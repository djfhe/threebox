import { Matrix4, Vector3, BufferGeometry, BufferAttribute, LineBasicMaterial, Line } from "three";
import { MERCATOR_A, DEG2RAD, PROJECTION_WORLD_SIZE, WORLD_SIZE, EARTH_CIRCUMFERENCE } from "./constants.js";
import validate from "./validate.js";

// Pretty print a 4x4 matrix
export function prettyPrintMatrix(uglymatrix) {
  for (let s = 0; s < 4; s++) {
    const quartet = [
      uglymatrix[s],
      uglymatrix[s + 4],
      uglymatrix[s + 8],
      uglymatrix[s + 12]
    ];
    console.log(quartet.map(num => num.toFixed(4)));
  }
}

// Create a perspective projection matrix
export function makePerspectiveMatrix(fovy, aspect, near, far) {
  const out = new Matrix4();
  const f = 1.0 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);

  const newMatrix = [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, (2 * far * near) * nf, 0
  ];

  out.elements = newMatrix;
  return out;
}

// Create an orthographic projection matrix
export function makeOrthographicMatrix(left, right, top, bottom, near, far) {
  const out = new Matrix4();

  const w = 1.0 / (right - left);
  const h = 1.0 / (top - bottom);
  const p = 1.0 / (far - near);

  const x = (right + left) * w;
  const y = (top + bottom) * h;
  const z = near * p;

  const newMatrix = [
    2 * w, 0, 0, 0,
    0, 2 * h, 0, 0,
    0, 0, -p, 0,
    -x, -y, -z, 1
  ];

  out.elements = newMatrix;
  return out;
}

// Convert degrees (or an object/array of degrees) to radians
export function radify(deg) {
  function convert(degrees) {
    degrees = degrees || 0;
    return Math.PI * 2 * degrees / 360;
  }

  if (typeof deg === 'object') {
    if (Array.isArray(deg) && deg.length > 0) {
      return deg.map(degree => convert(degree));
    } else {
      return [convert(deg.x), convert(deg.y), convert(deg.z)];
    }
  } else {
    return convert(deg);
  }
}

// Convert radians (or an object of radians) to degrees
export function degreeify(rad) {
  function convert(radians) {
    radians = radians || 0;
    return radians * 360 / (Math.PI * 2);
  }

  if (typeof rad === 'object') {
    return [convert(rad.x), convert(rad.y), convert(rad.z)];
  } else {
    return convert(rad);
  }
}

// Projects longitude/latitude (and optionally altitude) to world coordinates
export function projectToWorld(coords) {
  // Spherical mercator forward projection, re-scaling to WORLD_SIZE
  const projected = [
    -MERCATOR_A * DEG2RAD * coords[0] * PROJECTION_WORLD_SIZE,
    -MERCATOR_A * Math.log(Math.tan((Math.PI * 0.25) + (0.5 * DEG2RAD * coords[1]))) * PROJECTION_WORLD_SIZE
  ];

  if (!coords[2]) {
    projected.push(0);
  } else {
    const pixelsPerMeter = projectedUnitsPerMeter(coords[1]);
    projected.push(coords[2] * pixelsPerMeter);
  }

  return new Vector3(projected[0], projected[1], projected[2]);
}

// Calculate projected units per meter at a given latitude
export function projectedUnitsPerMeter(latitude) {
  return Math.abs(WORLD_SIZE / Math.cos(DEG2RAD * latitude) / EARTH_CIRCUMFERENCE);
}

// Internal: circumference of the Earth at a given latitude
function _circumferenceAtLatitude(latitude) {
  return EARTH_CIRCUMFERENCE * Math.cos(latitude * Math.PI / 180);
}

// Calculate the Mercator Z value from an altitude
export function mercatorZfromAltitude(altitude, lat) {
  return altitude / _circumferenceAtLatitude(lat);
}

// Scales an array of vertices from world units to meters
export function _scaleVerticesToMeters(centerLatLng, vertices) {
  const pixelsPerMeter = projectedUnitsPerMeter(centerLatLng[1]);
  const centerProjected = projectToWorld(centerLatLng);

  for (let i = 0; i < vertices.length; i++) {
    vertices[i].multiplyScalar(pixelsPerMeter);
  }

  return vertices;
}

// (Not yet implemented) Projects coordinates to screen space
export function projectToScreen(coords) {
  console.log("WARNING: Projecting to screen coordinates is not yet implemented");
}

// (Not yet implemented) Unprojects screen pixels back to world coordinates
export function unprojectFromScreen(pixel) {
  console.log("WARNING: unproject is not yet implemented");
}

// Unprojects world units back to longitude/latitude/altitude
export function unprojectFromWorld(worldUnits) {
  const unprojected = [
    -worldUnits.x / (MERCATOR_A * DEG2RAD * PROJECTION_WORLD_SIZE),
    2 * (Math.atan(Math.exp(worldUnits.y / (PROJECTION_WORLD_SIZE * (-MERCATOR_A)))) - Math.PI / 4) / DEG2RAD
  ];

  const pixelsPerMeter = projectedUnitsPerMeter(unprojected[1]);
  const height = worldUnits.z || 0;
  unprojected.push(height / pixelsPerMeter);

  return unprojected;
}

// Converts an object's 3D world position to screen coordinates
// Note: renderer must be passed in so that its canvas dimensions can be used.
export function toScreenPosition(obj, camera, renderer) {
  const vector = new Vector3();
  const widthHalf = 0.5 * renderer.context.canvas.width;
  const heightHalf = 0.5 * renderer.context.canvas.height;

  obj.updateMatrixWorld();
  vector.setFromMatrixPosition(obj.matrixWorld);
  vector.project(camera);

  vector.x = (vector.x * widthHalf) + widthHalf;
  vector.y = -(vector.y * heightHalf) + heightHalf;

  return {
    x: vector.x,
    y: vector.y
  };
}

// Retrieves the center point of a feature (geometry) and computes its height
export function getFeatureCenter(feature, model, level) {
  let center = [];
  let latitude = 0;
  let longitude = 0;
  let height = 0;
  // Deep copy to avoid modifying the original array
  let coordinates = [...feature.geometry.coordinates[0]];

  if (feature.geometry.type === "Point") {
    center = [...coordinates[0]]; // deep copy
  } else {
    // For polygons: remove the duplicate last coordinate if present
    if (feature.geometry.type === "MultiPolygon") coordinates = coordinates[0];
    coordinates.splice(-1, 1);
    coordinates.forEach(c => {
      latitude += c[0];
      longitude += c[1];
    });
    center = [latitude / coordinates.length, longitude / coordinates.length];
  }
  height = getObjectHeightOnFloor(feature, model, level);

  if (center.length < 3) {
    center.push(height);
  } else {
    center[2] = height;
  }

  return center;
}

// Calculates the height of an object on its floor
export function getObjectHeightOnFloor(feature, obj, level = feature.properties.level || 0) {
  const floorHeightMin = level * (feature.properties.levelHeight || 0);
  const base = feature.properties.base_height || feature.properties.min_height || 0;
  // If a model is provided, assume its height is 0; otherwise compute using the feature properties.
  const height = (obj && obj.model) ? 0 : (feature.properties.height - base);
  const objectHeight = height + base;
  const modelHeightFloor = floorHeightMin + objectHeight;
  return modelHeightFloor;
}

// (Empty implementation) Flips the material sides of an object
export function _flipMaterialSides(obj) {
  // Implementation not provided.
}

// Normalizes an array of Vector3 vertices to their collective center,
// returning the shifted vertices and the center position.
export function normalizeVertices(vertices) {
  const geometry = new BufferGeometry();
  const positions = [];

  for (let j = 0; j < vertices.length; j++) {
    const p = vertices[j];
    positions.push(p.x, p.y, p.z);
    positions.push(p.x, p.y, p.z);
  }
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.computeBoundingSphere();
  const center = geometry.boundingSphere.center;

  // Create new vectors shifted by the center
  const scaled = vertices.map(v3 => v3.clone().sub(center));

  return { vertices: scaled, position: center };
}

// Flattens an array of Vector3 objects into a simple [x,y,z, x,y,z, …] array
export function flattenVectors(vectors) {
  const flattenedArray = [];
  for (const vertex of vectors) {
    flattenedArray.push(vertex.x, vertex.y, vertex.z);
  }
  return flattenedArray;
}

// Converts an array of longitude/latitude (and optional altitude) coordinates to world coordinates (Vector3)
export function lnglatsToWorld(coords) {
  const vector3 = coords.map(pt => {
    const p = projectToWorld(pt);
    return new Vector3(p.x, p.y, p.z);
  });
  return vector3;
}

// Extends one object with the properties of another
export function extend(original, addition) {
  for (const key in addition) {
    original[key] = addition[key];
  }
}

// Creates a shallow clone of an object
export function clone(original) {
  const cloned = {};
  for (const key in original) {
    cloned[key] = original[key];
  }
  return cloned;
}

// Clamps a number between a minimum and maximum value
export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

// Utility functions for handling rotations and scales
export const types = {
  rotation(r, currentRotation) {
    // Default rotation is 0 if not provided
    if (!r) { r = 0; }
    // If a number is provided, assume rotation only about Z
    if (typeof r === 'number') r = { z: r };
    const degrees = types.applyDefault([r.x, r.y, r.z], currentRotation);
    const radians = radify(degrees);
    return radians;
  },
  scale(s, currentScale) {
    // Default scale is 1 if not provided
    if (!s) { s = 1; }
    if (typeof s === 'number') return [s, s, s];
    else return types.applyDefault([s.x, s.y, s.z], currentScale);
  },
  applyDefault(array, current) {
    return array.map((item, index) => item || current[index]);
  }
};

// Rounds a number to a specified number of decimal places
export function toDecimal(n, d) {
  return Number(n.toFixed(d));
}

// Checks deep equality between two objects
export function equal(obj1, obj2) {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }
  if (keys1.length === 0 && keys2.length === 0 && keys1 !== keys2) {
    return false;
  }

  for (const key of keys1) {
    const val1 = obj1[key];
    const val2 = obj2[key];
    const areObjects = isObject(val1) && isObject(val2);
    if (areObjects ? !equal(val1, val2) : val1 !== val2) {
      return false;
    }
  }
  return true;
}

// Determines if a value is an object
export function isObject(object) {
  return object != null && typeof object === 'object';
}

// Converts a curve (with a getPoints method) into a line
export function curveToLine(curve, params) {
  const { width, color } = params;
  const geometry = new BufferGeometry().setFromPoints(curve.getPoints(100));
  const material = new LineBasicMaterial({
    color: color,
    linewidth: width,
  });
  const line = new Line(geometry, material);
  return line;
}

// Converts an array of curves into an array of lines, using preset colors
export function curvesToLines(curves) {
  const colors = [0xff0000, 0x1eff00, 0x2600ff];
  const lines = curves.map((curve, i) => {
    const params = {
      width: 3,
      color: colors[i] || 'purple',
    };
    const curveline = curveToLine(curve, params);
    return curveline;
  });
  return lines;
}

// Validates user input against a set of default values
export function _validate(userInputs, defaults) {
  userInputs = userInputs || {};
  const validatedOutput = {};
  extend(validatedOutput, userInputs);

  for (const key of Object.keys(defaults)) {
    if (userInputs[key] === undefined) {
      // If a parameter is required (default is null) but not provided:
      if (defaults[key] === null) {
        console.error(key + ' is required');
        return;
      } else {
        validatedOutput[key] = defaults[key];
      }
    } else {
      validatedOutput[key] = userInputs[key];
    }
  }
  return validatedOutput;
}

// Validator instance (from the imported validate module)
export const Validator = new validate();

// List of methods that are exposed for external use
export const exposedMethods = ['projectToWorld', 'projectedUnitsPerMeter', 'extend', 'unprojectFromWorld'];