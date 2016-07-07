/* globals URL */
"use strict";

const simplePrefs = require("sdk/simple-prefs");
const options = require("@loader/options");
const {Cu} = require("chrome");
Cu.importGlobalProperties(["URL"]);

const kBaseURI = simplePrefs["sdk.baseURI"] || options.prefixURI;

/**
 * Creates a resource URL from the current addon based on a provided
 * relative path
 *
 * @param {String}      path
 *                      A relative path starting from the root of the addon
 * @returns {String}
 *                      A resource URL
 */
function getResourceURL(path) {
  return new URL(path, kBaseURI).href;
}

exports.getResourceURL = getResourceURL;
exports.baseURI = kBaseURI;
