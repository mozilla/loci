/* globals XPCOMUtils, OS, Sqlite, Task */
"use strict";

const {Cu} = require("chrome");

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/osfile.jsm");
Cu.import("resource://gre/modules/Task.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "Sqlite",
                                  "resource://gre/modules/Sqlite.jsm");

const DB_PATH = OS.Path.join(OS.Constants.Path.profileDir, "taskqueue.sqlite");

// SQL for creating the moz_pages table
const CREATE_PAGES_TABLE = `CREATE TABLE moz_pages (
  url LONGVARCHAR PRIMARY KEY,
  path LONGVARCHAR,
  expiry DATE,
  createdAt DATE,
  remote BOOLEAN DEFAULT 0 NOT NULL CHECK (remote IN (0,1))
);`;

// SQL for droping the moz_pages table
const DROP_PAGES_TABLE = "DROP TABLE moz_pages;";

// SQL for creating the moz_tasks table
const CREATE_TASKS_TABLE = `CREATE TABLE moz_tasks (
  id INTEGER PRIMARY KEY ASC,
  pageUrl LONGVARCHAR,
  createdAt INTEGER,
  jobStartedAt INTEGER,
  status LONGVARCHAR,
  type LONGVARCHAR
);`;

// SQL for droping the moz_tasks table
const DROP_TASKS_TABLE = "DROP TABLE moz_tasks;";

class Storage {
  /**
   * Handles database storage needs for the task queue
   */
  constructor() {
    this._conn = null;
  }

  /**
   * Creates the database tables for the job infrastructure
   */
  asyncCreateTables() {
    return Task.spawn((function*() {
      yield this._asyncGetConnection().then((db)=>db.execute(CREATE_PAGES_TABLE));
      yield this._asyncGetConnection().then((db)=>db.execute(CREATE_TASKS_TABLE));
    }).bind(this));
  }

  /**
   * Removes the database tables used for the job infrastructure
   */
  asyncDropTables() {
    return Task.spawn((function*() {
      yield this._asyncGetConnection().then((db)=>db.execute(DROP_PAGES_TABLE));
      yield this._asyncGetConnection().then((db)=>db.execute(DROP_TASKS_TABLE));
    }).bind(this));
  }

  /**
   * Close the connection to the database
   */
  asyncCloseConnection() {
    return Task.spawn((function*() {
      yield this._conn.close();
      this._conn = null;
    }).bind(this));
  }

  /**
   * Executes a SQL query in the database.
   *
   * @param {string} name
   *                 an human readable name for the request
   * @param {string} sql
   *                 the SQL query to execute
   * @param {Object} options
   *                 options to pass to the execution:
   *                   - columns: name of the columns if you want a list of objects returned.
   *                   - params: the sql statement parameters as an object.
   *                   - callback: a callback function to manually handle.
   */
  asyncExecuteCached(name, sql, options = {}) {
    let {columns, params, callback} = options;
    let items = [];

    return this._asyncGetConnection().then((db)=> db.executeBeforeShutdown(name, Task.async(function*(db) {
      yield db.executeCached(sql, params, aRow => {
        try {
          // check if caller wants to handle query raws
          if (callback) {
            callback(aRow);
          }
          // otherwise fill in the item and add items array
          else {
            let item = null;
            // if columns array is given construct an object
            if (columns && Array.isArray(columns)) {
              item = {};
              columns.forEach(column => {
                item[column] = aRow.getResultByName(column);
              });
            } else {
              // if no columns - make an array of raw values
              item = [];
              for (let i = 0; i < aRow.numEntries; i++) {
                item.push(aRow.getResultByIndex(i));
              }
            }
            items.push(item);
          }
        } catch (e) {
          throw new Error(e);
        }
      });
      return items;
    })));
  }

  /**
   * Get a connection to the database and keep it.
   *
   * @return {Promise}
   *                   Returns promise that resolves to the opened connection.
   */
  _asyncGetConnection() {
    return Task.spawn((function*() {
      if (!this._conn) {
        this._conn = yield Sqlite.openConnection({path: DB_PATH});
      }
      return this._conn;
    }).bind(this));
  }
}

exports.Storage = Storage;