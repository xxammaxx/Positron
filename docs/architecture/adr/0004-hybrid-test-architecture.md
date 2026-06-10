# ADR-0004: MCP-powered Hybrid Test Architecture

- **Date:** 2026-05-25
- **Status:** Proposed
- **Deciders:** Positron Architecture Team
- **Supersedes:** None

---

## Context

Positron v3.0 is an evidence-gated GitHub Issue execution system. Every unit of work — from issue ingestion through implementation to PR merge — must produce verifiable evidence (test results, build status, acceptance criteria mapping) that is logged as run events and persisted in SQLite.

The current test architecture relies on two disconnected pillars:

1. **Vitest** (unit/integration): 7 test files across packages and `apps/server`, executed via `vitest run`. Tests validate state machine transitions, adapter contracts, command-runner paths, and HTTP endpoints. Coverage is reasonable within packages but does not exercise cross-package workflows, real browser interaction, or MCP-layer behavior.

2. **Playwright** (E2E smoke): A single `e2e/smoke.spec.ts` file with 3 tests — health check, dashboard loading, and `/api/runs` response. The Playwright config supports headed mode (`PW_HEADED=1`) and slow-motion (`PW_SLOWMO`), but these are optional overrides, not a designed observation layer.

### Limitations of the current setup

| Limitation | Impact |
|---|---|
| No KI-driven test generation | Tests are hand-written; test coverage is static and human-dependent. The KI agent cannot analyze code changes and propose or generate targeted test scenarios. |
| No MCP-layer testing | The server orchestrates adapters that call GitHub, SpecKit, and OpenCode. None of these adapter calls are tested through the MCP protocol layer that agents actually use. This leaves a gap between "the adapter works in isolation" and "the agent can successfully use the adapter via MCP tools". |
| Binary headless/headed switch | `PW_HEADED=1` is a global toggle, not a layered observation mode. There is no way to selectively enable visible execution for specific test steps or provide a split view of agent-generated vs. framework-verified assertions. |
| No unified execution model | Vitest and Playwright run as separate `npm test` and `npx playwright test` commands. There is no orchestration layer that sequences agent-led exploration with classical assertion validation within a single test run. |
| Evidence-gating is theoretical | The constitution mandates "no silent failure" and evidence-gated progression, but evidence collection (test outputs, diffs, coverage) is manual or script-level, not systematically captured as run events. |
| Cross-platform fragility | The current env-var approach (`PW_HEADED`, `PW_SLOWMO`) works but lacks standardized cross-platform handling (Windows PowerShell vs. Unix shell, `cross-env` usage is inconsistent). |

### Why a hybrid approach is necessary

Positron's core value proposition is **controlled autonomy**: KI agents perform work, but every action is gated by evidence. Testing is the primary evidence source. A hybrid architecture is required because:

- **KI agents can plan tests but should not be the sole arbiter of test truth.** The agent may hallucinate a passing test or misinterpret a failure. The classical framework (Vitest/Playwright) must remain the authoritative truth layer.
- **MCP tools are the agent's interface to the world.** Testing the MCP layer itself (tool invocation, parameter validation, error propagation) is essential for validating agent behavior end-to-end.
- **Visible execution is a governance requirement.** Human operators must be able to observe what the agent is doing — not just read logs after the fact. A visible browser with slow-motion replay provides the audit trail demanded by the evidence-gated constitution.

---

## Decision

We will adopt a **4-layer Hybrid Test Architecture** that combines KI-driven test planning, MCP-controlled tool execution, classical framework assertion, and a visible observation layer.

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: KI Agent Layer (Test Planning & Code Analysis)     │
│ - Analyzes issue context, code diff, and existing coverage  │
│ - Generates test plans, identifies gap scenarios            │
│ - Prüft Akzeptanzkriterien gegen Testabdeckung               │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: MCP Layer (Controlled Tool Execution)              │
│ - MCP tools for browser navigation, repo access, test data  │
│ - Tool invocation audit trail → run events in SQLite        │
│ - Tiered trust: readonly tools (Tier 0) first               │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: Classical Test Layer (Ground Truth)                │
│ - Playwright for browser E2E (headed/headless)              │
│ - Vitest for unit/integration assertions                    │
│ - This layer is authoritative — KI assertions are advisory  │
│   until confirmed by classical framework results            │
├─────────────────────────────────────────────────────────────┤
│ Layer 4: Visible Observation Layer (Human-in-the-Loop)      │
│ - Headed browser with slowMo for interactive debugging      │
│ - Vitest UI mode for visual test exploration                │
│ - Playwright Trace Viewer for post-hoc analysis             │
│ - SSE event stream to web UI for live run observation       │
│ - Screenshot/video capture on failure                       │
└─────────────────────────────────────────────────────────────┘
```

### Layer 1: KI Agent Layer

**Responsibilities:**
- Ingest the issue specification, plan, and tasks (Speckit artifacts).
- Analyze the codebase diff and existing test coverage.
- Propose a **test plan** that maps acceptance criteria to specific test scenarios.
- Generate Playwright test stubs and Vitest test templates.
- Produce **test evidence comments** posted to the GitHub issue.

**Boundaries:**
- The KI agent **may propose** tests and **may report** observations but **may not** declare a test as passing based solely on its own analysis.
- Agent-generated tests must be reviewed by the classical layer before being accepted as evidence.
- Agent assertions that conflict with Vitest/Playwright results are automatically flagged as `EVIDENCE_CONFLICT`.

### Layer 2: MCP Layer

**Responsibilities:**
- Provide controlled MCP tools for the KI agent to interact with the test environment:
  - `browser_navigate`, `browser_click`, `browser_screenshot` (Playwright-backed, readonly by default)
  - `repo_read_file`, `repo_list_tests` (readonly repository access)
  - `testdata_seed`, `testdata_reset` (sandboxed test data management)
  - `run_vitest`, `run_playwright` (test execution, gated)
- Log every MCP tool invocation as a `RunEvent` in SQLite with:
  - Tool name, parameters (redacted for secrets), timestamp, result status.
- Enforce **trust tiers** from `.opencode/policies/mcp-trust-tiers.json`:
  - Tier 0 (Readonly): `browser_navigate`, `browser_screenshot`, `repo_read_file`
  - Tier 1 (Sandboxed): `testdata_seed`, `testdata_reset`, Playwright in headless mode
  - Tier 2 (Trusted, Human-Gate): `browser_click`, `run_vitest`, `run_playwright` in headed mode

**Boundaries:**
- MCP tools do not replace Playwright or Vitest. They wrap them. The tool invocation is recorded; the framework result is authoritative.
- MCP tool parameters are validated server-side before dispatch.
- The `run_vitest` and `run_playwright` tools return the framework's raw output, not the agent's interpretation.

### Layer 3: Classical Test Layer

**Responsibilities:**
- **Playwright** executes browser-based E2E scenarios. Playwright is the sole arbiter of browser truth — DOM assertions, network responses, visual state.
- **Vitest** executes unit and integration tests. Vitest is the sole arbiter of logic truth — function outputs, state transitions, adapter contracts.
- Test results are captured in structured form (pass/fail, duration, error messages, stack traces) and stored as run events.
- Coverage data (via v8 provider in Vitest) is collected and attached to the run.

**Configuration:**
- `POSITRON_TEST_MODE` env var controls the execution mode:
  - `headless` — CI mode, no browser UI (default)
  - `headed` — visible browser, single test at a time
  - `observe` — headed + slowMo + trace + video always-on
- Existing `PW_HEADED` and `PW_SLOWMO` vars continue to work but are deprecated in favor of `POSITRON_TEST_MODE`.
- `cross-env` is added as a devDependency to ensure consistent env-var setting across platforms.

### Layer 4: Visible Observation Layer

**Responsibilities:**
- **Headed browser mode** (`POSITRON_TEST_MODE=headed`): Browser window is visible during test execution. Useful for development, debugging, and stakeholder demos.
- **Slow-motion replay** (`POSITRON_TEST_MODE=observe`): Each Playwright action is executed with a configurable delay (default 500ms) so a human observer can follow along.
- **Vitest UI mode** (`vitest --ui`): Provides an interactive test explorer in the browser for visual inspection of test results and coverage.
- **Playwright Trace Viewer**: Post-hoc timeline of every action, network request, and DOM snapshot for failed tests.
- **SSE Event Stream**: The existing `/api/runs/:id/events/stream` SSE endpoint is extended to emit test-layer events (`test_started`, `test_passed`, `test_failed`, `test_evidence`) so the web UI can display a live testing dashboard.
- **Screenshot/Video on Failure**: Playwright is configured with `screenshot: 'only-on-failure'` and `video: 'retain-on-failure'` (already in place, extended to the `observe` mode for always-on capture).

---

## Alternatives Considered

### Alternative 1: Pure Playwright without MCP

**Description:** Expand the existing Playwright E2E suite without introducing MCP-managed test tools or a KI agent layer.

**Evaluation:**
- **Pros:** Simpler architecture, fewer moving parts, lower setup complexity. Playwright is a mature, well-understood framework.
- **Cons:** No KI-driven test generation — test coverage remains static. No MCP-layer testing means the agent's primary interface to the world is untested. The evidence-gated constitution cannot be fully implemented because test planning and evidence collection remain manual. Does not address the visible observation requirement beyond the existing `PW_HEADED` toggle.

**Rejection reason:** Fails to address the core requirement of KI agent testing and evidence-gated progression. Playwright alone cannot test the MCP protocol layer that Positron agents depend on.

### Alternative 2: MCP-only Testing without Classical Framework

**Description:** Use MCP tools as the sole test execution mechanism. The KI agent navigates the browser via MCP, inspects DOM state, and asserts correctness through MCP tool responses. No Playwright or Vitest under the hood.

**Evaluation:**
- **Pros:** Tightly integrated with the agent workflow. Single execution model. Agent has full control over test scenarios.
- **Cons:** The KI agent becomes the arbiter of truth — a direct violation of the evidence-gated principle (agents execute, but do not judge). MCP tool responses are agent-interpreted text, not structured test assertions. No built-in retry, trace, or coverage. No equivalent of Vitest's deterministic unit testing. Hallucinated "pass" results are undetectable.

**Rejection reason:** Fundamentally incompatible with Positron's constitution. "Evidence-Gated Progression" (Article IV) requires that test execution produce verifiable, framework-attested results, not agent self-reports. An MCP-only approach would make the system trust the agent to judge its own work.

### Alternative 3: Cypress instead of Playwright

**Description:** Replace Playwright with Cypress as the browser E2E framework.

**Evaluation:**
- **Pros:** Cypress has a well-known developer experience, real-time reloading, and a built-in dashboard. Some teams may already be familiar with it.
- **Cons:** Cypress runs inside the browser (no multi-tab, no cross-origin without hacks), which limits test scenarios. No MCP-native integration. Playwright's multi-browser support (Chromium, Firefox, WebKit) and its trace viewer are superior for evidence collection. Playwright's `launchOptions.slowMo` and `headless` toggles map directly to our visible observation needs. Cypress would require a separate MCP bridge layer.

**Rejection reason:** Playwright is already integrated in the project (v1.60.0 in devDependencies, `playwright.config.ts` configured with headed/slowMo support). Switching to Cypress would add migration cost with no architectural benefit. Playwright's architecture (out-of-process browser control) aligns better with the MCP tool model than Cypress's in-browser execution.

### Alternative 4: Fully Autonomous Testing (Agent decides pass/fail)

**Description:** Let the KI agent run tests, interpret results, and decide whether tests pass or fail without human or framework validation.

**Rejection reason (no detailed evaluation):** This is a direct violation of Positron Constitution Article IV (Evidence-Gated Progression) and Article IX (Security by Default). Positron's autonomy model is "controlled autonomy," not "blind autonomy." The agent executes; the framework judges.

---

## Consequences

### Positive

| Consequence | Description |
|---|---|
| **Visible test execution** | Human operators can observe agent-driven tests in real time via headed browser, slowMo replay, and the SSE event stream in the web UI. This satisfies the auditability requirements of the evidence-gated constitution. |
| **Evidence-gated testing** | Every test result — whether generated by the KI agent or executed by the classical layer — is captured as a structured run event in SQLite. No test passes silently; no test fails without a trace. |
| **Human-in-the-loop** | The visible observation layer enables a human to pause, inspect, and override at any point. The KI agent proposes; the human (and the classical framework) dispose. |
| **MCP-layer validation** | For the first time, the MCP tools that Positron agents use (browser navigation, repo access, test execution) are themselves testable. This closes the "adapter works, agent fails" gap. |
| **Unified execution model** | A single `POSITRON_TEST_MODE` env var controls the entire test execution posture across CI, development, and observation modes. No more juggling `PW_HEADED`, `PW_SLOWMO`, and `CI` independently. |
| **KI-assisted test coverage** | The KI agent can analyze diffs and propose targeted tests, catching regressions that static test suites would miss. |
| **Post-hoc forensic capability** | Playwright traces, screenshots, and videos for failed runs enable root-cause analysis without reproducing the issue. |

### Negative

| Consequence | Description |
|---|---|
| **Increased setup complexity** | The 4-layer architecture requires coordinating Vitest, Playwright, MCP tools, and the KI agent in a single test run. Setup scripts, configuration files, and documentation must cover all four layers. |
| **Cross-platform env var handling** | Windows PowerShell vs. Unix shell differences require `cross-env` for all test scripts. Environment variable names must be consistently cased and documented across `package.json`, CI configs, and developer documentation. |
| **Slower execution in observe mode** | `POSITRON_TEST_MODE=observe` with slowMo delays adds significant wall-clock time. This is acceptable for development and demos but must never be the default in CI. |
| **Agent-test coupling risk** | If the KI agent generates tests that are too tightly coupled to its own implementation decisions, test fragility increases. Test plans must be reviewed for high-level correctness, not implementation-detail verification. |
| **More moving parts in CI** | CI pipelines must now coordinate Vitest, Playwright, MCP tool servers, and the KI agent's test-planning step. Failure in any layer must not block the others from producing evidence. |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **MCP tool poisoning** — a compromised or buggy MCP tool returns manipulated results that the agent trusts | Medium | High (false evidence) | All MCP tool outputs are treated as potentially untrusted (per MCP Safety Rules in AGENTS.md). Layer 3 (classical framework) is authoritative; MCP results are advisory only. Tool responses are logged verbatim for audit. |
| **Prompt injection via test data** — test fixtures contain strings that are interpreted as agent instructions | Medium | High (agent hijacking) | Test data must be treated as untrusted input. Test data files are read via MCP Tier 1 (sandboxed), not passed directly to the agent's prompt. All test data is sanitized before agent ingestion. |
| **Secret leakage through MCP tool parameters** — secrets (tokens, keys) in tool invocations are logged to SQLite | Low | Critical | All MCP tool parameters are redacted before logging (existing `redactSecrets` utility extended to MCP parameter schemas). `run_vitest` and `run_playwright` tools do not accept environment variables as parameters. |
| **Cross-platform path divergence** — Windows path separators break test scripts or MCP tool file references | Medium | Medium | All file paths in MCP tool parameters use forward slashes and are normalized by the server. `cross-env` ensures consistent env var syntax. CI runs on both Windows and Linux to catch regressions. |
| **Agent over-trusting test output** — KI agent interprets Vitest/Playwright output and draws incorrect conclusions | Medium | Medium | Test output is captured as structured JSON, not free-text. The agent receives parsed results (`{ passed: number, failed: number, suites: [...] }`), not raw stdout. Evidence comments include both the raw output and the structured parse. |
| **Performance regression in observe mode** — slowMo + trace + video capture overwhelms CI runners | Low (CI runs headless) | Medium (if misconfigured) | `POSITRON_TEST_MODE` defaults to `headless` in CI. The `observe` mode has a hard timeout limit (configurable, default 5 minutes per test) and is blocked in CI via a guard in `playwright.config.ts`. |

---

## Security Considerations

### MCP Least-Privilege

Every MCP tool used in the test architecture is assigned to one of three trust tiers:

| Tier | Tools | Constraints |
|---|---|---|
| **Tier 0 (Readonly)** | `browser_navigate`, `browser_screenshot`, `repo_read_file`, `repo_list_tests` | No mutation of any system. Responses are treated as untrusted and validated before use. |
| **Tier 1 (Sandboxed)** | `testdata_seed`, `testdata_reset`, Playwright in headless mode | Mutation is confined to ephemeral test databases (`:memory:` SQLite or temp directories). No access to production data, real repositories, or live tokens. |
| **Tier 2 (Trusted, Human-Gate)** | `browser_click`, `browser_type`, `run_vitest`, `run_playwright` in headed mode | Requires `POSITRON_TEST_MODE=headed` or `observe` (human-initiated). Never available in CI. All actions are logged with full parameter audit. |

### Readonly-First Principle

- All MCP tools default to readonly mode. Mutation-capable tools require explicit opt-in via environment configuration.
- Browser tools start in "inspect" mode before "interact" mode. The agent must demonstrate understanding of the page state before it is allowed to click or type.
- This prevents "blind automation" where the agent clicks through pages without verifying state.

### Secret Protection

- The existing `redactSecrets` utility (referenced in `docs/architecture/README.md` Security Model) is extended to cover MCP tool parameter schemas. Any parameter matching a known secret pattern (`ghp_`, `github_pat_`, `sk-`, bearer tokens, etc.) is replaced with `[REDACTED]` before logging.
- `process.env` is never passed as an MCP tool parameter. Environment variables required by tests are injected server-side from a `.env.test` file (gitignored) or CI secret store.
- Test data files (fixtures, seeds) are stored in `packages/*/src/__tests__/__fixtures__/` and must never contain real credentials, PII, or production endpoints.

### Tool Poisoning Protection

Per the MCP Safety Rules in `AGENTS.md`:
- All MCP tool responses are treated as potentially untrusted. The classical test layer (Layer 3) is always authoritative.
- MCP tool responses are never piped directly to shell commands without validation.
- File paths returned by MCP tools are validated against allowed workspace paths before any filesystem operation.
- Suspicious MCP behavior (unexpected tool calls, parameter anomalies, response size outliers) is logged to `.opencode/logs/audit/` and flags the run for human review.

### Audit Trail

Every test-layer event is persisted as a `RunEvent` in SQLite with:
- `id`, `runId`, `phase`, `level`, `message`, `payload`, `createdAt`
- `payload` for test events includes: `{ layer: "mcp" | "classical" | "agent", tool?: string, testFile?: string, passed?: number, failed?: number, skipped?: number, duration?: number, evidenceUrl?: string }`

This ensures a complete, queryable audit trail of every test action, assertion, and result — satisfying the constitution's requirement that evidence be "documented in GitHub" and "persisted" (Article I, Article VIII).

---

## Implementation Notes

### Phased Rollout

1. **Phase 1 — Foundation:** Wire `POSITRON_TEST_MODE` env var. Extend Playwright config to support `headed`, `headless`, and `observe` modes. Add `cross-env` to test scripts.
2. **Phase 2 — MCP Layer:** Implement MCP tools for browser and repo access (Tier 0 first). Add tool invocation logging to SQLite.
3. **Phase 3 — Agent Integration:** KI agent generates test plans from Speckit artifacts. Agent proposes Playwright test stubs. Agent observes test execution via MCP tools.
4. **Phase 4 — Visible Dashboard:** Extend web UI to display live test events via SSE. Add Vitest UI mode integration.
5. **Phase 5 — Evidence Gating:** Programmatic gate that blocks PR creation/merge until test evidence is complete (all acceptance criteria mapped, all tests passed, coverage threshold met).

### Configuration Summary

```bash
# .env.test (gitignored, template in .env.test.example)
POSITRON_TEST_MODE=headless    # headless | headed | observe
POSITRON_MCP_TRUST_TIER=0      # 0=readonly, 1=sandboxed, 2=trusted
POSITRON_TEST_TIMEOUT=60000    # per-test timeout in ms
POSITRON_TEST_SLOWMO=500       # slowMo delay in observe mode
POSITRON_EVIDENCE_DIR=.positron/evidence  # screenshot/video/trace output
```

### Deprecation Path

- `PW_HEADED=1` → Deprecated in favor of `POSITRON_TEST_MODE=headed`. Retained with a deprecation warning for one release cycle.
- `PW_SLOWMO=N` → Deprecated in favor of `POSITRON_TEST_MODE=observe` + `POSITRON_TEST_SLOWMO=N`. Retained with a deprecation warning for one release cycle.

---

## Related Documents

- [Positron Constitution](https://github.com/xxammaxx/Positron/blob/main/.specify/memory/constitution.md) — especially Articles I, IV, VIII, IX
- [Positron Architecture Overview](../README.md)
- [AGENTS.md — Trust Tier System](https://github.com/xxammaxx/Positron/blob/main/AGENTS.md)
- [Issue #64: MCP-powered Hybrid Test Architecture](https://github.com/positron/positron/issues/64)
