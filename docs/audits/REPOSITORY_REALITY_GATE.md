# Repository Reality Gate — Positron Test Strategy Integration

> Version: 1.0.0 | Date: 2026-06-10 | Session: chore/vibe-coding-orchestration
> Branch: `chore/vibe-coding-orchestration` | Commit: `54010a3`
> Status: BASELINE_CAPTURED

---

## Purpose

Captures the actual (not assumed) state of the Positron repository BEFORE any test strategy changes are applied. This is the "source of truth about the source of truth."

---

## Repository Identity

| Attribute | Value |
|-----------|-------|
| Owner/Repo | `xxammaxx/Positron` |
| Remote | `https://github.com/xxammaxx/Positron` |
| Default Branch | `main` |
| Current Branch | `chore/vibe-coding-orchestration` |
| Current Commit | `54010a3` |
| Package Manager | npm (workspaces) |
| Node Version | >= 22 |
| TypeScript | 5.4.x |
| Test Framework | vitest 4.x |
| Constraint Solver | fast-check 4.8 |
| Linter/Formatter | Biome 1.9.4 |
| Mutation Testing | Stryker 9.6.1 |
| E2E Testing | Playwright 1.60.0 |

---

## Monorepo Structure

```
positron/
├── apps/
│   ├── server/          # Express/TypeScript backend (port 3000)
│   ├── web/             # React/Vite/Tailwind frontend (port 5173)
│   └── worker/           # BullMQ worker
├── packages/
│   ├── shared/           # Types, utils, secret-manager, interfaces
│   ├── github-adapter/   # GitHub API adapter (fake + real)
│   ├── opencode-adapter/ # OpenCode CLI adapter (fake + real)
│   ├── speckit-adapter/  # SpecKit CLI adapter
│   ├── run-state/        # 28-phase state machine
│   └── sandbox/          # Git worktrees, policies, paths
└── e2e/                  # Playwright E2E tests (5 spec files)
```

### Workspace Dependencies

```json
"workspaces": ["apps/*", "packages/*"]
```

---

## Test Configurations

### vitest.config.ts (Unit Tests)
- Include: `packages/*/src/__tests__/**/*.test.ts`, `apps/server/src/__tests__/**/*.test.ts`
- Environment: `node`, fake mode
- Coverage: v8 provider, thresholds: lines 30%, statements 30%, functions 32%, branches 25%
- Setup: `apps/server/vitest.setup.ts`

### vitest.contracts.config.ts (Contract Tests)
- Include: `packages/*/src/__tests__/**/*.contract.test.ts`, `packages/*/src/__contracts__/**/*.test.ts`
- Timeout: 5s, fake mode only
- Purpose: Public API contract verification

### vitest.safety.config.ts (Safety Tests)
- Include: 14 specific safety-critical test files (secret-manager, state-machine, paths, policies, templates, adapters)
- Coverage: 100% hard gate (lines, functions, branches, statements)
- Targets: 11 safety-critical source files

### playwright.config.ts (E2E Tests)
- Browser: Chromium only
- Mode: Fake adapters only
- Retries: 2 in CI, 0 locally
- Workers: 1 (sequential)
- Video: retain-on-failure (CI only)
- Trace: retain-on-failure
- WebServer: auto-starts server (3000) and frontend (5173)

### Stryker Mutation Configs
- **stryker.fast.config.json:** Targets state-machine.ts, utils.ts, secret-manager.ts
- **stryker.safety.config.json:** Targets 7 safety-critical modules, non-blocking

---

## Test Statistics (Baseline)

| Layer | Config | Test Files | Tests | Pass | Fail | Status |
|-------|--------|-----------|-------|------|------|--------|
| Unit | vitest.config.ts | 31 | 690 | 688 | 2 | Partial |
| Contract | vitest.contracts.config.ts | 4 | 140 | 140 | 0 | Clean |
| Safety | vitest.safety.config.ts | ~14 | ~399 | ~398 | ~1 | Partial |
| E2E | playwright.config.ts | 5 | ~15-20 | VARIES | VARIES | Non-blocking |
| Mutation Fast | stryker.fast.config.json | 3 targets | — | — | — | Non-blocking |
| Mutation Safety | stryker.safety.config.json | 7 targets | — | — | — | Non-blocking |
| Typecheck | `tsc -b --dry` | — | — | — | — | Clean |

---

## Pre-Existing Known Failures

### Failure 1: `real-adapter.test.ts` — Windows Path Issue
- **File:** `packages/opencode-adapter/src/__tests__/real-adapter.test.ts`
- **Test:** `RealOpenCodeAdapter saveEvidence edge cases > returns empty object when mkdir fails`
- **Root Cause:** Hardcoded `/tmp/evidence-conflict-test` path incompatible with Windows
- **Error:** `ENOENT: no such file or directory, open 'C:\tmp\evidence-conflict-test'`
- **Line:** ~247, `fs.writeFileSync(conflictPath, 'block')`
- **Impact:** Windows-only failure; test passes on Linux/macOS
- **Fixability:** Trivially fixable with `os.tmpdir()` / `path.join()`

### Failure 2: `state-machine.property.test.ts` — Invariant 8 Timeout
- **File:** `packages/run-state/src/__tests__/state-machine.property.test.ts`
- **Test:** `Invariant 8: Transition chain integrity > every edge in a valid chain satisfies canTransition`
- **Root Cause:** `transitionChainArb` generator produces chains of length 2-20 with `numRuns: 500` — the inner loop runs `transition()` 500 times with chains of up to 20 edges (10,000 state transitions). This times out at 5s.
- **Not a state machine bug:** The invariant itself is valid; the generator is too broad.
- **Line:** ~632, `fc.assert(fc.property(transitionChainArb, ...), { numRuns: 500 })`
- **Fixability:** Reduce `numRuns` or constrain chain length, OR increase test timeout.

---

## CI Gates (`.github/workflows/`)

### quality-gates.yml
| Job | Trigger | Blocking | Artifacts |
|-----|---------|----------|-----------|
| build-and-test | push/PR to main | Yes | — |
| observability-config-check | push/PR to main | No (continue-on-error) | — |
| mutation-fast | push/PR to main | No (continue-on-error) | mutation-fast-report |
| mutation-safety | push/PR to main | No (continue-on-error) | mutation-safety-report |
| e2e-playwright | push/PR to main | No (continue-on-error) | playwright-report, test-results |

### verify-issues.yml
- Scheduled: Monday 9:00 UTC
- On PR close, push to main
- Manual trigger with issue_number input

---

## Existing Evidence/Contract Documents (Untracked, Pre-Existing)

| Document | Path | Status |
|----------|------|--------|
| ADR-001 | `docs/adr/ADR-vibe-coding-orchestration.md` | PROPOSED |
| Agent Capability Registry | `docs/architecture/AGENT_CAPABILITY_REGISTRY.md` | PROPOSED |
| Adapter Contracts | `docs/architecture/ADAPTER_CONTRACTS.md` | PROPOSED |
| Vibe Coding Orchestration | `docs/architecture/VIBE_CODING_ORCHESTRATION.md` | PROPOSED |
| Verification Contract | `docs/testing/VIBE_CODING_VERIFICATION_CONTRACT.md` | PROPOSED |
| Context Manifest Template | `docs/agent/VIBE_CODING_CONTEXT_MANIFEST_TEMPLATE.md` | PROPOSED |
| Evidence Log Template | `docs/agent/VIBE_CODING_EVIDENCE_LOG_TEMPLATE.md` | PROPOSED |
| Reviewer Agent Contract | `docs/review/REVIEWER_AGENT_CONTRACT.md` | PROPOSED |
| Security Gates | `docs/security/AGENTIC_CODING_SECURITY_GATES.md` | PROPOSED |

**All above documents** are in PROPOSED state. None have corresponding runtime implementation or tests. This is the gap this test strategy integration addresses.

---

## Agent/Prompt Rules Inventory

| File | Purpose |
|------|---------|
| `AGENTS.md` | Global agent rules, trust tiers, isolation levels |
| `.opencode/policies/evidence-gates.json` | Evidence gate definitions |
| `.opencode/policies/mcp-trust-tiers.json` | MCP trust tier definitions |
| `.opencode/policies/data-retention.json` | Data retention policies |
| `SECURITY.md` | Security model documentation |
| `docs/security/security-model.md` | Detailed security model |
| `docs/security/external-skills-inventory.md` | Approved/quarantined skills |

---

## Fake/Real Adapter Inventory

| Adapter | Real | Fake | Contract Tests | Safety Coverage |
|---------|------|------|---------------|-----------------|
| GitHub | `GithubAdapter` | `FakeGitHubAdapter` | 24 tests | templates.test.ts ✅ |
| OpenCode | `RealOpenCodeAdapter` | `FakeOpenCodeAdapter` | Pending | fake-adapter.test.ts ✅ |
| SpecKit | N/A | `FakeSpecKitAdapter` | None | None |
| Sandbox | N/A | N/A | N/A | paths/policies ✅ |

---

## 7-Layer Quality System Status

| Layer | Name | Status |
|-------|------|--------|
| L1 | Unit Tests | Implemented (688/690 pass) |
| L2 | Contract Tests | Implemented (140/140 pass) |
| L3 | CI Gates | Partially implemented (build, lint, typecheck, test) |
| L4 | Browser/Playwright Evidence | Implemented (non-blocking) |
| L5 | AI UI Review | NOT IMPLEMENTED |
| L6 | Runtime Observability | Implemented (Prometheus/Grafana) |
| L7 | Evidence Aggregation | NOT IMPLEMENTED |

**Gap:** L5 and L7 are not yet implemented. Additionally, the new agentic coding contracts (Agent Capability Registry, Adapter Contracts, Context Manifest, Evidence Log, Reviewer Contract) have NO corresponding runtime tests or implementation.

---

## Known Infrastructure

- **SQLite:** Project-local database (`.positron/positron.db`)
- **BullMQ:** Queue system (disabled in fake mode)
- **Prometheus/Grafana:** Observability stack (`observability/` directory)
- **Docker Compose:** Local dev and test environments
- **Worktree Isolation:** Via `packages/sandbox/` (git worktrees)
- **Secret Redaction:** Via `packages/shared/src/secret-manager.ts`
- **Branch Policy:** Via `packages/sandbox/src/commit-policy.ts`
- **Command Allowlist:** Via `packages/sandbox/src/opencode-policy.ts`

---

## Gap Analysis Summary

The following contracts/specs exist as PROPOSED documents but have ZERO runtime tests or implementation:

1. **Agent Capability Registry** — No `agent-types.ts`, no registry class, no validation
2. **Adapter Contracts** — No `CodingAgentAdapter` interface in shared/, no contract tests
3. **Context Manifest** — No manifest type, no validator, no generator
4. **Evidence Log** — No log type, no validator, no structured comment generator
5. **Reviewer-Agent Contract** — No `ReviewReport` type, no checklist logic, no integration
6. **Vibe-Coding Pipeline Profile** — No profile type, no gate enforcement module
7. **Security Gates** — Document-only, no runtime enforcement of agentic gates

---

## Known Failure Classification Policy

For this test strategy integration, the two known failures are classified as:

1. **real-adapter.test.ts** (`C:\tmp\evidence-conflict-test`): **FIXABLE** — trivial cross-platform fix
2. **state-machine.property.test.ts** (Invariant 8 timeout): **MITIGATABLE** — reduce numRuns, not a state machine bug

Both will be addressed in Phase 8. New failures introduced by this work will be treated as blocking.

---

*Reality Gate captured 2026-06-10. To be updated after implementation.*
