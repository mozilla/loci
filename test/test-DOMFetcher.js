"use strict";

const {setTimeout} = require("sdk/timers");
const test = require("sdk/test");
const tabs = require("sdk/tabs");
const httpd = require("./lib/httpd");
const {before, after} = require("sdk/test/utils");
const {DOMFetcher} = require("lib/DOMFetcher");
const {Cu} = require("chrome");
const {doGetFile} = require("./lib/utils");

const {TextDecoder, OS} = Cu.import("resource://gre/modules/osfile.jsm", {});

const PORT = 8099;
const URL = `http://localhost:${PORT}/dummy.html`;
const OTHER_URL = `http://localhost:${PORT}/other-dummy.html`;

let SRV;
let DUMMY_DOM;
let OTHER_DUMMY_DOM;

// Compare two strings ignoring all the blank spaces
function contentCompare(stringA, stringB) {
  return stringA.replace(/[\s]+/g, "") === stringB.replace(/[\s]+/g, "");
}

exports["test DOM fetching when tab closed"] = function(assert, done) {
  let domFetcher = new DOMFetcher((message)=> {
    assert.equal(message.data.type, "document-content", "the message received have the right type");
    assert.ok(contentCompare(message.data.data.data, DUMMY_DOM), "fetched DOM should be equal to the url content");
    domFetcher.uninit();
    done();
  });
  tabs.once("ready", tab => tab.close());
  tabs.open({url: URL});
};

exports["test DOM fetching when location change"] = function(assert, done) {
  let openTab;
  let domFetcher = new DOMFetcher((message)=> {
    if (message.data.data.url === URL) {
      assert.ok(contentCompare(message.data.data.data, DUMMY_DOM), "fetched DOM should be equal to the first url content.");
      setTimeout(()=>openTab.close(), 500);
    } else {
      assert.equal(message.data.data.url, OTHER_URL, "the message passes the correct url.");
      assert.ok(contentCompare(message.data.data.data, OTHER_DUMMY_DOM), "fetched DOM should be equal to the second url content.");
      domFetcher.uninit();
      done();
    }
  });
  tabs.once("ready", (tab)=> {
    openTab = tab;
    tab.url = OTHER_URL;
  });
  tabs.open({url: URL});
};

before(exports, function*() {
  let encodedText = yield OS.File.read("test/resources/dummy.html");
  const decoder = new TextDecoder();
  DUMMY_DOM = decoder.decode(encodedText);

  encodedText = yield OS.File.read("test/resources/other-dummy.html");
  OTHER_DUMMY_DOM = decoder.decode(encodedText);

  SRV = httpd.startServerAsync(PORT, null, doGetFile("test/resources"));
});

after(exports, function*(name, assert) {
  yield new Promise(resolve => {
    SRV.stop(() => {
      resolve();
    });
  });
});

test.run(exports);
