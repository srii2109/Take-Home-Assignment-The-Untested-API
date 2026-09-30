# Submission: The Untested API

## Executive Summary

This submission completes the 2-day take-home assignment for the Task Manager API. The codebase has been transitioned from an untested, bug-prone state into a tested, robust service backed by an 81-test suite achieving **98.75% statement coverage**, **97.05% branch coverage**, and **100% line coverage** on core business and route modules.

---

## 1. Test Suite & Coverage Report

The test suite is organized into unit and integration tests:
- `tests/unit/taskService.test.js`: Unit tests for data operations, boundary conditions, and state transitions.
- `tests/unit/validators.test.js`: Unit tests for input validation, edge cases, and type safety.
- `tests/integration/tasks.test.js`: Supertest-driven integration tests covering all HTTP endpoints, status codes, query combinations, and error scenarios.

### Coverage Output (`npm run coverage`)

```text
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   98.75 |    97.05 |   96.66 |   98.63 |                   
 src             |   84.61 |       75 |      50 |   84.61 |                   
  app.js         |   84.61 |       75 |      50 |   84.61 | 17-18             
 src/routes      |     100 |    95.83 |     100 |     100 |                   
  tasks.js       |     100 |    95.83 |     100 |     100 | 17                
 src/services    |     100 |       95 |     100 |     100 |                   
  taskService.js |     100 |       95 |     100 |     100 | 24                
 src/utils       |     100 |      100 |     100 |     100 |                   
  validators.js  |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------

Test Suites: 3 passed, 3 total
Tests:       81 passed, 81 total
Snapshots:   0 total
```
*(Note: Uncovered lines 17–18 in `app.js` represent the `if (require.main === module)` conditional when starting the standalone HTTP listener).*

---

## 2. Bug Reports & Fixes (Part A & Part B)

Full details are documented in [BUG_REPORT.md](./BUG_REPORT.md). Six distinct issues were documented:

1. **BUG-01 (Primary Fix - Pagination Offset Calculation)**:
   - *Problem*: `offset = page * limit` skipped the first 10 items (items 0 to 9) for `page=1, limit=10`.
   - *Fix*: Updated to `offset = (pageNum - 1) * limitNum` with `Math.max(1, ...)` boundaries.
2. **BUG-02 (`completeTask` Priority Reset)**:
   - *Problem*: Completing a task hardcoded `priority: 'medium'`, erasing existing priorities.
   - *Fix*: Preserved the task's existing priority during completion.
3. **BUG-03 (Substring Status Matching)**:
   - *Problem*: `t.status.includes(status)` caused partial queries like `status=do` to match both `todo` and `done`.
   - *Fix*: Replaced with strict equality `t.status === status`.
4. **BUG-04 (Validator Crashes on Null/Undefined Body)**:
   - *Problem*: Missing body or invalid Content-Type threw an unhandled `TypeError` triggering a 500 error.
   - *Fix*: Added guard `if (!body || typeof body !== 'object' || Array.isArray(body))` returning 400 Bad Request.
5. **BUG-05 (Immutable Fields Overwritten in `update`)**:
   - *Problem*: Unsanitized spreading of request body allowed clients to overwrite `id` and `createdAt`.
   - *Fix*: Stripped `id` and `createdAt` before updating.
6. **BUG-06 (Combinability of Status and Pagination Queries)**:
   - *Problem*: Passing `?status=` bypassed pagination logic due to early return.
   - *Fix*: Streamlined query parameter pipeline in `routes/tasks.js`.

---

## 3. New Feature: Assign Task Endpoint (Part C)

### Endpoint Specification
```http
PATCH /tasks/:id/assign
Content-Type: application/json

{
  "assignee": "Jane Doe"
}
```

### Design Decisions & Edge Cases Handled

1. **Validation**:
   - `assignee` must be provided, must be a string, and cannot be empty or purely whitespace.
   - Whitespace is automatically trimmed before storage.
   - Invalid payloads return `400 Bad Request` with descriptive error messages.
2. **Re-assignment**:
   - If a task is already assigned, assigning it again cleanly overwrites the previous assignee with the new assignee. This aligns with standard task workflows (e.g. Jira/Linear) where ownership shifts between team members.
3. **404 Not Found Handling**:
   - If the task does not exist, `404 Not Found` with `{ "error": "Task not found" }` is returned.
4. **Task Model Schema**:
   - Tasks are initialized with `assignee: null` upon creation (`create()`), consistent with `dueDate` and `completedAt`.

---

## 4. Reflections & Production Readiness

### What I would test next with more time
- **Concurrent Request Handling / Race Conditions**: In a database-backed production service, concurrent updates (e.g., competing `completeTask` and `assignTask` calls) require optimistic locking (`version` column or `ETag` headers) or transactional isolation.
- **Large Dataset Performance & Load Testing**: Testing response latencies with 100,000+ tasks under simulated concurrency using k6 or Artillery.
- **Date & Timezone Boundaries**: Thorough fuzz testing for edge-case ISO 8601 strings (e.g. leap years, daylight saving time shifts, mixed UTC offsets) and overdue boundary transitions.
- **Security & Injection Testing**: Fuzzing query parameters, prototype pollution vectors (`__proto__`, `constructor`), and payload size limits.

### Anything that surprised me in the codebase
- **Hardcoded Priority Reset in `completeTask`**: It was interesting to see `priority: 'medium'` explicitly set inside `completeTask`. This was likely an accidental leftover from copy-pasting creation defaults.
- **No `GET /tasks/:id` Endpoint**: While `findById` was implemented in `taskService.js`, there was no corresponding `GET /tasks/:id` route in the API. Only list/filter/pagination endpoints existed.
- **Documentation Mismatch**: `README.md` listed status options as `pending | in-progress | completed`, whereas `ASSIGNMENT.md` and the actual validator code enforced `todo | in_progress | done`.

### Questions I'd ask before shipping this to production
1. **Persistence & Data Storage**: What database will replace the in-memory array (PostgreSQL, MongoDB, DynamoDB)? How should connection pooling and schema migrations be handled?
2. **Authentication & Authorization**: Who can view or modify tasks? Should tasks have an `ownerId` or `organizationId`? Can any user reassign another user's task?
3. **Audit Logging & History**: Do we need to preserve an audit trail (activity log) of who modified, assigned, or completed tasks?
4. **Unassign Capability**: Should the API allow unassigning a task (e.g., `DELETE /tasks/:id/assign` or `{ "assignee": null }`), or is a task permanently assigned once assigned?
5. **Rate Limiting & Input Size Limits**: What are our thresholds for API rate limiting and request body size (`express.json({ limit: '10kb' })`) to guard against DoS vectors?
