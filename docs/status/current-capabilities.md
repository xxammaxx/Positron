# Current Capabilities — Positron

## Status

Project closeout state as of the latest local verification on main (post PR #309 Portfolio Gap Discovery).

## Local Gates

| Gate | Result |
|------|--------|
| `git diff --check` | PASS |
| `npx biome format .` | PASS |
| `npm run build` | PASS |
| `npm run typecheck` | PASS (9 projects up to date) |
| `npm test` (root/packages) | PASS — **1897/1897** (78 test files) |
| `npm test` (apps/web) | PASS — **196/196** (8 test files, JSX/TSX resolved) |
| **Total Tests** | **2093/2093** (86 test files) |
| `npx biome check .` | advisory-only (known lint backlog) |

## Implemented Capabilities

### Local CI Policy v1

- Local gates are mandatory merge gates.
- GitHub Actions is advisory-only (workflows restored via #296 but remote CI not primary truth).
- Remote CI is not required for local development decisions.
- Remote CI can only be re-enabled with explicit approval.
- Policy document: `.opencode/policies/ci-policy.md`

### Rudolph Beacon Benchmark (#279, CLOSED)

- `packages/benchmark-rudolph/` package on main with controlled real-mode probe.
- Red-negative tests (36 tests) for safety gate enforcement.
- PR #295 merged; Issue #279 closed.
- CodeRabbit decommissioned as part of this track (commit `5494851`).
- Coverage policy (`COVERAGE_POLICY.md`) enforced.

### CI Recovery (#268, CLOSED)

- PR #296 merged: repaired workflow configuration and formatting gates.
- GitHub Actions workflows are syntactically valid and partially executable.
- Remote CI remains advisory-only; local gates are primary truth.

### Post-268 Fixes (#297/#298/#299, CLOSED)

- **#297:** Flaky Playwright E2E test stabilized.
- **#298:** Biome JSON formatting warnings resolved.
- **#299:** Windows runner module resolution fixed (PR #303).
- All three issues closed; evidence trail complete in `docs/evidence/post-268/`.

### Portfolio Gap Discovery (PR #309, MERGED)

- Comprehensive audit of all 14 open + 91 closed issues.
- 24 capability areas assessed.
- 4 new issues created: #305 (Portfolio Auto-Update), #306 (Backlog Hygiene), #307 (Docs Sync), #308 (Full Real Mode Pilot).
- 14 gaps mapped to existing issues.

### DeterministicFixtureAgent

- Reproducible fixture-based adapter testing in `packages/opencode-adapter`.
- No external LLM/network requirement for fixture mode.
- Fixture inputs produce deterministic evidence outputs.

### OpenCodeDryRunAgent

- Safe dry-run simulation for risky OpenCode actions.
- Write/push/merge/PR/worktree/npm operations are blocked or simulated according to the safety policy.
- Structured classification of commands into simulated reads, blocked writes, and reported info.

### ExecutionMode / EvidenceReport

- Shared execution modes: `fixture`, `dry-run`, and `real` execution.
- Structured evidence reporting for dry-run/fixture behavior.
- EvidenceReport provides traceable output for each execution mode.

### Test Stability Improvements

- Tool-Gateway `repo.list_files` fixture mismatch fixed (Issue #272 → PR #273).
- State-machine property-test chain generator stabilized (Issue #274 → PR #275).
- Secret Manager property tests bounded for local Windows execution (Issue #276 → PR #277).

### Tool Gateway with Red Team Tests

- MCP tool gateway enforces: shell injection blocking, path traversal prevention, secret redaction, egress policy, prompt injection detection, autonomy level gating, and approval bypass prevention.
- 1571 tests pass consistently, including red-team security tests.

### Spec Kit and OpenCode Adapters

- Fake adapter implementations for deterministic testing.
- Spec Kit adapter with artifact scanning and path safety checks.
- OpenCode adapter with command policy enforcement (fake/real modes).

### Safety Architecture

- Kill-switch (`POSITRON_MERGE_KILL_SWITCH`), push gate (`POSITRON_ENABLE_PUSH`).
- Evidence-gated progression through pipeline phases.
- Audit trail enforcement with session and decision logging.
- Max fix loops: automatic stop after 3 failed attempts.

### Stage 1: Read-Only GitHub Operations (#308)

- Real GitHub adapter read operations validated (7/7 reads, 0 writes).
- Token lifecycle (set → use → unset) verified.
- Write boundary enforcement: all write attempts blocked at policy level.
- Evidence: `docs/evidence/stage1-readonly-dry-run.md`

### Stage 2: Single Sandbox Comment Write (#308)

- Single controlled write to `xxammaxx/positron-sandbox#1` (Comment ID 4962261394, 2026-07-13).
- Full Positron harness path: Policy → Harness → Adapter → Octokit → GitHub API.
- PAT lifecycle: set → used (exactly once) → unset → revoked on GitHub.
- Kill-switches, idempotency, body hash binding, duplicate detection all enforced.
- Evidence: `docs/evidence/stage2-write-sandbox-single-comment-closeout-verification.md`

### Stage 3: Runtime Foundation (#308)

- Stage 3 Runtime Foundation implemented with 2093 tests passing.
- Stage3SupervisedPilotPolicy validates 19+ gates including repository allowlist, file hash binding, process safety, and quantity limits.
- Stage3RuntimeHarness orchestrates branch→commit→draft-PR sequence with partial failure detection.
- Fake mode operational; live path implemented but not executed.
- No real GitHub token used; no sandbox branch created.

## GitHub / Remote CI Status

- GitHub Actions workflows restored via PR #296 (Issue #268 CLOSED).
- Remote CI remains advisory-only; local gates are the primary merge gates.
- No GitHub-CI reruns are required for local acceptance.

## Active Backlog (Post-Closeout)

| Issue | Title | Risk | Priority |
|-------|-------|------|----------|
| #304 | Stabilize Playwright tracing lifecycle in E2E tests | YELLOW | P2 |
| #305 | Evidence Portfolio: Automate post-run capability updates | GREEN_SAFE | P2 |
| #306 | Backlog Hygiene: Define milestones, labels, taxonomy | GREEN_SAFE | P2 |
| #307 | Docs: Sync all status docs with post-closeout reality | GREEN_SAFE | P2 |
| #308 | Validation: Supervised Full Real Mode pilot | YELLOW | P1 |
| #229 | MCP Bootstrap Epic | YELLOW | P1 |
| #243 | Agentic Baseline Epic | YELLOW | P1 |
| #215 | GATE_APPROVE safety integration | YELLOW | P1 |
| #251 | api-overview #229 endpoint expansion | GREEN_SAFE | P2 |

## Evidence References

<!-- positron:auto-generated:start evidence-refs -->
| Issue/PR | Description | Status |
|----------|-------------|--------|
| #263 / #264 / #265 | Deterministic OpenCode dry-run agents | Merged |
| #266 / #267 | Portable temp paths in real adapter tests | Merged |
| #268 | GitHub-CI advisory-only tracker | CLOSED |
| #269 | LF normalization + Biome format compliance | Merged |
| #270 / #271 | Local CI policy versioning | Merged |
| #272 / #273 | Tool-Gateway repo.list_files fixture fix | Merged |
| #274 / #275 | State-machine property chain stabilization | Merged |
| #276 / #277 | Secret-manager property test timeout fix | Merged |
| #279 | Rudolph Beacon benchmark | CLOSED |
| #296 | CI workflow repair | Merged |
| #297 | Flaky E2E test stabilization | CLOSED |
| #298 | Biome JSON formatting | CLOSED |
| #299 | Windows module resolution | CLOSED |
| #309 | Portfolio Gap Discovery | Merged |
| #305 | Portfolio Auto-Update | OPEN |
| #306 | Backlog Hygiene | OPEN |
| #307 | Docs Reality Sync | OPEN |
| #308 | Full Real Mode Pilot | OPEN |
<!-- positron:auto-generated:end evidence-refs -->

## Test Breakdown

| Package | Tests | Status |
|---------|-------|--------|
| packages/shared | contracts, utils, secrets, types | PASS |
| packages/sandbox | commit-policy, paths, speckit-policy, opencode-policy, smoke | PASS |
| packages/github-adapter | sync-templates, contract, templates, stage3-policy, stage3-harness | PASS (297) |
| packages/run-state | state-machine, smoke, property tests | PASS |
| packages/speckit-adapter | smoke, artifact-scanner | PASS |
| packages/opencode-adapter | fake-adapter, smoke, frontend-design-skill | PASS |
| packages/tool-gateway | red-team (shell-inject, path-traversal, secret-leak, egress, autonomy, approval-bypass), scanner, github tools, evidence tools, repo tools | PASS |
| packages/benchmark-rudolph | controlled-real-probe, red-negative tests | PASS |
| apps/server | observability/queue | PASS |
| apps/web | voice, voice-output, voice-settings, smoke, PhasePipeline, BlueprintPanel, VoiceControls | PASS (196/196) |
| **Total** | **86 files** | **2093/2093 PASS** |
