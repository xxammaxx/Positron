# Issue #308 Readiness Decision

> Generated: 2026-06-27T21:37:00+02:00
> Auditor: issue-orchestrator (read-only)
> Decision: Evidence-based, gate-verified

## Decision

```text
ISSUE_308_READY_TO_START: NO
```

## Decision Matrix

| Criterion | Required | Actual | Pass? |
|---|---|---|---|
| #215 resolved (GATE_APPROVE on main) | YES | NO — PR #218 open, not merged | ❌ |
| #244 resolved (workspace cleanup on main) | YES | NO — PR #255 closed, no code on main | ❌ |
| #245 resolved (audit log enforcement on main) | YES | NO — PR #255 closed, no code on main | ❌ |
| #246 resolved (GateType enforcement on main) | YES | NO — PR #255 closed, no code on main | ❌ |
| Safety gates exist in code | YES | PARTIAL — only phase defs, no enforcement | ❌ |
| Local gates green | YES | Needs execution (see readiness-gates.md) | ⏳ |
| No secrets exposed | YES | CLEAN | ✅ |
| No RED_HOLD active | YES | CLEAN (no RED_HOLD labels) | ✅ |
| Owner approval for Real Mode | YES | NOT GRANTED — only READINESS AUDIT approved | ❌ |
| PR #218 merged (or equivalent) | YES | NO | ❌ |

**Score: 2/9 criteria met, 1 pending, 6 failed**

## Why NO

1. **All four blockers remain OPEN.** Despite implementation attempts (PR #218 and closed PR #255), none of the gate code is on main.

2. **PR #255 (the #244/#245/#246 implementation) was CLOSED without merge.** It was CONFLICTING and DIRTY. The code that should enforce workspace cleanup, audit logs, and GateType layers never reached main.

3. **PR #218 (#215 implementation) is open but stale.** 12 days without human review. Mergeability unknown. Awaiting owner approval.

4. **Gate infrastructure on main is ~20% complete.** Only phase definitions and decision classification exist. No runtime enforcement of any of the 8 GateTypes. No stop/ask evaluation. No audit enforcement. No workspace cleanup.

5. **No Real Mode approval exists.** The current owner approval is scoped to `APPROVE ISSUE 308 READINESS AUDIT ONLY` — explicitly NOT Real Mode.

6. **Gate-code discovery confirms 5 of 6 gate mechanisms are ABSENT on main.**

## Next Blocker to Build

```text
NEXT_BLOCKER_TO_BUILD: #215
```

### Reasoning

**#215 is the most actionable blocker:**

1. **PR #218 already exists** with working code, passing tests, and review-agent approval
2. **Lowest risk** — 7 files, contained in `packages/sandbox/`, 97 new tests
3. **Most directly needed** — #308 Phase 1 (Gate Assembly) requires GATE_APPROVE before anything else
4. **PR is salvageable** — not CONFLICTING (status: UNKNOWN), not draft, has passing tests
5. **Followed by #244/#245/#246** — the PR #255 code needs to be recovered and rebased

### Build Order

1. **#215 (first):** Merge PR #218 → GATE_APPROVE on main
2. **#244 (second):** Recover workspace cleanup from closed PR #255 → clean merge
3. **#245 (third):** Recover audit enforcement from closed PR #255 → clean merge
4. **#246 (fourth):** Recover GateType enforcement from closed PR #255 → clean merge
5. **#308:** Only after all four are on main with passing tests

### Alternative Path

If PR #218 has unfixable merge conflicts or the CodeRabbit comments are deemed blocking, implement #215 fresh against current main, incorporating lessons from PR #218 branch code.

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| PR #218 has merge conflicts with main | MEDIUM | MEDIUM | Local merge test first |
| PR #255 code cannot be cleanly recovered | HIGH | HIGH | Re-implement #244/#245/#246 individually |
| Owner delays approval beyond audit | MEDIUM | MEDIUM | Present evidence, wait for explicit approval |
| #308 Phase 2-4 requires more gates than expected | LOW | LOW | Discovery in Phase 1 would identify gaps |
| Pre-existing test failures interfere | LOW | HIGH | Documented 7 pre-existing failures (unchanged) |

## Approval Requirements

Before #308 can proceed:
1. **Human approval for PR #218 merge** (via GitHub PR review)
2. **Owner approval for #244/#245/#246 implementation** (already granted per issue)
3. **Separate owner approval for Real Mode** (NOT covered by this audit approval)
4. **All local gates green on merged code**
5. **Evidence artifacts for each blocker resolution**
