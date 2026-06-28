# Tool Gateway Discovery — Issue #245

**Generated:** 2026-06-28T00:00:00Z  
**Orchestrator:** issue-orchestrator (deepseek-v4-pro)

## Discovery Summary

A comprehensive codebase search was performed across `packages/tool-gateway/`, `packages/shared/`, `packages/sandbox/`, `packages/run-state/`, and `apps/server/`.

### Key Finding

**`requiresAuditLog` does NOT exist in ANY TypeScript source file.** It is referenced only in documentation (`docs/evidence/`, `docs/audits/`). This is the core gap that Issue #245 addresses.

---

## 1. `requiresAuditLog` — Current State

| Location | Status |
|----------|--------|
| `packages/tool-gateway/src/types.ts` (ToolDefinition) | ❌ NOT PRESENT |
| `packages/shared/src/types.ts` | ❌ NOT PRESENT |
| Any `.ts` source file | ❌ NOT PRESENT |
| `docs/evidence/` (documentation) | ✅ Referenced as gap |

**Action:** Add `requiresAuditLog?: boolean` to `ToolDefinition` in `packages/tool-gateway/src/types.ts`.

---

## 2. `ToolDefinition` — Current Interface

**File:** `packages/tool-gateway/src/types.ts:52-77`
**Fields:** id, title, description, inputSchema, outputSchema, riskLevel, requiredAutonomyLevel, approvalMode, allowedPhases, allowedWorkspaceRoots, egressPolicy, evidenceRequirements

**Missing:** `requiresAuditLog` — must be added.

---

## 3. `ToolPermissionEntry` — Current State

**Status:** ❌ DOES NOT EXIST anywhere in the codebase. This concept is not needed for #245 implementation.

---

## 4. `GatewayService` — Current State

**File:** `packages/tool-gateway/src/gateway.ts:43-533`

**8 Security Gates:**
1. Gateway enabled check (line 73)
2. Schema validation (line 78)
3. Tool lookup (line 84)
4. Phase check (line 92)
5. Autonomy check (line 100)
6. Approval check (line 108)
7. Workspace boundary check (line 137)
8. Egress check (line 145)

**Callbacks:**
- `onEvidence: ((call, result) => Promise<string>) | null` (line 51) — Post-execution evidence
- `onApprovalCheck: ((toolId, call) => Promise<boolean>) | null` (line 58) — Pre-execution approval

**Execution flow (after Gate 8):**
1. Tool handler execution (line 153)
2. Secret redaction (line 167)
3. Post-execution evidence generation via `onEvidence` (line 172)

**Gap:** No pre-execution audit enforcement gate. `onEvidence` is post-execution only.

---

## 5. `execute` Method (Central Execution)

**File:** `packages/tool-gateway/src/gateway.ts:68-189`

The `execute()` method is the single entry point for all tool execution. This is where the audit enforcement gate must be inserted.

---

## 6. `onEvidence` Callback

**File:** `packages/tool-gateway/src/gateway.ts:48-51, 171-174`

- Type: `((call: ToolCall, result: TimedResult) => Promise<string>) | null`
- Invoked AFTER tool execution (post-execution evidence generation)
- Returns evidence event ID string
- Set by server integration layer

**Usage for #245:** The existence of `onEvidence` indicates audit infrastructure is available. For pre-execution audit, a separate callback is needed.

---

## 7. `onAudit` Callback

**Status:** ❌ DOES NOT EXIST. Must be created as a pre-execution audit callback.

**Design:** `(call: ToolCall) => Promise<string>` — takes ToolCall, returns evidence ID. Throws if audit write fails.

---

## 8. Audit / Evidence Sink

**Current state:**
- `onEvidence` is the only evidence-related callback in `GatewayService`
- `evidence.append` is a built-in tool (not a sink — it's a tool that appends evidence items)
- `apps/server/src/index.ts` does NOT import or use `@positron/tool-gateway`
- No audit/evidence sink integration exists between tool-gateway and server

**For #245:** The audit sink is represented by whether `onEvidence` (or new `onAudit`) callback is configured. If not configured, audit enforcement blocks execution.

---

## 9. Write / Destructive Tool Classification

**RiskLevel type:** `'read' | 'write' | 'network' | 'secret_sensitive' | 'destructive'`

**Write tools:**
- `evidence.append` — riskLevel: 'write'
- `tests.run_selected` — riskLevel: 'write'  
- `github.comment_evidence_draft` — riskLevel: 'write'

**Destructive tools:** None currently registered. Risk level exists in type system.

**Scanner check:** `scanner.ts:183-191` warns if write/destructive tools have `approvalMode: 'none'`.

---

## 10. `BLOCK_REASONS` — Current State

**File:** `packages/tool-gateway/src/types.ts:165-177`

**Existing reasons:** TOOL_NOT_FOUND, SCHEMA_VALIDATION_FAILED, PHASE_NOT_ALLOWED, AUTONOMY_TOO_LOW, APPROVAL_REQUIRED, PATH_TRAVERSAL, EGRESS_BLOCKED, GATEWAY_DISABLED, TOOL_EXECUTION_ERROR, SCANNER_BLOCKED, UNKNOWN

**Missing:** `AUDIT_LOG_MISSING` — must be added.

---

## 11. Permission Matrix / Default Deny

**Permission Matrix:** ❌ NOT FOUND in source code.

**Default Deny:** Not explicitly named, but implemented:
- `DEFAULT_GATEWAY_CONFIG.enabled = false` (gateway off by default)
- Approval gate blocks all non-none modes without callback configured
- Gate 1 blocks all execution when disabled

---

## 12. Sealed Gateway

**File:** `packages/tool-gateway/src/registry.ts:124-150`

- `ToolRegistry.seal()` freezes all definitions, schemas, and policies
- Post-seal mutations rejected with `RegistrySealedError`
- Sealed state is immutable

**For #245:** Sealed gateway must remain stronger than audit gate. If gateway is sealed AND disabled, Gate 1 blocks before audit gate is reached.

---

## 13. `adapterSource` — Current State

**Status:** ❌ NOT FOUND in any source file. Does not exist.

**For #245:** No runtime enforcement. No scanner warnings needed (unless they already exist — they don't).

---

## 14. Existing Tests

**Tool gateway tests (packages/tool-gateway/src/__tests__/):**

| Test File | Coverage |
|-----------|----------|
| `gateway.test.ts` | 8-gate unit tests |
| `scanner.test.ts` | Scanner warnings |
| `registry.test.ts` | Registry operations, sealing |
| `tools/evidence.test.ts` | evidence.append tool |
| `tools/repo.test.ts` | Repo tools |
| `tools/github.test.ts` | GitHub tools |
| `tools/tests.test.ts` | Test framework tools |
| `red/shell-injection.test.ts` | Shell injection red tests |
| `red/secret-leakage.test.ts` | Secret leakage red tests |
| `red/phase-violation.test.ts` | Phase violation red tests |
| `red/path-traversal.test.ts` | Path traversal red tests |
| `red/hardening-fixes.test.ts` | Hardening fixes incl. evidence gen |
| `red/egress-violation.test.ts` | Egress violation red tests |
| `red/autonomy-violation.test.ts` | Autonomy violation red tests |
| `red/approval-bypass.test.ts` | Approval bypass red tests |
| `red/tool-poisoning.test.ts` | Tool poisoning red tests |

**Missing:** No audit enforcement tests exist. `hardening-fixes.test.ts` tests evidence generation callbacks but does NOT test `requiresAuditLog` enforcement.

---

## 15. GREEN_SAFE Modification Points

| Location | Change | Risk |
|----------|--------|------|
| `types.ts:52-77` | Add `requiresAuditLog?: boolean` to `ToolDefinition` | 🟢 Low — additive type change |
| `types.ts:165-177` | Add `AUDIT_LOG_MISSING` to `BLOCK_REASONS` | 🟢 Low — additive constant |
| `gateway.ts:48-51` | Add `onAudit` callback property | 🟢 Low — additive property |
| `gateway.ts:150` (after Gate 8) | Insert Gate 9: Audit Enforcement | 🟡 Medium — new gate in execution path |
| `gateway.test.ts` | Add audit enforcement unit tests | 🟢 Low — additive tests |
| New file: `red/audit-enforcement.test.ts` | Red/negative tests | 🟢 Low — additive tests |

## 16. YELLOW_REVIEW / RED_HOLD Points

| Location | Concern | Rating |
|----------|---------|--------|
| Gate 9 placement | Must not interfere with sealed/default-deny gates | 🟡 YELLOW — needs careful ordering |
| `onAudit` callback | New pre-execution async call adds latency | 🟡 YELLOW — acceptable for audit |
| RiskLevel gating | Whether to gate on riskLevel or just `requiresAuditLog` | 🟡 YELLOW — design decision |
| Tool arguments in audit | Must avoid logging secrets | 🔴 RED — requires sanitization |

## Classification

```text
ISSUE_245_DISCOVERY_STATUS: COMPLETE
```

**Rationale:** All keywords searched, all relevant source files analyzed, all test files inventoried. Clear picture of what exists, what's missing, and where changes must go.
