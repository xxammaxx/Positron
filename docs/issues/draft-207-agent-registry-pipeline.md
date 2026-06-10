---
issue_number: 207
title: "feat: Agent Capability Registry in Pipeline-Engine verdrahten (ADR-001 Phase 4)"
status: draft
labels: [enhancement, architecture, positron:ready]
created: 2026-06-10
---

# feat: Agent Capability Registry in Pipeline-Engine verdrahten (ADR-001 Phase 4)

## Kontext

- Abhangig von: `chore/vibe-coding-orchestration` (Teststrategie-Branch, pending Human Approval)
- Adressiert Non-Blocking Finding NB-001 aus Reviewer-Report
- ADR-001 Phase 4: Runtime-Integration der neuen Agent-Types

## Scope

- `AgentCapabilityRegistry` in `packages/run-state/` oder Pipeline-Engine einbinden
- `CodingAgentAdapter` Interface in bestehende Adapter-Factory integrieren
- `findAgentsForPhase()` fur Phasen-Routing nutzen
- KEINE neuen Adapter-Typen, keine neuen Capabilities

## Akzeptanzkriterien

- [ ] Registry wird beim Pipeline-Start initialisiert
- [ ] Agenten werden uber ihre Declaration registriert
- [ ] Phasen-Routing nutzt `findAgentsForPhase()` statt hartcodierter Adapter
- [ ] Bestehende Tests (904 unit + 247 contract) bleiben grun
- [ ] Fake-Adapter werden im Production-Profil abgelehnt
- [ ] Keine neuen Dependencies

## Blockiert durch

- Human Approval auf `chore/vibe-coding-orchestration`

## Branch

`positron/issue-207-agent-registry-pipeline`
