# Issue #308 Phase D — Limited Approval Package Draft

**Generated:** 2026-06-29T14:06:00+02:00
**Status:** DRAFT — NOT FOR EXECUTION
**Requires:** Separate Owner approval before any probe

## Proposed Next Run

```text
Issue #308 Phase D Approval Package Only
```

## Purpose

**No probe is executed.** This is a final plan document that, when approved, enables a later minimal Phase D probe under strict boundaries.

## Candidate Later Probe Scope (Not Executing Now)

### Option A (Recommended): Local Temp Workspace + Gateway-Routed No-Op Tool

**Description:**
1. Create a temporary workspace directory in `%TEMP%` (outside production repo)
2. Initialize a minimal local git repo (if needed for adapter)
3. Route a no-op write tool through GatewayService
4. Verify:
   - `GatewayService.onAudit` callback fires before tool execution
   - `createAuditSink` writes structured JSONL audit entries
   - Audit entries contain evidence IDs, tool IDs, timestamps (no secrets/args)
   - On audit failure, tool execution is BLOCKED (fail-closed)
   - Temporary workspace is deleted on cleanup
5. Verify all kill-switches remain at safe defaults throughout

**Not in scope:**
- No GitHub API calls
- No push, merge, PR creation
- No production repo modifications
- No real external tools (only local filesystem, git init)

### Option B: Local Temp Workspace + Gateway-Routed Real Adapter

**Same as Option A**, but uses a real (non-fake) adapter configured with no-op behavior. Higher fidelity, marginally higher risk. Still no GitHub writes.

### Option C: Production Repo / GitHub Write Probe

**RED_HOLD** — NOT APPROVED for any near-term probe. Requires all limitations resolved, separate explicit Owner approval with expanded scope.

## Hard Boundaries (Non-Negotiable)

| # | Boundary | Enforcement |
|---|----------|-------------|
| 1 | No production repo usage as probe workspace | Temp dir outside `C:\Positron` |
| 2 | No GitHub writes through pipeline | `gh *` commands blocked |
| 3 | No push | `POSITRON_ENABLE_PUSH` absent |
| 4 | No merge | `POSITRON_MERGE_KILL_SWITCH` enforced |
| 5 | No PR through pipeline | No `gh pr create` |
| 6 | No external tools (except local fs + git init if approved) | `POSITRON_REAL_MODE` absent |
| 7 | All kill-switches at safe defaults | Env audit before probe |
| 8 | Audit sink MUST write for every audited call | `createAuditSink` wired |
| 9 | Cleanup MUST verifiably delete temp workspace | `fs.rmSync` with verification |
| 10 | Secret scan MUST be clean | Redact/scan all output |
| 11 | No `.env` contents | Never read `.env` |
| 12 | No issue/PR/label mutations | Read-only GitHub |

## Open Scope Decisions

| Issue | Decision | Rationale |
|-------|----------|-----------|
| #321 MERGE→DONE | Excluded | No merge in probe scope |
| #323 pre_run/pre_push | Excluded | No push, no full pipeline in probe scope |
| #324 Process-scoped lock | Accepted single-process | Probe is single-process |
| #325 Dist artifacts | Excluded | Working tree clean, GREEN_SAFE |
| #326 CodeRabbit | Excluded | NON_GATE external noise, owner action |
| PR #313 | Excluded | Obsolete, owner action to close |

## Pre-Probe Safety Checklist (Required Before Execution)

- [ ] `Get-ChildItem Env: | Where-Object { $_.Name -match 'POSITRON|REAL|PUSH|MERGE|YOLO|BYPASS|AUDIT|GATE' }` — must be EMPTY
- [ ] `git status --porcelain` — must be CLEAN
- [ ] `npm test` — must PASS (1858+)
- [ ] Temp directory path confirmed outside `C:\Positron`
- [ ] No stashes created during probe
- [ ] No untracked files in production repo after probe

## Future Explicit Approval Phrase

**Not for execution now.** Only when the Owner is ready to authorize a probe:

```text
APPROVE ISSUE 308 PHASE D CONTROLLED LOCAL TEMP PROBE AFTER APPROVAL PACKAGE
```

This approval package itself requires:

```text
APPROVE ISSUE 308 PHASE D APPROVAL PACKAGE ONLY
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Audit sink fails silently | LOW | MEDIUM | Fail-closed via Gate 9 |
| Temp workspace not cleaned up | LOW | LOW | Verification after cleanup |
| Kill-switch bypass | VERY LOW | HIGH | 30+ invariants, multi-layer |
| Tool routing through gateway not complete | MEDIUM | LOW | No-op tool only, no real danger |
| Real mode accidentally activated | VERY LOW | HIGH | Env var check before probe |
| Process-scoped lock collision | VERY LOW | LOW | Single-process guarantee |

## Status

```text
PHASE_D_APPROVAL_PACKAGE_STATUS: DRAFT_READY_FOR_OWNER_REVIEW
```

This document is a draft. No probe is authorized. The Owner must review and explicitly approve before any Phase D probe execution.
