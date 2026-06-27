# Evidence Index — Positron

This index catalogs all evidence artifacts in the Positron repository. Evidence is the **audit trail** of implementation decisions, test results, and gate verification. It is NOT runtime truth — it documents what was verified at a point in time.

## Truth Layer Model

| Layer | Description | Location |
|-------|-------------|----------|
| **Reality Refresh** | Snapshot of repo state at run start | `docs/evidence/*/reality-refresh.md` |
| **Code / Config / Tests** | Source of executable truth | `packages/`, `apps/`, `*.json` |
| **Evidence** | Audited record of a completed run | `docs/evidence/*/` |
| **Docs** | Derived documentation from evidence | `docs/status/`, `docs/architecture/` |
| **Chat / Memory** | Ephemeral session context | `.opencode/logs/`, `.opencode/memory/` |

## Evidence Directory Map

### Rudolph Beacon (#279)

| Path | Description |
|------|-------------|
| `docs/evidence/rudolph-beacon/RUN_REPORT.md` | Full benchmark run report (Phases 3–20) |
| `docs/evidence/rudolph-beacon/phase-4-*.md` | Phase 4 evidence (reality refresh, preflight, gates, reports) |
| `docs/evidence/rudolph-beacon/phase-4-summary.json` | Schema-validated summary |
| `docs/benchmark/rudolph-beacon/CAPABILITIES.md` | Rudolph Beacon capabilities |
| `docs/benchmark/rudolph-beacon/KNOWN_LIMITATIONS.md` | Rudolph Beacon limitations |
| `docs/benchmark/rudolph-beacon/BENCHMARK_SPEC.md` | Benchmark specification |
| `docs/benchmark/rudolph-beacon/COVERAGE_POLICY.md` | Coverage policy |
| `docs/benchmark/rudolph-beacon/REAL_MODE_READINESS.md` | Real mode readiness assessment |
| `docs/benchmark/rudolph-beacon/TRACEABILITY_CONTRACT.md` | Traceability contract |

### CI Recovery (#268)

| Path | Description |
|------|-------------|
| `docs/evidence/issue-268/phase-6-*.md` | Phase 6: PR readiness, gates, workflow audit |
| `docs/evidence/issue-268/phase-7-*.md` | Phase 7: Final merge, post-merge sync |
| `docs/evidence/issue-268/phase-8-*.md` | Phase 8: Post-merge gates, owner handoff |
| `docs/evidence/issue-268/phase-9-*.md` | Phase 9: Owner decision package, infra tracker |
| `docs/evidence/issue-268/phase-10-*.md` | Phase 10: Branch cleanup, confirmation gates |
| `docs/evidence/issue-268/phase-11-*.md` | Phase 11: Final owner handoff, CI results |

### Post-268 Fixes (#297, #298, #299)

| Path | Description |
|------|-------------|
| `docs/evidence/post-268/issue-297-*.md` | #297: Flaky test stabilization evidence |
| `docs/evidence/post-268/issue-298-*.md` | #298: Biome JSON formatting evidence |
| `docs/evidence/post-268/issue-299-*.md` | #299: Windows module resolution evidence |
| `docs/evidence/post-268/phase-1-*.md` | Post-268 triage phase evidence |
| `docs/evidence/post-268/pr-301-*.md` | PR #301 formatting completion evidence |

### Portfolio Gap Discovery (PR #309)

| Path | Description |
|------|-------------|
| `docs/evidence/portfolio-gap-discovery/report.md` | Full gap discovery report |
| `docs/evidence/portfolio-gap-discovery/phase-2-report.md` | Phase 2 issue creation report |

### Documentation Sync (#307)

| Path | Description |
|------|-------------|
| `docs/evidence/issue-307/reality-refresh.md` | Run start repo state |
| `docs/evidence/issue-307/docs-inventory.md` | Documentation staleness inventory |
| `docs/evidence/issue-307/status-reality-map.md` | Claim vs. reality table |
| `docs/evidence/issue-307/update-report.md` | Per-file update log |
| `docs/evidence/issue-307/consistency-audit.md` | Post-update consistency audit |
| `docs/evidence/issue-307/gates.md` | Local gate results |
| `docs/evidence/issue-307/summary.json` | Schema-validated summary |
| `docs/evidence/issue-307/report.md` | Full run report |
| `docs/evidence/issue-307/reviewer-report.md` | Reviewer checklist |

## Capability & Limitation Documents

| Path | Description |
|------|-------------|
| `docs/status/current-capabilities.md` | Active capabilities and test reality |
| `docs/status/known-limitations.md` | Known limitations and open issues |

## Key Run Reports

| Path | Issue | Run |
|------|-------|-----|
| `docs/evidence/rudolph-beacon/RUN_REPORT.md` | #279 | Rudolph Beacon Benchmark |
| `docs/evidence/portfolio-gap-discovery/report.md` | PR #309 | Portfolio Gap Discovery |
| `docs/evidence/issue-307/report.md` | #307 | Documentation Reality Sync |

## Notes

- Evidence is immutable audit trail: once committed, evidence artifacts document what happened at a specific time.
- Status docs (`current-capabilities.md`, `known-limitations.md`) are living documents updated to reflect evidence.
- Evidence subdirectories use the pattern `docs/evidence/<namespace>/` where namespace is the issue or run name.
- All evidence should reference the issue/PR it was created for.
