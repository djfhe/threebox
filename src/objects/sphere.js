/**
 * @author peterqliu / https://github.com/peterqliu
 * @author jscastro / https://github.com/jscastro76
*/
import * as utils from "../utils/utils.js";
import material from "../utils/material.js";
import { SphereGeometry, Mesh } from 'three';
import Objects from './objects.js';
import Object3D from './Object3D.js';

function Sphere(opt) {

	opt = utils._validate(opt, Objects.prototype._defaults.sphere);
	let geometry = new SphereGeometry(opt.radius, opt.sides, opt.sides);
	let mat = material(opt)
	let output = new Mesh(geometry, mat);
	//[jscastro] we convert it in Object3D to add methods, bounding box, model, tooltip...
	return new Object3D({ obj: output, units: opt.units, anchor: opt.anchor, adjustment: opt.adjustment, bbox: opt.bbox, tooltip: opt.tooltip, raycasted: opt.raycasted });

}


export default Sphere;