# Issue #279 Phase 1A — Decision Manifest Validator MVP

## Kurzfazit

Implement a local validator for Positron decision manifests.

## Problem

Agents must not execute GitHub actions from a cleanup matrix unless the manifest explicitly permits it. Past analysis showed GREEN_SAFE can still be DO_NOT_APPLY. Therefore risk class alone is insufficient.

## Goals

- Parse a decision manifest CSV.
- Validate required columns.
- Validate known risk classes.
- Validate known agent recommendations.
- Compute counts by risk class.
- Compute applyable GREEN_SAFE actions.
- Return zero applyable actions when all recommendations are DO_NOT_APPLY.
- Flag YELLOW_REVIEW, RED_HOLD, UNKNOWN, TOOL_GAP as non-applyable.
- Produce a structured validation summary.

## Non-Goals

- No GitHub API calls.
- No issue/PR mutation.
- No merge/close/apply behavior.
- No remote CI.
- No PR #218 action.
- No Issue #229/#279 closure.

## Required Types

- RiskClass
- AgentRecommendation
- DecisionManifestRow
- DecisionManifestValidationResult

## Required API

- parseDecisionManifestCsv(input: string): DecisionManifestRow[]
- validateDecisionManifest(rows: DecisionManifestRow[]): DecisionManifestValidationResult
- getApplyableGreenSafeActions(rows: DecisionManifestRow[]): DecisionManifestRow[]

## Accepted Values

### RiskClass
- GREEN_SAFE
- YELLOW_REVIEW
- RED_HOLD
- UNKNOWN
- TOOL_GAP
- DEFER_TO_279

### AgentRecommendation
- APPLY_GREEN_SAFE
- DO_NOT_APPLY
- REVIEW_REQUIRED
- HOLD
- DEFER

## Acceptance Criteria

- Missing required columns produce validation errors.
- Unknown risk classes produce validation errors.
- Unknown recommendations produce validation errors.
- GREEN_SAFE + DO_NOT_APPLY is not applyable.
- GREEN_SAFE + APPLY_GREEN_SAFE is applyable.
- YELLOW_REVIEW is never applyable.
- RED_HOLD is never applyable.
- UNKNOWN/TOOL_GAP is never applyable.
- Empty manifests are invalid.
- Tests cover current cleanup finding: 5 GREEN_SAFE but 0 applyable actions.

## Local Gates

- npm run build
- npm run typecheck
- npm test
- npm test --workspace apps/web
