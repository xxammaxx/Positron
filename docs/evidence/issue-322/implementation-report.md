# Implementation Report — Issue #322

## Timestamp
2026-06-29T11:12:00Z

## Status

```text
ISSUE_322_IMPLEMENTATION_STATUS: IMPLEMENTED
```

## Summary

Wire ToolGateway `onAudit` into server/worker runtime by:
1. Creating a local structured audit sink (`packages/tool-gateway/src/audit-sink.ts`)
2. Exporting it from the tool-gateway package
3. Instantiating GatewayService in server `createApp` with audit sink wired
4. Instantiating GatewayService in worker startup with audit sink wired
5. Adding gateway to worker's `PipelineDeps` DI interface

## Files Changed

### New Files
- `packages/tool-gateway/src/audit-sink.ts` — Audit sink module (114 lines)
- `packages/tool-gateway/src/__tests__/audit-sink.test.ts` — Tests (22 test cases)
- `docs/evidence/issue-322/` — 9 evidence documents

### Modified Files
- `packages/tool-gateway/src/index.ts` — Added audit sink exports (4 lines)
- `apps/server/src/index.ts` — Added import + GatewayService init (10 lines)
- `apps/server/package.json` — Added @positron/tool-gateway dependency
- `apps/server/tsconfig.json` — Added tool-gateway reference
- `apps/worker/src/index.ts` — Added import + GatewayService init (10 lines)
- `apps/worker/src/pipeline-runner.ts` — Added gateway to PipelineDeps (3 lines)
- `apps/worker/package.json` — Added @positron/tool-gateway dependency
- `apps/worker/tsconfig.json` — Added tool-gateway reference

## Implementation Details

### Audit Sink
- Local JSONL file under `{workspacePath}/audit-{runId}-{date}.jsonl`
- Pre-execution: writes audit entry BEFORE tool executes
- Fail-closed: throws on write failure → GatewayService Gate 9 blocks
- Safe metadata only: no tool arguments (no secrets)
- Returns UUID evidence ID on success

### Server Wiring
- GatewayService created in `createApp()` with `{ enabled: true }`
- `onAudit` wired to `createAuditSink({ source: 'server' })`
- ToolRegistry created (empty — tools not registered yet, future Phase D scope)

### Worker Wiring
- GatewayService created after `registerFakeGateEvaluators()`
- `onAudit` wired to `createAuditSink({ source: 'worker' })`
- GatewayService added to PipelineDeps as optional field
- Passed to `runPipeline()` via `deps.gateway`

### What This Enables
- When tools are routed through GatewayService (future Phase D), audit will work automatically
- `onAudit` callback is configured and tested
- Gate 9 fail-closed behavior is operational in both runtime paths
- Audit trail is written locally, verifiable, and secret-safe
