# Agent Capability Registry

> Version: 1.0.0-draft | Status: PROPOSED | Date: 2026-06-10
> Related: ADR-001

---

## Purpose

Positron verwaltet Coding-Agenten nicht über Namen, sondern über deklarierte **Capabilities**. Die Capability Registry definiert einen kanonischen Satz von Fähigkeiten, die ein Agent besitzen kann, und erlaubt Positron, den richtigen Agenten für jede Pipeline-Phase auszuwählen.

---

## Canonical Capability Set

### Core Capabilities

| Capability ID | Name | Description | Required For Phase |
|---------------|------|-------------|-------------------|
| `repo_read` | Repository Read | Codebase lesen, analysieren, durchsuchen | REPO_SYNC, ISSUE_CONTEXT |
| `code_write` | Code Write | Dateien erstellen, bearbeiten, löschen im Workspace | IMPLEMENT |
| `code_review` | Code Review | Code-Änderungen prüfen, kommentieren | REVIEW |
| `test_run` | Test Run | Tests ausführen und Ergebnisse interpretieren | TEST, VERIFY |
| `spec_generate` | Spec Generation | Spezifikation aus Issue-Kontext ableiten | SPECIFY |
| `plan_generate` | Plan Generation | Implementierungsplan aus Spec erstellen | PLAN |
| `task_breakdown` | Task Breakdown | Plan in atomare Tasks zerlegen | TASKS |

### Integration Capabilities

| Capability ID | Name | Description |
|---------------|------|-------------|
| `github_issue_read` | GitHub Issue Read | Issues lesen und interpretieren |
| `github_pr_create` | GitHub PR Create | Pull Requests erstellen |
| `github_review_comment` | GitHub Review Comment | Review-Kommentare auf PRs posten |
| `github_label_manage` | GitHub Label Manage | Labels auf Issues verwalten |

### Environment Capabilities

| Capability ID | Name | Description |
|---------------|------|-------------|
| `terminal_exec` | Terminal Execute | Shell-Befehle ausführen |
| `worktree_isolation` | Worktree Isolation | In isoliertem Git-Worktree arbeiten |
| `devcontainer_support` | Dev Container Support | In Dev-Container-Umgebung laufen |
| `sandbox_preview` | Sandbox Preview | Anwendung im Sandbox-Browser starten |

### Quality Capabilities

| Capability ID | Name | Description |
|---------------|------|-------------|
| `browser_preview` | Browser Preview | UI im Browser rendern und inspizieren |
| `security_scan_awareness` | Security Scan Awareness | Ergebnisse von Security-Scans verstehen |
| `lint_fix` | Lint Fix | Linter-Warnungen automatisch beheben |
| `type_check` | Type Check | TypeScript-Typ-Prüfung ausführen |

### AI-Specific Capabilities

| Capability ID | Name | Description |
|---------------|------|-------------|
| `mcp_tool_use` | MCP Tool Use | MCP-Tools über Model Context Protocol nutzen |
| `context_manifest` | Context Manifest | Strukturierten Kontext aus Manifest laden |
| `web_research` | Web Research | Externe Dokumentation recherchieren |
| `diff_analysis` | Diff Analysis | Git-Diffs verstehen und erklären |

### Safety Capabilities

| Capability ID | Name | Description |
|---------------|------|-------------|
| `human_approval_required` | Human Approval Required | Bestimmte Aktionen benötigen menschliche Freigabe |
| `secret_detection` | Secret Detection | Secrets vor dem Senden erkennen und redigieren |
| `command_allowlist` | Command Allowlist | Nur erlaubte Shell-Befehle ausführen |
| `file_scope_restriction` | File Scope Restriction | Nur auf erlaubte Dateibereiche zugreifen |

---

## Agent Declaration Contract

Jeder Agent/Adapter MUSS folgende Struktur deklarieren:

```typescript
interface AgentDeclaration {
  // Identity
  name: string;                    // z.B. "OpenCode", "Codex CLI", "Claude Code"
  type: 'cli' | 'api' | 'ide' | 'service' | 'human';
  version: string;                 // Version des Agenten/Adapters

  // Deployment
  deployment: 'local' | 'cloud' | 'hybrid';
  runtime: 'node' | 'python' | 'binary' | 'container';

  // Capabilities
  capabilities: string[];          // Liste der Capability-IDs (siehe oben)

  // Secrets & Auth
  requiredSecrets: string[];       // z.B. ["GITHUB_TOKEN", "OPENAI_API_KEY"]
  requiredEnvVars: string[];       // z.B. ["POSITRON_WORKSPACE_ROOT"]

  // Scope & Permissions
  allowedPaths: string[];          // Glob-Patterns für erlaubte Dateien
  deniedPaths: string[];           // Glob-Patterns für verbotene Dateien
  allowedActions: string[];        // Erlaubte Aktionen (z.B. "git.commit", "git.push")
  deniedActions: string[];         // Verbotene Aktionen (z.B. "git.push:main")

  // Risk & Trust
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  trustTier: 0 | 1 | 2;           // MCP Trust Tier (0=readonly, 1=sandboxed, 2=human-gate)

  // Evidence
  evidenceRequirements: {
    logOutput: boolean;            // CLI-Output als Evidence speichern
    captureDiff: boolean;          // Diff nach Aktion erfassen
    captureTests: boolean;         // Testergebnisse erfassen
    requireScreenshot: boolean;    // Screenshot für UI-Änderungen
    requireTrace: boolean;         // Playwright-Trace für Browser-Aktionen
  };

  // Behavior
  fallbackAgent?: string;          // Fallback-Agent wenn dieser nicht verfügbar ist
  maxConcurrency: number;          // Maximale parallele Instanzen
  timeoutMs: number;               // Max. Ausführungszeit pro Aktion
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
}
```

---

## Agent Capability Matrix

### Current Agents (implemented)

| Agent | Capabilities | Trust Tier | Risk | Status |
|-------|-------------|------------|------|--------|
| **OpenCode** (via `opencode-adapter`) | `repo_read`, `code_write`, `spec_generate`, `plan_generate`, `task_breakdown`, `terminal_exec`, `worktree_isolation` | 1 | medium | implemented |

### Planned Adapters

| Adapter Class | Target Agent | Planned Capabilities | Trust Tier | Risk | Status |
|---------------|-------------|---------------------|------------|------|--------|
| `CodexCliAdapter` | OpenAI Codex CLI | `repo_read`, `code_write`, `test_run`, `terminal_exec` | 1 | medium | planned |
| `ClaudeCodeAdapter` | Anthropic Claude Code | `repo_read`, `code_write`, `spec_generate`, `browser_preview` | 1 | medium | planned |
| `CursorAgentAdapter` | Cursor Agents | `repo_read`, `code_write`, `code_review`, `diff_analysis` | 1 | medium | planned |
| `WindsurfCascadeAdapter` | Windsurf Cascade | `repo_read`, `code_write`, `lint_fix`, `browser_preview` | 1 | medium | planned |
| `DevinAdapter` | Devin | `repo_read`, `code_write`, `test_run`, `browser_preview`, `web_research` | 2 | high | planned |
| `GitHubCopilotAdapter` | GitHub Copilot Agent | `repo_read`, `code_write`, `code_review`, `github_issue_read` | 1 | medium | planned |
| `GenericMcpAgentAdapter` | Any MCP Agent | `mcp_tool_use`, `repo_read`, `code_write` | 1-2 | variable | planned |
| `HumanOperatorAdapter` | Human Developer | Alle Capabilities | 2 | low | planned |

---

## Capability-Based Agent Selection

Positron wählt Agenten zur Laufzeit basierend auf benötigten Capabilities:

```typescript
// Pseudocode: Agent Selection Logic
function selectAgent(requiredCapabilities: string[], phase: Phase): AgentDeclaration {
  // 1. Filter agents that have ALL required capabilities
  const candidates = registry.filter(a =>
    requiredCapabilities.every(cap => a.capabilities.includes(cap))
  );

  // 2. Prefer local agents for development, cloud for production
  // 3. Prefer lower risk level when capabilities are equal
  // 4. Respect trust tier constraints per phase
  // 5. Fall back to human operator if no agent qualifies

  return bestMatch;
}
```

---

## Capability Resolution Rules

1. **Required Capabilities:** Phasen deklarieren benötigte Capabilities — Agent MUSS alle erfüllen
2. **Optional Capabilities:** Agent KANN zusätzliche Capabilities haben — werden bevorzugt
3. **Degradation:** Wenn kein Agent alle Required Capabilities erfüllt → Human Approval Gate
4. **Capability Override:** Human kann Agenten-Wahl manuell überschreiben
5. **Capability Discovery:** Neue Agenten registrieren ihre Capabilities bei Startup

---

## Integration Points

Die Capability Registry wird genutzt von:

- **Pipeline Engine** (`apps/server/`) — Agenten-Auswahl pro Phase
- **Run State** (`packages/run-state/`) — Capability-basierte Gate-Validierung
- **UI** (`apps/web/`) — Anzeige verfügbarer Agenten und deren Fähigkeiten
- **Reviewer-Agent** — Prüfung ob der eingesetzte Agent die benötigten Capabilities hatte

---

## Migration Path

1. `AgentDeclaration` Interface in `packages/shared/src/opencode-types.ts` (oder neue Datei `agent-types.ts`)
2. `AgentCapabilityRegistry` Klasse in `packages/shared/` — in-memory Registry mit Runtime-Validator
3. Bestehenden `OpenCodeAdapter` auf `AgentDeclaration` migrieren
4. Pipeline-Engine auf Capability-basierte Agenten-Auswahl umstellen
5. Neue Adapter mit Capability-Deklaration hinzufügen
