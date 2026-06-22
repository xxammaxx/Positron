# Current Capabilities — Positron

## Status

Project closeout state as of the latest local verification on main.

## Local Gates

| Gate | Result |
|------|--------|
| `git diff --check` | PASS |
| `npx biome format .` | PASS (370 files, 0 fixes needed) |
| `npm run build` | PASS |
| `npm run typecheck` | PASS (9 projects up to date) |
| `npm test` (core/packages) | PASS — **917/917** (50 test files) |
| `npm test` (apps/web) | 5 pre-existing JSX/TSX failures (known, not core gate) |
| `npx biome check .` | advisory-only (known lint backlog) |

## Implemented Capabilities

### Local CI Policy v1

- Local gates are mandatory merge gates.
- GitHub Actions remains advisory-only.
- Remote CI is not required for local development decisions.
- Remote CI can only be re-enabled with explicit approval.
- Policy document: `.opencode/policies/ci-policy.md`

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
- 917 core tests pass consistently, including red-team security tests.

### Spec Kit and OpenCode Adapters

- Fake adapter implementations for deterministic testing.
- Spec Kit adapter with artifact scanning and path safety checks.
- OpenCode adapter with command policy enforcement (fake/real modes).

### Safety Architecture

- Kill-switch (`POSITRON_MERGE_KILL_SWITCH`), push gate (`POSITRON_ENABLE_PUSH`).
- Evidence-gated progression through pipeline phases.
- Audit trail enforcement with session and decision logging.
- Max fix loops: automatic stop after 3 failed attempts.

## GitHub / Remote CI Status

- GitHub Actions is advisory-only due to zero-step/runner-quota issue.
- Issue #268 tracks the infrastructure constraint.
- No GitHub-CI reruns are required for local acceptance.
- Local gates serve as the authoritative merge gates.

## Evidence References

| Issue/PR | Description | Status |
|----------|-------------|--------|
| #263 / #264 / #265 | Deterministic OpenCode dry-run agents | Merged |
| #266 / #267 | Portable temp paths in real adapter tests | Merged |
| #268 | GitHub-CI advisory-only tracker | Open |
| #269 | LF normalization + Biome format compliance | Merged |
| #270 / #271 | Local CI policy versioning | Merged |
| #272 / #273 | Tool-Gateway repo.list_files fixture fix | Merged |
| #274 / #275 | State-machine property chain stabilization | Merged |
| #276 / #277 | Secret-manager property test timeout fix | Merged |

## Test Breakdown

| Package | Tests | Status |
|---------|-------|--------|
| packages/shared | contracts, utils, secrets, types | PASS |
| packages/sandbox | commit-policy, paths, speckit-policy, opencode-policy, smoke | PASS |
| packages/github-adapter | sync-templates, contract, templates | PASS |
| packages/run-state | state-machine, smoke, property tests | PASS |
| packages/speckit-adapter | smoke, artifact-scanner | PASS |
| packages/opencode-adapter | fake-adapter, smoke, frontend-design-skill | PASS |
| packages/tool-gateway | red-team (shell-inject, path-traversal, secret-leak, egress, autonomy, approval-bypass), scanner, github tools, evidence tools, repo tools | PASS |
| apps/server | observability/queue | PASS |
| apps/web | voice, voice-settings | 3/8 files pass (5 pre-existing failures) |
| **Total Core** | **50 files** | **917/917 PASS** |
