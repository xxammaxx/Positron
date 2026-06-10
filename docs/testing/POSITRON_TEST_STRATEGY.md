# Positron Test Strategy — Direct Integration

> Version: 1.0.0 | Date: 2026-06-10 | Branch: `chore/vibe-coding-orchestration`
> Author: issue-orchestrator | Related: Issue #???
> Status: IMPLEMENTING

---

## Purpose

This document defines the **executable** Positron test strategy. It is not theoretical documentation — it maps directly to existing test configurations, identifies concrete gaps, and specifies what tests must exist at each layer. Every claim references a specific vitest config, test file, or CI job.

---

## Seven-Layer Quality System

### Layer 1: Unit Tests

| Aspect | Detail |
|--------|--------|
| **Config** | `vitest.config.ts` |
| **Command** | `npm test` |
| **Scope** | All packages + apps/server |
| **Test Files** | 31 files |
| **Test Count** | 690 tests |
| **Pass Rate** | 688/690 (99.7%) |
| **Coverage Threshold** | Lines: 30%, Statements: 30%, Functions: 32%, Branches: 25% |
| **CI Gate** | `quality-gates.yml` → `build-and-test` job (blocking) |
| **Evidence** | Test output in CI logs |

**Gaps:**
- Missing unit tests for new agentic types (AgentDeclaration, CodingAgentAdapter, etc.)
- Missing unit tests for evidence validation logic

**New Tests Required:**
- `packages/shared/src/__tests__/agent-types.test.ts` — AgentDeclaration validation
- `packages/shared/src/__tests__/evidence-types.test.ts` — Evidence validation types
- `packages/shared/src/__tests__/context-manifest.test.ts` — Context manifest validation
- `packages/shared/src/__tests__/verification-contract.test.ts` — Contract validation

---

### Layer 2: Contract Tests

| Aspect | Detail |
|--------|--------|
| **Config** | `vitest.contracts.config.ts` |
| **Command** | `npm run test:contracts` |
| **Scope** | Public API contracts between packages |
| **Test Files** | 4 files |
| **Test Count** | 140 tests |
| **Pass Rate** | 140/140 (100%) |
| **CI Gate** | Not separately gated (runs within unit tests) |
| **Evidence** | Contract test reports |

**Gaps:**
- No adapter conformance contract tests for `CodingAgentAdapter`
- No contract tests for Agent Capability Registry
- No contract tests for Evidence Log structure
- No contract tests for Reviewer-Agent Report structure

**New Tests Required:**
- `packages/opencode-adapter/src/__contracts__/coding-agent-adapter.contract.test.ts`
- `packages/shared/src/__contracts__/agent-capability-registry.contract.test.ts`
- `packages/shared/src/__contracts__/evidence-log.contract.test.ts`
- `packages/shared/src/__contracts__/reviewer-report.contract.test.ts`

---

### Layer 3: Adapter Conformance Tests

| Aspect | Detail |
|--------|--------|
| **Status** | **NEW LAYER** — exists as concept, needs implementation |
| **Config** | To be added to `vitest.contracts.config.ts` or new `vitest.adapters.config.ts` |
| **Command** | `npm run test:adapters` (new) |
| **Scope** | Every adapter must implement its contract correctly |
| **CI Gate** | To be added |

**Required Tests:**
- Every adapter implements `CodingAgentAdapter`
- Fake/Real adapter parity (same interface, different behavior)
- Adapter Capability declaration matches actual behavior
- Trust Tier, Risk Level correctly set
- Adapter error handling produces typed results
- Adapter does not leak secrets in logs/evidence

---

### Layer 4: State Machine / Property Tests

| Aspect | Detail |
|--------|--------|
| **Config** | `vitest.config.ts` (included) |
| **Test Files** | `packages/run-state/src/__tests__/state-machine.property.test.ts` |
| **Test Count** | ~20 property tests (fast-check) |
| **Pass Rate** | All pass except Invariant 8 timeout |
| **Coverage** | Covered by safety config (100% target) |

**Known Issue:** Invariant 8 (`transitionChainArb`, `numRuns: 500`, chains up to 20 edges) times out at 5s. Not a state machine bug — generator is too broad.

**Action:** Reduce `numRuns` to 100 for chain tests, increase timeout to 15s for this test only.

---

### Layer 5: Safety / Security Tests

| Aspect | Detail |
|--------|--------|
| **Config** | `vitest.safety.config.ts` |
| **Command** | `npm run coverage:safety` |
| **Scope** | 14 safety-critical test files → 11 source files |
| **Coverage Target** | 100% lines, functions, branches, statements |
| **CI Gate** | Coverage checked via safety config |

**Gaps:**
- No safety tests for agentic security gates (prompt sanitization, command allowlist for multi-agent)
- No safety test for context manifest secret detection
- No safety test for evidence integrity hash verification

**New Tests Required:**
- `packages/shared/src/__tests__/prompt-sanitizer.test.ts` — Secret redaction in agent prompts
- `packages/sandbox/src/__tests__/agent-command-policy.test.ts` — Multi-agent command allowlist
- `packages/shared/src/__tests__/evidence-integrity.test.ts` — Hash verification

---

### Layer 6: Browser / Playwright / Operator-Dashboard Tests

| Aspect | Detail |
|--------|--------|
| **Config** | `playwright.config.ts` |
| **Command** | `npm run test:e2e` |
| **Scope** | E2E UI workflow, smoke tests, workflow proof |
| **Test Files** | 5 spec files in `e2e/` |
| **CI Gate** | `quality-gates.yml` → `e2e-playwright` (non-blocking) |
| **Evidence** | Screenshots (on failure), video (CI), trace (retain-on-failure) |

**Gaps:**
- No Playwright test for Operator Dashboard critical flows
- No explicit console error assertion gate
- No explicit network 4xx/5xx assertion gate
- No accessibility snapshot assertions

**New Tests Required:**
- `e2e/operator-dashboard.spec.ts` — Operator dashboard critical flows
- Enhancement: console/network error gates in existing tests

---

### Layer 7: Evidence / CI / Reviewer Gates

| Aspect | Detail |
|--------|--------|
| **Status** | **NEW LAYER** — designed, not implemented |
| **Config** | New `vitest.evidence.config.ts` (planned) |
| **Command** | `npm run test:evidence` (new) |
| **Scope** | Evidence validation, context manifest validation, reviewer report validation |
| **CI Gate** | To be added to `quality-gates.yml` |

**Required Tests:**
- Evidence Log structural validation
- Context Manifest field validation
- Reviewer Report verdict rules validation
- Verification Contract gate enforcement
- CI artifact upload integrity

---

## Layer Matrix (Full)

| Layer | Zweck | Existiert? | Lücke | Neue Tests | CI Gate | Evidence |
|-------|-------|:----------:|-------|-----------|---------|----------|
| **L1** | Unit Tests | ✅ Yes | Agentic type tests | 4 new test files | Blocking | Test output |
| **L2** | Contract Tests | ✅ Yes | Agentic contract tests | 4 new test files | Not separated | Contract report |
| **L3** | Adapter Conformance | ❌ New | No adapter contract tests | 1 new vitest config | To add | Conformance report |
| **L4** | State Machine/Property | ✅ Yes | Invariant 8 timeout | Reduce numRuns | Included in L1 | Property report |
| **L5** | Safety/Security | ✅ Yes | Agentic security tests | 3 new test files | 100% coverage gate | Safety report |
| **L6** | Browser/Playwright | ✅ Yes | Operator dashboard, console/network gates | 1 new spec file | Non-blocking | Screenshots, video, trace |
| **L7** | Evidence/CI/Reviewer | ❌ New | Entire layer missing | 1 new vitest config | To add | Evidence artifacts |

---

## CI Gate Matrix (Current + Planned)

| Gate | Tool | Blocking | Artifacts | Status |
|------|------|:--------:|-----------|--------|
| Format Check | Biome | Yes | — | ✅ Implemented |
| Lint | Biome | Yes | — | ✅ Implemented |
| Build | tsc -b | Yes | — | ✅ Implemented |
| Typecheck | tsc -b --dry | Yes | — | ✅ Implemented |
| Unit Tests | vitest | Yes | — | ✅ Implemented |
| Contract Tests | vitest | No* | — | ⚠️ Needs separate job |
| Safety Tests | vitest | No* | — | ⚠️ Needs separate job |
| Property Tests | vitest | No* | — | ⚠️ Bundled in unit |
| Playwright E2E | playwright | No | Report, traces | ⚠️ Non-blocking |
| Mutation Fast | Stryker | No | HTML report | ⚠️ Non-blocking |
| Mutation Safety | Stryker | No | HTML/JSON report | ⚠️ Non-blocking |
| **Evidence Gates** | vitest + scripts | ❌ **NEW** | Evidence log | 🔴 Not implemented |
| **Contract Conformance** | vitest | ❌ **NEW** | Conformance report | 🔴 Not implemented |
| **Agentic Security** | semgrep/policy | ❌ **NEW** | Scan report | 🔴 Not implemented |

\* Currently bundled in `npm test` (unit tests), not visible as separate gates.

---

## Test Command Inventory

| Command | Config | Description |
|---------|--------|-------------|
| `npm test` | vitest.config.ts | All unit tests |
| `npm run test:contracts` | vitest.contracts.config.ts | Contract tests |
| `npm run test:integration` | vitest.config.ts (single file) | Integration test |
| `npm run test:e2e` | playwright.config.ts | Playwright E2E |
| `npm run coverage` | vitest.config.ts | Unit coverage |
| `npm run coverage:safety` | vitest.safety.config.ts | Safety coverage |
| `npm run test:mutation:fast` | stryker.fast.config.json | Fast mutation |
| `npm run test:mutation:safety` | stryker.safety.config.json | Safety mutation |
| `npm run typecheck` | tsc -b --dry | TypeScript check |

**New Commands Planned:**
- `npm run test:evidence` — Evidence gate tests
- `npm run test:adapters` — Adapter conformance tests

---

## Test Directory Convention

```
packages/{name}/src/__tests__/       — Unit tests (*.test.ts)
packages/{name}/src/__contracts__/   — Contract tests (or *.contract.test.ts in __tests__)
tests/contracts/                     — Cross-package contract tests (if needed)
tests/safety/                        — Cross-package safety tests (if needed)
tests/agentic/                       — Agentic coding infrastructure tests
e2e/                                 — Playwright E2E tests
```

**Rule:** Use existing conventions. New directories only when cross-package scope requires it.

---

## Implementation Priority

1. **Phase A (this sprint):** Type definitions for agentic contracts (`packages/shared/src/`)
2. **Phase B (this sprint):** Red tests for all 7 new contract categories
3. **Phase C (this sprint):** Known failure fixes
4. **Phase D (this sprint):** CI gate enhancement with separate test layers
5. **Phase E (next sprint):** Playwright Operator Dashboard E2E
6. **Phase F (next sprint):** Runtime evidence aggregation (L7)

---

*Strategy document created 2026-06-10. To be updated as gates are implemented.*
