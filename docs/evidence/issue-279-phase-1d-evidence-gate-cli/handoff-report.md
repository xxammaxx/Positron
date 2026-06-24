# Issue #279 Phase 1D — Evidence Gate CLI Handoff

## Kurzfazit

**GREEN** — Evidence Gate CLI MVP successfully implemented. Combines Snapshot Collector + Reconciler + Validator into an audit-ready decision report. No GitHub mutations, no apply behavior.

## Reality Refresh

| Item | Value |
|------|-------|
| Working root | C:\Positron |
| Branch | feat/issue-279-phase-1d-evidence-gate-cli |
| HEAD | Based on main @ 16e75b67454f1023a819f0f450bca4111a2238ec |
| origin/main | 16e75b67454f1023a819f0f450bca4111a2238ec |
| Dirty state | Only untracked `docs/audits/`, `evidence/` |
| Worktrees | Only C:\Positron (main) |
| Positron folders | Only C:\Positron |
| Stashes | stash@{0}, stash@{1} (untouched) |
| Repo visibility | PUBLIC |
| PR #291 | MERGED |
| PR #218 | OPEN, MERGEABLE, YELLOW_REVIEW, 9 CodeRabbit findings |
| Issue #229 | OPEN |
| Issue #268 | OPEN |
| Issue #279 | OPEN |
| Open PR count | 1 |
| Open issue count | 15 |

## Phase 1A/1B/1C Contracts Used

- **DecisionManifestRow** from `decision-manifest.ts` — action_id, risk_class, agent_recommendation
- **validateDecisionManifest()** — returns DecisionManifestValidationResult
- **GitHubContextSnapshot** from `github-context-reconciler.ts` — pullRequests[], issues[]
- **reconcileGitHubContext()** — returns GitHubContextReconciliationResult { rows, validation, applyableCount }
- **Snapshot Collector normalize functions** — normalizeGitHubIssuesFromGhJson, normalizeGitHubPullRequestsFromGhJson, createGitHubContextSnapshot
- Same barrel export convention: `packages/shared/src/index.ts`

## Implemented Files

| # | File | Lines | Purpose |
|---|------|-------|---------|
| 1 | `docs/specs/issue-279-phase-1d.md` | ~70 | Phase 1D specification |
| 2 | `packages/shared/src/evidence-gate.ts` | 149 | Evidence Gate core: pure functions |
| 3 | `packages/shared/src/__tests__/evidence-gate.test.ts` | ~255 | 20 tests covering all acceptance criteria |
| 4 | `packages/shared/src/index.ts` | +1 line | Barrel export for evidence-gate |
| 5 | `scripts/run-evidence-gate.mjs` | ~330 | CLI script: dry-run, JSON output, safety checks |
| 6 | `docs/evidence/issue-279-phase-1d-evidence-gate-cli/handoff-report.md` | this file | Evidence handoff |

## Not Changed

- no GitHub mutations
- no PR #218 action
- no Issue #229 closure
- no Issue #279 closure
- no workflows (.github/workflows/*)
- no dependencies/package*.json
- no lockfiles
- no stashes applied/popped/dropped
- no `.env` exposed
- no `.opencode/` changes
- no `apps/*` changes
- no CI reruns

## Red Test Evidence

```
npx vitest run packages/shared/src/__tests__/evidence-gate.test.ts
→ 17/17 PASS (red: all expected NOT_IMPLEMENTED)
```

## Green Test Evidence

```
npx vitest run packages/shared/src/__tests__/evidence-gate.test.ts
→ 20/20 PASS
```

Test coverage:
1. creates evidence gate report from reconciled rows ✓
2. includes counts by risk class ✓
3. includes counts by agent recommendation ✓
4. includes applyable action count ✓
5. current repo-like fixture produces 0 applyable actions ✓
6. PR #218-like fixture remains YELLOW_REVIEW + REVIEW_REQUIRED ✓
7. TOOL_GAP rows are visible in report ✓
8. RED_HOLD rows are visible in report ✓
9. validation errors are surfaced ✓
10. report marks invalid manifest as failed ✓
11. report marks valid zero-apply manifest as passed ✓
12. output is deterministic ✓
13. JSON serialization is stable ✓
14. no mutation/apply field is produced ✓
15. GitHubContextSnapshot: reconciles and produces report ✓
16. GitHubContextSnapshot: PR #218 remains YELLOW_REVIEW ✓
17. GitHubContextSnapshot: DEFER_TO_279 rows present ✓
18. generatedAt is a valid ISO timestamp ✓
19. blockedRows contains all non-applyable rows ✓
20. status is WARN when warnings exist but no errors ✓

## CLI Dry-Run Evidence

```
node scripts/run-evidence-gate.mjs --dry-run --repo xxammaxx/Positron
→ Exit code: 0
→ Status: WARN
→ Applyable actions: 0
→ PR-218: YELLOW_REVIEW + REVIEW_REQUIRED
→ Defers: ISSUE-215, ISSUE-229, ISSUE-268, ISSUE-279 (DEFER_TO_279 + DEFER)
```

## Output File Test

```
node scripts/run-evidence-gate.mjs --dry-run --repo xxammaxx/Positron --output ".local-release/evidence-gate/evidence-gate-dry-run.json" --format json
→ Report written successfully
→ git check-ignore -v confirms .local-release/ is gitignored
```

## Local Gates

| Gate | Result |
|------|--------|
| git diff --check | PASS (no whitespace errors) |
| npm run build | PASS |
| npm run typecheck | PASS |
| evidence-gate tests | 20/20 PASS |
| snapshot collector tests | 40/40 PASS |
| reconciler tests | 17/17 PASS |
| decision-manifest tests | 19/19 PASS |
| npm test (core) | 1013/1013 PASS (54 files) |
| apps/web tests | 196/196 PASS (8 files) |
| CLI --dry-run | PASS |
| CLI --output | PASS (gitignored path) |

Total: **1209/1209 tests pass** across 62 test files. No flaky tests detected.

## Safety Notes

- Evidence Gate module: pure functions only — no network, no shell, no mutations
- CLI script: prohibited command patterns scanned before any execution
- gh command allowlist enforced (same as Snapshot Collector)
- Output path validated against system/path traversal
- No apply or mutate fields in report structure
- No secrets, no .env access
- `.local-release/` confirmed gitignored

## Risks / Blockers

- PR #218 remains OPEN with 9 CodeRabbit findings (YELLOW_REVIEW, not touched)
- Issue #229 remains OPEN (not touched)
- Issue #268 remains OPEN — GitHub CI advisory-only
- Issue #279 remains OPEN — Phase 1E is next
- dist artifacts may need regeneration after this PR

## Was kann die Software jetzt im Vergleich zum vorherigen Lauf?

### Neue Fähigkeiten
- Evidence Gate CLI exists (`scripts/run-evidence-gate.mjs`)
- Local Decision Report can be generated (human-readable + JSON)
- Snapshot Collector + Reconciler + Validator are connected end-to-end
- JSON output for automated processing
- Dry-run for offline testing
- Applyable actions default to 0 (safe)

### Entfernte Blocker
- Positron can now produce audit-ready decision reports from GitHub context
- Evidence gate bridges the gap between collection/classification and reporting

### Unveränderte Einschränkungen
- No GitHub API Apply
- No PR #218 Merge
- No Issue #229 Close
- No stashes applied
- No CI reruns
- GitHub-CI advisory-only

### Verbleibende Risiken
- PR #218 Findings: 9 CodeRabbit findings remain unresolved
- Live Apply remains forbidden
- Issue #279 Phase 1E pending
- Biome restbacklog remains

### Nächster sinnvoller Schritt

**Issue #279 Phase 1E — Local Gate Runner Integration**, so Evidence Gate Reports can also include structured build/test/typecheck results alongside GitHub context analysis.
