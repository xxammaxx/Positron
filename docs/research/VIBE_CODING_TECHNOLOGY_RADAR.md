# Vibe Coding Technology Radar 2026

> Version: 1.0.0-draft | Status: PROPOSED | Date: 2026-06-10
> Base: Deep Research Report validation (May 2026)

---

## Technology Classification

### Adopt (Recommended for Positron Integration)

| Technology | Category | Integration | Rationale |
|-----------|----------|-------------|-----------|
| **OpenCode CLI** | Agentic Coding | ✅ Implemented (`opencode-adapter`) | Bereits integriert; CLI-basiert; lokal |
| **GitHub Issues** | Source of Truth | ✅ Implemented (`github-adapter`) | Kanonischer Workflow-Anker |
| **Vitest** | Testing | ✅ Implemented | 690+ Tests, safety coverage gate |
| **Playwright** | E2E/Visual | ✅ Implemented (L4) | Browser evidence, traces, screenshots |
| **Biome** | Lint/Format | ✅ Implemented (QA-002) | Ersetzt ESLint/Prettier |
| **Stryker** | Mutation Testing | ✅ Implemented (non-blocking) | Safety baseline 88.32% |
| **Prometheus + Grafana** | Observability | ✅ Implemented | Metriken, Dashboards, Alerts |
| **Git Worktrees** | Sandbox | ✅ Implemented (`sandbox` package) | Workspace-Isolation |
| **BullMQ + Redis** | Queue | ✅ Implemented | Entkoppelte Pipeline-Ausführung |

### Trial (Evaluate for Integration)

| Technology | Category | Positron Integration | Caveat |
|-----------|----------|---------------------|--------|
| **Codex CLI** | Agentic Coding | `CodexCliAdapter` (planned) | OpenAI API key required; local execution |
| **Claude Code** | Agentic Coding | `ClaudeCodeAdapter` (planned) | Anthropic API key required; MCP support |
| **Cursor Agents** | Agentic Coding | `CursorAgentAdapter` (planned) | Primarily IDE-based; CLI mode hypothesis |
| **Windsurf Cascade** | Agentic Coding | `WindsurfCascadeAdapter` (planned) | IDE-based; Devin integration unverified |
| **Playwright MCP** | Tool Protocol | `GenericMcpAgentAdapter` (planned) | Trust Tier 1; Sandbox-only |
| **Model Context Protocol (MCP)** | Agent Protocol | Via `GenericMcpAgentAdapter` | Protocol still evolving; trust tier concerns |

### Assess (Monitor for Future)

| Technology | Category | Status | Notes |
|-----------|----------|--------|-------|
| **Devin** | Agentic Coding | `DevinAdapter` (planned) | Cloud-based; high risk; Trust Tier 2 |
| **GitHub Copilot Agent** | Agentic Coding | `GitHubCopilotAdapter` (planned) | Cloud-based; pricing NOT documented here |
| **GitHub Copilot Workspace** | Environment | Future exploration | Vendor claim: sandboxed environments |
| **Sentry/OTEL** | Observability | Deferred (L6) | Requires cloud tokens |
| **SonarQube** | SAST | Deferred (L2c) | Requires maintained instance; 90% coverage by existing tools |
| **AI UI Review** | Quality | Deferred (L5) | Privacy risk; cloud provider blocked |

### Hold (Do NOT Integrate)

| Technology | Reason |
|-----------|--------|
| **Paperclip Core/Research/Code Review** | Externer Operator — umgeht Positron-Run-Control. Forbidden (🔴) |
| **OpenClaw Base/Deploy/Sandbox** | Framework für externe Agent-Orchestrierung. Forbidden (🔴) |
| **Sudo / unrestricted bash** | Sicherheitsrisiko. Blockiert durch Command Allowlist |
| **Direct main/master push** | Branch Protection. Blockiert durch Commit Policy |

---

## Vendor Claims vs. Verified Facts

### Vendor Claims (NOT verified by Positron team)

| Claim | Source | Verification Status |
|-------|--------|---------------------|
| "Codex CLI supports sandboxed execution" | OpenAI docs | Unverified — marked as Vendor Claim |
| "Claude Code supports MCP tools natively" | Anthropic docs | Unverified — marked as Vendor Claim |
| "Windsurf Cascade runs autonomously in IDE" | Windsurf docs | Unverified — marked as Vendor Claim |
| "Devin resolves 1 in 7 real GitHub issues autonomously" | Cognition AI blog | Unverified — Vendor Claim. Independent reproduction not available |
| "GitHub Copilot Agent can create PRs from issues" | GitHub docs | Unverified — Vendor Claim |
| "Copilot Workspace provides sandboxed environments" | GitHub docs | Unverified — Vendor Claim |

### Verified Facts (evidence exists in Positron)

| Fact | Evidence |
|------|----------|
| OpenCode CLI v1.15.5 is detected and callable | `RealOpenCodeAdapter.healthCheck()` succeeds |
| Worktree isolation works via RealGitWorkspaceAdapter | Reality Check Report (Issue #58) |
| Playwright E2E: 25 tests pass in fake mode | CI artifact `playwright-report` |
| Pipeline runs through 28 phases | State Machine contract tests (140/140) |
| Secret redaction covers ghp_*, sk-*, anthropic_*, AIza* | `secret-manager.test.ts` |
| Biome lint/formatter configured | Quality Gates CI job |

### Forbidden Claims in Positron

- ❌ "Devin costs $X/month" — Pricing claims NOT documented
- ❌ "Copilot has Y% success rate" — Performance claims NOT documented
- ❌ "Agent Z is N times more productive than humans" — Productivity claims without evidence
- ❌ Any pricing, plan, or performance claim about external tools without verifiable source

---

## Adapter Implementation Priority

| Priority | Adapter | Reason |
|----------|---------|--------|
| **P0** | Generic CodingAgentAdapter Interface | Foundation for all adapters |
| **P0** | OpenCode Real/Fake Adapter Migration | Existing agent must conform to new interface |
| **P1** | CodexCliAdapter (Real + Fake) | Next most mature CLI-based agent |
| **P1** | ClaudeCodeAdapter (Real + Fake) | Strong MCP + browser capabilities |
| **P2** | CursorAgentAdapter (Fake only, initially) | CLI API uncertain — start with fake |
| **P2** | WindsurfCascadeAdapter (Fake only, initially) | IDE-dependent — start with fake |
| **P3** | GenericMcpAgentAdapter | Protocol still evolving |
| **P3** | GitHubCopilotAdapter (Fake only, initially) | Cloud dependency concerns |
| **P4** | DevinAdapter (Fake only) | High risk, cloud-only, expensive |
| **P4** | HumanOperatorAdapter | Universal fallback — lower priority |

---

## Confidence Ratings

| Area | Confidence | Basis |
|------|-----------|-------|
| OpenCode integration | HIGH | Existing adapter, CLI detected, tests passing |
| Agent Capability abstraction | HIGH | Existing adapter pattern proves interface-based design works |
| Codex CLI integration | MEDIUM | CLI exists; Positron can call it; but no integration tests |
| Claude Code integration | MEDIUM | CLI exists; MCP described in docs; but no integration tests |
| Cursor/Windsurf headless CLI | LOW | Primarily IDE-based; headless integration is HYPOTHESIS |
| Devin API reliability | LOW | Cloud-only; no public SLA or API stability guarantees |
| Copilot Agent API | LOW | Evolving product; no stable external API documented |
| MCP protocol maturity | MEDIUM | Standard exists; Positron has MCP tool infrastructure; but protocol is v1 |

---

## Update Cadence

- **Quarterly review:** Technology Radar wird alle 3 Monate aktualisiert
- **Trigger-based:** Bei neuen Vendor-Releases oder CVE-Meldungen sofort aktualisieren
- **After each adapter implementation:** Status von `planned` → `partial` → `implemented` updaten
