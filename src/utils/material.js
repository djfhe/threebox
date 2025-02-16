// This module creates a THREE material from the options object provided into the Objects class.
// Users can do this in one of three ways:

// - provide a preset THREE.Material in the `material` parameter
// - specify a `material` string, `color`, and/or `opacity` as modifications of the default material
// - provide none of these parameters, to use the default material

import { _validate } from "../utils/utils.js";
import * as THREE from "three";

var defaults = {
	material: 'MeshBasicMaterial',
	color: 'black',
	opacity: 1
};


function material (options) {

	var output;

	if (options) {

		options = _validate(options, defaults);

		// check if user provided material object
		if (options.material && options.material.isMaterial) output = options.material;

		// check if user provided any material parameters. create new material object based on that.
		else if (options.material || options.color || options.opacity){
		    output = new THREE[options.material]({color: options.color, transparent: options.opacity<1});
		}

		// if neither, return default material
		else output = generateDefaultMaterial();

		output.opacity = options.opacity;
		if (options.side) output.side = options.side

	}

	// if no options, return default
	else output = generateDefaultMaterial();

	function generateDefaultMaterial(){
		return new THREE[defaults.material]({color: defaults.color});
	}

	return output
}

export default material;
