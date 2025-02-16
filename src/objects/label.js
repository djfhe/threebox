/**
 * @author jscastro / https://github.com/jscastro76
 */
import * as utils from "../utils/utils.js";
import Objects from './objects.js';
import * as CSS2D from './CSS2DRenderer.js';

function Label(obj) {

	obj = utils._validate(obj, Objects.prototype._defaults.label);

	let div = Objects.prototype.drawLabelHTML(obj.htmlElement, obj.cssClass);

	let label = new CSS2D.CSS2DObject(div);
	label.name = "label";
	label.visible = obj.alwaysVisible;
	label.alwaysVisible = obj.alwaysVisible;
	var userScaleGroup = Objects.prototype._makeGroup(label, obj);
	Objects.prototype._addMethods(userScaleGroup);
	userScaleGroup.visibility = obj.alwaysVisible;

	return userScaleGroup;
}


export default Label;