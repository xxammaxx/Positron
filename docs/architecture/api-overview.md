---
title: Positron API Overview
date: 2026-06-27
author: Positron Team
---

# Positron — API Overview

> **Note:** This document catalogs the current API endpoints as of the latest sync. Full expansion of Issue #229 and #243 endpoints is tracked separately in [Issue #251](https://github.com/xxammaxx/Positron/issues/251).

All routes are served by the Express server under `/api`. The current implementation does not enforce application-level authentication; access is expected to be protected by deployment controls.

## Common response notes

- Validation failures return `400` with `{ error: 'VALIDATION_ERROR', message: string }` for the affected endpoints.
- Missing resources return `404` with `{ error: 'Not found' }` or a similar message.
- State conflicts on run control return `409`.
- Adapter/streaming failures may surface as `500` or as a JSON error payload from the Express error handler.

## POST `/api/repos`

- **Method:** `POST`
- **Path:** `/api/repos`
- **Description:** Register a repository for orchestration.
- **Request body:**

```json
{ "owner": "octo-org", "name": "repo-name" }
```

- **Response:**

```json
{ "id": "repo-1", "status": "registered", "mode": "fake" }
```

- **Error codes:** `400` validation error.

## GET `/api/repos/:id/issues`

- **Method:** `GET`
- **Path:** `/api/repos/:id/issues`
- **Description:** List open issues for the configured repository.
- **Request body:** none.
- **Response:**

```json
{ "issues": [] }
```

- **Notes:** `:id` is currently a route placeholder; the handler reads the repository from runtime configuration.
- **Error codes:** `500` adapter/runtime error.

## POST `/api/repos/:repoId/runs`

- **Method:** `POST`
- **Path:** `/api/repos/:repoId/runs`
- **Description:** Start a new run for the given issue number.
- **Request body:**

```json
{ "issueNumber": 42, "autonomyLevel": 2 }
```

- **Response:**

```json
{
  "run": {},
  "events": [],
  "eventCount": 0
}
```

- **Error codes:** `400` validation error.

## GET `/api/runs`

- **Method:** `GET`
- **Path:** `/api/runs`
- **Description:** List all persisted runs.
- **Request body:** none.
- **Response:**

```json
{ "runs": [] }
```

- **Error codes:** none expected beyond server failure.

## GET `/api/runs/:id`

- **Method:** `GET`
- **Path:** `/api/runs/:id`
- **Description:** Get a single run and its events.
- **Request body:** none.
- **Response:**

```json
{ "run": {}, "events": [] }
```

- **Error codes:** `404` when the run does not exist.

## GET `/api/runs/:id/events/stream`

- **Method:** `GET`
- **Path:** `/api/runs/:id/events/stream`
- **Description:** Server-Sent Events stream for live run updates.
- **Request body:** none.
- **Response:** `text/event-stream` with:
  - `initial` event containing `{ run, events }`
  - `run-event` events for newly persisted run events
  - keepalive comments every 15 seconds
- **Error codes:** `404` if the run is missing.

## GET `/api/health`

- **Method:** `GET`
- **Path:** `/api/health`
- **Description:** Basic server health check.
- **Request body:** none.
- **Response:**

```json
{ "status": "ok", "runs": 0 }
```

- **Error codes:** none expected beyond server failure.

## GET `/api/adapters/health`

- **Method:** `GET`
- **Path:** `/api/adapters/health`
- **Description:** Report adapter availability and mode.
- **Request body:** none.
- **Response:**

```json
{
  "github": { "available": true, "mode": "fake" },
  "specKit": {},
  "openCode": {}
}
```

- **Error codes:** returns `{ "error": "..." }` on internal adapter-check failures.

## POST `/api/demo/blueprint`

- **Method:** `POST`
- **Path:** `/api/demo/blueprint`
- **Description:** Start a demo run from a blueprint markdown string.
- **Request body:**

```json
{ "blueprint": "# Blueprint", "issueNumber": 56 }
```

- **Response:**

```json
{ "run": {}, "message": "Blueprint run started", "blueprint": "# Blueprint" }
```

- **Error codes:** `400` if `blueprint` is missing or `issueNumber` is invalid.

## GET `/api/demo/blueprint/:runId`

- **Method:** `GET`
- **Path:** `/api/demo/blueprint/:runId`
- **Description:** Retrieve the stored blueprint payload for a demo run.
- **Request body:** none.
- **Response:**

```json
{ "blueprint": "# Blueprint", "runId": "..." }
```

- **Error codes:** `404` if no blueprint event exists for the run.

## GET `/api/safety`

- **Method:** `GET`
- **Path:** `/api/safety`
- **Description:** Show current safety-gate switches.
- **Request body:** none.
- **Response:**

```json
{
  "enableMerge": false,
  "mergeDryRun": true,
  "enablePush": false,
  "killSwitch": true,
  "enableFixLoop": false
}
```

- **Error codes:** none expected beyond server failure.

## GET `/api/runs/:id/merge-status`

- **Method:** `GET`
- **Path:** `/api/runs/:id/merge-status`
- **Description:** Return merge readiness and blocking reasons.
- **Request body:** none.
- **Response:**

```json
{
  "enabled": false,
  "killSwitch": true,
  "dryRun": true,
  "runStatus": "active",
  "hasTestEvidence": true,
  "branch": "positron/issue-42-demo",
  "canMerge": false,
  "blockedReasons": ["Kill-Switch active"]
}
```

- **Error codes:** `404` if the run does not exist.

## POST `/api/runs/:id/control`

- **Method:** `POST`
- **Path:** `/api/runs/:id/control`
- **Description:** Pause, abort, resume, or retry a run.
- **Request body:**

```json
{ "action": "pause" }
```

- **Valid actions:** `pause`, `abort`, `resume`, `retry`
- **Response:**

```json
{ "ok": true, "action": "pause", "runId": "..." }
```

- **Error codes:** `400` invalid action, `404` run not found, `409` invalid state transition.
