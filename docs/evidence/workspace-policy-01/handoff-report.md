# Workspace Policy Evidence — Handoff Report

**Date:** 2026-06-20
**Run:** Positron Workspace Final Cleanup + PR #260 Correction

## Summary

GREEN. The workspace is now clean and governed by a documented no-sibling-worktree policy.

## Findings

### Orphaned Directory
- `C:\Positron-clean-prompt-hardening-20260619-133337` was found as an orphaned worktree directory
- No `.git` metadata present; not registered in `git worktree list`
- Contents: `node_modules`, `packages`, `observability`, `scripts`, config files
- **Deleted** after explicit Human Approval

### Dirty PR #260
- PR #260 was OPEN and CONFLICTING
- Branch `positron/workspace-policy-no-sibling-worktrees` was built on stale `main` (missing PR #258 merge)
- 28 commits, 98 files changed — far too large for a policy PR
- **Closed as superseded** after explicit Human Approval

### Dirty Main Worktree
- `C:\Positron` had 13 modified + ~40 untracked files
- 16 generated build artifacts deleted (`.d.ts`, `.js` from config files)
- 8 modified `dist/` files restored to HEAD
- Remaining 32 entries safely stashed

## New Policy Rule

```text
C:\Positron ist der einzige normale Projektarbeitsort.

Keine neuen Schwesterordner neben C:\Positron.
Worktree-Isolation nur nach expliziter Human Approval
und ausschließlich unter C:\Positron\.agent-worktrees\.
```

## Changes in This PR

| File | Change |
|------|--------|
| `.gitignore` | Added `.agent-worktrees/` exclusion |
| `AGENTS.md` | Added Workspace Root Rule section |
| `docs/evidence/workspace-policy-01/handoff-report.md` | This evidence file |

## PR Status After Cleanup

| PR | Status |
|----|--------|
| #257 | CLOSED |
| #258 | MERGED |
| #259 | OPEN (local-only CI, out of scope) |
| #260 | CLOSED (superseded) |
| **This PR** | Clean workspace policy from `origin/main` |

## Verification

- No new sibling directories created
- No new worktrees created
- Clean branch from `origin/main`
- Stash preserved for later recovery: `safety: dirty tree before clean workspace policy pr`
