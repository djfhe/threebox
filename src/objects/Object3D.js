/**
 * @author peterqliu / https://github.com/peterqliu
 * @author jscastro / https://github.com/jscastro76
 */
import Object from './objects.js';
import { _validate, types } from "../utils/utils.js";

function Object3D(opt) {
	opt = _validate(opt, prototype._defaults.Object3D);
	// [jscastro] full refactor of Object3D to behave exactly like 3D Models loadObj
	let obj = opt.obj;
	// [jscastro] options.rotation was wrongly used
	const r = types.rotation(opt.rotation, [0, 0, 0]);
	const s = types.scale(opt.scale, [1, 1, 1]);
	obj.rotation.set(r[0], r[1], r[2]);
	obj.scale.set(s[0], s[1], s[2]);
	obj.name = "model";
	let userScaleGroup = Object.prototype._makeGroup(obj, opt);
	opt.obj.name = "model";
	Object.prototype._addMethods(userScaleGroup);
	//[jscastro] calculate automatically the pivotal center of the object
	userScaleGroup.setAnchor(opt.anchor);
	//[jscastro] override the center calculated if the object has adjustments
	userScaleGroup.setCenter(opt.adjustment);
	//[jscastro] if the object is excluded from raycasting
	userScaleGroup.raycasted = opt.raycasted;
	userScaleGroup.visibility = true;

	return userScaleGroup
}

export default Object3D;