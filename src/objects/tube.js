/**
 * @author peterqliu / https://github.com/peterqliu
 * @author jscastro / https://github.com/jscastro76
*/
import * as utils from "../utils/utils.js";
import material from "../utils/material.js";
import Objects from './objects.js';
import { Vector3, CatmullRomCurve3, TubeGeometry, Mesh } from "three";
import Object3D from './Object3D.js';

function tube(opt, world){

	// validate and prep input geometry
	opt = utils._validate(opt, Objects.prototype._defaults.tube);

	let points = []
	opt.geometry.forEach(p => {
		points.push(new Vector3(p[0], p[1], p[2]));
	})
	const curve = new CatmullRomCurve3(points);
	let tube = new TubeGeometry(curve, points.length, opt.radius, opt.sides, false);
	let mat = material(opt);
	let obj = new Mesh(tube, mat);
	//[jscastro] we convert it in Object3D to add methods, bounding box, model, tooltip...
	return new Object3D({ obj: obj, units: opt.units, anchor: opt.anchor, adjustment: opt.adjustment, bbox: opt.bbox, tooltip: opt.tooltip, raycasted: opt.raycasted });
}

export default tube;

