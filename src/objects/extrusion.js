/**
 * @author jscastro / https://github.com/jscastro76
 */
import Object from './objects.js';
import { _validate, projectToWorld, toDecimal } from "../utils/utils.js";
import { Mesh, Vector2, Vector3, Shape, Path, ExtrudeGeometry } from "three";
import Object3D from './Object3D.js';

/**
 * 
 * @param {any} opt must fit the default defined in Objects.prototype._defaults.extrusion 
 * @param {arr} opt.coordinates could receive a feature.geometry.coordinates
 */
function extrusion(opt) {

	opt = _validate(opt, Object.prototype._defaults.extrusion);
	let shape = extrusion.prototype.buildShape(opt.coordinates);
	let geometry = extrusion.prototype.buildGeometry(shape, opt.geometryOptions);
	let mesh = new Mesh(geometry, opt.materials);
	opt.obj = mesh;
	//[jscastro] we convert it in Object3D to add methods, bounding box, model, tooltip...
	return new Object3D(opt);

}

extrusion.prototype = {

	buildShape: function (coords) {
		if (coords[0] instanceof (Vector2 || Vector3)) return new Shape(coords);
		let shape = new Shape();
		for (let i = 0; i < coords.length; i++) {
			if (i === 0) {
				shape = new Shape(this.buildPoints(coords[0], coords[0]));
			} else {
				shape.holes.push(new Path(this.buildPoints(coords[i], coords[0])));
			}
		}
		return shape;
	},

	buildPoints: function (coords, initCoords) {
		const points = [];
		let init = projectToWorld([initCoords[0][0], initCoords[0][1], 0]);
		for (let i = 0; i < coords.length; i++) {
			let pos = projectToWorld([coords[i][0], coords[i][1], 0]);
			points.push(new Vector2(toDecimal((pos.x - init.x), 9), toDecimal((pos.y - init.y), 9)));
		}
		return points;
	},

	buildGeometry: function (shape, settings) {
		let geometry = new ExtrudeGeometry(shape, settings);
		geometry.computeBoundingBox();
		return geometry;
	}

}

export default extrusion;