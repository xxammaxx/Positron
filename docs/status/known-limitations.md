# Known Limitations — Positron

## Remote CI

GitHub Actions remains advisory-only. Workflow YAML files are syntactically valid and partially executable (restored via PR #296, Issue #268 CLOSED), but runner quota/billing restrictions prevent reliable remote execution on the private repository.

- Remote CI is advisory-only; local gates are the primary truth for merge decisions.
- Workflow files present and valid in `.github/workflows/`.
- No self-hosted runners available.
- Billing API inaccessible (requires `user` scope).
- Remote CI status is separate from the `advisory-only` policy: the workflows are fixed, but CI is not required for decisions.

## Biome Lint Backlog

`npx biome check .` remains advisory-only due to a known lint backlog (approximately 786 errors / 486 warnings). This is separate from formatting; `npx biome format .` passes consistently with 370 files checked and 0 fixes needed.

## Full Real Mode Not Productively Validated

- Full Real Mode (human-in-the-loop GitHub operations) has not been productively proven.
- The Rudolph Beacon `controlled-real-probe` validates safety gates in simulation but does not exercise real GitHub operations with a live token.
- Full Real Mode Pilot is tracked in Issue #308 (YELLOW_VALIDATE, P1).
- Preflight validation completed 2026-07-07: security baseline confirmed, 1900 tests pass, Stage 0 (Fake Mode Baseline) ready.
- **UPDATE 2026-07-07**: Blocker Issues #215, #244, #245, #246 were already CLOSED/MERGED (2026-06-28 to 2026-06-29) at the time of the preflight — the documentation was stale. Blocker audit PR #355 confirmed all four are resolved and in main.
- **UPDATE 2026-07-08**: Stage 1 ReadOnly Dry Run validated successfully (7/7 reads, 0 writes, write boundary enforced). See `docs/evidence/stage1-readonly-dry-run.md`. Stage 2/3 remain blocked.
- **UPDATE 2026-07-09**: Stage 2 Write-Sandbox Blueprint created. Stage 2 remains in PREFLIGHT_DESIGNED_NOT_EXECUTED status. Stage 3 remains blocked. See `docs/evidence/stage2-write-sandbox-blueprint.md` and `docs/security/github-stage2-write-sandbox-token-policy.md`.
- **UPDATE 2026-07-09 (Policy Implementation)**: Stage 2 Write-Sandbox Policy implemented as a technical, testable module in `packages/github-adapter/src/stage2-write-sandbox-policy.ts` with 41 tests. Stage 2 policy is IMPLEMENTED_NOT_EXECUTED — no real writes performed. Stage 3 remains blocked. See `docs/evidence/stage2-write-sandbox-policy-implementation.md`.
- **UPDATE 2026-07-09 (Target Selection)**: Stage 2 sandbox target created: dedicated repo `xxammaxx/positron-sandbox` (PRIVATE), issue #1, label `positron-stage2-sandbox`. All GitHub operations performed by Developer via `gh` CLI — no Positron runtime writes. Stage 2 remains NOT_EXECUTED. See `docs/evidence/stage2-sandbox-target.md`.
- **UPDATE 2026-07-10 (Single Comment Dry Run)**: Stage 2 single-comment dry run attempted. All pre-write gates (A–G) passed. Halted at Phase H: `BLOCKED_BY_RUNTIME_WRITE_HARNESS_MISSING` — no server-side `Stage2WriteSandboxPolicy` → `RealGitHubAdapter` bridge. No write executed, no token used. See `docs/evidence/stage2-write-sandbox-single-comment-dry-run.md`.
- **UPDATE 2026-07-10 (Runtime Write Harness)**: Stage 2 runtime write harness implemented in fake/test mode (42 harness tests, 195 total regression tests passing). Policy-to-adapter bridge exists now. No real token used, no real write executed. Harness is ready for final audit. See `docs/evidence/stage2-runtime-write-harness-implementation.md`.
- **UPDATE 2026-07-11 (Single Comment Dry Run Retry)**: Stage 2 dry-run retry attempted after harness merge. All pre-write gates passed. Blocked at harness execution: code path for real writes is intentionally unreachable — harness returns `success: false` even with `fakeMode=false`. `this.adapter.createIssueComment()` is never called. Stage 2 remains NOT_EXECUTABLE until harness execution path is implemented. See `docs/evidence/stage2-write-sandbox-single-comment-retry.md`.
- **UPDATE 2026-07-11 (Harness Execution Path Fix)**: Stage 2 harness execution path implemented. The non-fake path now calls the injected issue-comment writer after all policy gates pass. Tested with fake/spy writer (63 tests pass). No real Stage2 token used, no real GitHub write executed. Harness is ready for final audit before the real single-comment retry. Stage 3 remains blocked. See `docs/evidence/stage2-harness-execution-path-fix.md`.
- **UPDATE 2026-07-13 (STAGE 2 COMPLETE)**: Stage 2 single-comment write SUCCESSFULLY EXECUTED. Classic PAT with `repo` scope used through the Positron harness path. Sandbox comment ID 4962261394 written to `xxammaxx/positron-sandbox#1` (SHA-256: 48be36a2... verified). PAT immediately revoked. No second write, no side effects. Stage 2 is COMPLETE. See `docs/evidence/stage2-write-sandbox-single-comment-closeout-verification.md` and `docs/evidence/issue-308/closeout-phase-c-final-status.md`.
- **UPDATE 2026-07-14 (STAGE 3 RUNTIME FOUNDATION)**: Stage 3 Runtime Foundation implemented and tested (not executed). 345 tests across 10 github-adapter test files (37 policy + 27 harness + 47 remediation + 234 other adapter tests). Stage3SupervisedPilotPolicy with 20+ gates. Stage3RuntimeHarness with 11-phase orchestration. Five remediation modules integrated (approval-binding, base-resolver, safety-probe, reader-verifier, bridge). Fake mode operational. Real GitHub write path exists but requires separate PAT and owner approval.
- Real mode requires combined approval gates (GATE_APPROVE → all four merged, verified in audit).

## E2E Testing

### Playwright E2E Tracing Flake (#304, OPEN)

- E2E Playwright tests have tracing lifecycle instability.
- Local gates do not currently gate on E2E test results.
- E2E tests are advisory-only for now.
- Tracked in Issue #304 (YELLOW, P2).

### E2E Runtime Proof — Auth Contract Verified (Issue #373)

- **2026-07-17: E2E Runtime Proof completed at head `1aa2e43`.**
- Auth contract confirmed: no-token → 401, wrong-token → 401, valid token → 201 (POST /api/demo-runs).
- Demo workflow verified end-to-end with live Server/Redis.
- Suite: 24/26 passed; `full-run-lifecycle.spec.ts` has a pre-existing timeout (not related to auth).
- Token fixture hardened: centralized in `e2e/fixtures/admin-auth.ts`, CI token aligned.
- CI verification pending: token mismatch between CI environment and test-worker was fixed in code but CI has not re-run.

### Pending Admin Auth Mismatches

The following frontend API methods use `request()` (no admin token) but hit server endpoints protected by `requireAdmin`. These remain unfixed since Issue #373 only scoped `startDemoRun()`:

| Frontend Method | Endpoint | Server Middleware |
|----------------|----------|-------------------|
| `createRepo` | `POST /api/repos` | `requireAdmin` |
| `createRun` | `POST /api/runs` | `requireAdmin` |
| `startRun` | `POST /api/repos/:repoId/runs` | `requireAdmin` |
| `saveEvidence` | `POST /api/evidence` | `requireAdmin` |
| `updateSafety` | `POST /api/safety` | `requireAdmin` |
| `cancelRun` | `POST /api/runs/:id/cancel` | `requireAdmin` |

These 6 endpoints are potential auth failures in admin-authenticated flows. Evaluate for a follow-up issue.

## Open Issues / PRs

- **0 open PRs**: All blocker PRs (#218, #314, #315, #316) merged. No open PRs at audit time.
- **PR-Chain #230–#242**: 13 PRs in the Issue #229 chain remain intentionally untouched pending human decision.
- **#229 MCP Bootstrap Epic**: Large epic requiring decomposition before implementation.
- **#243 Agentic Baseline Epic**: Large epic requiring decomposition before implementation.

## Issue #229 PR-Chain Status

| PR | Base | Title | Mergeable |
|----|------|-------|-----------|
| #230 | #224 | Tool Gateway metadata for MCP/provider planning | MERGEABLE |
| #231 | #230 | OpenCode model profile types, validation, warm-up | MERGEABLE |
| #232 | #231 | Spec Kit sync profile validation | MERGEABLE |
| #233 | #232 | MCP warm-up contract and evidence model | MERGEABLE |
| #234 | #233 | MCP warm-up runtime executor foundation | MERGEABLE |
| #235 | #234 | OpenCode provider detection foundation | MERGEABLE |
| #236 | #235 | Human oversight question queue | MERGEABLE |
| #237 | #236 | Oversight approvals wired to provider/MCP gates | MERGEABLE |
| #238 | #237 | Blueprint Launcher foundation and validation | MERGEABLE |
| #239 | #238 | Blueprint gated pipeline handoff | MERGEABLE |
| #240 | #239 | Blueprint handoff to infrastructure gates | MERGEABLE |
| #241 | #240 | Infrastructure state stores | MERGEABLE |
| #242 | #241 | Infrastructure state stores + Proxmox dev docs | MERGEABLE |

All 13 PRs in the chain are mergeable but require human decision for final disposition.

## Stashes

Two stashes remain preserved and untouched on `main`:

- `stash@{0}`: "safety: dirty tree before clean workspace policy pr"
- `stash@{1}`: "stash: doc modification from spec phase"

These must not be applied, popped, or dropped without explicit human instruction.

## Active Limitations (Post-Closeout)

<!-- positron:auto-generated:start active-limitations -->
| Item | Status | Issue |
|------|--------|-------|
| E2E tracing lifecycle flake | Open | #304 |
| Portfolio auto-update mechanism | Open | #305 |
| Backlog hygiene (milestones, labels, taxonomy) | Open | #306 |
| Documentation drift | Being addressed | #307 |
| Full Real Mode not productively validated | Open | #308 |
| Stage 2 Write Sandbox — COMPLETED | Single comment written 2026-07-13, PAT revoked | #308 |
| Stage 3 Full Real Mode | IMPLEMENTED_AND_TESTED_NOT_EXECUTED — real write path exists, requires new PAT and owner approval | #308 |
| Stage 3 remediation modules (approval-binding, base-resolver, safety-probe, reader-verifier, bridge) | Integrated via PR #370 — 345 github-adapter tests passing | #308 |
| Large epics need decomposition | Open | #229, #243 |
| Security/runtime gates (GATE_APPROVE) | Resolved — merged to main | #215, #244, #245, #246 (all CLOSED) |
| CodeRabbit external removal | Owner action only | — |
| Repository polish (labels, wiki) | Deferred | #211 |
| Biome lint backlog resolution | Out of scope for closeout | — |
| api-overview #229 endpoint expansion | Separate issue | #251 |
| Remote CI reactivation | Requires explicit approval | — |
| CHANGELOG v0.2.0/v0.3.0 | Being created | #307 |
| Stage 3 real GitHub write | Implemented and tested, not executed | #308 |
| Multi-process workspace lock | Not implemented at runtime | #324 |
| Remaining admin auth mismatches (6 endpoints) | Identified in #373 — frontend uses `request()` but server requires `requireAdmin` | — |
<!-- positron:auto-generated:end active-limitations -->

## Stage 3 Runtime Foundation

- Stage 3 Runtime Foundation implemented and tested (not executed). Real GitHub write path exists but requires separate PAT and owner approval.
- PR #370 integrated five remediation modules (approval-binding, base-resolver, safety-probe, reader-verifier, bridge) into `Stage3RuntimeHarness`. `Stage3HarnessInput` is now a discriminated union. All 345 github-adapter tests pass (10 test files).
- Issue #324 (multi-process workspace lock) remains open and documented.

## Resolved Limitations (Reference)

<!-- positron:auto-generated:start resolved-limitations -->
| Item | Resolution |
|------|-----------|
| #268 CI zero-step infrastructure | Resolved via PR #296; CI advisory-only policy retained |
| #252 Repository badges/links cleanup | CLOSED |
| #297 Flaky E2E test | Stabilized and CLOSED |
| #298 Biome JSON formatting | Resolved and CLOSED |
| #299 Windows module resolution | Resolved and CLOSED |
| apps/web JSX/TSX test failures | Resolved (all 205 web tests pass) |
| Demo-run admin auth contract (`POST /api/demo-runs` 401) | Fixed and verified at runtime — `startDemoRun()` now uses `adminRequest()` (head `1aa2e43`). |
| CI Playwright token mismatch | Fixed — CI workflow token aligned to `positron-test-token-dev` matching playwright.config.ts. |
<!-- positron:auto-generated:end resolved-limitations -->
| CodeRabbit automation | Decommissioned (internal), external pending owner |
