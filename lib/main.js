/* globals Task */

const {PlacesProvider} = require("lib/PlacesProvider");
const {Application} = require("lib/Application");
const {Cu} = require("chrome");

Cu.import("resource://gre/modules/Task.jsm");

let app = null;

Object.assign(exports, {
  main(options) {

    // options.loadReason can be install/enable/startup/upgrade/downgrade
    PlacesProvider.links.init();

    Task.spawn(function*() {
      app = new Application(options);
    }.bind(this));
  },

  onUnload(reason) {
    if (app) {
      app.unload(reason);
      app = null;
    }
    PlacesProvider.links.uninit();
  }
});
