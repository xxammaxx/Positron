# PR #255 Salvage Audit — Issue #245

**Generated:** 2026-06-28T00:00:00Z  
**Orchestrator:** issue-orchestrator (deepseek-v4-pro)  
**Source:** PR #255 (CLOSED, CONFLICTING, NOT MERGED)

## PR #255 Metadata

| Field | Value |
|-------|-------|
| PR Number | #255 |
| Title | feat(issue-243): enforce P0 runtime safety gates |
| State | CLOSED |
| Mergeable | CONFLICTING |
| Merged | No |
| Head Branch | `positron/issue-243-p0-runtime-safety` |
| Base Branch | `main` |
| Draft | No |

## Issue #245 Comments from PR #255 Work

From Issue #245 comment thread, the PR #255 author posted:

### Comment 1 (2026-06-17T19:17:50Z)
> **P0 Runtime Safety Implementation Complete**
> - BLOCK_REASONS: Added AUDIT_LOG_REQUIRED and ADAPTER_SOURCE_REQUIRED
> - GatewayService: Gate 9 blocks write/destructive tools with requiresAuditLog=true when onEvidence not configured
> - Scanner: Warns about missing requiresAuditLog, missing adapterSource on risky tools
> - AdapterSource enforcement is scanner-level (warnings), reserved for future runtime enforcement
> - Tests: 10/10 PASS (audit-enforcement.test.ts)

### Comment 2 (2026-06-18T03:57:50Z)
> **P0 Runtime Safety Hardening — Audit/Gate Integration**
> - requiresAuditLog enforcement still active via GatewayService Gate 9 (unchanged)
> - ADAPTER_SOURCE_REQUIRED documented as scanner-level only, reserved for future mandatory enforcement
> - Scanner continues to emit adapterSource warnings for risky write/destructive tools
> - Gate evaluator pre_write + evidence_required enforce evidence collection before write operations

## Salvage Analysis by File Category

### Files Belonging to #245 Scope

Based on the PR comments, the #245-relevant code likely included:
- `BLOCK_REASONS.AUDIT_LOG_REQUIRED` addition
- `GatewayService` Gate 9 (audit enforcement gate)
- `requiresAuditLog` field on `ToolDefinition`
- `audit-enforcement.test.ts` test file
- Scanner warnings for missing `requiresAuditLog`

### Files Belonging to #244 Scope

PR #255 was built on branch `positron/issue-243-p0-runtime-safety` which predated #244. Any #244 code in PR #255 would be mixed/conflicting with the current main (which has #244 merged via PR #314).

### Files Belonging to #246 Scope

The `ADAPTER_SOURCE_REQUIRED` block reason and GateType layer references in PR #255 comments are #246 scope. These MUST NOT be ported to #245.

### Files with UI / Provider / Oversight / Blueprint Scope

Unknown — PR #255 is closed and conflict-ridden. Full file list not available without checking out the branch.

## Salvageable Concepts (Safe to Port)

| Concept | Safe? | Rationale |
|---------|-------|-----------|
| `BLOCK_REASONS.AUDIT_LOG_REQUIRED` | ✅ YES | Clear block reason for audit enforcement. Port with name `AUDIT_LOG_MISSING` to match current convention and distinguish from future GateType enforcement. |
| `GatewayService` Gate 9 concept | ✅ YES | Audit enforcement as a new gate between Gate 8 and execution. |
| `requiresAuditLog` on `ToolDefinition` | ✅ YES | Core type addition. Must be optional boolean (default undefined = no enforcement). |
| Scanner warning for missing `requiresAuditLog` | ✅ YES | Scanner warnings are safe and informational. |
| `audit-enforcement.test.ts` test patterns | ✅ YES | Test patterns can inspire current tests — but must be rewritten against current `main` code. |
| Pre-execution audit check via `onEvidence` availability | ✅ YES | The concept of checking whether an evidence/audit callback is configured before allowing execution. |

## Discard (Must NOT Port)

| Concept | Why Discard |
|---------|-------------|
| `ADAPTER_SOURCE_REQUIRED` | #246 scope only. Not runtime-enforced in #245. |
| GateType layer enforcement | #246 scope. Not in #245. |
| `pre_write` + `evidence_required` gate evaluator | Likely #246 GateType layer logic. Not in #245. |
| Any merged logic mixing #244/#245/#246 | PR #255 is CONFLICTING with main — code from that branch does not apply cleanly. |
| `positron/issue-243-p0-runtime-safety` branch | Branch is stale, conflicts with main, and mixes multiple issues. |

## Specific Safe Ports

### 1. `BLOCK_REASONS.AUDIT_LOG_REQUIRED` → `AUDIT_LOG_MISSING`

PR #255 had `AUDIT_LOG_REQUIRED`. For #245, use `AUDIT_LOG_MISSING` to clearly signal "audit log is required but the sink is missing/unavailable." This is a distinct block reason from future GateType enforcement.

### 2. `requiresAuditLog` Field

Add `requiresAuditLog?: boolean` to `ToolDefinition`. This is a pure type addition with no runtime impact until enforcement is implemented.

### 3. GatewayService Gate 9 (Audit Enforcement)

New gate inserted between Gate 8 and tool execution. Logic:
- If `def.requiresAuditLog === true` AND `riskLevel !== 'read'`:
  - Check if audit/evidence sink is available
  - If not available → BLOCK with `AUDIT_LOG_MISSING`
  - If available → invoke pre-execution audit
  - If audit write fails → BLOCK
  - If audit write succeeds → continue to tool execution

**Refinement:** The issue specifies that even read tools with `requiresAuditLog: true` need auditing (test 8). So the gate should check `requiresAuditLog` regardless of riskLevel, but the primary target is write/destructive tools.

### 4. `onEvidence` Callback as Audit Sink Indicator

PR #255 used `onEvidence` configuration as the audit sink availability check. This is safe to port — if `onEvidence` is configured (set by server integration), it indicates the system has audit infrastructure available.

**Important:** For #245 pre-execution audit, we need a separate `onAudit` callback (pre-execution) in addition to the existing post-execution `onEvidence` callback. The PR #255 approach of checking `onEvidence` existence is a good indicator of overall audit infrastructure availability, but the actual pre-execution audit write needs a dedicated callback.

## Classification

```text
PR_255_SALVAGE_STATUS: USE_AS_REFERENCE_ONLY
```

**Rationale:** PR #255 is CONFLICTING with current main, mixes #244/#245/#246 code, and cannot be merged or directly ported. However, several concepts (block reasons, Gate 9 pattern, requiresAuditLog field, test patterns) provide useful design guidance for the #245 implementation.

**Rule Enforcement:** PR #255 is NEVER to be directly merged. Only targeted, small #245 concepts may be reimplemented against current `main`.
