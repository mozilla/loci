const setRowsOrError = require("reducers/SetRowsOrError");

module.exports = {
  TopSites: setRowsOrError("TOP_FRECENT_SITES_REQUEST", "TOP_FRECENT_SITES_RESPONSE"),
  History: setRowsOrError("RECENT_LINKS_REQUEST", "RECENT_LINKS_RESPONSE"),
  Bookmarks: setRowsOrError("RECENT_BOOKMARKS_REQUEST", "RECENT_BOOKMARKS_RESPONSE"),
  Highlights: setRowsOrError("HIGHLIGHTS_LINKS_REQUEST", "HIGHLIGHTS_LINKS_RESPONSE"),
};
