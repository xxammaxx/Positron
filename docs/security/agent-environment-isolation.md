# Agent Environment Isolation Strategy

> Stand: 2026-05-24 · Positron Issue #47
> Status: **Active** 🛡️

## Problem

Positron-Sessions wurden von externen Agent-Regeln und Skills beeinflusst:

1. `~/.config/opencode/AGENTS.md` — globale "Read Before Sketch"-Regel (27 Referenzen zu Skills/MCP)
2. `~/.claude/skills/paperclip/` — Paperclip Agent-Framework (3 Skills)
3. `~/.claude/skills/para-memory-files/` — PARA Memory-System

Diese externen Ressourcen laden Operator-Frameworks in den System-Prompt und lassen sie als verfügbare Werkzeuge erscheinen. Die KI versucht dann, sie zu nutzen — auch wenn sie für Positron nicht relevant oder sogar gefährlich sind.

## Prinzip

**Nur Positron-eigene Regeln und explizit freigegebene Adapter dürfen Positron-Runs beeinflussen.**

## Isolationsebenen

### Level 1 — Positron `AGENTS.md` (autoritativ)

Die `AGENTS.md` im Positron-Repository-Root ist die einzige autoritative Regelquelle für Positron-Sessions. Sie enthält:
- Positron-spezifische Workflow-Regeln
- Sicherheitsgates (Push/Merge/Fix-Loop)
- GitHub Source-of-Truth Workflow
- Researcher / External Operator Guardrails
- **AGENTS.md Isolation Rule** (neu in Issue #47)

### Level 2 — Erlaubte Positron-Skills

Diese Skills sind für Positron-Runs explizit freigegeben:
- `github-source-of-truth`
- `spec-driven-development`
- `test-enforcement`
- `audit-trail-enforcer`
- `architecture-review`
- `security-evidence-gate`
- `playwright-visual-review`

### Level 3 — Quarantinierte Skills

Diese Skills dürfen nur mit expliziter Freigabe genutzt werden:
- GPT Researcher / Deep Research → Nur in expliziten Research-Issues
- `para-memory-files` → Nur mit expliziter Freigabe
- MCP-Server → Nur explizit konfigurierte

### Level 4 — Verbotene Skills/Tools

Diese dürfen NIE in Positron-Sessions geladen werden:
- `paperclip`, `paperclip-create-agent`, `paperclip-create-plugin`
- OpenClaw, openclaw-local-operator
- local-operator, desktop automation
- browser/OS operator agents

## Konfliktlösung

**Bei Konflikt zwischen Positron-Regeln und externen Regeln gewinnt Positron immer.**

Beispiele:
- Externe Regel: "Nutze Researcher für Analyse" → Positron: "Researcher nur in expliziten Research-Issues" → Positron gewinnt
- Externe Regel: "Verwende Paperclip für Task-Management" → Positron: "Paperclip ist forbidden" → Positron gewinnt
- Externe Regel: "Read Before Sketch" → Positron: "akzeptiert als neutrale Stilpräferenz"

## Implementierung

1. **Positron AGENTS.md** enthält explizite Isolation Rule
2. **Skills-Inventar** dokumentiert Klassifikation aller Skills
3. **Startup-Skript** konfiguriert isolierte Session (siehe `isolated-agent-startup.md`)
4. **Runbook** dokumentiert Betrieb mit isolierter Umgebung

## Monitoring

Bei jedem Positron-Run prüfen:
- Werden externe Skills geladen? → Wenn ja: Alarm
- Versucht die KI einen forbidden Skill? → Blockieren + Issue erstellen
- Werden externe Tools erwähnt? → Dokumentieren

## Empfehlung

Paperclip-Skills aus `~/.claude/skills/` für Positron-Kontext deaktivieren. Falls OpenCode eine projekt-spezifische Skill-Konfiguration unterstützt, diese nutzen.
