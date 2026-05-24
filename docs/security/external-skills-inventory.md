# External Skills Inventory — Classification

> Stand: 2026-05-24 · Positron Issue #47
> Scope: Alle Skills und AGENTS.md-Dateien die in Positron-Sessions geladen werden können
> Policy: Nichts löschen — inventarisieren, klassifizieren, isolieren

## Klassifikationsschema

| Klasse | Icon | Bedeutung |
|--------|------|-----------|
| **allowed** | ✅ | Für Positron-Runs zugelassen |
| **ignored** | ⚪ | Neutral — kein Einfluss auf Positron |
| **quarantined** | 🟡 | Nur mit expliziter Freigabe |
| **forbidden** | 🔴 | Niemals in Positron-Sessions laden |

---

## A) AGENTS.md-Dateien (18 gefunden, 8 klassifiziert)

| Pfad | Klasse | Grund |
|------|--------|-------|
| `Positron/AGENTS.md` | ✅ allowed | Projekt-eigene Regeln — autoritativ |
| `~/.config/opencode/AGENTS.md` | ⚪ ignored | Global "Read Before Sketch" — 27 Refs zu Skills/MCP. Neutral, aber darf keine Tools erzwingen |
| `openclaw-local-operator/AGENTS.md` | 🔴 forbidden | Beschreibt OpenClaw Stack — externes Framework |
| `openclaw-local-operator/openclaw/AGENTS.md` | 🔴 forbidden | OpenClaw Gateway |
| `openclaw-local-operator/workspace/AGENTS.md` | 🔴 forbidden | OpenClaw Workspace |
| `Schreibtisch/paperclip/AGENTS.md` | 🔴 forbidden | Paperclip Agent Framework |
| `Schreibtisch/paperclip_ai/AGENTS.md` | 🔴 forbidden | Paperclip AI |
| `Schreibtisch/OpenCode-Agenten-Oekosystem/AGENTS.md` | 🔴 forbidden | Multi-Agent Ecosystem |
| `.codex/AGENTS.md` | ⚪ ignored | Codex — separates Tool, kein Einfluss |
| `.qoder/AGENTS.md` | ⚪ ignored | Qoder — separates Tool |
| Weitere (`CiviPet_OS`, `llama.cpp`, etc.) | ⚪ ignored | Projektspezifisch — irrelevant für Positron |

## B) Skills — `~/.config/opencode/skills/` (12 Skills)

| Skill | Klasse | Grund |
|-------|--------|-------|
| `architecture-review` | ✅ allowed | Positron nutzt ADR-Format |
| `audit-trail-enforcer` | ✅ allowed | Positron Audit-Logging |
| `funding-document-generator` | ⚪ ignored | Nicht Positron-relevant |
| `github-source-of-truth` | ✅ allowed | Positron Core Workflow |
| `llm-benchmark` | ⚪ ignored | Benchmark-Tool, nicht Pipeline |
| `migration-review` | ⚪ ignored | DB-Migration — nicht aktuell |
| `playwright-visual-review` | ✅ allowed | Positron E2E-Visualisierung |
| `read-before-sketch` | ⚪ ignored | Globales Meta-Skill — neutral |
| `security-evidence-gate` | ✅ allowed | Positron Security-Gates |
| `spec-driven-development` | ✅ allowed | Positron Core Workflow |
| `test-enforcement` | ✅ allowed | Positron Test-Gates |
| `tierheim-compliance` | ⚪ ignored | DSGVO-Templates — nicht Positron |

## C) Skills — `~/.claude/skills/` (4 Skills)

| Skill | Klasse | Grund |
|-------|--------|-------|
| **`paperclip`** | 🔴 **forbidden** | Paperclip Agent Framework — eigene Control Plane, Tasks, Routinen. DARF NIE in Positron-Sessions geladen werden |
| **`paperclip-create-agent`** | 🔴 **forbidden** | Erstellt neue Paperclip-Agenten — unkontrollierte Agent-Expansion |
| **`paperclip-create-plugin`** | 🔴 **forbidden** | Erstellt Paperclip-Plugins — unkontrollierte Plugin-Expansion |
| `para-memory-files` | 🟡 quarantined | PARA Memory System — nur mit expliziter Freigabe nutzbar |

## D) Andere Tools / Frameworks

| Tool | Klasse | Grund |
|------|--------|-------|
| GPT Researcher | 🟡 quarantined | Nur in expliziten Research-Issues |
| Deep Research | 🟡 quarantined | Nur in expliziten Research-Issues |
| OpenClaw Gateway | 🔴 **forbidden** | Externes Operator-Framework |
| openclaw-local-operator | 🔴 **forbidden** | Lokaler Operator — ausserhalb Positron |
| Paperclip Control Plane | 🔴 **forbidden** | Eigene Agent-Koordination |
| lokal installierte MCP-Server | 🟡 quarantined | Nur explizit konfigurierte |

## E) Zusammenfassung

| Klasse | Anzahl |
|--------|--------|
| ✅ allowed | 8 |
| ⚪ ignored | 10 |
| 🟡 quarantined | 4 |
| 🔴 forbidden | 7 |

**Empfehlung:** Die 4 Paperclip/OpenClaw-Skills sollten NICHT in Positron-Sessions geladen werden. Falls möglich: `paperclip*` aus `~/.claude/skills/` für Positron deaktivieren.
