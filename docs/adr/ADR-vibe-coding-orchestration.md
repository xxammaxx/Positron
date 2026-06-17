# ADR-001: Vibe-Coding Orchestration Architecture

## Metadata

| Field | Value |
|-------|-------|
| **ADR ID** | ADR-001 |
| **Date** | 2026-06-10 |
| **Status** | PROPOSED |
| **Author** | issue-orchestrator (Positron Agent) |
| **Supersedes** | — (first ADR) |
| **Related ADRs** | — |

---

## Context

Positron ist ein orchestrierendes System für KI-unterstützte Softwareentwicklung. Es steuert den Workflow: GitHub Issue → Spec → Plan → Tasks → Implementation → Test → PR → Merge — abgesichert durch harte Gates und Evidence-Pflicht.

Die aktuelle Architektur unterstützt NUR OpenCode als Coding-Agent (via `packages/opencode-adapter/`). Moderne Vibe-Coding-Werkzeuge wie Codex CLI, Claude Code, Cursor Agents, Windsurf Cascade, Devin und GitHub Copilot sind nicht integrierbar, weil:

1. Keine Agent Capability Registry existiert
2. Keine abstrakten Adapter-Contracts jenseits von OpenCode definiert sind
3. Die Pipeline einen einzigen Agenten-Typ annimmt (`OpenCodeRunInput`)
4. Capability-basierte Orchestrierung fehlt (welcher Agent kann was?)

Ein aktueller Deep-Research-Bericht validierte: Vibe Coding baut nur dann zuverlässig funktionierende Software, wenn jeder KI-Schritt durch Repo-Kontext, Tests, Preview, Review, Security-Gates und Evidence abgesichert wird.

---

## Decision

Positron wird zu einem **Multi-Agent-Vibe-Coding-Orchestrator** erweitert durch:

1. **Agent Capability Registry** — Agenten werden über Capabilities (nicht Namen) verwaltet
2. **Abstrakte Adapter-Contracts** — `CodingAgentAdapter` Interface mit Capability-Deklaration
3. **Vibe-Coding Pipeline Profile** — Dediziertes Pipeline-Profil mit erzwungenen Quality-Gates
4. **Worktree Multi-Agent** — Parallele Agentenläufe in isolierten Worktrees
5. **Reviewer-Agent Contract** — Validierung gegen Verification Contract
6. **Preview/Observability Gates** — Sichtbare Verifikation vor Merge-Freigabe

**Technologie-Entscheidungen:**

| Entscheidung | Wahl | Rationale |
|-------------|------|-----------|
| Agent-Abstraktion | Interface-basiert (nicht Vererbung) | Positron nutzt bereits Dependency Inversion; Adapter implementieren Interfaces aus `shared/` |
| Capability-Deklaration | TypeScript Union Type + Runtime Validator | Typsicherheit + Runtime-Check bei dynamischer Agenten-Wahl |
| Vendor-Integration | Adapter-Klassen, keine hartkodierten CLI-Pfade | `CodexCliAdapter`, `ClaudeCodeAdapter` etc. implementieren `CodingAgentAdapter` |
| Pipeline-Profile | Konfigurationsdatei mit Gate-Definitionen | Trennt Pipeline-Logik von Agenten-Auswahl |
| Preview-Gate | Playwright + Sandbox URL | Bestehende Infrastruktur (L4 Browser Evidence) wird als Gate wiederverwendet |

---

## Alternatives Considered

### Alternative A: Nur OpenCode erweitern
- **Beschreibung:** OpenCode als alleinigen Agenten ausbauen
- **Vorteil:** Einfacher, geringeres Risiko
- **Nachteil:** Kein Multi-Vendor-Support; Vendor Lock-in; keine Capability-basierte Agenten-Wahl
- **Verworfen:** Widerspricht dem Positron-Prinzip "kontrollierte Orchestrierung über Adapter"

### Alternative B: Jeden Agenten als separaten Service
- **Beschreibung:** Codex, Claude etc. über HTTP/MCP als eigene Services
- **Vorteil:** Lose Kopplung, unabhängige Skalierung
- **Nachteil:** Hohe Komplexität, Netzwerk-Latenz, Authentifizierungs-Matrix
- **Verworfen:** Overkill für MVP; Adapter-Pattern bietet ausreichende Entkopplung

### Alternative C: MCP-basierte Agenten-Integration
- **Beschreibung:** Alle Agenten über MCP-Server anbinden
- **Vorteil:** Standardisiertes Protokoll
- **Nachteil:** MCP ist noch in Entwicklung; nicht alle Werkzeuge unterstützen MCP; Trust-Tier-Probleme
- **Status:** Future exploration — MCP-Adapter als `GenericMcpAgentAdapter` vorgemerkt

---

## Consequences

### Positive
- Multi-Agent-Orchestrierung ermöglicht "best tool for the job"
- Capability-Registry erlaubt dynamische Agenten-Auswahl zur Laufzeit
- Adapter-Contracts verhindern Vendor-Lock-in
- Pipeline-Profile erzwingen konsistente Qualitätsgates unabhängig vom Agenten

### Negative
- Erhöhte Komplexität der Orchestrierungslogik
- Mehr Adapter zu warten (pro Agent ein Real+Fake-Adapter-Paar)
- Capability-Matrix muss bei neuen Agenten-Versionen aktualisiert werden
- Test-Matrix wächst (neue Adapter-Contract-Tests)

### Risiken
- Vendor-CLIs können sich ändern → Adapter müssen nachgezogen werden
- Nicht alle Agenten unterstützen alle Capabilities → Pipeline muss degradieren können
- Parallele Agentenläufe erhöhen Konfliktpotenzial → Merge-Strategie erforderlich

---

## Implementation Roadmap

| Phase | Inhalt | Abhängigkeiten |
|-------|--------|----------------|
| **Phase 1** | Agent Capability Registry + Shared Types | Keine |
| **Phase 2** | `CodingAgentAdapter` Interface in `shared/` | Phase 1 |
| **Phase 3** | `GenericCodingAgentAdapter` Basisklasse in `packages/sandbox/` | Phase 2 |
| **Phase 4** | OpenCode-Adapter auf `CodingAgentAdapter` migrieren | Phase 3 |
| **Phase 5** | Codex/Claude/Cursor/Windsurf/Devin/Copilot Adapter (Real+Fake) | Phase 4 |
| **Phase 6** | Vibe-Coding Pipeline Profile + Preview Gate | Phase 5 |
| **Phase 7** | Multi-Agent Worktree + Parallel Run Support | Phase 5 |
| **Phase 8** | Reviewer-Agent Contract Implementation | Phase 6 |

---

## Related Documents

- `docs/architecture/AGENT_CAPABILITY_REGISTRY.md` — Capability definitions
- `docs/architecture/ADAPTER_CONTRACTS.md` — Adapter interface contracts
- `docs/architecture/VIBE_CODING_ORCHESTRATION.md` — Pipeline profile
- `docs/review/REVIEWER_AGENT_CONTRACT.md` — Reviewer contract
- `docs/testing/VIBE_CODING_VERIFICATION_CONTRACT.md` — Verification contract
