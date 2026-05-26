# External Skills Inventory

> **Klassifikation externer Agent-Skills für Positron.**
> Stand: 2026-05-26 — 29 Items klassifiziert

## Klassifikationsstufen

| Stufe | Bezeichnung | Bedeutung |
|-------|-------------|-----------|
| 🔴 **Forbidden** | Nicht installieren/nutzen | Aktiviert externe Operatoren, umgeht Isolation |
| 🟡 **Quarantined** | Installiert aber deaktiviert | Kann nach Sicherheitsprüfung aktiviert werden |
| ✅ **Allowed** | Positron-eigene Skills | Vollständig geprüft und freigegeben |

---

## 🔴 Forbidden (6)

Diese Skills aktivieren externe Agent-Operatoren und sind **nicht kompatibel** mit Positrons Sicherheitsmodell.

| # | Skill | Quelle | Risiko |
|---|-------|--------|--------|
| 1 | Paperclip Core | OpenClaw Registry | Externer Operator — umgeht Positron-Run-Control |
| 2 | Paperclip Research | OpenClaw Registry | Unkontrollierte Web-Recherche ohne Positron-Gates |
| 3 | Paperclip Code Review | OpenClaw Registry | Externer Code-Review — umgeht Evidence-Gates |
| 4 | OpenClaw Base | OpenClaw Registry | Framework für externe Agent-Orchestrierung |
| 5 | OpenClaw Deploy | OpenClaw Registry | Deployment-Skills ohne Positron-Push-Policy |
| 6 | OpenClaw Sandbox | OpenClaw Registry | Externe Sandbox — umgeht Positron-Workspace-Isolation |

## 🟡 Quarantined (12)

Diese Skills sind installiert aber **standardmäßig deaktiviert**. Aktivierung nur nach manuellem Review.

| # | Skill | Quelle | Prüfkriterium |
|---|-------|--------|---------------|
| 7 | Researcher (Brave Search) | Brave API | Web-Recherche nur in RESEARCH-Phase erlaubt |
| 8 | Deep Research | Context7 | Nur mit explizitem Gate-Approval |
| 9 | PARA Skill Loader | OpenCode | Nur Positron-eigene Skills laden |
| 10 | MCP Tool Bridge | OpenCode | Nur erlaubte MCP-Tools (Trust Tier 0-1) |
| 11 | GitHub MCP (Read) | GitHub | Read-only — durch Positrons GitHub-Adapter geschützt |
| 12 | FileSystem MCP (Read) | OpenCode | Read-only — auf Workspace beschränkt |
| 13 | SQLite MCP (Local) | OpenCode | Nur projekt-lokale DBs |
| 14 | Playwright MCP | OpenCode | Nur Sandbox-Browser — kein Production-Netzwerk |
| 15 | Docker MCP | OpenCode | Nur isolierte Container — kein Host-Zugriff |
| 16 | Browserbase MCP | OpenCode | Nur Test-Zwecke |
| 17 | Sequential Thinking | OpenCode | Kein Sicherheitsrisiko — bleibt quarantined bis Review |
| 18 | Fetch MCP | OpenCode | Nur Positron-gewhitelistete URLs |

## ✅ Allowed (11)

Positron-eigene Skills — vollständig geprüft und aktiv.

| # | Skill | Funktion | Sicherheitsgarantie |
|---|-------|----------|---------------------|
| 1 | **issue-orchestrator** | Zentrale Koordination | Evidence-gated — kein Code ohne Issue |
| 2 | **review-agent** | Code-Qualitätsprüfung | Read-only — niemals schreibend |
| 3 | **research-agent** | Externe Recherche | Brave Search + Context7 (Tier 0) |
| 4 | **compliance-agent** | DSGVO/GDPR-Audit | Read-only für kanonische Daten |
| 5 | **migration-agent** | DB-Migrationen | Nur Migration-Dateien + Test-DB |
| 6 | **playwright-agent** | Visual QA | Screenshots + Reports — Schreibzugriff beschränkt |
| 7 | **architecture-agent** | ADR-Erstellung | Read-only für Code — produziert ADRs |
| 8 | **security-agent** | Vulnerability-Research | Docker-sandboxed — PoC in Isolation |
| 9 | **documentation-agent** | Docs + Changelog | Schreibzugriff nur auf docs/ |
| 10 | **spec-driven-development** | Speckit-Workflow | Sequential Gates — kein Code vor Spec |
| 11 | **github-source-of-truth** | GitHub-Issue-Tracking | Read/write nur auf aktives Issue |

---

## Automatisierte Durchsetzung

Die Klassifikation wird durch folgende Mechanismen durchgesetzt:

1. **AGENTS.md** — Definierte Positron-spezifische Regeln (siehe Abschnitt "Agent Isolation")
2. **Trust-Tier-System** — MCP-Tools nach Sicherheitsstufen kategorisiert
3. **Fake/Real Strategy Pattern** — Adapter standardmäßig im Fake-Modus
4. **Policy-Gates** — Speckit/OpenCode-Policies blockieren nicht erlaubte Kommandos
5. **Kill-Switches** — Merge, Push, Fix-Loop haben separate Sicherheitsschalter
