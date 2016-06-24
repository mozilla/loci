"use strict";

const {WorkerTask, TASK_NEW, TASK_WORKING, TASK_DONE} = require("lib/task-queue/WorkerTask");
const {Storage} = require("lib/task-queue/Storage");

const taskOptions = {
  pageUrl: "https://foo.bar",
  type: "fts",
};

exports["test Task status setting"] = function(assert) {
  let task = new WorkerTask(taskOptions.pageUrl, taskOptions.type);
  assert.equal(task.status, TASK_NEW, "Task created with new status");
  task.status = TASK_WORKING;
  assert.equal(task.status, TASK_WORKING, "Task status changed");
  task.status = TASK_DONE;
  assert.equal(task.status, TASK_DONE, "Task status changed");
};

exports["test Task invalid status setting throws"] = function(assert) {
  let task = new WorkerTask(taskOptions.pageUrl, taskOptions.type);
  assert.throws(()=> task.status = "not a valid status", /Invalid task status/, "Invalid task status throws.");
};

exports["test Task job started"] = function(assert) {
  let task = new WorkerTask(taskOptions.pageUrl, taskOptions.type);
  assert.equal(task.jobStartedAt, null, "New task job started time is null.");
  assert.equal(task.status, TASK_NEW, "Task created with new status");
  task.jobStarted();
  assert.ok(()=> task.jobStartedAt <= Date.now() && task.jobStartedAt > task.createdAt,
            "Task job started time assigned.");
  assert.equal(task.status, TASK_WORKING, "Task status is now working.");
};

exports["test Task serialization and deserialization"] = function(assert) {
  let fullTask = {
    id: 1,
    pageUrl: "https://foo.bar",
    createdAt: Date.now() - 3600,
    jobStartedAt: Date.now(),
    status: "new",
    type: "fts",
  };

  // Creates a new task from the fullTask object
  let task = WorkerTask.fromObject(fullTask);

  // Serializes the task and compare to the serialized fullTask
  let serializedTask = JSON.stringify(task);
  assert.equal(serializedTask, JSON.stringify(fullTask), "Serialized task is equal to serialized origin object");

  // Creates a new copy of the task from the serialized version and compares to the original one
  assert.deepEqual(WorkerTask.fromObject(JSON.parse(serializedTask)), task, "Task serialized and then deserialized have the same values");
};

exports["test save task"] = function*(assert) {
  // Initialize the database
  let storage = new Storage();
  yield storage.asyncCreateTables();

  // Create new task and saves it
  let task = new WorkerTask(taskOptions.pageUrl, taskOptions.type);
  yield task.save();
  assert.ok(task.id, "Task has an id assigned to it.");

  // Get the saved task from the database and compare to the original one.
  let savedTask = yield WorkerTask.asyncGetById(task.id);
  assert.deepEqual(task, savedTask, "Saved task was recovered");

  // Changes the task and save it again
  task.jobStarted();
  yield task.save();

  // Get the changed task from the database and compare it again
  savedTask = yield WorkerTask.asyncGetById(task.id);
  assert.deepEqual(task, savedTask, "Modified saved task was recovered");

  // Drops the database and closes the connection
  yield storage.asyncDropTables();
  yield storage.asyncCloseConnection();
};

require("sdk/test").run(exports);
