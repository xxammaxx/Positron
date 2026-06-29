# Issue #308 Phase C — Controlled Real Probe Scope Proposal

**Generated:** 2026-06-29T10:00:00+02:00
**Mode:** Phase C Readiness Recheck — NO Real Mode
**IMPORTANT:** This is a PROPOSAL only. No execution authorized.

---

## Purpose

Define the minimal, safest possible scope for a future Controlled Real Probe to validate the gate assembly system's behavior with a real (but isolated) operation. This probe is the logical next step after Phase B fake/dry-run validation.

---

## Option Evaluation

### Option A: Local Temp Workspace Only

**What:** Set `POSITRON_WORKSPACE_ROOT` to a temporary directory, run the pipeline to create a workspace, perform a fake-speckit or real-git-clone into the temp directory, and verify cleanup.

**Pros:**
- ✅ No GitHub writes (push, PR, merge all blocked)
- ✅ Fully local and controllable
- ✅ Workspace cleanup is demonstrable
- ✅ Rollback is trivial (delete temp directory)
- ✅ Audit evidence can be captured (even if via file log)
- ✅ No production repo involved
- ✅ Real file system write is bounded to temp workspace
- ✅ Can validate kill-switches with real env vars

**Cons:**
- ⚠️ Requires real git clone (network access)
- ⚠️ Real file system writes (bounded to temp dir)
- ⚠️ `git clone` may fail without network

**Risk:** LOW

### Option B: Real Local Git Branch (No Push)

**What:** Use a real git workspace, create a branch, make a docs-only change, commit, but never push.

**Pros:**
- ✅ More realistic pipeline exercise
- ✅ Validates git operations in real mode
- ✅ No push, no PR, no merge

**Cons:**
- ⚠️ Modifies local working copy
- ⚠️ Requires production repo clone
- ⚠️ Higher cleanup complexity
- ⚠️ Could accidentally affect working tree

**Risk:** MEDIUM

### Option C: GitHub Read-Only API Call

**What:** Execute `gh issue view 308` or `gh pr list` through the pipeline with real GitHub adapter but read-only.

**Pros:**
- ✅ Read-only — zero risk of writes
- ✅ Uses real GitHub adapter
- ✅ Trivially safe

**Cons:**
- ❌ Not meaningfully different from what Phase B already did
- ❌ Doesn't exercise any real-mode code path beyond the adapter
- ❌ Doesn't validate workspace, file I/O, or cleanup

**Risk:** VERY LOW (but also very low value)

---

## Recommendation: Option A — Local Temp Workspace Only

Option A is the recommended first Controlled Real Probe because:

1. **Highest safety margin** — No GitHub writes, no production repo, no push, no merge.
2. **Meaningful validation** — Exercises the real GitWorkspaceAdapter, file system operations, workspace cleanup, and gate enforcement with real (but bounded) side effects.
3. **Progressive** — Can be followed by Option B if Option A succeeds.
4. **Recoverable** — Cleanup is a single `rm -rf` on the temp directory.

---

## Hard Boundaries for the Probe

These boundaries MUST be enforced programmatically and verified before probe execution:

```text
✅ REQUIRED:
- POSITRON_WORKSPACE_ROOT=<TEMP_DIR_ONLY>
- POSITRON_SPECKIT_MODE=fake (or omitted)
- POSITRON_OPENCODE_MODE=fake (or omitted)

❌ MUST BE ABSENT / DEFAULT:
- POSITRON_ENABLE_PUSH (must NOT be 'true')
- POSITRON_ENABLE_MERGE (must NOT be 'true')
- POSITRON_MERGE_KILL_SWITCH (must NOT be 'false')
- POSITRON_MERGE_DRY_RUN (irrelevant — no merge)
- --yolo (must not exist)

🚫 HARD PROHIBITIONS:
- No production repo clone (use a temp-only path)
- No git push
- No gh pr create
- No gh merge
- No gh workflow run
- No branch deletion
- No secret exposure
- No .env file reading
- No merge to main
- No force push
```

---

## Pre-Probe Verification Checklist

Before any Controlled Real Probe:

| # | Check | Method |
|---|-------|--------|
| 1 | WORKSPACE_ROOT points to temp directory only | `stat $POSITRON_WORKSPACE_ROOT` |
| 2 | PUSH is blocked | `echo $POSITRON_ENABLE_PUSH` → empty |
| 3 | MERGE is blocked | `echo $POSITRON_ENABLE_MERGE` → empty |
| 4 | KILL_SWITCH is active | `echo $POSITRON_MERGE_KILL_SWITCH` → empty |
| 5 | No GITHUB_TOKEN for write scope | Verify token scope |
| 6 | Workspace is clean before probe | `git status --porcelain` |
| 7 | All local gates pass | `git diff --check; npm run build; npm test` |
| 8 | Owner approval text received | Exact match verified |
| 9 | Rollback plan documented | This document |
| 10 | Evidence directory exists | `docs/evidence/issue-308/phase-c2-*` |

---

## Probe Execution Steps (FUTURE — NOT THIS RUN)

1. Owner posts approval text on Issue #308.
2. Positron reads the approval, verifies exact match.
3. Positron creates temp workspace directory.
4. Positron runs pipeline with real workspace adapter.
5. Positron captures:
   - Gate evaluation results
   - Workspace path
   - Cleanup result
   - Any errors
6. Positron runs cleanup.
7. Positron posts structured evidence comment on Issue #308.
8. Issue remains OPEN.

---

## Classification

```text
CONTROLLED_PROBE_SCOPE_STATUS: SAFE_PROPOSAL_READY
```

**Justification:** Option A (local temp workspace only) is the safest possible real-mode probe. All GitHub writes are blocked. File system writes are bounded to temp directory. Cleanup is trivial. Kill-switches remain active. No production repo usage.
