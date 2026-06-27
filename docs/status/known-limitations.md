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
- Real mode requires combined approval gates (GATE_APPROVE → #215, #244, #245, #246).

## E2E Testing

### Playwright E2E Tracing Flake (#304, OPEN)

- E2E Playwright tests have tracing lifecycle instability.
- Local gates do not currently gate on E2E test results.
- E2E tests are advisory-only for now.
- Tracked in Issue #304 (YELLOW, P2).

## Open Issues / PRs

- **1 open PR**: Only PR #218 (GATE_APPROVE for #215) remains open.
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
| Large epics need decomposition | Open | #229, #243 |
| Security/runtime gates (GATE_APPROVE) | Approval-bound / RED_HOLD | #215, #244, #245, #246 |
| CodeRabbit external removal | Owner action only | — |
| Repository polish (labels, wiki) | Deferred | #211 |
| Biome lint backlog resolution | Out of scope for closeout | — |
| api-overview #229 endpoint expansion | Separate issue | #251 |
| Remote CI reactivation | Requires explicit approval | — |
| CHANGELOG v0.2.0/v0.3.0 | Being created | #307 |
<!-- positron:auto-generated:end active-limitations -->

## Resolved Limitations (Reference)

<!-- positron:auto-generated:start resolved-limitations -->
| Item | Resolution |
|------|-----------|
| #268 CI zero-step infrastructure | Resolved via PR #296; CI advisory-only policy retained |
| #252 Repository badges/links cleanup | CLOSED |
| #297 Flaky E2E test | Stabilized and CLOSED |
| #298 Biome JSON formatting | Resolved and CLOSED |
| #299 Windows module resolution | Resolved and CLOSED |
| apps/web JSX/TSX test failures | Resolved (all 196 web tests pass) |
<!-- positron:auto-generated:end resolved-limitations -->
| CodeRabbit automation | Decommissioned (internal), external pending owner |
