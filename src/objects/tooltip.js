import * as utils from "../utils/utils.js";
import Objects from './objects.js';
import * as CSS2D from './CSS2DRenderer.js';

function Tooltip(obj) {

	obj = utils._validate(obj, Objects.prototype._defaults.tooltip);

	if (obj.text) {

		let divToolTip = Objects.prototype.drawTooltip(obj.text, obj.mapboxStyle);

		let tooltip = new CSS2D.CSS2DObject(divToolTip);
		tooltip.visible = false;
		tooltip.name = "tooltip";
		var userScaleGroup = Objects.prototype._makeGroup(tooltip, obj);
		Objects.prototype._addMethods(userScaleGroup);
		return userScaleGroup;
	}

}

export default Tooltip;