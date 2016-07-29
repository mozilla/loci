/* globals Task */
"use strict";

const {Cu} = require("chrome");

const {Page, DEFAULT_MAX_AGE} = require("lib/task-queue/Page");
const {Storage} = require("lib/task-queue/Storage");

Cu.import("resource://gre/modules/Task.jsm");

const TEST_URLS = [
  "https://foo.bar",
  "https://bar.foo",
  "http://foo.bar",
  "https://example.com",
  "https://www.example.com",
  "https://example.com/page1",
  "https://example.com/page2",
  "https://example.com?query=true",
];

exports["test instantiation"] = function(assert) {
  assert.throws(()=>new Page({}), /URL must be defined/, "Page needs at least an url to be instantiated");
};

exports["test page immutable"] = function(assert) {
  let page = new Page({url: TEST_URLS[0]});
  assert.throws(()=>page.url = null, /TypeError/, "Page is immutable");
  assert.throws(()=>page.maxAge = 1000, /TypeError/, "Page is immutable");
  assert.throws(()=>page.remote = true, /TypeError/, "Page is immutable");
  assert.throws(()=>page.createdAt = Date.now(), /TypeError/, "Page is immutable");
};

exports["test Page serialization"] = function(assert) {
  let fullPage = {
    url: "https://foo.bar",
    path: "62b89db0-01ca-0f45-bd67-947e9fa93677",
    maxAge: DEFAULT_MAX_AGE,
    remote: false,
    createdAt: Date.now(),
  };

  // Creates a new page
  let page = new Page(fullPage);

  // Serializes the page and compare to the serialized fullPage
  let serializedPage = JSON.stringify(page);
  assert.equal(serializedPage, JSON.stringify(fullPage), "Serialized page is equal to serialized origin object");
};

exports["test save page"] = function*(assert) {
  // Initialize the database
  let storage = new Storage();
  yield storage.asyncCreateTables();

  // Create new page and saves it
  let page = new Page({url: TEST_URLS[0]});
  yield page.save();

  // Get the saved page from the database and compare to the original one.
  let savedPage = yield Page.asyncGetByUrl(page.url);
  assert.deepEqual(page, savedPage, "Saved page was recovered");

  // Drops the database and closes the connection
  yield storage.asyncDropTables();
  yield storage.asyncCloseConnection();
};

exports["test saving multiple pages and getting each one"] = function*(assert) {
  // Initialize the database
  let storage = new Storage();
  yield storage.asyncCreateTables();

  let savePromises = [];
  TEST_URLS.map(function(url) {
    let page = new Page({url});
    savePromises.push(page.save());
  });

  yield Promise.all(savePromises);

  let size = yield storage.asyncExecuteCached("check size", "SELECT count(*) FROM moz_pages");
  assert.equal(size[0][0], TEST_URLS.length, "table size is correct");

  let promises = TEST_URLS.map(Task.async(function*(url) {
    let page = yield Page.asyncGetByUrl(url);
    assert.ok(page instanceof Page, "Returned a page");
  }));

  yield Promise.all(promises);

  // Drops the database and closes the connection
  yield storage.asyncDropTables();
  yield storage.asyncCloseConnection();
};

require("sdk/test").run(exports);
