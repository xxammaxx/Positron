# ADR-0006: HTTP Cancel with In-Memory Signal Pattern

- **Date:** 2026-05-26
- **Status:** Accepted
- **Deciders:** Positron Architecture Team (reviewed post-impl)
- **Supersedes:** None
- **Implements:** Issue #66 — Live Operations Pass (Cancel/Control)

---

## Context

Positron runs are long-lived (minutes to hours), executing through ~20 phases from `QUEUED` to `DONE`. Users need to be able to cancel a run at any point. The cancellation must be:

1. **Safe:** Cannot corrupt the database or leave the run in an inconsistent state
2. **Idempotent:** Calling cancel on an already-cancelled run must not error
3. **Atomic:** Two concurrent cancel requests must not both succeed
4. **Visible:** Cancellation must be broadcast to all connected SSE clients
5. **Responsive:** The running pipeline must detect and react to cancellation in < 1 second

The existing control endpoint (`POST /api/runs/:id/control`) already supported `action: 'abort'`, but lacked idempotency, atomic DB updates, and SSE broadcast. A dedicated `/cancel` endpoint was added in Issue #66.

The system uses **in-memory signals** (`Map<runId, 'ABORT'|'PAUSE'|'RESUME'|'RETRY'>`) that the pipeline loop polls between phases via `checkRunSignal()`. There is no process-level signal (e.g., POSIX signals or `AbortController`).

---

## Decision

**Cancel via dedicated HTTP POST endpoint with in-memory signal and conditional DB update.**

### Architecture

```
Browser                    Express Server                    Pipeline Loop
  │                            │                                │
  │  POST /runs/:id/cancel     │                                │
  │ ──────────────────────────>│                                │
  │                            │  1. loadRunFromDb(runId)       │
  │                            │  2. idempotent guard           │
  │                            │     status='cancelled' → 200   │
  │                            │  3. status guard               │
  │                            │     only active|blocked → 409  │
  │                            │  4. runSignals.set(ID, ABORT)  │
  │                            │  5. UPDATE runs                │
  │                            │     WHERE status IN(...)       │
  │                            │     → changes=0 means race     │
  │                            │  6. storeEvent()               │
  │                            │  7. broadcastSSE()             │
  │                            │                                │
  │  200 {ok:true, cancelled}  │                                │
  │ <──────────────────────────│                                │
  │                            │                                │
  │                            │                  checkRunSignal()
  │                            │                     ↓
  │                            │              signal === 'ABORT'
  │                            │                     ↓
  │                            │              markFailed(FAILED_BLOCKED)
  │                            │              + broadcastSSE
  │                            │              + return
```

### Layered safety (defense in depth)

| Layer | Mechanism | Protects Against |
|---|---|---|
| 1. Idempotent guard | `status === 'cancelled'` → 200 | Double-submit, browser refresh retry |
| 2. Status guard | Only `active`/`blocked` → 409 | Cancelling terminal runs |
| 3. In-memory signal | `runSignals.set(runId, 'ABORT')` | Tells pipeline to stop between phases |
| 4. Conditional DB UPDATE | `WHERE status IN ('active', 'blocked')` | Race between two cancel requests or cancel vs completion |
| 5. Changes check | `updateResult.changes === 0` → 409 | Race where run finished between guard check and UPDATE |
| 6. Store event + broadcast | `storeEvent()` + `broadcastSSE()` | Visibility to all connected clients |

### The idempotency fix (critical)
The initial implementation had the status guard (`only active/blocked`) **before** the idempotency check. Since `'cancelled'` is neither `'active'` nor `'blocked'`, the guard rejected the request with 409 before the idempotent path could return 200. The fix reordered the checks: **idempotent check first, then status guard**.

```typescript
// CORRECT ORDER (post-fix):
// 1. Idempotent: already cancelled → return 200 (not an error)
if (run.status === 'cancelled') {
  res.json({ ok: true, runId, message: 'Run already cancelled', status: 'cancelled' });
  return;
}
// 2. Status guard: only active/blocked can be cancelled
if (run.status !== 'active' && run.status !== 'blocked') {
  res.status(409).json({ error: `Cannot cancel run with status "${run.status}"...` });
  return;
}
```

```typescript
// WRONG ORDER (pre-fix — dead code path):
// 1. Status guard rejects 'cancelled' with 409
if (run.status !== 'active' && run.status !== 'blocked') {
  res.status(409).json(...); // ← REJECTS 'cancelled' here!
  return;
}
// 2. Idempotent check NEVER REACHED for cancelled runs
if (run.status === 'cancelled') { // ← DEAD CODE
  res.json({ ok: true, ... });
}
```

---

## Alternatives Considered

### Alternative A: WebSocket cancel message
**Pros:**
- No separate HTTP endpoint needed
- Cancel flows through same channel as status updates
- Lower latency (no HTTP request overhead)

**Cons:**
- Cancel is a request/response pattern, not a streaming event — HTTP POST is the natural fit
- Idempotency is harder to enforce over WebSocket (messages are fire-and-forget)
- Requires WebSocket connection to be active — what if it dropped?
- Adds complexity to a unidirectional SSE system

**Verdict:** Rejected — HTTP POST provides idempotency, status codes (200/409/404), and works even if the SSE connection drops.

### Alternative B: Database-only signal (polled by pipeline)
**Pros:**
- Survives server restart (signal stored in DB)
- No in-memory state to manage
- Simpler: no Maps, no signal clearing

**Cons:**
- Pipeline must poll DB every iteration (increasing I/O)
- DB write per signal adds latency
- Signal cleanup (setting back to "none") requires additional writes
- SSE broadcast still needed separately

**Verdict:** Rejected — In-memory signal is faster (no DB I/O on every pipeline iteration) and the restart scenario is acceptable for a dev tool. Production would need DB-backed signals.

### Alternative C: `AbortController` (Node.js native)
**Pros:**
- Standard Node.js cancellation primitive
- Integrates with `fetch()`, timers, and async operations
- Composable (parent/child controllers)

**Cons:**
- Pipeline is synchronous state machine steps, not async I/O — `AbortController` provides no benefit for sync code
- Would require restructuring the pipeline to pass `AbortSignal` through every adapter call
- No benefit over simple flag check in `checkRunSignal()`

**Verdict:** Rejected for now — the pipeline is sync-first with `await` only for adapter calls. An `AbortController` would be useful if the pipeline is refactored to be fully async, but the current `runSignals` Map is adequate.

---

## Consequences

### Positive
- **Defense-in-depth:** 6 layers of protection against edge cases (double-submit, race with completion, cancelled-again)
- **Atomic DB update:** `WHERE status IN ('active', 'blocked')` prevents overwriting a run that just completed or failed
- **Idempotent:** Repeating the cancel request always returns 200 with `{ok: true, message: 'Run already cancelled'}`
- **SSE integration:** Cancellation is broadcast immediately to all connected clients
- **Human-auditable:** Cancel event stored in DB with `level: 'HUMAN'` and phase context

### Negative
- **In-memory signal is ephemeral:** If the server restarts after `runSignals.set(ID, 'ABORT')` but before the pipeline detects it, the signal is lost. The DB status update is durable, but the pipeline may continue executing for one more phase.
- **Manual signal handling:** `checkRunSignal()` is called at specific points in the pipeline loop — if a phase executes for a long time (e.g., 30s `IMPLEMENT`), the abort signal won't be detected until the next iteration.
- **No process-level kill:** The ABORT signal is cooperative — the pipeline checks it voluntarily. An adapter that hangs indefinitely won't be interrupted.
- **Control endpoint confusion:** `POST /control` with `action: 'abort'` and `POST /cancel` both exist. The control endpoint sets the ABORT signal WITHOUT the atomic DB update, idempotency check, or SSE broadcast. This is a correctness gap.

### Migration
- To DB-backed signals: Add a `run_signals` table, write signals there first, then set in-memory. On restart, rehydrate signals from DB.
- To `AbortController`: Create one per run, pass `signal` to all async adapter calls, check `signal.aborted` in the pipeline loop instead of `checkRunSignal()`.
- To unified cancel: Merge `/control` with `action: 'abort'` into `/cancel` — the control endpoint's abort path should either delegate to `/cancel` or be deprecated.

---

## Detailed Design Evaluations

### Control vs Cancel: Should They Be Unified?

**Current state:**
| Endpoint | Actions | Atomic DB Update | Idempotent | SSE Broadcast |
|---|---|---|---|---|
| `POST /cancel` | cancel only | ✅ Conditional WHERE | ✅ | ✅ `run-cancelled` |
| `POST /control` | pause, resume, abort, retry | ❌ None | ❌ | ✅ `run-control` |

**Evaluation:**
The `/control` endpoint with `action: 'abort'` sets the ABORT signal but does NOT:
- Update the DB status to `'cancelled'`
- Check for idempotency
- Broadcast `run-cancelled` with run details
- Store a cancel event

This means calling `POST /control { action: 'abort' }` results in a different state than `POST /cancel` — the run ends in `FAILED_BLOCKED` (from the pipeline's `markFailed()` call) rather than `cancelled`. This is semantically different and creates confusion.

**Recommendation:** Either:
1. **Unify:** Remove `action: 'abort'` from `/control`, making `/cancel` the only way to abort. The `/control` endpoint handles pause/resume/retry; `/cancel` handles cancellation.
2. **Delegate:** Have `/control` with `action: 'abort'` delegate to the `/cancel` logic internally (call the same function).

The current design (two different abort paths with different semantics) is a bug waiting to happen.

### Test Coverage for the Idempotency Fix

**Current state:**
- **No server-side tests** for the cancel endpoint at all
- The only test touching SSE/cancel is a smoke test for the client-side `useSSE` hook
- The idempotency ordering bug was dead code — the test suite did not catch it

**What patterns would prevent this:**
1. **Table-driven tests for status guards:** A test table covering all 5 RunStatus values × cancel action, asserting the correct HTTP status (200/409/404) for each:
   ```typescript
   const cases = [
     { status: 'active',    expected: 200 },
     { status: 'blocked',   expected: 200 },
     { status: 'cancelled', expected: 200 }, // ← would have caught the bug
     { status: 'done',      expected: 409 },
     { status: 'failed',    expected: 409 },
   ];
   ```
2. **Double-cancel test:** Call cancel twice on the same run, assert both return 200 with `ok: true`.
3. **Race condition test:** Start a run, simultaneously call cancel and transition to `done`, assert only one wins.
4. **SSE broadcast test:** Connect an EventSource, call cancel, assert `run-cancelled` event received.

---

## Compliance

- [x] Meets evidence-gated progression principle — cancel event is stored as DB event with full context
- [x] Meets GitHub Source of Truth principle — DB status is the authoritative state; SSE is derived
- [x] Security reviewed — idempotency prevents abuse, status guard prevents invalid transitions
- [ ] Test coverage adequate — **FAIL**: No server-side tests for cancel endpoint, idempotency, race conditions, or SSE broadcast of cancellation. This is a critical gap.
