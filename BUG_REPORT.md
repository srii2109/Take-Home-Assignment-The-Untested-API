# Bug Report: The Untested API

This document details the bugs identified during testing of the Task Manager API codebase. Each bug report includes the location in the code, why it occurs, expected vs. actual behavior, how it was discovered via tests, and the proposed fix.

---

## Summary of Bugs Identified

| ID | Severity | Component | Summary |
|---|---|---|---|
| **BUG-01** | High | `taskService.js` | 1-indexed pagination calculates incorrect offset, skipping page 1 items |
| **BUG-02** | High | `taskService.js` | `completeTask` overwrites task priority to `'medium'` |
| **BUG-03** | Medium | `taskService.js` | Status filter uses substring search (`includes`) instead of exact match |
| **BUG-04** | High | `validators.js` | `validateCreateTask` and `validateUpdateTask` crash with `TypeError` on null/missing body |
| **BUG-05** | Medium | `taskService.js` | `update` allows modifying immutable fields (`id`, `createdAt`) |
| **BUG-06** | Low | `routes/tasks.js` | `GET /tasks` query does not allow combining `status` filter with pagination |

---

## Detailed Bug Reports

### BUG-01: Pagination Off-By-One / 1-Index Offset Error

- **Location:** `src/services/taskService.js` (lines 11–14) & `src/routes/tasks.js` (lines 19–24)
- **Code:**
  ```javascript
  const getPaginated = (page, limit) => {
    const offset = page * limit;
    return tasks.slice(offset, offset + limit);
  };
  ```
- **Why it happens:**
  The route layer parses query parameters using 1-based indexing (`const pageNum = parseInt(page) || 1;`), where page 1 is expected to return the first page of results. In `taskService.getPaginated`, `offset` is calculated as `page * limit`. For `page = 1` and `limit = 10`, `offset` equals `10`. As a result, the first 10 items (indexes 0 to 9) are completely skipped. The first page of items can never be fetched via the pagination endpoint.
- **Expected Behavior:**
  Requesting `GET /tasks?page=1&limit=2` should return items at index 0 and 1 (the first 2 tasks).
- **Actual Behavior:**
  Requesting `GET /tasks?page=1&limit=2` returns items starting from index 2 ("Task 3" and "Task 4"), omitting "Task 1" and "Task 2".
- **How Discovered:**
  - Unit test: `TaskService Unit Tests > getPaginated > should return the first page of results (page 1, limit 2)`
  - Integration test: `Tasks API Integration Tests > GET /tasks > should paginate tasks with page and limit (page=1, limit=2)`
- **Proposed Fix:**
  Change offset calculation to account for 1-based indexing and ensure page is at least 1:
  ```javascript
  const getPaginated = (page, limit) => {
    const pageNum = Math.max(1, page);
    const limitNum = Math.max(1, limit);
    const offset = (pageNum - 1) * limitNum;
    return tasks.slice(offset, offset + limitNum);
  };
  ```

---

### BUG-02: `completeTask` Unconditionally Overwrites Priority to `'medium'`

- **Location:** `src/services/taskService.js` (lines 67–72)
- **Code:**
  ```javascript
  const updated = {
    ...task,
    priority: 'medium',
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```
- **Why it happens:**
  When `completeTask(id)` creates the updated task object, it hardcodes `priority: 'medium'`. This erases the task's original priority (`'high'` or `'low'`).
- **Expected Behavior:**
  Marking a task as complete should only update `status` to `'done'` and set `completedAt` to the current ISO timestamp. The task's priority and other metadata should remain unchanged.
- **Actual Behavior:**
  A task with `priority: 'high'` has its priority reset to `'medium'` upon completion.
- **How Discovered:**
  - Unit test: `TaskService Unit Tests > completeTask > should preserve existing priority when completing task`
  - Integration test: `Tasks API Integration Tests > PATCH /tasks/:id/complete > should mark existing task as done with completedAt timestamp and return 200`
- **Proposed Fix:**
  Remove `priority: 'medium'` from the update object in `completeTask`:
  ```javascript
  const updated = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```

---

### BUG-03: Substring Match Instead of Exact Match in `getByStatus`

- **Location:** `src/services/taskService.js` (line 9)
- **Code:**
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
  ```
- **Why it happens:**
  `t.status.includes(status)` performs a substring search rather than an exact match. Any status string that happens to be a substring of another status will return unintended tasks. For example, `status=do` matches both `todo` and `done`. Querying `status=o` matches all three statuses (`todo`, `in_progress`, and `done`).
- **Expected Behavior:**
  Filtering by status should return only tasks whose status strictly matches the provided status string (`t.status === status`).
- **Actual Behavior:**
  Partial substrings return tasks across multiple different statuses.
- **How Discovered:**
  - Unit test: `TaskService Unit Tests > getByStatus > should only match exact status and not substring matches`
- **Proposed Fix:**
  Replace `.includes()` with exact comparison:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status === status);
  ```

---

### BUG-04: Unhandled `TypeError` on Missing or Null Request Body in Validators

- **Location:** `src/utils/validators.js` (lines 4–6 and 20–22)
- **Code:**
  ```javascript
  const validateCreateTask = (body) => {
    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
  ...
  const validateUpdateTask = (body) => {
    if (body.title !== undefined && ...) {
  ```
- **Why it happens:**
  The validation functions assume `body` is always a defined object. If a client sends a request without a body, without a `Content-Type: application/json` header, or with a JSON `null` literal, `body` is `undefined` or `null`. Evaluating `!body.title` or `body.title !== undefined` throws `TypeError: Cannot read properties of null/undefined (reading 'title')`. This crashes into Express's generic 500 error handler instead of returning a clean 400 Bad Request.
- **Expected Behavior:**
  Requests with a missing or non-object body should return a 400 Bad Request error stating that a valid JSON request body is required.
- **Actual Behavior:**
  The server throws an uncaught `TypeError` and returns a 500 Internal Server Error.
- **How Discovered:**
  - Unit test: `Validators Unit Tests > validateCreateTask > should handle null or non-object body without throwing an uncaught exception`
  - Unit test: `Validators Unit Tests > validateUpdateTask > should handle null or non-object body without throwing an uncaught exception`
- **Proposed Fix:**
  Add a guard at the beginning of each validator:
  ```javascript
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'request body must be a valid JSON object';
  }
  ```

---

### BUG-05: Immutable Fields (`id`, `createdAt`) Can Be Overwritten in `update`

- **Location:** `src/services/taskService.js` (lines 46–53)
- **Code:**
  ```javascript
  const update = (id, fields) => {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const updated = { ...tasks[index], ...fields };
    tasks[index] = updated;
    return updated;
  };
  ```
- **Why it happens:**
  `fields` is directly spread over `tasks[index]`. If the client passes `{ id: 'new-id', createdAt: 'invalid' }`, these core identifiers are overwritten.
- **Expected Behavior:**
  Internal, system-managed fields such as `id` and `createdAt` must be immutable and ignored during updates.
- **Actual Behavior:**
  A client can overwrite task IDs and creation timestamps.
- **How Discovered:**
  - Unit test: `TaskService Unit Tests > update > should not allow overwriting task id or createdAt`
- **Proposed Fix:**
  Destructure and strip protected fields before applying updates:
  ```javascript
  const update = (id, fields) => {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...allowedFields } = fields;
    const updated = { ...tasks[index], ...allowedFields };
    tasks[index] = updated;
    return updated;
  };
  ```

---

### BUG-06: Inability to Combine `status` Filter with Pagination in `GET /tasks`

- **Location:** `src/routes/tasks.js` (lines 14–24)
- **Code:**
  ```javascript
  if (status) {
    const tasks = taskService.getByStatus(status);
    return res.json(tasks);
  }

  if (page !== undefined || limit !== undefined) {
    ...
  ```
- **Why it happens:**
  The route uses early returns for `status` filtering and pagination independently. If both are passed (e.g. `GET /tasks?status=todo&page=1&limit=5`), the `status` branch executes and returns all todo tasks, completely ignoring `page` and `limit`.
- **Expected Behavior:**
  Query filters should be combinable so clients can paginate filtered results.
- **Actual Behavior:**
  Passing `status` disables pagination.
- **Proposed Fix:**
  Refactor query handling so filtering by status is applied first, followed by pagination if requested.
