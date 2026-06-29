# Design Plan — Issue #322

## Timestamp
2026-06-29T11:05:00Z

## Design Goals

1. Wire `GatewayService.onAudit` into server/worker runtime
2. Define local structured audit sink (JSONL file)
3. Preserve fail-closed behavior (Gate 9 blocks on audit failure)
4. Audit entry written BEFORE tool execution
5. No secrets in audit entries
6. No remote sinks, no Real Mode, no GitHub writes
7. Existing #245 Gate 9 semantics preserved

## Audit Sink Design

### Option B (Selected): Shared audit sink in tool-gateway package

**Location:** `packages/tool-gateway/src/audit-sink.ts`

**Rationale:**
- Close to GatewayService definition
- Importable by both server and worker
- Self-contained with no external dependencies beyond `@positron/shared`
- Existing evidence/event infrastructure is DB-based (SQLite) — adding a file-based audit sink complements it

### Sink Format: Local JSONL File

```jsonl
{"ts":"2026-06-29T11:05:00.000Z","runId":"run-abc123","phase":"IMPLEMENT","toolId":"repo.write_file","requiresAuditLog":true,"decision":"ALLOW","evidenceId":"evt-001","meta":{"tool":"repo.write_file","source":"server"}}
{"ts":"2026-06-29T11:05:01.000Z","runId":"run-abc123","phase":"IMPLEMENT","toolId":"test.run_selected","requiresAuditLog":true,"decision":"BLOCK","reason":"AUDIT_LOG_MISSING: audit sink write failed: disk full","meta":{"tool":"test.run_selected","source":"worker"}}
```

### Audit Entry Schema
```typescript
interface AuditEntry {
  ts: string;           // ISO8601 timestamp
  runId: string;        // Run ID
  phase: string;        // Current phase
  toolId: string;       // Tool identifier
  requiresAuditLog: boolean;  // Always true for audited tools
  decision: 'ALLOW' | 'BLOCK';  // Outcome
  reason?: string;      // Block reason (only for BLOCK)
  evidenceId?: string;  // Evidence event ID (only for ALLOW)
  meta: {
    tool: string;       // Tool ID (safe metadata)
    source: 'server' | 'worker';  // Runtime source
  };
}
```

Note: NO tool arguments (`call.args`) are included — they may contain secrets.

### File Location
```
{workspacePath}/.positron/audit/audit-{runId}-{timestamp}.jsonl
```

Where `workspacePath` defaults to `C:\Positron\.opencode\audit\` for in-process runs.

### Fail-Closed Contract
- `createAuditSink()` returns `(call: ToolCall) => Promise<string>` — compatible with GatewayService's `onAudit` type
- On success: Returns a unique evidence ID (UUID)
- On failure: THROWS an error — which GatewayService catches and blocks via Gate 9
- No `--yolo`, no `SKIP_AUDIT`, no `bypassAudit`, no `autoApprove`

## Wiring Plan

### 1. Create audit sink module
**File:** `packages/tool-gateway/src/audit-sink.ts`
- `createAuditSink(options: AuditSinkOptions): (call: ToolCall) => Promise<string>`
- `AuditSinkOptions { runId: string; workspacePath?: string; source: 'server' | 'worker' }`

### 2. Export from tool-gateway index
**File:** `packages/tool-gateway/src/index.ts`
- Add `export { createAuditSink } from './audit-sink.js'`
- Add `export type { AuditSinkOptions, AuditEntry } from './audit-sink.js'`

### 3. Wire into server (createApp)
**File:** `apps/server/src/index.ts`
- Import `GatewayService`, `ToolRegistry`, `createAuditSink` from `@positron/tool-gateway`
- Create `ToolRegistry` and `GatewayService` instances
- Register built-in tools (repo, tests, evidence, github) for future use
- Set `gateway.onAudit = createAuditSink({ source: 'server' })` with default workspace path
- Store gateway instance for reference

### 4. Wire into worker
**File:** `apps/worker/src/pipeline-runner.ts` or `apps/worker/src/index.ts`
- Import `GatewayService`, `ToolRegistry`, `createAuditSink`
- Create GatewayService instance with audit sink
- Add to `PipelineDeps` or pass alongside

### 5. Tests
- Unit tests for `createAuditSink()` — success/failure cases
- Integration test: GatewayService with audit sink wired
- Existing #245 tests must remain green
- Full test suite must remain green

## Non-Scope
- No tool routing through GatewayService (tools are not routed through it yet — this wiring is infrastructure preparation)
- No Full Real Mode
- No production repo probe
- No GitHub writes via pipeline
- No UI changes
- No workflow changes

## Design Classification

```text
ISSUE_322_DESIGN_STATUS: GREEN_SAFE
```

**Reasoning:** Design is minimal, self-contained, and leverages existing GatewayService infrastructure. No new dependencies. No remote sinks. No security weakening. Deterministic testability via local file sink. Fail-closed via existing Gate 9 semantics.
