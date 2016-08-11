"use strict";

const {Cc, Ci} = require("chrome");

const {newURI} = Cc["@mozilla.org/network/io-service;1"]
                    .getService(Ci.nsIIOService);

/**
 * Normalize a URL doing the following things:
 *   - Returns undefined for invalid URLs
 *   - Make the domain address lowercase
 *   - Always have a "/"" at the begining of the path
 *   - Sort the query arguments by their unicode code point value
 *   - Replace "+" and whitespace in the query with %20
 *   - Normalize percent encodings to the uppercase version (%2b -> %2B)
 *   - Remove the reference part if the keepReference argument is false
 *
 * @param {String}  urlString
 *                  The url we want to normalize
 * @param {Boolean} keepReference
 *                  If set to false, do not keep the reference portion of the url
 * @returns {String}
 *                  Returns the normalized URL
 */

function normalizeUrl(urlString, keepReference = true) {
  let url;
  try {
    url = newURI(urlString, null, null).QueryInterface(Ci.nsIURL);
  } catch (e) {
    // this is not a valid URL,
    return "";
  }

  // nsIURL will normalize the urls always having a / for the path.
  let path = url.filePath;
  let query = url.query;
  if (query) {
    // Sort query arguments
    query = query.split("&").sort().join("&");

    // Replace "+" with %20
    query = query.replace(/[\+]/g, "%20");

    // Normalize percent encodings
    query = query.replace(/%[0-9a-fA-F]{2}/g, pe => pe.toUpperCase());

    path += `?${query}`;
  }

  if (keepReference && url.ref) {
    path += `#${url.ref}`;
  }

  return url.prePath + path;
}

exports.normalizeUrl = normalizeUrl;
