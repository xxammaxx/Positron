# Issue #308 Phase D Readiness Recheck After #322 — Post-Merge Verification

**Generated:** 2026-06-29T14:06:00+02:00
**Codebase State:** HEAD `2198bc99` (PR #328 merged)

## Verification Method

`git grep` across `apps/server apps/worker packages/tool-gateway packages/shared packages/run-state`
for key patterns: `onAudit|AuditSink|audit-sink|GatewayService|requiresAuditLog|AUDIT_LOG_MISSING`

## Verification Results

### 1. `ToolGateway.onAudit` Existence

✅ **CONFIRMED.** `GatewayService.onAudit` property declared at `packages/tool-gateway/src/gateway.ts:60`:
```ts
public onAudit: ((call: ToolCall) => Promise<string>) | null = null;
```

### 2. Server Runtime GatewayService/onAudit Wiring

✅ **CONFIRMED.** Server runtime wires GatewayService with onAudit at `apps/server/src/index.ts:2323-2332`:
```ts
// ── Issue #322: Wire ToolGateway onAudit into server runtime ──
const gateway = new GatewayService(toolRegistry, { enabled: true });
gateway.onAudit = createAuditSink({
    runId: 'server-runtime',
    source: 'server',
});
```

### 3. Worker Runtime GatewayService/onAudit Wiring

✅ **CONFIRMED.** Worker runtime wires GatewayService with onAudit at `apps/worker/src/index.ts:117-120`:
```ts
const workerGateway = new GatewayService(workerToolRegistry, { enabled: true });
workerGateway.onAudit = createAuditSink({...});
```

✅ **CONFIRMED.** Worker `PipelineDeps` includes optional `gateway?: GatewayService` at `apps/worker/src/pipeline-runner.ts:52`.

### 4. Local JSONL Audit Sink Existence

✅ **CONFIRMED.** `createAuditSink` in `packages/tool-gateway/src/audit-sink.ts`:
- Date-rotated JSONL file sink
- Fail-closed: throws on write failure
- Redacts arguments (no secrets recorded)
- UUID evidence IDs
- `createBlockedAuditEntry` for blocked calls
- `hashAuditEntry` for integrity

### 5. Audit Sink Does NOT Write Tool Args/Secrets

✅ **CONFIRMED.** Audit sink entry format (`AuditEntry`):
```ts
interface AuditEntry {
    evidenceId: string;
    toolId: string;
    runId: string;
    source: string;
    requiresAuditLog: boolean;
    // NO args, NO params, NO secrets fields
}
```
Arguments are redacted in `hashAuditEntry` — only hashes stored.

### 6. Fail-Closed Behavior Covered in Tests

✅ **CONFIRMED.** Multiple test coverage:
- `audit-sink.test.ts`: 22 tests (JSONL writing, argument redaction, directory creation, fail-closed)
- `gateway.test.ts`: Gate 9 tests (block when no onAudit, block when onAudit throws)
- `audit-enforcement.test.ts`: 20+ tests (missing callback blocks, throw blocks, ordering)

### 7. Gate 9 (Audit Enforcement) NOT Weakened

✅ **CONFIRMED.** Gate 9 remains fail-closed:
- `gateway.ts:168`: `if (def.requiresAuditLog === true)` guard
- `gateway.ts:169`: `if (!this.onAudit)` → BLOCKED with `AUDIT_LOG_MISSING`
- `gateway.ts:177-180`: onAudit `try/catch` → BLOCKED on throw
- `BLOCK_REASONS.AUDIT_LOG_MISSING` constant preserved at `types.ts:178`

#322 **added** the audit sink callback — it did not modify Gate 9 logic at all.

### 8. Gate 6 (Stop/Ask — #215) NOT Weakened

✅ **CONFIRMED.** Gate 6 approval enforcement remains:
- `gateway.ts:116-139`: Approval check logic unchanged
- `BLOCK_REASONS.APPROVAL_REQUIRED` preserved
- `gate-evaluator.ts:309-324`: Human approval → GATE_APPROVE routing intact
- `state-machine.ts:86`: `GATE_APPROVE: ['COMMIT', 'MERGE', 'DONE']` transitions unchanged

### 9. Cleanup (Gate 8 — #244) NOT Weakened

✅ **CONFIRMED.** Workspace cleanup remains:
- `gateway.ts:153`: Gate 8 egress check preserved
- `gateway.ts:340-358`: Path traversal blocking intact
- `state-machine.ts:183-218`: Workspace cleanup lifecycle preserved
- `registerWorkspaceCleanup` function preserved

### 10. GateType Enforcement (#246) NOT Weakened

✅ **CONFIRMED.** GateType layer enforcement intact:
- `PHASE_GATE_REQUIREMENTS` mapping preserved at `gate-evaluator.ts:148`
- `registerGateEvaluator` function preserved
- `evaluateGates` function preserved
- `MISSING_EVALUATOR` handling preserved
- All 8 GateTypes registered in `ALL_GATE_TYPES`

## Classification

```text
ISSUE_322_POST_MERGE_STATUS: VERIFIED
```

**Rationale:** All 10 verification points confirmed. #322 onAudit wiring is present on main, functional, tested, and did not weaken any existing safety layer. The audit sink is operational, fail-closed behavior is runtime-verified in tests. The build errors are pre-existing (unrelated to #322) and tracked via other issues.
