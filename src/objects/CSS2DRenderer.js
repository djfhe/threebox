/**
 * CSS2DRenderer / CSS2DObject
 * Based on original code by mrdoob / http://mrdoob.com/
 */

import { Object3D, Vector3, Matrix4 } from 'three';

const _vector = new Vector3();
const _viewMatrix = new Matrix4();
const _viewProjectionMatrix = new Matrix4();
const _a = new Vector3();
const _b = new Vector3();

class CSS2DObject extends Object3D {
  constructor(element) {
    super();
    this.element = element || document.createElement('div');
    this.element.style.position = 'absolute';
    this.element.style.userSelect = 'none';
    this.element.setAttribute('draggable', false);

    // Some labels must be always visible.
    this.alwaysVisible = false;

    // 'layer' is used for visibility toggling.
    Object.defineProperty(this, 'layer', {
      get() {
        return this.parent && this.parent.parent ? this.parent.parent.layer : null;
      }
    });

    // Implement dispose: remove the element and null its reference.
    this.dispose = function () {
      this.remove();
      this.element = null;
    };

    // Explicit remove: detach the element from the DOM.
    this.remove = function () {
      if (this.element instanceof Element && this.element.parentNode !== null) {
        this.element.parentNode.removeChild(this.element);
      }
    };

    // When this object is removed from the scene, clean up its element.
    this.addEventListener('removed', function () {
      this.remove();
    });
  }

  copy(source, recursive) {
    super.copy(source, recursive);
    this.element = source.element.cloneNode(true);
    return this;
  }
}

CSS2DObject.prototype.isCSS2DObject = true;

class CSS2DRenderer {
  constructor() {
    // Internal size properties.
    this._width = 0;
    this._height = 0;
    this._widthHalf = 0;
    this._heightHalf = 0;

    // Cache for objects and a list (using a WeakMap and Map).
    this.cache = {
      objects: new WeakMap(),
      list: new Map()
    };
    this.cacheList = this.cache.list;

    // Create the main container DOM element.
    this.domElement = document.createElement('div');
    this.domElement.style.overflow = 'hidden';
  }

  getSize() {
    return { width: this._width, height: this._height };
  }

  setSize(width, height) {
    this._width = width;
    this._height = height;
    this._widthHalf = width / 2;
    this._heightHalf = height / 2;
    this.domElement.style.width = width + 'px';
    this.domElement.style.height = height + 'px';
  }

  render(scene, camera) {
    if (scene.autoUpdate === true) scene.updateMatrixWorld();
    if (camera.parent === null) camera.updateMatrixWorld();

    _viewMatrix.copy(camera.matrixWorldInverse);
    _viewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, _viewMatrix);

    this._renderObject(scene, scene, camera);
    this._zOrder(scene);
  }

  _renderObject(object, scene, camera) {
    if (object.isCSS2DObject) {
      if (!object.visible) {
        // If the object is not visible, remove it from cache and DOM.
        this.cache.objects.delete(object);
        this.cache.list.delete(object.uuid);
        object.remove();
      } else {
        if (object.onBeforeRender) object.onBeforeRender(this, scene, camera);

        _vector.setFromMatrixPosition(object.matrixWorld);
        _vector.applyMatrix4(_viewProjectionMatrix);

        const element = object.element;
        let style;
        if (/apple/i.test(navigator.vendor)) {
          // For Apple devices, round the coordinates.
          style =
            'translate(-50%,-50%) translate(' +
            Math.round(_vector.x * this._widthHalf + this._widthHalf) + 'px,' +
            Math.round(-_vector.y * this._heightHalf + this._heightHalf) + 'px)';
        } else {
          style =
            'translate(-50%,-50%) translate(' +
            (_vector.x * this._widthHalf + this._widthHalf) + 'px,' +
            (-_vector.y * this._heightHalf + this._heightHalf) + 'px)';
        }

        element.style.WebkitTransform = style;
        element.style.MozTransform = style;
        element.style.oTransform = style;
        element.style.transform = style;

        element.style.display =
          object.visible && _vector.z >= -1 && _vector.z <= 1 ? '' : 'none';

        const objectData = {
          distanceToCameraSquared: this._getDistanceToSquared(camera, object)
        };

        // Cache the object data using the object itself as the key.
        this.cache.objects.set(object, objectData);
        this.cache.list.set(object.uuid, object);

        if (element.parentNode !== this.domElement) {
          this.domElement.appendChild(element);
        }

        if (object.onAfterRender) object.onAfterRender(this, scene, camera);
      }
    }

    // Recursively render children.
    for (let i = 0, l = object.children.length; i < l; i++) {
      this._renderObject(object.children[i], scene, camera);
    }
  }

  _getDistanceToSquared(object1, object2) {
    _a.setFromMatrixPosition(object1.matrixWorld);
    _b.setFromMatrixPosition(object2.matrixWorld);
    return _a.distanceToSquared(_b);
  }

  _filterAndFlatten(scene) {
    const result = [];
    scene.traverse(object => {
      if (object.isCSS2DObject) result.push(object);
    });
    return result;
  }

  _zOrder(scene) {
    const sorted = this._filterAndFlatten(scene).sort((a, b) => {
      const cacheA = this.cache.objects.get(a);
      const cacheB = this.cache.objects.get(b);
      if (cacheA && cacheB) {
        return cacheA.distanceToCameraSquared - cacheB.distanceToCameraSquared;
      }
      return 0;
    });

    const zMax = sorted.length;
    for (let i = 0, l = sorted.length; i < l; i++) {
      sorted[i].element.style.zIndex = zMax - i;
    }
  }
}

export { CSS2DRenderer, CSS2DObject };
