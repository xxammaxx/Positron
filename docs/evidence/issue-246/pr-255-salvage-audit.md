# Issue #246 — PR #255 Salvage Audit

## Timestamp
2026-06-29T07:20:00Z

## PR #255 Overview

| Field | Value |
|-------|-------|
| Number | 255 |
| Title | feat(issue-243): enforce P0 runtime safety gates |
| State | **CLOSED** |
| Merged | **NO** |
| Mergeable | **CONFLICTING** |
| Draft | No |
| Head Branch | `positron/issue-243-p0-runtime-safety` |
| Base Branch | `main` |
| Total Files | 29 |

## File Classification

### Files Related to #246 (GateType Enforcement)
**None directly in PR #255.** The 29 files did NOT include any `packages/run-state/` changes. The #246-related implementation descriptions in issue comments (GateEvaluator registry, evaluateGates, tryTransitionWithGates, gate-enforcement.test.ts) reference work that either:
1. Was on a different branch not merged into this PR
2. Was aspirational/planned but not implemented
3. Was in a follow-up PR not captured

### Files Related to #244 (Workspace Cleanup)
- `packages/sandbox/` — workspace path validation, boundary checks
- CodeRabbit review comments mention workspace-root validation issues in real-adapter.ts

### Files Related to #245 (Audit Log Enforcement)
- `apps/server/src/index.ts` — likely contains audit log wiring
- `apps/server/src/oversight/` — human question store with audit tracking

### UI / Provider / Oversight / Blueprint Files (OUT OF SCOPE for #246)
- `apps/web/src/App.tsx`
- `apps/web/src/api.ts`
- `apps/web/src/pages/BlueprintLauncherPage.tsx`
- `apps/web/src/pages/OversightPage.tsx`
- `apps/web/src/pages/ProvidersPage.tsx`
- `apps/web/src/components/dashboard/DashboardPage.tsx`
- `apps/web/src/components/dashboard/ToolGatewayPanel.tsx`
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/components/oversight/ApprovalRequestCard.tsx`
- `apps/web/src/components/oversight/EvidencePreview.tsx`
- `apps/web/src/components/oversight/HumanQuestionQueue.tsx`
- `apps/web/src/components/oversight/RiskDecisionPanel.tsx`
- `apps/web/src/types.ts`
- `apps/server/src/infrastructure/` — infrastructure state routes, SQLite store
- `apps/server/src/oversight/human-question-store.ts`
- Various test files for UI/infrastructure components

### Documentation/Config Files (Out of scope)
- `CONTRIBUTING.md`, `README.md`, `SECURITY.md`

## Salvageable #246 Concepts from Issue Comments (NOT from PR code)

The following concepts are described in issue #246 comments and are safe to reimplement:

| Concept | Safety | Notes |
|---------|--------|-------|
| GateEvaluator registry | **SAFE_TO_PORT** | registerGateEvaluator / clearGateEvaluators pattern |
| evaluateGates() | **SAFE_TO_PORT** | Missing evaluator → blocking failure |
| tryTransitionWithGates() | **SAFE_TO_PORT** | Gate eval + phase transition combined |
| PHASE_GATE_REQUIREMENTS | **SAFE_TO_PORT** | Map phases to gate types |
| Security cannot override human_approval | **SAFE_TO_PORT** | Safety invariant |
| gate-enforcement.test.ts | **REFERENCE_ONLY** | Test patterns useful, but must be rewritten for current main |

## What Must Be Discarded

1. **All UI changes** — OversightPage, ProvidersPage, BlueprintLauncher, Dashboard, Sidebar
2. **Infrastructure state routes** — server-side persistence not needed for #246
3. **Human question store** — already exists in main via #215
4. **CodeRabbit config** — decommissioned
5. **PR #255 itself** — cannot be merged or reactivated

## Compatibility Assessment

Since PR #255 had NO run-state changes (29 files, none in `packages/run-state/`), the actual #246 implementation code is NOT available from PR #255. We must implement from scratch using the conceptual design from the issue.

The current main branch has:
- `packages/shared/src/types.ts` — GateType, GateResult, GateLayerResult types defined (#243)
- `packages/run-state/src/state-machine.ts` — State machine with transitions, GATE_APPROVE, CLEANUP
- `apps/server/src/index.ts` — Server pipeline wiring
- `apps/worker/src/index.ts` — Worker pipeline wiring
- Various tests from #215, #244, #245

## Classification

**PR_255_SALVAGE_STATUS: USE_AS_REFERENCE_ONLY**

PR #255 cannot be merged or reactivated. It mixed UI/Oversight/Provider/Blueprint scope with #244/#245/#246 work, is CLOSED/NOT_MERGED/CONFLICTING, and contains NO run-state code for GateType enforcement. The conceptual design described in issue #246 comments (GateEvaluator registry, evaluateGates, tryTransitionWithGates, PHASE_GATE_REQUIREMENTS) is safe to reimplement from scratch against current main.
