/* globals Task */
"use strict";

const {before, after} = require("sdk/test/utils");
const {Storage} = require("lib/task-queue/Storage.js");
const {Cu} = require("chrome");

Cu.import("resource://gre/modules/Task.jsm");

let STORAGE;

exports["test that tables are created"] = function*(assert) {
  let tableCheckSQL = "SELECT name FROM sqlite_master WHERE type='table' AND name=:name";
  let pagesTable = yield STORAGE.asyncExecuteCached("check pages table existence", tableCheckSQL, {
    params: {name: "moz_pages"}
  });
  assert.ok(pagesTable.length, "Found a moz_pages table");

  let tasksTable = yield STORAGE.asyncExecuteCached("check tasks table existence", tableCheckSQL, {
    params: {name: "moz_tasks"}
  });
  assert.ok(tasksTable.length, "Found a moz_tasks table");
};

exports["test inserting, selecting and deleting a page"] = function*(assert) {
  const insertPage = `INSERT INTO moz_pages (url, path, expiry, createdAt, remote)
                      VALUES (:url, :path, :expiry, :createdAt, :remote);`;
  const deletePage = "DELETE FROM moz_pages WHERE url = :url;";

  let requestPage = Task.async(function*(url) {
    const selectPage = "SELECT url, path, expiry, createdAt, remote FROM moz_pages WHERE url = :url;";
    return yield STORAGE.asyncExecuteCached("select page", selectPage, {
      columns: ["url", "path", "expiry", "createdAt", "remote"],
      params: {url},
    });
  });

  let params = {
    url: "http://foo.bar",
    path: "1234",
    expiry: 1467225044,
    createdAt: null,
    remote: 0};

  let page = yield requestPage(params.url);
  assert.equal(page.length, 0, "The table is empty.");

  yield STORAGE.asyncExecuteCached("insert pages", insertPage, {params});
  page = yield requestPage(params.url);

  assert.equal(page.length, 1, "The table has 1 entry.");
  assert.deepEqual(page, [params], "Selected page is equal to the inserted one.");

  yield STORAGE.asyncExecuteCached("delete page", deletePage, {params: {url: params.url}});
  page = yield requestPage(params.url);
  assert.equal(page.length, 0, "The table is empty again.");
};

exports["test inserting, selecting and deleting a task"] = function*(assert) {
  const insertTask = `INSERT INTO moz_tasks (id, pageUrl, createdAt, jobStartedAt, status, type)
                      VALUES (:id, :pageUrl, :createdAt, :jobStartedAt, :status, :type);`;
  const deleteTask = "DELETE FROM moz_tasks WHERE id = :id;";

  let requestTask = Task.async(function*(id) {
    const selectTask = "SELECT id, pageUrl, createdAt, jobStartedAt, status, type FROM moz_tasks WHERE id = :id;";
    return yield STORAGE.asyncExecuteCached("select task", selectTask, {
      columns: ["id", "pageUrl", "createdAt", "jobStartedAt", "status", "type"],
      params: {id},
    });
  });
  let params = {
    id: 1,
    pageUrl: "http://foo.bar",
    createdAt: 1467225044,
    jobStartedAt: null,
    status: "new",
    type: "metadata"
  };

  let task = yield requestTask(params.id);
  assert.equal(task.length, 0, "The table is empty.");

  yield STORAGE.asyncExecuteCached("insert tasks", insertTask, {params});
  task = yield requestTask(params.id);

  assert.equal(task.length, 1, "The table has 1 entry.");
  assert.deepEqual(task, [params], "Selected task is equal to the inserted one.");

  yield STORAGE.asyncExecuteCached("delete task", deleteTask, {params: {id: params.id}});
  task = yield requestTask(params.url);
  assert.equal(task.length, 0, "The table is empty again.");
};

before(exports, function*() {
  STORAGE = new Storage();
  yield STORAGE.asyncCreateTables();
});

after(exports, function*() {
  yield STORAGE.asyncDropTables();
  yield STORAGE.asyncCloseConnection();
});

require("sdk/test").run(exports);
