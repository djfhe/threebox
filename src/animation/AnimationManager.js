/**
 * AnimationManager – modernized and optimized version (without followPath sample caching)
 */
import { Clock, AnimationMixer, CatmullRomCurve3, Vector3 } from 'three';
import * as utils from '../utils/utils.js';

const defaults = {
  followPath: {
    path: null,
    duration: 1000,
    trackHeading: true,
  },
};

class AnimationManager {
  constructor(map) {
    this.map = map;
    this.enrolledObjects = [];
    this.previousFrameTime = undefined;
    this.isAnimating = false;
  }

  unenroll(obj) {
    const index = this.enrolledObjects.indexOf(obj);
    if (index !== -1) {
      this.enrolledObjects.splice(index, 1);
    }
  }

  enroll(obj) {
    // Set up basic animation properties.
    obj.clock = new Clock();
    obj.hasDefaultAnimation = false;
    obj.defaultAction = undefined;
    obj.actions = [];
    obj.mixer = undefined;

    // If the object has animations, initialize the AnimationMixer and default action.
    if (obj.animations && obj.animations.length > 0) {
      obj.hasDefaultAnimation = true;
      const daIndex =
        obj.userData.defaultAnimation !== undefined
          ? obj.userData.defaultAnimation
          : 0;
      obj.mixer = new AnimationMixer(obj);

      // Closure for setting the proper animation action.
      const setAction = (animationIndex) => {
        obj.animations.forEach((animation, i) => {
          if (animationIndex >= obj.animations.length) {
            console.log(
              `The animation index ${animationIndex} doesn't exist for this object`
            );
          }
          const action = obj.mixer.clipAction(animation);
          obj.actions.push(action);
          if (animationIndex === i) {
            obj.defaultAction = action;
            action.setEffectiveWeight(1);
          } else {
            action.setEffectiveWeight(0);
          }
          action.play();
        });
      };

      setAction(daIndex);

      // Allow switching animations via options.
      obj.playAnimation = (options) => {
        if (obj.mixer) {
          if (options.animation !== undefined) {
            setAction(options.animation);
          }
          obj.playDefault(options);
        }
      };
    }

    // Create an "isPlaying" property with getter/setter.
    let _isPlaying = false;
    Object.defineProperty(obj, 'isPlaying', {
      get: () => _isPlaying,
      set: (value) => {
        if (_isPlaying !== value) {
          _isPlaying = value;
          obj.dispatchEvent({ type: 'IsPlayingChanged', detail: obj });
        }
      },
    });

    // Add an internal animation queue.
    obj.animationQueue = [];

    // "set" method to animate object properties over a duration.
    obj.set = function (options) {
      if (options.duration > 0) {
        const newParams = {
          start: Date.now(),
          expiration: Date.now() + options.duration,
          endState: {},
        };
        utils.extend(options, newParams);

        const translating = options.coords;
        const rotating = options.rotation;
        const scaling =
          options.scale || options.scaleX || options.scaleY || options.scaleZ;

        if (rotating) {
          const { x, y, z } = obj.rotation;
          options.startRotation = [x, y, z];
          options.endState.rotation = utils.types.rotation(
            options.rotation,
            options.startRotation
          );
          options.rotationPerMs = options.endState.rotation.map(
            (angle, index) =>
              (angle - options.startRotation[index]) / options.duration
          );
        }

        if (scaling) {
          const { x, y, z } = obj.scale;
          options.startScale = [x, y, z];
          options.endState.scale = utils.types.scale(options.scale, options.startScale);
          options.scalePerMs = options.endState.scale.map(
            (scale, index) =>
              (scale - options.startScale[index]) / options.duration
          );
        }

        if (translating) {
          options.pathCurve = new CatmullRomCurve3(
            utils.lnglatsToWorld([obj.coordinates, options.coords])
          );
        }

        const entry = { type: 'set', parameters: options };
        this.animationQueue.push(entry);
        tb.map.repaint = true;
      } else {
        this.stop();
        options.rotation = utils.radify(options.rotation);
        this._setObject(options);
      }
      return this;
    };

    // Placeholder for animation request IDs.
    obj.animationMethod = null;

    // Stop animation: cancel requestAnimationFrame and clear the queue.
    obj.stop = function () {
      if (obj.mixer) {
        obj.isPlaying = false;
        cancelAnimationFrame(obj.animationMethod);
      }
      this.animationQueue = [];
      return this;
    };

    // "followPath" method (without sample caching).
    obj.followPath = function (options, cb) {
      const entry = {
        type: 'followPath',
        parameters: utils._validate(options, defaults.followPath),
      };

      // Create the curve from lng/lat coordinates.
      entry.parameters.pathCurve = new CatmullRomCurve3(
        utils.lnglatsToWorld(options.path)
      );

      Object.assign(entry.parameters, {
        start: Date.now(),
        expiration: Date.now() + entry.parameters.duration,
        cb: cb,
      });

      this.animationQueue.push(entry);
      tb.map.repaint = true;
      return this;
    };

    // Immediately set the object state.
    obj._setObject = function (options) {
      // Always update scale first.
      obj.setScale();

      const { position: p, rotation: r, scale: s, worldCoordinates: w, quaternion: q, translate: t, worldTranslate: wt } = options;

      if (p) {
        this.coordinates = p;
        const c = utils.projectToWorld(p);
        this.position.copy(c);
      }

      if (t) {
        this.coordinates = [
          this.coordinates[0] + t[0],
          this.coordinates[1] + t[1],
          this.coordinates[2] + t[2],
        ];
        const c = utils.projectToWorld(t);
        this.position.copy(c);
        options.position = this.coordinates;
      }

      if (wt) {
        this.translateX(wt.x);
        this.translateY(wt.y);
        this.translateZ(wt.z);
        const p = utils.unprojectFromWorld(this.position);
        this.coordinates = options.position = p;
      }

      if (r) {
        this.rotation.set(r[0], r[1], r[2]);
        options.rotation = new Vector3(r[0], r[1], r[2]);
      }

      if (s) {
        this.scale.set(s[0], s[1], s[2]);
        options.scale = this.scale;
      }

      if (q) {
        this.quaternion.setFromAxisAngle(q[0], q[1]);
        options.rotation = q[0].multiplyScalar(q[1]);
      }

      if (w) {
        this.position.copy(w);
        const p = utils.unprojectFromWorld(w);
        this.coordinates = options.position = p;
      }

      // Update shadow and bounding properties.
      this.setBoundingBoxShadowFloor();
      this.setReceiveShadowFloor();

      this.updateMatrixWorld();
      tb.map.repaint = true;

      // Notify listeners that the object has changed.
      this.dispatchEvent({
        type: 'ObjectChanged',
        detail: {
          object: this,
          action: { position: options.position, rotation: options.rotation, scale: options.scale },
        },
      });
    };

    // Play the default animation.
    obj.playDefault = function (options) {
      if (obj.mixer && obj.hasDefaultAnimation) {
        const newParams = {
          start: Date.now(),
          expiration: Date.now() + options.duration,
          endState: {},
        };
        utils.extend(options, newParams);
        obj.mixer.timeScale = options.speed || 1;
        const entry = {
          type: 'playDefault',
          parameters: options,
        };
        this.animationQueue.push(entry);
        tb.map.repaint = true;
        return this;
      }
    };

    // Pause/unpause and activate/deactivate all actions.
    obj.pauseAllActions = function () {
      if (obj.mixer) {
        obj.actions.forEach((action) => (action.paused = true));
      }
    };

    obj.unPauseAllActions = function () {
      if (obj.mixer) {
        obj.actions.forEach((action) => (action.paused = false));
      }
    };

    obj.deactivateAllActions = function () {
      if (obj.mixer) {
        obj.actions.forEach((action) => action.stop());
      }
    };

    obj.activateAllActions = function () {
      if (obj.mixer) {
        obj.actions.forEach((action) => action.play());
      }
    };

    // A small tick to ensure proper initialization.
    obj.idle = function () {
      if (obj.mixer) {
        obj.mixer.update(0.01);
      }
      tb.map.repaint = true;
      return this;
    };

    this.enrolledObjects.push(obj);
  }

  update(now) {
    // Cache current time once per update.
    const currentTime = Date.now();
    let repaintNeeded = false;

    // Pre-create temporary vectors for tangent calculations.
    const up = new Vector3(0, 1, 0);
    const tempAxis = new Vector3();

    // Loop over each enrolled object.
    for (let a = this.enrolledObjects.length - 1; a >= 0; a--) {
      const object = this.enrolledObjects[a];
      if (!object.animationQueue || object.animationQueue.length === 0) continue;

      // Process each animation entry in the object's queue.
      for (let i = object.animationQueue.length - 1; i >= 0; i--) {
        const item = object.animationQueue[i];
        if (!item) continue;
        const options = item.parameters;

        // Remove items with no expiration.
        if (!options.expiration) {
          object.animationQueue.splice(i, 1);
          if (object.animationQueue[i]) {
            object.animationQueue[i].parameters.start = currentTime;
          }
          continue;
        }

        const expiring = currentTime >= options.expiration;
        if (expiring) {
          options.expiration = false;
          if (item.type === 'playDefault') {
            object.stop();
          } else {
            if (options.endState) object._setObject(options.endState);
            if (typeof options.cb !== 'undefined') options.cb();
          }
        } else {
          const timeProgress = (currentTime - options.start) / options.duration;

          if (item.type === 'set') {
            const objectState = {};
            if (options.pathCurve) {
              objectState.worldCoordinates = options.pathCurve.getPoint(timeProgress);
            }
            if (options.rotationPerMs) {
              objectState.rotation = options.startRotation.map(
                (rad, index) =>
                  rad + options.rotationPerMs[index] * timeProgress * options.duration
              );
            }
            if (options.scalePerMs) {
              objectState.scale = options.startScale.map(
                (scale, index) =>
                  scale + options.scalePerMs[index] * timeProgress * options.duration
              );
            }
            object._setObject(objectState);
          }

          if (item.type === 'followPath') {
            const objectState = {};
            objectState.worldCoordinates = options.pathCurve.getPointAt(timeProgress);
            if (options.trackHeading) {
              // Calculate heading using temporary vectors.
              const tangent = options.pathCurve.getTangentAt(timeProgress).normalize();
              tempAxis.crossVectors(up, tangent).normalize();
              const radians = Math.acos(up.dot(tangent));
              objectState.quaternion = [tempAxis.clone(), radians];
            }
            object._setObject(objectState);
          }

          if (item.type === 'playDefault') {
            object.activateAllActions();
            object.isPlaying = true;
            // Centralize scheduling of the update loop.
            if (!this.isAnimating) {
              this.isAnimating = true;
              requestAnimationFrame(this.update.bind(this));
            }
            object.mixer.update(object.clock.getDelta());
          }
          repaintNeeded = true;
        }
      }
    }

    if (repaintNeeded) {
      tb.map.repaint = true;
    }
    this.previousFrameTime = currentTime;
  }
}

export default AnimationManager;
