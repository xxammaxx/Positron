# Issue #279 Phase 1C — GitHub Snapshot Collector Handoff

## Kurzfazit

**GREEN.** GitHub Snapshot Collector MVP is implemented, tested, and validated. Read-only CLI collects gh JSON, normalizes it, feeds the Phase 1B reconciler, and prints decision summaries.

## Reality Refresh

| Property | Value |
|----------|-------|
| Working root | `C:\Positron` |
| Branch | `feat/issue-279-phase-1c-github-snapshot-collector` |
| HEAD | `265e440` (main) |
| Repo visibility | PUBLIC |
| PR #290 | MERGED |
| Issue #279 | OPEN |
| Issue #268 | OPEN |

## Phase 1A/1B Contracts Used

- `DecisionManifestRow` — `{ action_id, risk_class, agent_recommendation }`
- `RiskClass` — `GREEN_SAFE | YELLOW_REVIEW | RED_HOLD | UNKNOWN | TOOL_GAP | DEFER_TO_279`
- `GitHubIssueSnapshot`, `GitHubPullRequestSnapshot`, `GitHubContextSnapshot`
- `reconcileGitHubContext()`, `reconcileGitHubContextToDecisionManifestRows()`
- `validateDecisionManifest()`, `getApplyableGreenSafeActions()`

## Implemented Files

1. `docs/specs/issue-279-phase-1c.md` — Phase 1C specification
2. `packages/shared/src/github-snapshot-collector.ts` — Normalizer/collector module (pure functions)
3. `packages/shared/src/__tests__/github-snapshot-collector.test.ts` — 40 green tests
4. `packages/shared/src/index.ts` — Barrel export (+1 line)
5. `scripts/collect-github-context.mjs` — Read-only CLI script
6. `docs/evidence/issue-279-phase-1c-github-snapshot-collector/handoff-report.md` — This file

Dist artifacts (build-generated, tracked barrel only):
7. `packages/shared/dist/index.d.ts` — Updated
8. `packages/shared/dist/index.d.ts.map` — Updated
9. `packages/shared/dist/index.js` — Updated
10. `packages/shared/dist/index.js.map` — Updated

## Not Changed

- no GitHub mutations
- no PR #218 action
- no Issue #229 closure
- no Issue #279 closure
- no workflows
- no dependencies
- no lockfiles
- no stashes
- no `.opencode/`
- no `.env`
- no secrets

## Green Test Evidence

All 40 tests pass:
```
 ✓ normalizeGitHubIssuesFromGhJson > normalizes gh issue list JSON into GitHubIssueSnapshot[]
 ✓ returns empty array for empty input
 ✓ returns empty array for non-array input
 ✓ handles missing optional fields gracefully
 ✓ extracts labels as string[] from gh object format
 ✓ normalizeGitHubPullRequestsFromGhJson > normalizes gh pr list JSON into GitHubPullRequestSnapshot[]
 ✓ preserves DRAFT state
 ✓ preserves CLOSED with null mergeable
 ✓ enriches with review findings when enrichment data provided
 ✓ returns empty array for non-array input
 ✓ handles missing optional fields gracefully
 ✓ marks findingsAccessible=false when no enrichment provided for PR
 ✓ createGitHubContextSnapshot > creates GitHubContextSnapshot from normalized data
 ✓ handles empty inputs
 ✓ handles non-array inputs by returning empty arrays
 ✓ snapshot → reconciler → validator pipeline > current repo-like fixture produces 0 applyable actions
 ✓ PR #218-like fixture with enrichment produces YELLOW_REVIEW
 ✓ enriched PR #218-like fixture applyable count is zero
 ✓ full repo fixture rows pass validateDecisionManifest()
 ✓ Issue #279 is classified as DEFER_TO_279 + DEFER
 ✓ Issue #268 becomes DEFER_TO_279 due to infrastructure label
 ✓ isAllowedReadOnlyGhCommand > allows gh repo view
 ✓ allows gh pr list / view / issue list / view
 ✓ blocks gh pr merge / close / comment
 ✓ blocks gh issue close / comment / workflow run / run rerun
 ✓ blocks empty / non-gh / gh api
 ✓ getAllowedReadOnlyGhCommands > returns known allowlist, no mutate commands
 ✓ deterministic ordering stable
```

Reconciler tests: 17/17 PASS. Decision Manifest tests: 19/19 PASS.

## CLI Dry-Run Evidence

```
Positron GitHub Snapshot Collector — Phase 1C
  Repo: xxammaxx/Positron
  Dry-run: true

[1/3] Collecting open issues...
[DRY-RUN] gh issue list --repo xxammaxx/Positron --state open --limit 100 --json ...
[2/3] Collecting open PRs...
[DRY-RUN] gh pr list --repo xxammaxx/Positron --state open --limit 100 --json ...

--- Decision Summary ---
  Rows: 0
  Valid: YES
  Applyable: 0
  Errors: 0
  Warnings: 0
```

## Local Gates

| Gate | Status |
|------|--------|
| `git diff --check` | ✅ CLEAN |
| `npm run build` | ✅ PASS |
| `npm run typecheck` | ✅ PASS (9 projects up to date) |
| Snapshot collector tests | ✅ 40/40 PASS |
| Reconciler tests | ✅ 17/17 PASS |
| Decision manifest tests | ✅ 19/19 PASS |
| `npm test` (core) | ✅ 993/993 PASS (53 files) |
| `npm test` (apps/web) | ✅ 196/196 PASS (8 files) |
| CLI `--dry-run` | ✅ Works with reconciler |
| Dist consistency | ✅ Barrel only, individual files gitignored |

## Safety Notes

- All 40 tests pass with ZERO applyable actions
- CLI uses read-only command allowlist — no mutate commands possible
- PR #218-like fixture → YELLOW_REVIEW ✅
- No GitHub writes, no mutations, no network calls in shared module
- Pure functions in shared module — deterministic output
- CLI spawns `gh` only with allowlisted read-only commands

## Risks / Blockers

- None. Ready for review and merge.

## Was kann die Software jetzt im Vergleich zum vorherigen Lauf?

### Neue Fähigkeiten

* ✅ GitHub Snapshot Collector exists and is tested
* ✅ gh issue/pr JSON → normalized snapshot → reconciler → decision summary pipeline
* ✅ Read-only CLI with `--dry-run`, `--output`, `--target-pr` flags
* ✅ PR #218-like enrichment with review findings produces YELLOW_REVIEW
* ✅ Deterministic sorting, 0 applyable actions by default
* ✅ Command allowlist blocks all GitHub mutations

### Entfernte Blocker

* ✅ Positron can now safely collect live GitHub context and produce decision summaries

### Unveränderte Einschränkungen

* ⬜ No GitHub API Apply
* ⬜ No PR #218 Merge
* ⬜ No Issue #229 Close
* ⬜ No stash applied
* ⬜ No CI reruns
* ⬜ GitHub-CI advisory-only

### Verbleibende Risiken

* PR #218 has 9 unresolved CodeRabbit findings
* Issue #279 Phase 1D (Evidence Gate CLI) still pending
* Biome lint backlog (~478 errors)

### Nächster sinnvoller Schritt

**Issue #279 Phase 1D** — Evidence Gate CLI, das Snapshot Collector + Reconciler + Validator zu einem lokalen auditierbaren Decision Report verbindet.
