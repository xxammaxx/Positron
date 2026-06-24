# Issue #279 Phase 1C — Read-only GitHub Snapshot Collector/CLI

## Kurzfazit

Implement a read-only GitHub Snapshot Collector/CLI that gathers GitHub issue/PR state via `gh` read-only commands and feeds normalized snapshots into the Phase 1B GitHub Context Reconciler.

## Problem

The reconciler can classify snapshots, but Positron still needs a safe collector path from live GitHub state to normalized snapshot input. This must be read-only and must never mutate GitHub state.

## Goals

- Collect repository metadata.
- Collect open PRs.
- Collect open issues.
- Collect targeted PR #218 state.
- Collect targeted issues #229, #268, #279.
- Normalize `gh` JSON into GitHubContextSnapshot.
- Run reconcileGitHubContext().
- Run validateDecisionManifest().
- Print deterministic decision summary.
- Support `--dry-run`.
- Support `--output <path>` for local JSON artifact.
- Default output path must be under an ignored/local evidence path or explicitly documented.

## Non-Goals

- No GitHub mutations.
- No PR merge/close.
- No issue close/comment.
- No workflow run/rerun.
- No remote CI dependency.
- No PR #218 action.
- No Issue #229 closure.
- No Issue #279 closure.
- No automatic apply actions.

## Acceptance Criteria

- Collector only uses read-only gh commands.
- Script refuses dangerous command names.
- PR #218-like live/synthetic fixture produces YELLOW_REVIEW.
- Tool gaps become TOOL_GAP.
- Output validates with Decision Manifest Validator.
- Applyable actions remain zero for current repo snapshot unless explicitly safe.
- CLI can run in dry-run/test mode without network.
- Tests do not call GitHub.
