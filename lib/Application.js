/* globals EventEmitter, XPCOMUtils, NewTabURL */

const {Cu} = require("chrome");
const {data} = require("sdk/self");
const {PageMod} = require("sdk/page-mod");
const {PlacesProvider} = require("lib/PlacesProvider");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/NewTabURL.jsm");
Cu.import("resource://gre/modules/Services.jsm");
const am = require("common/action-manager");

XPCOMUtils.defineLazyGetter(this, "EventEmitter", function() {
  const {EventEmitter} = Cu.import("resource://devtools/shared/event-emitter.js", {});
  return EventEmitter;
});

const DEFAULT_OPTIONS = {
};

function Application(options = {}) {
  this.options = Object.assign({}, DEFAULT_OPTIONS, options);
  EventEmitter.decorate(this);
  this._setupListeners();
  this._setupPageMod();
  NewTabURL.override(this.pageURL);
}

Application.prototype = {
  pageURL: data.url("content/index.html"),
  _pagemod: null,

  _setupPageMod() {
    this.workers = new Set();
    this._pagemod = new PageMod({
      include: [this.pageURL],
      contentScriptFile: data.url("content-bridge.js"),
      contentScriptWhen: "start",
      attachTo: ["existing", "top"],
      onAttach: worker => {
        // This detaches workers on reload or closing the tab
        worker.on("detach", () => this._removeWorker(worker));

        // add the worker to a set to enable broadcasting
        if (!this.workers.has(worker)) {
          this._addWorker(worker);
        }

        worker.port.on("content-to-addon", msg => {
          if (!msg.type) {
            Cu.reportError("Application.dispatch error: unknown message type");
            return;
          }
          // This detaches workers if a new url is launched
          // it is important to remove the worker from the set, otherwise we will leak memory
          if (msg.type === "pagehide") {
            this._removeWorker(worker);
          }
          this.emit(msg.type, {msg, worker});
        });
      },
      onError: err => {
        Cu.reportError(err);
      }
    });
  },

  /**
   * Send a message to a worker
   */
  send(action, worker) {
    // if the function is async, the worker might not be there yet, or might have already disappeared
    try {
      worker.port.emit("addon-to-content", action);
    } catch (err) {
      this.workers.delete(worker);
      Cu.reportError(err);
    }
  },

  /**
   * Broadcast a message to all workers
   */
  broadcast(action) {
    for (let worker of this.workers) {
      this.send(action, worker);
    }
  },

  /*
   * Process the passed in links, save them, get from cache and response to content.
   */
  _processAndSendLinks(links, responseType, worker, options) {
    let {append} = options || {};
    this.send(am.actions.Response(responseType, links, {append}), worker);
  },

  /**
   * Responds to places requests
   */
  _respondToPlacesRequests(msgName, params) {
    let {msg, worker} = params;
    switch (msgName) {
      case am.type("TOP_FRECENT_SITES_REQUEST"):
        PlacesProvider.links.getTopFrecentSites(msg.data).then(links => {
          this._processAndSendLinks(links, "TOP_FRECENT_SITES_RESPONSE", worker, msg.meta);
        });
        break;
      case am.type("RECENT_BOOKMARKS_REQUEST"):
        PlacesProvider.links.getRecentBookmarks(msg.data).then(links => {
          this._processAndSendLinks(links, "RECENT_BOOKMARKS_RESPONSE", worker, msg.meta);
        });
        break;
      case am.type("RECENT_LINKS_REQUEST"):
        PlacesProvider.links.getRecentLinks(msg.data).then(links => {
          this._processAndSendLinks(links, "RECENT_LINKS_RESPONSE", worker, msg.meta);
        });
        break;
      case am.type("HIGHLIGHTS_LINKS_REQUEST"):
        PlacesProvider.links.getHighlightsLinks(msg.data).then(links => {
          this._processAndSendLinks(links, "HIGHLIGHTS_LINKS_RESPONSE", worker, msg.meta);
        });
        break;
    }
  },

  /**
   * Handles changes to places
   */
  _handlePlacesChanges(eventName, data) {
    /* note: this will execute for each of the 3 notifications that occur
     * when adding a visit: frecency:-1, frecency: real frecency, title */
    if (this._populatingCache && !this._populatingCache.places) {
      this._asyncBuildPlacesCache();
    }

    if (eventName.startsWith("bookmark")) {
      this.broadcast(am.actions.Response("RECEIVE_BOOKMARKS_CHANGES", data));
    } else {
      this.broadcast(am.actions.Response("RECEIVE_PLACES_CHANGES", data));
    }
  },

  /**
   * Sets up various listeners for the pages
   */
  _setupListeners() {
    this._handlePlacesChanges = this._handlePlacesChanges.bind(this);
    this._respondToPlacesRequests = this._respondToPlacesRequests.bind(this);
    PlacesProvider.links.on("deleteURI", this._handlePlacesChanges);
    PlacesProvider.links.on("clearHistory", this._handlePlacesChanges);
    PlacesProvider.links.on("linkChanged", this._handlePlacesChanges);
    PlacesProvider.links.on("manyLinksChanged", this._handlePlacesChanges);
    PlacesProvider.links.on("bookmarkAdded", this._handlePlacesChanges);
    PlacesProvider.links.on("bookmarkRemoved", this._handlePlacesChanges);
    PlacesProvider.links.on("bookmarkChanged", this._handlePlacesChanges);

    this.on(am.type("TOP_FRECENT_SITES_REQUEST"), this._respondToPlacesRequests);
    this.on(am.type("HIGHLIGHTS_LINKS_REQUEST"), this._respondToPlacesRequests);
    this.on(am.type("RECENT_BOOKMARKS_REQUEST"), this._respondToPlacesRequests);
    this.on(am.type("RECENT_LINKS_REQUEST"), this._respondToPlacesRequests);
  },

  _removeListeners() {
    PlacesProvider.links.off("deleteURI", this._handlePlacesChanges);
    PlacesProvider.links.off("clearHistory", this._handlePlacesChanges);
    PlacesProvider.links.off("linkChanged", this._handlePlacesChanges);
    PlacesProvider.links.off("manyLinksChanged", this._handlePlacesChanges);
    PlacesProvider.links.off("bookmarkAdded", this._handlePlacesChanges);
    PlacesProvider.links.off("bookmarkRemoved", this._handlePlacesChanges);
    PlacesProvider.links.off("bookmarkChanged", this._handlePlacesChanges);

    this.off(am.type("TOP_FRECENT_SITES_REQUEST"), this._respondToPlacesRequests);
    this.off(am.type("HIGHLIGHTS_LINKS_REQUEST"), this._respondToPlacesRequests);
    this.off(am.type("RECENT_BOOKMARKS_REQUEST"), this._respondToPlacesRequests);
    this.off(am.type("RECENT_LINKS_REQUEST"), this._respondToPlacesRequests);
  },

  /**
   * Adds a worker and calls callback if defined
   */
  _addWorker(worker) {
    this.workers.add(worker);
    if (this.options.onAddWorker) {
      this.options.onAddWorker();
    }
  },

  /**
   * Removes a worker and calls callback if defined
   */
  _removeWorker(worker) {
    this.workers.delete(worker);
    if (this.options.onRemoveWorker) {
      this.options.onRemoveWorker();
    }
  },

  /**
   * Unload the application
   */
  unload(reason) { // eslint-disable-line no-unused-vars
    let defaultUnload = () => {
      this.workers.clear();
      this._removeListeners();
      this._pagemod.destroy();
    };

    switch (reason){
      // can be one of: disable/shutdown/upgrade/downgrade
      default:
        defaultUnload();
    }
  }
};

exports.Application = Application;
