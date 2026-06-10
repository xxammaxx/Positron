# Vibe-Coding Adapter Contracts

> Version: 1.0.0-draft | Status: PROPOSED | Date: 2026-06-10
> Related: ADR-001, AGENT_CAPABILITY_REGISTRY.md

---

## Purpose

Definiert abstrakte Interfaces (Contracts) für Coding-Agent-Adapter in Positron. Jeder Adapter implementiert `CodingAgentAdapter` und deklariert seine Capabilities. Keine hartkodierten Vendor-Abhängigkeiten.

---

## Core Interface: `CodingAgentAdapter`

```typescript
// packages/shared/src/agent-types.ts (geplant)

interface CodingAgentAdapter {
  // ── Identity ──
  readonly declaration: AgentDeclaration;

  // ── Health ──
  healthCheck(workspacePath: string): Promise<AgentHealth>;

  // ── Core Operations ──
  runPhase(input: CodingPhaseInput): Promise<CodingAgentResult>;

  // ── Preview (optional) ──
  startPreview?(workspacePath: string): Promise<PreviewInfo>;
  stopPreview?(previewId: string): Promise<void>;
  capturePreviewScreenshot?(previewId: string): Promise<string>; // returns path

  // ── Cleanup ──
  cleanup?(): Promise<void>;
}
```

---

## Adapter Implementation Matrix

### Status Codes

| Status | Meaning |
|--------|---------|
| `implemented` | Real + Fake Adapter existieren, Tests vorhanden |
| `partial` | Basis-Interface implementiert, aber nicht alle Capabilities |
| `planned` | Interface definiert, keine Implementierung |
| `not_supported` | Technisch nicht möglich oder policy-blockiert |

---

## Individual Adapter Contracts

### 1. OpenCodeAdapter

```yaml
class: RealOpenCodeAdapter / FakeOpenCodeAdapter
package: packages/opencode-adapter/
status: partial  # implementiert, aber auf CodingAgentAdapter migrierbar
target_agent: OpenCode CLI (v1.15.5+)
capabilities:
  - repo_read
  - code_write
  - spec_generate
  - plan_generate
  - task_breakdown
  - terminal_exec
  - worktree_isolation
deployment: local
trust_tier: 1
risk_level: medium
secrets_required: []
env_vars_required:
  - POSITRON_WORKSPACE_ROOT
allowed_paths: ["{workspace}/**"]
denied_paths: [".env", "**/.git/"]
evidence_requirements:
  logOutput: true
  captureDiff: true
  captureTests: true
  requireScreenshot: false
  requireTrace: false
test_strategy:
  unit: packages/opencode-adapter/src/__tests__/
  contract: via CodingAgentAdapter contract
  e2e: via Playwright fake-mode
limits:
  maxConcurrency: 1
  timeoutMs: 300000  # 5 min
  retryPolicy: { maxRetries: 3, backoffMs: 5000 }
fallback_agent: HumanOperatorAdapter
```

### 2. CodexCliAdapter

```yaml
class: CodexCliAdapter (Real/Fake)
package: packages/codex-adapter/ (neu)
status: planned
target_agent: OpenAI Codex CLI
capabilities:
  - repo_read
  - code_write
  - test_run
  - terminal_exec
deployment: local
trust_tier: 1
risk_level: medium
secrets_required:
  - OPENAI_API_KEY
test_strategy:
  unit: neues Package
  contract: CodingAgentAdapter contract
  e2e: Playwright fake-mode
vendor_claims:
  - "Codex CLI supports sandbox execution" → Vendor Claim (nicht verifiziert)
note: Integration über child_process, keine direkte OpenAI API
```

### 3. ClaudeCodeAdapter

```yaml
class: ClaudeCodeAdapter (Real/Fake)
package: packages/claude-code-adapter/ (neu)
status: planned
target_agent: Anthropic Claude Code
capabilities:
  - repo_read
  - code_write
  - spec_generate
  - browser_preview
deployment: local  # Claude Code läuft lokal
trust_tier: 1
risk_level: medium
secrets_required:
  - ANTHROPIC_API_KEY
vendor_claims:
  - "Claude Code supports MCP tools" → Vendor Claim (mit Referenz)
  - "Claude Code can run in headless mode" → Hypothesis (zu verifizieren)
```

### 4. CursorAgentAdapter

```yaml
class: CursorAgentAdapter (Real/Fake)
package: packages/cursor-adapter/ (neu)
status: planned
target_agent: Cursor Agents (IDE-integriert)
capabilities:
  - repo_read
  - code_write
  - code_review
  - diff_analysis
deployment: local  # Läuft in Cursor IDE oder via CLI
trust_tier: 1
risk_level: medium
secrets_required:
  - CURSOR_API_KEY  # falls CLI-Modus
note: Cursor ist primär IDE-integriert. CLI-Modus prüfen.
limits:
  automation_limits: "Cursor's agent mode may require IDE GUI — headless integration unverified"
vendor_claims:
  - "Cursor Agents can be invoked via CLI" → Hypothesis (Untersuchung erforderlich)
```

### 5. WindsurfCascadeAdapter

```yaml
class: WindsurfCascadeAdapter (Real/Fake)
package: packages/windsurf-adapter/ (neu)
status: planned
target_agent: Windsurf Cascade
capabilities:
  - repo_read
  - code_write
  - lint_fix
  - browser_preview
deployment: local  # Windsurf IDE oder Cascade CLI
trust_tier: 1
risk_level: medium
secrets_required:
  - WINDSURF_API_KEY  # falls CLI-Modus
note: "Windsurf + Devin-Integration als relevanter Vibe-Coding-Komplex"
vendor_claims:
  - "Windsurf Cascade runs autonomously" → Vendor Claim
  - "Windsurf + Devin enables end-to-end coding" → Vendor Claim
limits:
  automation_limits: "Primarily IDE-based; CLI API stability unverified"
```

### 6. DevinAdapter

```yaml
class: DevinAdapter (Real/Fake)
package: packages/devin-adapter/ (neu)
status: planned
target_agent: Devin (Cognition AI)
capabilities:
  - repo_read
  - code_write
  - test_run
  - browser_preview
  - web_research
deployment: cloud  # Devin läuft in Cognition's Cloud
trust_tier: 2  # Human-Gate wegen Cloud-Ausführung
risk_level: high  # Externer Cloud-Service
secrets_required:
  - DEVIN_API_KEY
test_strategy:
  fake_adapter: Simuliert Devin-API-Responses
  contract: CodingAgentAdapter contract
limits:
  automation_limits: "Cloud-based — network dependency, cost, and privacy concerns"
  requires_human_approval_for:
    - PR creation
    - Merge
    - External network access
vendor_claims:
  - "Devin resolves 1 in 7 real GitHub issues autonomously" → Vendor Claim (von Cognition AI)
  - Keine unabhängige Verifikation verfügbar
```

### 7. GitHubCopilotAdapter

```yaml
class: GitHubCopilotAdapter (Real/Fake)
package: packages/copilot-adapter/ (neu)
status: planned
target_agent: GitHub Copilot Agent/Workspace
capabilities:
  - repo_read
  - code_write
  - code_review
  - github_issue_read
deployment: cloud  # Copilot Agent läuft auf GitHub
trust_tier: 1
risk_level: medium
secrets_required:
  - GITHUB_TOKEN
note: >
  GitHub Copilot pricing and plan details are NOT documented here.
  Refer to https://github.com/features/copilot for current plans.
  Previous draft versions contained unverified pricing claims that
  have been removed.
vendor_claims:
  - "Copilot Agent can create PRs from issues" → Vendor Claim (von GitHub)
  - "Copilot Workspace provides sandboxed environments" → Vendor Claim
forbidden_claims:
  - "Copilot costs $X/month" → Unverified pricing — NOT DOCUMENTED
  - "Copilot has Y% success rate" → Unverified metric — NOT DOCUMENTED
```

### 8. GenericMcpAgentAdapter

```yaml
class: GenericMcpAgentAdapter (Real/Fake)
package: packages/mcp-agent-adapter/ (neu)
status: planned
target_agent: Any MCP-compatible agent
capabilities:
  - mcp_tool_use
  - repo_read
  - code_write
deployment: local  # MCP-Server läuft lokal
trust_tier: 1  # Sandboxed
risk_level: variable  # Hängt vom konkreten Agenten ab
note: >
  Generischer Adapter für MCP-kompatible Agenten.
  Capabilities werden dynamisch vom MCP-Server abgefragt.
  Trust Tier wird basierend auf MCP-Server-Trust-Tier gesetzt.
```

### 9. HumanOperatorAdapter

```yaml
class: HumanOperatorAdapter
package: packages/sandbox/ (oder shared)
status: planned
target_agent: Human Developer
capabilities:
  - repo_read
  - code_write
  - code_review
  - test_run
  - spec_generate
  - plan_generate
  - task_breakdown
  - github_issue_read
  - github_pr_create
  - github_review_comment
  - github_label_manage
  - terminal_exec
  - worktree_isolation
  - browser_preview
  - security_scan_awareness
  - lint_fix
  - type_check
  - human_approval_required
deployment: local
trust_tier: 2  # Human-Gate für kritische Aktionen
risk_level: low
note: >
  HumanOperatorAdapter ist der universelle Fallback.
  Er delegiert an den menschlichen Entwickler via UI-Gates.
  Wird verwendet wenn kein KI-Agent die benötigten Capabilities hat.
```

---

## Adapter Factory Pattern

```typescript
// packages/shared/src/agent-factory.ts (geplant)

type AdapterMode = 'real' | 'fake';

interface AdapterFactory {
  createAdapter(agentType: string, mode: AdapterMode): CodingAgentAdapter;
  listAvailableAgents(mode: AdapterMode): AgentDeclaration[];
  resolveAgentForCapabilities(
    requiredCapabilities: string[],
    mode: AdapterMode,
  ): CodingAgentAdapter;
}
```

---

## Contract Enforcement

1. **Compile-time:** Jeder Adapter MUSS `CodingAgentAdapter` implementieren (TypeScript `implements`)
2. **Runtime:** `AgentCapabilityRegistry` validiert Capability-Deklarationen bei Registrierung
3. **Contract Tests:** Jeder Adapter hat Contract-Tests gegen `CodingAgentAdapter`
4. **CI Gate:** Fehlende Contract-Tests blockieren Merge

---

## File System Isolation per Adapter

| Adapter | Workspace Path | Schreibrechte | Leserechte | Netzwerk |
|---------|---------------|---------------|------------|----------|
| OpenCode | `{WORKSPACE_ROOT}/{runId}` | workspace | workspace + repo | npm registry |
| Codex CLI | `{WORKSPACE_ROOT}/{runId}` | workspace | workspace + repo | OpenAI API |
| Claude Code | `{WORKSPACE_ROOT}/{runId}` | workspace | workspace + repo | Anthropic API |
| Cursor | `{WORKSPACE_ROOT}/{runId}` | workspace | workspace + repo | Cursor API |
| Windsurf | `{WORKSPACE_ROOT}/{runId}` | workspace | workspace + repo | Windsurf API |
| Devin | Cloud Workspace | Read-only API | API-only | Devin API |
| Copilot | GitHub Workspace | API-only | API-only | GitHub API |
| Generic MCP | `{WORKSPACE_ROOT}/{runId}` | MCP-beschränkt | MCP-beschränkt | MCP-gewährleistet |
| Human | Kein Workspace | Manuell | Manuell | N/A |

---

## Mock/Fake/Demo-Kennzeichnung

Alle Adapter MÜSSEN ihren Modus im `AgentDeclaration` kenntlich machen:

```typescript
// Fake-Adapters setzen:
isFake: true,
isMock: false,
isDemo: false,

// Mock-Adapters setzen:
isFake: false,
isMock: true,   // Nur für Tests — kein produktiver Pfad
isDemo: false,

// Demo-Adapters setzen:
isFake: false,
isMock: false,
isDemo: true,   // UI-Demo — kein echter Agent
```

Pipeline-Logik prüft `isFake/isMock/isDemo` vor produktiven Aktionen.
