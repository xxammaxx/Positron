# REAL_MODE_READINESS — Rudolph Beacon

**Status:** PREPARED, NOT EXECUTED
**Effective Date:** 2026-06-24
**Requires Human Approval:** YES

## What Real-Mode Means in Positron Context

Real-mode is the execution mode where Positron performs **actual file writes, git operations, network calls, and system interactions** rather than simulating them through fixtures or dry-run analysis.

In the Rudolph Beacon benchmark, `executionMode: 'real'` would mean:

- Actual file writes to controlled paths (`.positron/evidence/`)
- Real `git status`, `git diff` reads (already read-only)
- Actual `npm test` execution (already runs locally)
- Actual `tsc` compilation (already runs locally)
- Actual evidence file creation (already done under controlled paths)

Real-mode does NOT mean:
- Unrestricted file writes
- Automatic git push/merge/PR creation
- GitHub Actions triggers
- Production data modification
- Autonomous system configuration changes

## Actions Still Prohibited in Real-Mode

These remain RED_HOLD regardless of execution mode:

| Action | Reason | Kill-Switch |
|--------|--------|-------------|
| `git push` | Remote write | `POSITRON_ENABLE_PUSH` |
| `git merge` | State mutation | `POSITRON_MERGE_KILL_SWITCH` |
| `gh pr create` | Remote write | Dry-Run agent blocks |
| `gh pr merge` | Remote write | Dry-Run agent blocks |
| GitHub Actions trigger | Remote CI | Issue #268 advisory-only |
| `.env` file reading | Secret exposure | Policy gate |
| Stash apply/pop/drop | State loss | Policy gate |
| `git worktree add` | Workspace rule violation | Dry-Run agent blocks |
| Production data modification | DSGVO violation | Tierheim compliance skill |
| Autonomy expansion | Policy violation | `.opencode/policies/` |

## Minimal Safe Real-Mode Tests (After Human Approval)

These tests would be safe to execute after explicit `HUMAN_APPROVED_REAL=true`:

1. **Controlled file write test**: Write to `.positron/evidence/rudolph-real-test.json`, verify content, delete after test.
2. **Real vitest integration**: Re-run the existing benchmark tests under real mode, verify the exit codes match fixtures.
3. **Evidence artifact creation**: Create a real `run-summary.json` from a live run, validate schema.
4. **Safety gate verification**: Confirm that even in real mode, RED_HOLD actions remain blocked.

## Required Human Approval

Before ANY real-mode execution, the following must be true:

1. `POSITRON_ENABLE_REAL=true` — environment variable (not set by default)
2. `HUMAN_APPROVED_REAL=true` — explicit human approval gate
3. Owner has reviewed the real-mode test plan
4. Owner has acknowledged the scope of real-mode actions
5. A backup or snapshot has been considered (optional but recommended)

## Kill-Switches That Must Remain Active

| Kill-Switch | Default | Purpose |
|-------------|---------|---------|
| `POSITRON_ENABLE_PUSH` | unset | Prevents all git push |
| `POSITRON_MERGE_KILL_SWITCH` | active | Prevents merges and branch deletion |
| `POSITRON_ENABLE_DRY_RUN` | unset (off) | When set, forces dry-run even in 'real' mode |
| `POSITRON_FAKE_MODE` | unset (real-ish) | When set, GitHub/network calls are mocked |

## Why Real-Mode Is Not Started Automatically

1. **Safety First**: Real-mode writes files. Even controlled-path writes carry risk.
2. **No Rollback**: Without a human in the loop, an automated real-mode run could leave artifacts that confuse later analysis.
3. **Human Judgment Required**: The decision about WHEN real-mode is appropriate (e.g., after all tests pass, after review) requires human context about the broader project state.
4. **Policy Compliance**: Positron's architecture explicitly gates real execution behind human approval per the evidence gates and agent rules.

## Current State

- Benchmark has `executionMode` schema support for 'real' ✅
- `BenchmarkRunner` detects real mode and downgrades to dry-run ✅
- Warning is emitted: "REAL execution mode requested — requires HUMAN APPROVAL" ✅
- Red Test 19 verifies this gate ✅
- No real-mode execution has occurred ❌ (by design)

## When Real-Mode Becomes Appropriate

Real-mode testing becomes appropriate when:

1. All fixture and dry-run tests pass at high confidence (>= 0.90)
2. Evidence schema validation passes
3. Coverage measurement is complete and acceptable
4. Reviewer-Agent has approved the current state
5. Owner explicitly sets `HUMAN_APPROVED_REAL=true`
