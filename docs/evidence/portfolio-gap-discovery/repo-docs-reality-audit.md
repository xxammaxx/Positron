# Portfolio Gap Discovery — Repo Docs Reality Audit

## Documents Checked

| Document | Exists | Status |
|----------|--------|--------|
| README.md | YES | STALE |
| AGENTS.md | YES | Current (updated 2026-06-23) |
| SECURITY.md | YES | Current |
| package.json | YES | v0.1.0 (not updated since v0.1.0-rc.1) |
| docs/status/current-capabilities.md | YES | STALE |
| docs/status/known-limitations.md | YES | STALE |
| docs/status/evidence-index.md | NO | MISSING |
| docs/evidence/rudolph-beacon/RUN_REPORT.md | YES | Current |
| docs/benchmark/rudolph-beacon/CAPABILITIES.md | YES | Current |
| docs/benchmark/rudolph-beacon/KNOWN_LIMITATIONS.md | YES | Current |
| docs/architecture/api-overview.md | YES | STALE |
| docs/architecture/README.md | YES | OK |
| docs/changelog/iteration-1.md | YES | Historical |
| docs/changelog/iteration-2.md | YES | Historical |
| docs/changelog/iteration-3.md | YES | Historical |
| docs/changelog/v0.1.0.md | YES | Historical |
| docs/changelog/v0.2.0.md | NO | MISSING (was scope of #254) |
| docs/changelog/v0.3.0.md | NO | MISSING (was scope of #254) |

## STALE Documentation Analysis

### README.md
- **Badges show:** v0.1.0, 917 tests
- **Reality:** Post-#279, post-#268 fixes → 1571+ tests, version effectively past v0.3.0 capabilities
- **Screenshots:** May be outdated (pre-dashboard changes)
- **Severity:** MEDIUM — presents inaccurate capability picture

### docs/status/current-capabilities.md
- **Shows:** 917/917 tests, closeout state
- **Missing:** Rudolph Beacon benchmark, post-268 CI recovery, #297/#298/#299 fixes, #279 controlled real-mode probe
- **Stale references:** #268 listed as "Open" (it's CLOSED)
- **Severity:** HIGH — source of truth for capabilities is wrong

### docs/status/known-limitations.md
- **Shows:** GitHub Actions as failing, #268 as open, #252/#211 as deferred
- **Reality:** GitHub Actions now partially functional (advisory-only but not entirely broken), #268 CLOSED, #252 CLOSED, #211 still OPEN
- **Missing:** Known limitations from Rudolph Beacon, from post-268 fixes, from #243 baseline
- **Severity:** HIGH — misleading limitation claims

### docs/architecture/api-overview.md
- **Shows:** v3.0 API overview dated 2026-05-24
- **Missing:** No endpoints from #229 (Tool Gateway, MCP warm-up, Oversight, Blueprint Launcher, Architecture Scanner)
- **Missing:** No endpoints from #243 (Agent Run Control, Worktree Isolation, Trace/Eval, Living Portfolio)
- **Missing:** No endpoints from #279 (Rudolph Beacon probe, decision manifest, evidence gate CLI)
- **Severity:** MEDIUM — incomplete API documentation

### docs/status/evidence-index.md
- **Status:** FILE NOT FOUND
- **Expected:** Should index all evidence directories and their reports
- **Severity:** MEDIUM — missing evidence index makes navigation harder

### CHANGELOG gaps
- v0.2.0 and v0.3.0 changelog entries were scope of #254 (CLOSED) but files not found
- May have been part of a merged branch but not visible in current `main` tree
- **Severity:** LOW — historical record gap

## Code/Package Reality Check

| Package | Exists | Has Tests | Notes |
|---------|--------|-----------|-------|
| packages/shared | YES | YES (917+) | Core types, utilities |
| packages/sandbox | YES | YES | Workspace isolation, policies |
| packages/github-adapter | YES | YES | GitHub API integration |
| packages/run-state | YES | YES | State machine (28 phases) |
| packages/speckit-adapter | YES | YES | Spec Kit CLI adapter |
| packages/opencode-adapter | YES | YES | OpenCode CLI adapter |
| packages/tool-gateway | YES | YES | MCP tool gateway + red-team tests |
| packages/benchmark-rudolph | YES | YES (282+) | Rudolph Beacon benchmark |
| apps/server | YES | YES | Express backend |
| apps/web | YES | PARTIAL (5 failures) | React/Vite frontend |
| apps/worker | YES | YES | BullMQ worker |
| e2e/ | YES | YES (26 tests) | Playwright E2E (25/26 pass, 1 tracing flake) |

## Package NOT Present (Gap)

| Expected Package | Status | Note |
|-----------------|--------|------|
| packages/mcp-gateway | MISSING | MCP gateway referenced in docs but no dedicated package |
| packages/reverse-prd | MISSING | No dedicated reverse-PRD/blueprint-to-spec package |
| packages/orchestrator | MISSING | No dedicated end-to-end orchestrator package (orchestration spread across run-state + server) |
| packages/evidence-portfolio | MISSING | Evidence portfolio logic spread across docs/; no automated update module |

## Classification

```
DOC_REALITY_STATUS: PARTIAL_DRIFT
```

**Justification:** Core documentation (current-capabilities, known-limitations, README badges, api-overview) has significant drift from post-closeout reality. Multiple completed tracks (Rudolph Beacon, CI recovery) are not reflected. Evidence index is missing entirely. Several CHANGELOG entries expected from closed issues are absent.
