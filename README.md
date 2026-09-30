# Task Manager API — Complete Solution

[![Tests](https://img.shields.io/badge/tests-81%20passed%20%2F%200%20failed-brightgreen)](tests)
[![Coverage](https://img.shields.io/badge/coverage-98.75%25%20statements-brightgreen)](coverage)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-blue)](package.json)

A fully tested, hardened Express.js Task Management REST API built as part of the take-home engineering assignment. 

This repository contains:
- **Comprehensive Test Suite**: 81 automated tests achieving **98.75% statement coverage** (100% on routes, services, and validators).
- **Bug Discovery & Reports**: 6 identified and documented bugs with root-cause analysis (see [BUG_REPORT.md](./BUG_REPORT.md)).
- **Bug Fixes**: Resolved critical issues including the pagination offset calculation, priority erasure on task completion, substring status filtering, and validator crashes on non-object bodies.
- **New Feature**: Implemented `PATCH /tasks/:id/assign` with input validation, whitespace normalization, reassignment support, and full test coverage.
- **Production Review**: Architectural notes, test expansion roadmap, and production readiness questions (see [SUBMISSION.md](./SUBMISSION.md)).

---

## Table of Contents

- [Getting Started](#getting-started)
- [Running Tests & Coverage](#running-tests--coverage)
- [API Reference](#api-reference)
  - [Endpoints](#endpoints)
  - [Task Data Shape](#task-data-shape)
  - [Sample cURL Requests](#sample-curl-requests)
- [Test Suite & Coverage Report](#test-suite--coverage-report)
- [Bugs Identified & Fixes](#bugs-identified--fixes)
- [New Feature: Assign Task](#new-feature-assign-task)
- [Engineering Reflections & Production Readiness](#engineering-reflections--production-readiness)

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation & Starting Server

```bash
# Navigate to the API directory
cd task-api

# Install dependencies
npm install

# Start the server (runs on http://localhost:3000)
npm start
```

> **Note:** The data store is in-memory and resets when the process restarts.

---

## Running Tests & Coverage

The test suite contains 81 tests covering unit logic and HTTP integration paths.

```bash
cd task-api

# Run test suite
npm test

# Run tests with Jest code coverage report
npm run coverage
```

---

## API Reference

### Endpoints

| Method | Path | Description | Status Codes |
|---|---|---|---|
| `GET` | `/tasks` | List all tasks. Supports `?status=`, `?page=`, `?limit=` | `200`, `500` |
| `GET` | `/tasks/stats` | Counts by status (`todo`, `in_progress`, `done`) + overdue count | `200` |
| `POST` | `/tasks` | Create a new task | `201`, `400` |
| `PUT` | `/tasks/:id` | Update an existing task | `200`, `400`, `404` |
| `DELETE` | `/tasks/:id` | Delete a task | `204`, `404` |
| `PATCH` | `/tasks/:id/complete` | Mark task status as `done` and set `completedAt` | `200`, `404` |
| `PATCH` | `/tasks/:id/assign` | **Assign a task to a user** *(New Feature)* | `200`, `400`, `404` |

---

### Task Data Shape

```json
{
  "id": "c1f71df4-0518-4dc0-8433-4f9cf2e42f60",
  "title": "Write unit tests",
  "description": "Ensure 80%+ coverage",
  "status": "todo",
  "priority": "high",
  "dueDate": "2026-10-15T18:00:00.000Z",
  "assignee": "Jane Developer",
  "completedAt": null,
  "createdAt": "2026-09-30T08:00:00.000Z"
}
```

- **`status`**: `"todo"` | `"in_progress"` | `"done"` (default: `"todo"`)
- **`priority`**: `"low"` | `"medium"` | `"high"` (default: `"medium"`)
- **`assignee`**: `string | null` (default: `null`)
- **`dueDate`**: ISO 8601 string or `null`
- **`completedAt`**: ISO 8601 string or `null`

---

### Sample cURL Requests

#### 1. Create a task
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Audit dependencies",
    "priority": "high",
    "dueDate": "2026-10-30T00:00:00.000Z"
  }'
```

#### 2. List tasks with filtering and pagination
```bash
# Filter by status and paginate
curl "http://localhost:3000/tasks?status=todo&page=1&limit=5"
```

#### 3. Assign a task to a user
```bash
curl -X PATCH http://localhost:3000/tasks/<TASK_ID>/assign \
  -H "Content-Type: application/json" \
  -d '{"assignee": "Srikari Maddikunta"}'
```

#### 4. Complete a task
```bash
curl -X PATCH http://localhost:3000/tasks/<TASK_ID>/complete
```

#### 5. Retrieve statistics
```bash
curl http://localhost:3000/tasks/stats
```

---

## Test Suite & Coverage Report

The automated test suite is located in [`task-api/tests`](./task-api/tests):
- [`tests/unit/taskService.test.js`](./task-api/tests/unit/taskService.test.js): Verifies data manipulation, boundary conditions, filtering, pagination logic, and state transitions.
- [`tests/unit/validators.test.js`](./task-api/tests/unit/validators.test.js): Verifies validation logic, type checks, missing fields, whitespace trimming, and malformed request bodies.
- [`tests/integration/tasks.test.js`](./task-api/tests/integration/tasks.test.js): End-to-end integration tests using Supertest covering all HTTP methods, query string parameter combinations, error handlers, and persistence.

### Jest Coverage Summary

```text
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   98.75 |    97.05 |   96.66 |   98.63 |                   
 src             |   84.61 |       75 |      50 |   84.61 |                   
  app.js         |   84.61 |       75 |      50 |   84.61 | 17-18 (listener)  
 src/routes      |     100 |    95.83 |     100 |     100 |                   
  tasks.js       |     100 |    95.83 |     100 |     100 |                   
 src/services    |     100 |       95 |     100 |     100 |                   
  taskService.js |     100 |       95 |     100 |     100 |                   
 src/utils       |     100 |      100 |     100 |     100 |                   
  validators.js  |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------

Test Suites: 3 passed, 3 total
Tests:       81 passed, 81 total
```

---

## Bugs Identified & Fixes

Full root-cause details and reproduction tests are documented in [BUG_REPORT.md](./BUG_REPORT.md).

| Bug ID | Severity | File | Issue Summary | Status |
|---|---|---|---|---|
| **BUG-01** | High | `taskService.js` | 1-indexed pagination offset `offset = page * limit` skipped items 0–9 for page 1 | **Fixed** |
| **BUG-02** | High | `taskService.js` | `completeTask` unconditionally reset task priority to `'medium'` | **Fixed** |
| **BUG-03** | Medium | `taskService.js` | `getByStatus` used `.includes(status)` substring search instead of exact match | **Fixed** |
| **BUG-04** | High | `validators.js` | `validateCreateTask`/`validateUpdateTask` threw unhandled `TypeError` on null/missing body | **Fixed** |
| **BUG-05** | Medium | `taskService.js` | `update` allowed client overrides of immutable system fields (`id`, `createdAt`) | **Fixed** |
| **BUG-06** | Low | `routes/tasks.js` | Query handling ignored pagination parameters whenever `?status=` was passed | **Fixed** |

### Fix Highlight: BUG-01 (Pagination Offset Calculation)
- **Problem**: In 1-indexed pagination, requesting `page=1, limit=10` calculated `offset = 1 * 10 = 10`, slicing elements 10 through 19 and completely skipping the first page of items.
- **Solution**: Updated to `offset = (pageNum - 1) * limitNum` with `Math.max(1, ...)` boundaries:
  ```javascript
  const getPaginated = (page, limit) => {
    const pageNum = Math.max(1, page);
    const limitNum = Math.max(1, limit);
    const offset = (pageNum - 1) * limitNum;
    return tasks.slice(offset, offset + limitNum);
  };
  ```

---

## New Feature: Assign Task

### Specification
```http
PATCH /tasks/:id/assign
Content-Type: application/json

{
  "assignee": "Jane Developer"
}
```

### Design Decisions
1. **Validation**:
   - `assignee` must be provided, must be a string, and cannot be an empty string or whitespace only.
   - Surrounding whitespace is automatically trimmed.
   - Non-string or missing values return `400 Bad Request`.
2. **Re-assignment**:
   - If a task is already assigned, assigning it again replaces the existing assignee with the new one. This matches real-world issue tracker workflows (e.g., Jira, Linear) where task ownership shifts.
3. **404 Handling**:
   - Returns `404 Not Found` with `{ "error": "Task not found" }` if the target task ID does not exist.
4. **Data Model**:
   - Initialized with `assignee: null` on task creation.

---

## Engineering Reflections & Production Readiness

### What to test next with more time
- **Concurrency & Race Conditions**: In a database-backed system with concurrent workers, simultaneous updates (e.g. concurrent `assign` and `complete` calls) require optimistic locking (`version` column or `ETag` headers) or transactional isolation.
- **High-Volume Stress Testing**: Benchmark API performance and pagination under large datasets (100,000+ tasks) using tools like k6 or Artillery.
- **ISO 8601 & Timezone Edge Cases**: Fuzz test timestamp formats (leap years, daylight saving time shifts, mixed UTC offsets) to ensure overdue task evaluation remains accurate worldwide.
- **Security Protections**: Enforce request body size limits (`express.json({ limit: '10kb' })`) and safeguard against prototype pollution vulnerabilities on object spread operations.

### Surprises in the codebase
- **Hardcoded Priority Reset**: `completeTask` explicitly overwrote `priority: 'medium'`, which looked like an inadvertent copy-paste artifact from creation defaults.
- **No `GET /tasks/:id`**: `findById` existed in `taskService.js`, but no individual item retrieval route was defined.
- **Documentation Discrepancy**: The original `README.md` listed status options as `pending | in-progress | completed`, while the validator and assignment brief used `todo | in_progress | done`.

### Questions to ask before shipping to production
1. **Persistence & Database**: What database (PostgreSQL, MongoDB, DynamoDB) will replace the in-memory array, and what indexes should be created (`status`, `dueDate`, `createdAt`)?
2. **Authentication & Authorization**: Who is authorized to assign, modify, or complete tasks? Do tasks belong to workspaces or individual owners?
3. **Audit Logging**: Is an audit trail required for compliance to track who changed task status or assignment?
4. **Unassign Capability**: Should the API support explicitly unassigning tasks (e.g., `DELETE /tasks/:id/assign` or `{ "assignee": null }`)?
5. **Rate Limiting**: What rate-limiting thresholds should be applied per IP/token to guard against DoS?

---

## License

This project was completed for the Take-Home Engineering Assignment.
