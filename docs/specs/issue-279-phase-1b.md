# Issue #279 Phase 1B — GitHub Context Reconciler MVP

## Kurzfazit

Implement a pure/local reconciler that maps GitHub issue/PR snapshots into Decision Manifest rows validated by the Phase 1A Decision Manifest Validator.

## Problem

GitHub live state can be stale, incomplete, conflicting, or blocked by tool gaps. Agents must not interpret open PRs or GREEN_SAFE labels as applyable actions unless both the risk class and recommendation allow it.

## Goals

- Accept GitHub issue and PR snapshot objects.
- Classify PRs and issues into Decision Manifest rows.
- Mark PRs with unresolved actionable review findings as YELLOW_REVIEW + REVIEW_REQUIRED.
- Mark tool gaps as TOOL_GAP + REVIEW_REQUIRED.
- Mark superseded/deferred architecture items as DEFER_TO_279 + DEFER.
- Never output APPLY_GREEN_SAFE unless a rule explicitly proves the action is safe.
- Integrate with validateDecisionManifest().
- Provide deterministic output.
- No GitHub API calls.
- No GitHub mutations.

## Non-Goals

- No gh CLI execution from the module.
- No issue close.
- No PR close.
- No merge.
- No remote CI.
- No PR #218 action.
- No Issue #229 closure.
- No Issue #279 implementation beyond this MVP.

## MVP Inputs

- GitHubIssueSnapshot[]
- GitHubPullRequestSnapshot[]
- optional ReviewFindingSnapshot[]
- optional StatusCheckSnapshot[]

## MVP Output

- DecisionManifestRow[]
- GitHubContextReconciliationResult

## Core Classification Rules

1. Open PR with unresolved actionable findings → YELLOW_REVIEW + REVIEW_REQUIRED.
2. Open mergeable PR with unknown review status → TOOL_GAP + REVIEW_REQUIRED.
3. Conflicting PR → YELLOW_REVIEW or RED_HOLD, never applyable.
4. Closed superseded PR → GREEN_SAFE + DO_NOT_APPLY.
5. Open issue marked deferred/replacement/architecture → DEFER_TO_279 + DEFER.
6. RED_HOLD labels or data-loss risk markers → RED_HOLD + HOLD.
7. Unknown state → TOOL_GAP + REVIEW_REQUIRED.
8. No row may become applyable unless risk_class=GREEN_SAFE and agent_recommendation=APPLY_GREEN_SAFE.

## Acceptance Criteria

- PR #218-like fixture with 9 findings becomes YELLOW_REVIEW + REVIEW_REQUIRED.
- PR #228-like conflicting fixture is not applyable.
- Old #229 chain closed/superseded fixture becomes non-applyable.
- Issue #279 fixture becomes DEFER_TO_279 + DEFER or YELLOW_REVIEW + REVIEW_REQUIRED depending on current labels/body.
- Output passes validateDecisionManifest().
- getApplyableGreenSafeActions() returns zero for PR #218/#279/#229 fixture scenario.
- No GitHub writes exist in code.

## Safety Default

Default classification is non-applyable. APPLY_GREEN_SAFE is never emitted in the MVP.
The safest row type is GREEN_SAFE + DO_NOT_APPLY (for closed/superseded items).
