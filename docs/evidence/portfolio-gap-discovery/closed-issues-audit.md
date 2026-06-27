# Portfolio Gap Discovery — Closed Issues Audit

## Summary

91+ closed issues identified and reviewed. Key tracks assessed below.

## Key Closed Issues — Classification

### #299 — Post-268: Fix Windows runner module resolution
- **Closed:** 2026-06-27
- **Classification:** COMPLETE
- **Evidence:** PR #303 merged. CI `tool-gateway-windows` now green.

### #298 — Post-268: Fix Biome JSON formatting warnings
- **Closed:** 2026-06-27
- **Classification:** COMPLETE
- **Evidence:** PR #300 merged. PR #301 cleanup. All JSON formatting fixed.

### #297 — Post-268: Stabilize flaky Playwright E2E test
- **Closed:** 2026-06-27
- **Classification:** COMPLETE_WITH_FOLLOWUP
- **Evidence:** PR #302 merged. 25/26 tests pass. Remaining tracing issue → #304 (OPEN).

### #279 — Rudolph Beacon: rebuild #229 architecture chain on current main
- **Closed:** 2026-06-26
- **Classification:** COMPLETE
- **Evidence:** PR #295 merged. All 1571 tests pass. Full audit trail (phases 3-20) committed.

### #276 — fix(local-ci): secret-manager property test timeouts
- **Closed:** 2026-06-22
- **Classification:** COMPLETE

### #274 — fix(local-ci): state-machine property test timeout
- **Closed:** 2026-06-21
- **Classification:** COMPLETE

### #272 — fix(local-ci): tool-gateway repo.list_files test fixture mismatch
- **Closed:** 2026-06-21
- **Classification:** COMPLETE

### #270 — chore(local-ci): version CI policy and ignore local audit logs
- **Closed:** 2026-06-21
- **Classification:** COMPLETE

### #268 — CI Infrastructure Tracker
- **Closed:** 2026-06-27
- **Classification:** COMPLETE
- **Evidence:** PR #296 merged. Zero-step/runner-quota resolved. CI advisory-only policy documented.

### #266 — fix: Windows /tmp path bug in real-adapter.test.ts (pre-existing)
- **Closed:** 2026-06-21
- **Classification:** COMPLETE

### #263 — Feature: DeterministicFixtureAgent + OpenCodeDryRunAgent
- **Closed:** 2026-06-21
- **Classification:** COMPLETE
- **Evidence:** Implemented in `packages/opencode-adapter`. Fixture and dry-run modes operational.

### #254 — Add CHANGELOG Entries for v0.2.0 and v0.3.0
- **Closed:** 2026-06-22
- **Classification:** COMPLETE
- **Note:** Check if changelog files actually exist. `docs/changelog/` only shows iteration-1/2/3 and v0.1.0.md. No v0.2.0 or v0.3.0 files visible.

### #253 — Update Living Evidence Portfolio with Issue #243 Baseline Capabilities
- **Closed:** 2026-06-22
- **Classification:** COMPLETE
- **Note:** Should have updated current-capabilities.md and known-limitations.md. However, current files are stale (see repo-docs-audit).

### #252 — GitHub Repo Polish: CODE_OF_CONDUCT, PR Template, Issue Templates, Milestones, Badges
- **Closed:** 2026-06-23
- **Classification:** COMPLETE
- **Evidence:** PR #282 merged. README badges still show v0.1.0 and 917 tests (stale).

### #205 — SDD-/Fleet-/OpenCode-/Kontext-Engineering-Erkenntnisse auf Positron uebertragen
- **Closed:** 2026-06-22
- **Classification:** COMPLETE_WITH_FOLLOWUP
- **Note:** 10 gaps identified. Several implemented (#243 baseline, evidence types, etc.). Some gaps may still persist (Context Engineering Framework, Vibe-Coding principles, Pre-Transition Quality Gates, Error escalation, etc.)

### #223 — ci(tool-gateway): add Windows path traversal CI coverage
- **Closed:** 2026-06-15
- **Classification:** COMPLETE

### #222 — chore(tool-gateway): address Biome noControlCharactersInRegex warning
- **Closed:** 2026-06-15
- **Classification:** COMPLETE

### #221 — chore(tool-gateway): remove unused success() helper and durationMs
- **Closed:** 2026-06-15
- **Classification:** COMPLETE

### #219 — feat(mcp-gateway): add safe internal MCP-compatible tool gateway
- **Closed:** 2026-06-15
- **Classification:** COMPLETE
- **Evidence:** Tool Gateway operational with red-team tests. 917 tests pass.

### #216 — Cleanup: Remove pre-existing development and release artifacts
- **Closed:** 2026-06-15
- **Classification:** COMPLETE

### #213 — Safety: Implement Stop/Ask Protocol Policy
- **Closed:** 2026-06-14
- **Classification:** COMPLETE_WITH_FOLLOWUP
- **Follow-up:** #215 (OPEN) — runtime integration of GATE_APPROVE hook. PR #218 exists.

### Early MVP Issues (#1–#177)
Most early issues are COMPLETE or SUPERSEDED. The foundational MVP was built in Q1-Q2 2026.

## Classification Summary

| Classification | Count | Examples |
|---------------|-------|----------|
| COMPLETE | ~75 | #268, #279, #297, #298, #299, #263, #276, #274, #272, #270, #266, #254, #253, #252 |
| COMPLETE_WITH_FOLLOWUP | ~5 | #297→#304, #213→#215, #205→#243 |
| PARTIAL_NEEDS_FOLLOWUP | ~3 | #205 (some gaps remain), #253 (docs still stale) |
| SUPERSEDED | ~5 | Early prototype issues |
| NOT_RELEVANT | ~5 | Old closed issues |
| UNKNOWN | ~2 | Very old issues not re-checked |

## Specific Verification

- #268: COMPLETE ✅ — CI infrastructure repaired, advisory-only policy active
- #279: COMPLETE ✅ — Rudolph Beacon merged, evidence chain complete
- #297: COMPLETE_WITH_FOLLOWUP ✅ — main flake fixed, tracing flake → #304
- #298: COMPLETE ✅ — Biome JSON formatting fixed
- #299: COMPLETE ✅ — Windows module resolution fixed
- #263: COMPLETE ✅ — Fixture/dry-run agents implemented
- #270: COMPLETE ✅ — Local CI policy versioned
- #272: COMPLETE ✅ — repo.list_files fixture fixed
- #274: COMPLETE ✅ — state-machine property tests stabilized
- #276: COMPLETE ✅ — secret-manager property tests bounded
- #205: COMPLETE_WITH_FOLLOWUP ⚠️ — some gaps persist
- #253: COMPLETE (but docs stale) ⚠️ — portfolio docs outdated
- #254: COMPLETE (but files not found) ⚠️ — v0.2.0/v0.3.0 changelog files missing
- #252: COMPLETE (but badges stale) ⚠️ — README badges show old data
