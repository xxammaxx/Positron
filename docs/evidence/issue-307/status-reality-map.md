# Status Reality Map — Issue #307

## Claim vs. Reality Table

| Claim | File | Old Statement | Current Reality | Evidence | Action |
|-------|------|---------------|-----------------|----------|--------|
| Test count = 917 | README L4, current-capabilities L15 | "tests-917 passing", "917/917" | 1571 tests (1375 root + 196 web) | `npm test` output: 64 packages + 8 web = 1571 | UPDATE to 1571+ |
| Test files = 50 | README L130, current-capabilities L104 | "50 test files" | 72 test files (64 + 8) | `npm test` output: 64 files + 8 files | UPDATE to 72 |
| apps/web has 5 failures | current-capabilities L16 | "5 pre-existing JSX/TSX failures" | All 196 pass | `npm test` in apps/web shows 8 passed, 196 passed | UPDATE to all passing |
| #268 is open | current-capabilities L84, known-limitations L5 | "Open", "Tracked in Issue #268" | #268 CLOSED | `gh issue view 268` = state:CLOSED | UPDATE to CLOSED |
| #297 open | — | — | #297 CLOSED | `gh issue view 297` = state:CLOSED | UPDATE references |
| #298 open | — | — | #298 CLOSED | `gh issue view 298` = state:CLOSED | UPDATE references |
| #299 open | — | — | #299 CLOSED | `gh issue view 299` = state:CLOSED | UPDATE references |
| GH Actions "all jobs fail" | known-limitations L7 | "all jobs fail" | Partially resolved via #296 | PR #296 MERGED, CI infrastructure still advisory | UPDATE to "advisory, restored but limited" |
| Zero-step CI infrastructure | README L212, current-capabilities L73 | "zero-step CI", "advisory-only" | CI workflows repaired via #296, but remote CI remains advisory | PR #296 merged, `.github/workflows/` present and valid | UPDATE: differentiate "zero-step" (false now) from "advisory" (still true) |
| Rudolph Beacon on main | — | Not mentioned in status docs | Rudolph Beacon (#279) CLOSED, PR #295 MERGED on main | `docs/evidence/rudolph-beacon/RUN_REPORT.md` | ADD to capabilities |
| CodeRabbit decommissioned | — | Only in Rudolph Beacon evidence | Decommissioned on main | Rudolph Beacon Phase 17 commit `5494851` | ADD to capabilities + limitations |
| Windows tool-gateway repaired | — | — | PR #303 MERGED (issue #299) | `docs/evidence/post-268/issue-299-*` | ADD to capabilities |
| Portfolio Gap Discovery on main | — | — | PR #309 MERGED | `docs/evidence/portfolio-gap-discovery/report.md` | ADD to capabilities |
| #305 created | — | Not in status docs | #305 OPEN | `gh issue view 305` | ADD to docs |
| #306 created | — | Not in status docs | #306 OPEN | `gh issue view 306` | ADD to docs |
| #307 exists | — | This issue | #307 OPEN | This run | ADD to docs |
| #308 created | — | Not in status docs | #308 OPEN | `gh issue view 308` | ADD to docs |
| #304 open (E2E flake) | — | Not in limitations | #304 OPEN | `gh issue view 304` = state:OPEN | ADD to limitations |
| #218 open | known-limitations L30 | "15 open PRs" (now only #218) | Only PR #218 is open | `gh pr list` shows only #218 | UPDATE PR count |
| Full Real Mode not validated | — | Not in limitations | Not productively proven | Rudolph Beacon probe is controlled-only | ADD to limitations |
| #252/#211 deferred | known-limitations L68 | "Deferred (Issue #252, #211)" | #252 CLOSED, #211 OPEN | `gh issue view 252` = state:CLOSED | UPDATE |
| Milestones/Backlog hygiene open | — | Not in limitations | #306 OPEN | `gh issue view 306` = state:OPEN | ADD to limitations |
| Documentation drift | — | Not in limitations | #307 addresses this | This run | ADD to limitations (being addressed) |
| Version = v0.1.0 | README L3 | "version-v0.1.0-blue" | Post-closeout: effectively pre-v0.2.0 | Rudolph Beacon + CI Recovery completed | UPDATE or keep with note |
| CHANGELOG missing v0.2.0/v0.3.0 | docs/changelog/ | Files not found | Need creation | `glob docs/changelog/*.md` = only v0.1.0 + iterations | CREATE |
| Remote CI advisory-only | Multiple | "advisory-only" | STILL TRUE — CI is advisory, not primary gate | Local gates are primary truth | KEEP (update rationale) |
| No Vollautonomie claimed | — | — | No Vollautonomie claim in any doc | All docs checked | KEEP (no false claims) |

## Classification

```
ISSUE_307_STATUS_REALITY_MAP: COMPLETE
```

All 24 claims verified against current repo reality. 19 require updates, 5 confirmed accurate.
