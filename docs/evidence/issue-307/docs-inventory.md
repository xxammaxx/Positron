# Documentation Inventory — Issue #307

## Inventory

| File | Exists | Status | Key Stale Claims | Correction Needed | In #307 Scope |
|------|--------|--------|------------------|-------------------|---------------|
| `README.md` | ✅ | STALE | "917 tests", "v0.1.0", "#268 open" | Update to 1571+, current version, #268 closed | YES |
| `docs/status/current-capabilities.md` | ✅ | STALE | "917/917 tests", "#268 Open", "5 JSX failures", evidence only to #277 | Update test count, close #268, resolve web failures, add post-closeout tracks | YES |
| `docs/status/known-limitations.md` | ✅ | STALE | "#268 open", "all jobs fail", "#252/#211 deferred", missing limitations | Update CI status, close #268, add real-mode/e2e limitations | YES |
| `docs/status/evidence-index.md` | ❌ | MISSING | — | Create new | YES |
| `docs/architecture/api-overview.md` | ✅ | STALE | "v3.0 API, May 2026", missing #229/#243 endpoints | Limited sync, full update deferred to #251 | YES (limited) |
| `docs/changelog/v0.2.0.md` | ❌ | MISSING | — | Create new | YES |
| `docs/changelog/v0.3.0.md` | ❌ | MISSING | — | Create new | YES |
| `docs/evidence/rudolph-beacon/RUN_REPORT.md` | ✅ | CURRENT | — | No correction needed | NO (reference) |
| `docs/evidence/portfolio-gap-discovery/report.md` | ✅ | CURRENT | — | No correction needed | NO (reference) |
| `docs/evidence/portfolio-gap-discovery/phase-2-report.md` | ❌ | MISSING | — | Phase 2 report merged into report.md; check if separate file exists | NO (reference) |
| `docs/evidence/issue-268/` | ✅ | CURRENT | — | No correction needed | NO (reference) |
| `docs/evidence/post-268/` | ✅ | CURRENT | — | No correction needed | NO (reference) |
| `docs/benchmark/rudolph-beacon/CAPABILITIES.md` | ✅ | CURRENT | — | No correction needed | NO (reference) |
| `docs/benchmark/rudolph-beacon/KNOWN_LIMITATIONS.md` | ✅ | CURRENT | — | No correction needed | NO (reference) |

## Key Findings

### README.md (7 stale references)
1. Line 3: Version badge `v0.1.0` — should reflect current state
2. Line 4: Test badge `917 passing` — reality is 1571+
3. Line 130: `917 core/package tests (50 test files)` — reality is 1375 (64 files)
4. Line 136: `917/917 passing` — stale
5. Line 207: `core: **917/917 passing** (50 test files)` — stale
6. Line 212: `#268` referenced as "zero-step CI" tracker — #268 is CLOSED
7. Line 129: E2E tests "advisory-only, see Issue #268" — #268 is CLOSED, reference to #304 more appropriate

### current-capabilities.md (8 stale references)
1. Line 15: `917/917 (50 test files)` — stale
2. Line 16: `5 pre-existing JSX/TSX failures` — resolved (all 196 pass)
3. Line 84: `#268 GitHub-CI advisory-only tracker Open` — CLOSED
4. Line 104: `917/917 PASS` — stale
5. Evidence references only up to #277
6. Missing: Rudolph Beacon benchmark
7. Missing: CI Recovery + Post-268 fixes
8. Missing: Portfolio Gap Discovery + #305–#308

### known-limitations.md (7 stale references)
1. Line 5: `Tracked in Issue #268` — CLOSED
2. Line 7: `all jobs fail in 2–3 seconds` — partially resolved
3. Line 29: `15 open issues` — count changed
4. Line 30: `15 open PRs` — count changed (only #218 open)
5. Line 66: `Remote CI reactivation Requires explicit approval` — partially resolved
6. Line 68: `#252, #211` listed as deferred — #252 is CLOSED
7. Line 70: `CHANGELOG v0.3.0 Deferred` — now being addressed

### api-overview.md (3 stale aspects)
1. Title: "v3.0 API" with date "2026-05-24"
2. Missing endpoints from #229, #243, #279
3. Note: Full update is scope of #251

## Classification

```
ISSUE_307_DOCS_INVENTORY_STATUS: STALE
```

Rationale: 22+ stale claims across 4 core documentation files, 3 files missing entirely. Documentation does not reflect post-closeout reality.
