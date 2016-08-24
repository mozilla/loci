const {PlacesProvider} = require("lib/PlacesProvider");
const {Application} = require("lib/Application");

let app = null;

Object.assign(exports, {
  main(options) {
    // options.loadReason can be install/enable/startup/upgrade/downgrade
    PlacesProvider.links.init();

    app = new Application(options);
  },

  onUnload(reason) {
    if (app) {
      app.unload(reason);
      app = null;
    }
    PlacesProvider.links.uninit();
  }
});
