# Implementation Report — Issue #245

**Generated:** 2026-06-28T00:00:00Z  
**Orchestrator:** issue-orchestrator (deepseek-v4-pro)

## Summary

`requiresAuditLog` runtime enforcement implemented in the Tool Gateway. When a tool definition has `requiresAuditLog: true`, a pre-execution audit entry MUST be written before the tool executes. If the audit callback is not configured or fails, tool execution is blocked.

## Changes Made

### 1. `packages/tool-gateway/src/types.ts`

- **Line 77-78:** Added `requiresAuditLog?: boolean` field to `ToolDefinition` interface
- **Line 176:** Added `AUDIT_LOG_MISSING: 'AUDIT_LOG_MISSING'` to `BLOCK_REASONS` constant

### 2. `packages/tool-gateway/src/gateway.ts`

- **Lines 54-60:** Added `onAudit` callback property to `GatewayService` class:
  ```typescript
  public onAudit: ((call: ToolCall) => Promise<string>) | null = null;
  ```
- **Lines 161-184:** Inserted Gate 9 (Audit Enforcement) between Gate 8 (Egress) and tool handler execution:
  - Checks `requiresAuditLog === true` on tool definition
  - If no `onAudit` callback configured → BLOCKED with `AUDIT_LOG_MISSING`
  - If `onAudit` throws → BLOCKED with `AUDIT_LOG_MISSING` + error message
  - If `onAudit` succeeds → stores evidence ID, continues to tool execution
- **Line 199:** Updated `timedResult` construction to include pre-execution audit evidence ID

### 3. `packages/tool-gateway/src/scanner.ts`

- **Lines 194-203:** Added scanner-level warning for write/destructive tools missing `requiresAuditLog: true`:
  ```
  Tool "{id}" has risk level "{level}" but does not require audit logging — consider setting requiresAuditLog: true
  ```

### 4. `packages/tool-gateway/src/__tests__/gateway.test.ts`

- **Lines 441-513:** Added 5 Gate 9 unit tests covering:
  - Block when requiresAuditLog and no onAudit
  - Allow when onAudit succeeds
  - Block when onAudit throws
  - Pass through when requiresAuditLog not set
  - Earlier gates take priority over audit gate

### 5. `packages/tool-gateway/src/__tests__/red/audit-enforcement.test.ts`

- **Created:** 20 red/negative tests covering:
  - Write tool + requiresAuditLog + no audit sink → BLOCKED
  - Destructive tool + requiresAuditLog + no audit sink → BLOCKED
  - Write tool + requiresAuditLog + successful audit → ALLOWED
  - Audit callback failure blocks execution
  - Audit called BEFORE tool execution (order validation)
  - Tool handler NOT called when audit blocks
  - Read-only without requiresAuditLog → NOT blocked
  - Read-only WITH requiresAuditLog → blocked without sink
  - Read-only WITH requiresAuditLog + sink → ALLOWED
  - Sealed/disabled gateway blocks before audit gate
  - Default deny (Gate 6) blocks before audit gate
  - Schema validation failures block before audit gate
  - Audit callback receives call context
  - Block reason does NOT expose secret arguments
  - No GateType layer references in block reasons
  - Evidence event ID from pre-execution audit
  - Post-execution evidence can override pre-execution ID
  - Tools without requiresAuditLog skip onAudit
  - Undefined requiresAuditLog treated as false

## Files Not Modified (Per Scope Rules)

- `packages/shared/src/types.ts` — No changes needed
- `apps/server/` — No server integration
- `apps/web/` — No UI changes
- `.github/workflows/` — No workflow changes
- Any docs outside `docs/evidence/issue-245/`

## Scope Enforcement Verified

| Rule | Status |
|------|--------|
| No #246 GateType Layer Enforcement | ✅ Confirmed — no GateType references |
| No #308 Real Mode | ✅ Confirmed — no real mode code |
| No UI changes | ✅ Confirmed — no web/ changes |
| No Workflow changes | ✅ Confirmed — no .github changes |
| No AdapterSource runtime enforcement | ✅ Confirmed — scanner warnings only |
| No PR #218 touch | ✅ Confirmed |
| No PR #255 merge/reactivation | ✅ Confirmed — fresh implementation |
| No PR chain #230–#242 | ✅ Confirmed |
| No CodeRabbit reactivation | ✅ Confirmed |
| No Manual CI | ✅ Confirmed |
| No Secrets exposed | ✅ Confirmed |
| No .env contents | ✅ Confirmed |

## Classification

```text
ISSUE_245_IMPLEMENTATION_STATUS: IMPLEMENTED
```
