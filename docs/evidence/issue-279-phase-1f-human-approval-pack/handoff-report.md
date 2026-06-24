# Issue #279 Phase 1F — Human Approval Pack Generator Handoff

## Kurzfazit

Implemented Human Approval Pack Generator that translates Evidence Gate Reports into simple GREEN/YELLOW/RED/TOOL_GAP/DEFER owner decision packages. 18 new tests, 0 regressions. No GitHub mutations, no apply behavior, no auto-fix commands.

## Reality Refresh

- Arbeitsroot: C:\Positron
- Branch: feat/issue-279-phase-1f-human-approval-pack
- HEAD: bca0f65 (before changes)
- origin/main: bca0f65
- Dirty state before: docs/audits/ (untracked), evidence/ (untracked)
- PR #293: MERGED
- PR #218: OPEN, YELLOW_REVIEW
- Issue #279: OPEN

## Phase 1A/1B/1C/1D/1E Contracts Used

- DecisionManifestRow: risk_class, agent_recommendation, action_id
- EvidenceGateReport: status, summary, applyableRows, blockedRows, validation, localGateReport
- LocalGateReport: status, results per gate kind
- EvidenceGateReportOptions: localGateReport? for Phase 1E integration
- applyable action contract: only GREEN_SAFE + APPLY_GREEN_SAFE is applyable

## Implemented Files

1. `docs/specs/issue-279-phase-1f.md` — Phase 1F specification
2. `packages/shared/src/human-approval-pack.ts` — Core module (278 lines)
   - `ApprovalPackageType`: GREEN_SAFE_PACKAGE, YELLOW_REVIEW_PACKAGE, RED_HOLD_PACKAGE, TOOL_GAP_PACKAGE, DEFER_TO_279_PACKAGE, MIXED_RISK_PACKAGE
   - `ApprovalPackageStatus`: READY_FOR_APPROVAL, REVIEW_REQUIRED, HOLD, DEFER, BLOCKED
   - `ApprovalPackage`: id, type, status, title, summary, rowIds, riskClasses, recommendations, applyable, approvalPhrase, blockerReasons, warnings
   - `ApprovalPackReport`: status, totalPackages, applyablePackages, reviewPackages, holdPackages, deferredPackages, packages
   - `createHumanApprovalPackReport(EvidenceGateReport)`: pure function, deterministic, no side effects
3. `packages/shared/src/__tests__/human-approval-pack.test.ts` — 18 tests
4. `packages/shared/src/evidence-gate.ts` — `createEvidenceGateReportFromGitHubContext` now accepts options (W-2 fix)
5. `packages/shared/src/local-gate-runner.ts` — added `npx biome lint .` as advisory gate (W-1 fix)
6. `packages/shared/src/index.ts` — export human-approval-pack
7. `scripts/run-evidence-gate.mjs` — `--approval-pack` CLI option, approval pack rendering and integration
8. `docs/evidence/issue-279-phase-1f-human-approval-pack/handoff-report.md` — this file

## Not Changed

- no GitHub mutations
- no PR #218 action
- no Issue #229 closure
- no Issue #279 closure
- no workflows
- no dependencies
- no stashes
- no auto-fix commands
- no apply execution
- no apps/*
- no .opencode/*
- no package.json / package-lock.json

## Red Test Evidence

- Before implementation: 18 tests SKIPPED (module not found)
- Module import failed cleanly with ERR_MODULE_NOT_FOUND

## Green Test Evidence

- `human-approval-pack.test.ts`: 18/18 PASS
- `evidence-gate.test.ts`: 27/27 PASS (including local gate integration)
- `local-gate-runner.test.ts`: 29/29 PASS
- `decision-manifest.test.ts`: 17/17 PASS
- `github-context-reconciler.test.ts`: 17/17 PASS
- `github-snapshot-collector.test.ts`: 41/41 PASS
- Total shared: 149/149 PASS
- Full `npm test`: 1066/1066 PASS (core) + 196/196 PASS (apps/web)
- Build: PASS
- Typecheck: PASS

## CLI Dry-Run Evidence

### Basic dry-run
```
node scripts/run-evidence-gate.mjs --dry-run --repo xxammaxx/Positron
→ Exit 0, WARN status, 0 applyable actions
```

### With approval pack
```
node scripts/run-evidence-gate.mjs --dry-run --approval-pack --repo xxammaxx/Positron
→ 3 packages: GREEN_SAFE_PACKAGE (blocked DO_NOT_APPLY), YELLOW_REVIEW_PACKAGE (PR-218), DEFER_TO_279_PACKAGE (4 issues)
→ Exit 0, WARN status
```

### With local gates + approval pack
```
node scripts/run-evidence-gate.mjs --dry-run --include-local-gates --local-gates-dry-run --approval-pack --repo xxammaxx/Positron
→ 8 local gates SKIPPED (dry-run), PASS verdict
→ 3 approval packages
→ Exit 0, WARN status
```

## Approval Pack Evidence

Generated packages from dry-run fixture:

| Package | Type | Status | Applyable | Approval Phrase |
|---------|------|--------|-----------|-----------------|
| GREEN_SAFE_PACKAGE-1 | GREEN_SAFE | READY_FOR_APPROVAL | No (DO_NOT_APPLY) | APPROVE REVIEW GREEN_SAFE_PACKAGE GREEN_SAFE_PACKAGE-1 |
| YELLOW_REVIEW_PACKAGE-2 | YELLOW_REVIEW | REVIEW_REQUIRED | No | APPROVE REVIEW YELLOW_REVIEW_PACKAGE YELLOW_REVIEW_PACKAGE-2 |
| DEFER_TO_279_PACKAGE-3 | DEFER_TO_279 | DEFER | No | DEFER DEFER_TO_279_PACKAGE DEFER_TO_279_PACKAGE-3 TO ISSUE 279 |

Owner Decision Summary:
```
→ APPROVE REVIEW GREEN_SAFE_PACKAGE GREEN_SAFE_PACKAGE-1
→ APPROVE REVIEW YELLOW_REVIEW_PACKAGE YELLOW_REVIEW_PACKAGE-2
→ DEFER DEFER_TO_279_PACKAGE DEFER_TO_279_PACKAGE-3 TO ISSUE 279
→ No applyable packages. No automated mutations possible.
```

## Local Gates

- Build: PASS
- Typecheck: PASS
- npm test (core): 1066/1066 PASS
- npm test (apps/web): 196/196 PASS
- Biome format: 33 pre-existing errors (advisory-only per ci-policy.md)
- Git diff --check: PASS

## Safety Notes

- No action execution in module or CLI
- No GitHub mutations
- Pure functions in shared module
- CLI only loads and prints — no write outside controlled paths
- `--approval-pack` is additive, never destructive
- W-1: `npx biome lint .` added as advisory gate
- W-2: Status recomputation unified through `createEvidenceGateReportFromGitHubContext` options parameter

## Risks / Blockers

- None. All tests pass, all acceptance criteria met.
- Biome format errors are pre-existing and advisory-only.
- GitHub-CI remains advisory-only per Issue #268.

## Was kann die Software jetzt im Vergleich zum vorherigen Lauf?

### Neue Fahigkeiten

- Human Approval Pack Generator exists and is tested
- Evidence Gate can produce simple owner decision packages
- GREEN/YELLOW/RED/TOOL_GAP/DEFER packages are generated
- Deterministic approval phrases: "APPROVE APPLY", "APPROVE REVIEW", "HOLD", "NEEDS VALIDATION", "DEFER"
- GREEN_SAFE + DO_NOT_APPLY remains blocked with blocker reasons
- Failing required local gate blocks GREEN apply package with blocker reasons
- CLI option `--approval-pack` works in all modes (dry-run, local gates, output)
- W-1: `npx biome lint .` added to default local gate definitions
- W-2: Status recomputation deduplicated via options parameter

### Entfernte Blocker

- Positron can now translate technical evidence into human-simple decision packages

### Unveranderte Einschrankungen

- No GitHub API apply
- No PR #218 merge
- No Issue #229 close
- No stash applied
- No CI reruns
- GitHub-CI advisory-only

### Verbleibende Risiken

- PR #218 findings (9 CodeRabbit, 2 actionable)
- Live apply remains forbidden
- Issue #279 Phase 1G pending
- Biome rest backlog (33 advisory errors)

### Nachster sinnvoller Schritt

After review/merge of this Phase 1F PR:
Issue #279 Phase 1G — Safe Apply Plan Export
