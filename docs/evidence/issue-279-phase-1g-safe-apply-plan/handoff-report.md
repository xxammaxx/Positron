# Issue #279 Phase 1G — Safe Apply Plan Export Handoff

## Kurzfazit

Safe Apply Plan Export wurde erfolgreich implementiert. Human Approval Pack Reports (Phase 1F) können jetzt in nicht-ausführende, prüfbare Apply-Pläne übersetzt werden. Jede Plan-Action hat `executable: false`. Keine GitHub-Mutationen, kein Apply-Verhalten, keine Auto-Fix-Kommandos.

## Reality Refresh

| Check | Status |
|-------|--------|
| Arbeitsroot | C:\Positron |
| Branch | feat/issue-279-phase-1g-safe-apply-plan-20260624-135722 |
| HEAD | b9888a27 (based on main) |
| origin/main | b9888a27 |
| Dirty state | Only untracked (docs/audits/, evidence/, docs/specs/issue-279-phase-1g.md) |
| Worktrees | 1 (C:\Positron only) |
| Sibling folders | 0 |
| Stashes | 2 (preserved intact) |
| Repo visibility | PUBLIC |
| PR #294 (Phase 1F) | MERGED |
| PR #218 | OPEN, YELLOW_REVIEW (not touched) |
| Issue #229 | OPEN (not touched) |
| Issue #268 | OPEN (CI advisory-only, not touched) |
| Issue #279 | OPEN |

## Phase 1A/1B/1C/1D/1E/1F Contracts Used

- **Phase 1A:** `DecisionManifestRow`, `RiskClass`, `AgentRecommendation` — not directly used, but foundational
- **Phase 1B:** `GitHubContextSnapshot` — not directly used (consumed by Phase 1D)
- **Phase 1C:** Snapshot Collector — not directly used
- **Phase 1D:** `EvidenceGateReport` — consumed indirectly via Phase 1F bridge
- **Phase 1E:** `LocalGateReport` — consumed indirectly via Phase 1F bridge
- **Phase 1F:** `ApprovalPackage`, `ApprovalPackReport` — **direct input** to `createSafeApplyPlanReport()`
- **Phase 1F:** `createHumanApprovalPackReport()` — called from CLI before Safe Apply Plan

## Implemented Files

| File | Type | Lines |
|------|------|-------|
| `packages/shared/src/safe-apply-plan.ts` | Core module (NEW) | 306 |
| `packages/shared/src/__tests__/safe-apply-plan.test.ts` | Tests (NEW) | 350 |
| `packages/shared/src/index.ts` | Barrel export (MODIFIED +1 line) | 26 |
| `scripts/run-evidence-gate.mjs` | CLI (MODIFIED ~50 lines) | 980 |
| `docs/specs/issue-279-phase-1g.md` | Spec (NEW) | 110 |
| `docs/evidence/issue-279-phase-1g-safe-apply-plan/handoff-report.md` | Evidence (NEW) | this file |

## Not Changed

- No GitHub mutations
- No PR #218 action
- No Issue #229 closure
- No Issue #279 closure
- No workflows (.github/workflows/*)
- No dependencies (package.json, package-lock.json)
- No .opencode/ files
- No stashes applied/popped/dropped
- No auto-fix commands (npx biome --write, etc.)
- No apply execution
- No lockfile changes

## Red Test Evidence

Red tests were confirmed failing (module not found) before implementation:

```text
FAIL  packages/shared/src/__tests__/safe-apply-plan.test.ts
Error: Cannot find module '../safe-apply-plan.js'
```

## Green Test Evidence

All 27 Safe Apply Plan tests pass:

```text
Test Files  1 passed (1)
     Tests  27 passed (27)
```

All existing test suites pass (no regressions):

| Suite | Tests | Status |
|-------|-------|--------|
| safe-apply-plan | 27/27 | PASS |
| human-approval-pack | 18/18 | PASS |
| evidence-gate | 27/27 | PASS |
| local-gate-runner | 29/29 | PASS |
| decision-manifest | 19/19 | PASS |
| github-context-reconciler | 17/17 | PASS |
| github-snapshot-collector | 40/40 | PASS |
| All other core suites | ~916 | PASS |
| **Core total** | **1093/1093** | **PASS** |
| apps/web | 196/196 | PASS |

## CLI Dry-Run Evidence

### Basic approval-pack + safe-apply-plan
```bash
node scripts/run-evidence-gate.mjs --dry-run --approval-pack --safe-apply-plan
→ Exit 0, WARN status, 3 plans, 0 executable
```

### With local gates + safe-apply-plan
```bash
node scripts/run-evidence-gate.mjs --dry-run --include-local-gates --local-gates-dry-run --approval-pack --safe-apply-plan
→ Exit 0, WARN status, 8 local gates SKIPPED, 3 plans, 0 executable
```

### JSON output
```bash
node scripts/run-evidence-gate.mjs --dry-run --include-local-gates --local-gates-dry-run --approval-pack --safe-apply-plan --output ".local-release/evidence-gate/evidence-gate-safe-apply-plan-dry-run.json" --format json
→ Exit 0, JSON written to gitignored path
```

## Safe Apply Plan Evidence

From the dry-run with the Positron repo fixture:

- **3 plans generated**: YELLOW_REVIEW_PLAN (PR #218), DEFER_TO_279_PLAN (4 issues), BLOCKED_PLAN (GREEN_SAFE + DO_NOT_APPLY for PR #291)
- **All plans explicitly non-executing** (`executable: false`)
- **0 executable plans** (type-level enforcement)
- **PR #218** correctly mapped to `YELLOW_REVIEW_PLAN` with approval phrase preserved
- **Issue #279** correctly mapped to `DEFER_TO_279_PLAN`
- **GREEN_SAFE + DO_NOT_APPLY** correctly blocked as `BLOCKED_PLAN`
- **Every action has `blocked=true`** when package is not applyable

## Local Gates

| Gate | Result |
|------|--------|
| git diff --check | PASS |
| npm run build | PASS |
| npm run typecheck | PASS (all projects up to date) |
| npm test (core) | 1093/1093 PASS |
| npm test (apps/web) | 196/196 PASS |
| biome format | Advisory (pre-existing evidence/ files) |
| biome check | Advisory-only (pre-existing lint backlog) |

## Safety Notes

- Safe Apply Plan Export has ZERO execution capability
- No `execute`, `apply`, `run`, or mutation functions in the module
- `executablePlans` is always literal `0` — enforced at type level
- CLI never executes any actions from plans
- No GitHub API mutations, no shell execution, no network calls in the shared module
- Approval phrases are preserved but never executed
- Output path `.local-release/` is gitignored

## Risks / Blockers

- PR #218 remains OPEN with 9 CodeRabbit findings (YELLOW_REVIEW, DO_NOT_MERGE_NOW)
- Issue #268 GitHub-CI remains advisory-only
- Biome lint backlog remains advisory-only
- Live Apply remains verboten
- stash@{0} and stash@{1} preserved intact

## Was kann die Software jetzt im Vergleich zum vorherigen Lauf?

### Neue Fähigkeiten

- Safe Apply Plan Export existiert
- Approval Packs können in nicht-ausführende Apply-Pläne übersetzt werden
- Jede Plan-Action hat `executable=false`
- GREEN_SAFE + DO_NOT_APPLY bleibt blockiert
- Failing required local gate blockiert GREEN Apply Plan
- CLI-Option `--safe-apply-plan` existiert
- JSON Output enthält `safeApplyPlanReport`
- Human-readable output zeigt nicht-ausführende Pläne

### Entfernte Blocker

- Positron kann nun nicht-ausführende Apply-Pläne aus menschlichen Entscheidungspaketen erzeugen

### Unveränderte Einschränkungen

- Kein GitHub API Apply
- Kein PR #218 Merge
- Kein Issue #229 Close
- Keine Stash-Operationen
- Keine CI-Reruns
- GitHub-CI advisory-only

### Verbleibende Risiken

- PR #218 Findings (9 CodeRabbit findings)
- Live Apply bleibt verboten
- Issue #279 Phase 1H noch nicht implementiert
- Biome Restbacklog (~478 errors)

### Nächster sinnvoller Schritt

Nach Review/Merge dieses Phase-1G-PRs:

**Issue #279 Phase 1H** — Apply Plan Reviewer, der Safe Apply Plans gegen Policies prüft und weiterhin nichts ausführt.
