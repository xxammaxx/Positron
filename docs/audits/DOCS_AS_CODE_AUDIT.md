# Docs-as-Code Audit Report

**Datum:** 2026-06-09
**Auditor:** issue-orchestrator (AI Agent)
**Projekt:** Positron v3.0 — Evidence-Gated GitHub Issue Execution System
**Status:** Audit abgeschlossen

---

## 1. Projekt-Steckbrief

| Merkmal | Wert |
|---|---|
| **Sprachen** | TypeScript (vollständig) |
| **Laufzeit** | Node.js v22+ |
| **Build-System** | TypeScript Compiler (`tsc -b`), Vite (Frontend) |
| **Paketmanager** | npm (Workspaces: `apps/*`, `packages/*`) |
| **Repository-Typ** | Monorepo (2 Apps, 6 Packages) |
| **Frontend** | React + Vite + Tailwind CSS |
| **Backend** | Node.js + Express + SQLite (better-sqlite3) |
| **Testing** | Vitest (Unit/Integration), Playwright (E2E) |
| **CI/CD** | GitHub Actions (`verify-issues.yml`) |
| **Governance** | Constitution-driven (`.specify/memory/constitution.md`), AGENTS.md für KI-Agenten |

---

## 2. Vorhandene Dokumentation

### 2.1 Root-Ebene

| Datei | Zustand | Bewertung |
|---|---|---|
| `README.md` | Existiert | Gut: Quick Start, Architektur-Skizze, Testing-Infos |
| `AGENTS.md` | Existiert | Gut: Agenten-Regeln, Trust-Tier-System, aber keine Docs-Update-Regeln |
| `Blueprint.md` | Existiert | Projektskizze (Deutsch) |
| `Meta-Prompt für eine KI zur iterativen Projekt-Orchestrierung_v2.md` | Existiert | Design-Dokument (Deutsch) |

### 2.2 docs/ Verzeichnis

| Pfad | Typ | Bewertung |
|---|---|---|
| `docs/architecture/README.md` | Architekturüberblick | Gut: Stack, Diagramm, Datenfluss, Patterns, Security-Modell |
| `docs/architecture/api-overview.md` | API-Referenz | Gut: 14 Endpunkte dokumentiert |
| `docs/architecture/adr/0004-*.md` | ADR | Gut: Gründliche Hybrid-Test-Architektur-Entscheidung |
| `docs/architecture/adr/0005-*.md` | ADR | SSE Realtime Transport |
| `docs/architecture/adr/0006-*.md` | ADR | HTTP Cancel mit In-Memory-Signal |
| `docs/architecture.md` | Architektur-Summary | Teilweise redundant mit `docs/architecture/README.md` |
| `docs/blueprint-analysis.md` | Analyse | Projekt-Genese aus Blueprint |
| `docs/module-map.md` | Referenz | Detaillierte Modulbeschreibungen mit API, Typen, Zuständen |
| `docs/dependency-graph.md` | Referenz | Abhängigkeitsgraph |
| `docs/workflows/development.md` | How-to | Dev-Setup, Build, Tests, Troubleshooting |
| `docs/workflows/cli.md` | Referenz | CLI-Befehle |
| `docs/security/security-model.md` | Explanation | Sicherheitsmodell |
| `docs/security/mcp-security-rules.md` | Reference | MCP-Sicherheitsregeln |
| `docs/security/agent-environment-isolation.md` | Explanation | Agenten-Isolierung |
| `docs/security/external-skills-inventory.md` | Reference | Externe Skill-Inventur |
| `docs/security/isolated-agent-startup.md` | How-to | Agent-Startup-Prozedur |
| `docs/changelog/iteration-{1,2,3}.md` | Changelog | Iterations-Changelogs |
| `docs/release/v0.1.0-rc.1.md` | Release Notes | v0.1.0 RC1 |
| `docs/release/ui-workflow-proof-report.md` | Evidence | UI-Workflow-Testbeweis |
| `docs/testing/fixture-strategy.md` | Reference | Test-Fixture-Strategie |
| `docs/testing/*-template.md` (4 Dateien) | Templates | Test-Plan/Result/Regression/Visual-Templates |
| `docs/ui-audit/01-audit-report.md` | Audit | UI-Audit |
| `docs/ui-audit/02-redesign-plan.md` | Plan | UI-Redesign-Plan |
| `docs/ui-audit/03-functional-data-audit.md` | Audit | Funktionale Datenprüfung |
| `docs/live-operations/DATA-AUDIT.md` | Audit | Live-Ops Datenprüfung |
| `docs/alles_verbinden.md` | Fragment | Unsortierte Notizen |
| `docs/GitHub Issues vs Code Verifikation.md` | Fragment | Naming-Notizen |

### 2.3 Governance

| Datei | Zustand |
|---|---|
| `.specify/memory/constitution.md` | 10 Artikel, verbindliche Projektgrundlage |
| `.github/PULL_REQUEST_TEMPLATE.md` | Existiert |
| `.github/ISSUE_TEMPLATE/*.md` (3 Templates) | Existiert (Bug, Feature, Security) |
| `CONTRIBUTING.md` | **Fehlt** |
| `CHANGELOG.md` (Root) | **Fehlt** (nur `docs/changelog/`) |
| `SECURITY.md` | **Fehlt** |
| `llms.txt` | **Fehlt** |

---

## 3. Risiken für Dokumentationsdrift

| Risiko | Schweregrad | Beschreibung |
|---|---|---|
| **Kein index.md** | Hoch | Es gibt keinen zentralen Einstiegspunkt in die Dokumentation. README ist Start, aber `docs/index.md` fehlt. |
| **Fragmentierte Struktur** | Mittel | Dateien wie `alles_verbinden.md` und `GitHub Issues vs Code Verifikation.md` sind isolierte Fragmente ohne klare Zugehörigkeit. |
| **Redundanz** | Mittel | `docs/architecture.md` und `docs/architecture/README.md` haben überlappenden Inhalt. |
| **Kein Link-Checking** | Hoch | Keine automatische Validierung interner Links. Link-Rot unentdeckt. |
| **Kein Docs-Build** | Hoch | Keine CI-Pipeline für Dokumentation. Syntax-Fehler in Markdown unentdeckt. |
| **Keine Agent-Docs-Regeln** | Hoch | AGENTS.md enthält keine Regeln, wann Agenten Dokumentation aktualisieren müssen. |
| **Kein Glossary** | Mittel | Kein zentrales Glossar für Projekt-Terminologie (`Run`, `Phase`, `Gate`, `Evidence`). |
| **Kein CONTRIBUTING** | Mittel | Kein Leitfaden für Contributors (Docs-Regeln, PR-Prozess, Code-Stil). |
| **Fehlende Diátaxis-Struktur** | Mittel | Vorhandene docs folgen keinem einheitlichen Organisationsprinzip (Tutorial/How-to/Reference/Explanation). |

---

## 4. Empfohlene Dokumentationsplattform

### Entscheidung: **MkDocs**

**Begründung:**

| Kriterium | Bewertung |
|---|---|
| Projektsprache | TypeScript/Node.js — Sphinx wäre unpassend (kein Python-Stack) |
| Dokumentationsformat | Bestehendes Material ist 100% Markdown |
| Build-Komplexität | MkDocs ist minimal (Python + YAML-Konfiguration) |
| Docusaurus-Overhead | Projekt hat React, aber interaktive Docs-Komponenten sind nicht gefordert |
| Diátaxis-Unterstützung | MkDocs mit `material`-Theme + Navigation passt perfekt zur Diátaxis-Struktur |
| Suchfunktion | Built-in (`search` Plugin) |
| Theme | `mkdocs-material` für modernes, durchsuchbares Design |
| CI-Integration | Trivial: `mkdocs build --strict` |

**Abhängigkeit:** Python 3.14 ist verfügbar. `requirements-docs.txt` wird hinzugefügt.

---

## 5. Dateien, die NICHT überschrieben werden dürfen

Diese Dateien sind etablierte Sources of Truth und werden nur ergänzt, nicht ersetzt:

1. **`README.md`** — Projekteinstieg, bleibt erhalten. Neue Docs-Sektion hinzugefügt.
2. **`AGENTS.md`** — KI-Agenten-Regeln. Wird um Docs-Update-Regeln **erweitert**.
3. **`.specify/memory/constitution.md`** — Unantastbare Projektgrundlage.
4. **`docs/architecture/README.md`** — Architektur-Hauptdokument.
5. **`docs/architecture/adr/*.md`** — ADR-Entscheidungen (immutable).
6. **`docs/workflows/development.md`** — Entwickler-Setup.
7. **`docs/module-map.md`** — Modul-Referenz.
8. **`docs/security/security-model.md`** — Sicherheitsmodell.
9. **`.github/workflows/verify-issues.yml`** — Bestehende CI-Pipeline.
10. **`.github/ISSUE_TEMPLATE/*.md`** — Issue-Templates.
11. **`docs/changelog/*.md`** — Bestehende Changelogs.
12. **`docs/testing/*-template.md`** — Test-Templates.

---

## 6. Konkrete Umsetzungsschritte

| Phase | Schritt | Neue/Geänderte Dateien |
|---|---|---|
| 2 | Architekturentscheidung dokumentieren | `docs/architecture/adr/0007-docs-as-code-platform.md` |
| 3 | Diátaxis-Zielstruktur anlegen | `docs/index.md`, `docs/getting-started/`, `docs/how-to/`, `docs/reference/`, `docs/explanation/`, `docs/glossary.md` |
| 3 | Agent-Templates erstellen | `docs/agent/CONTEXT_MANIFEST_TEMPLATE.md`, `docs/agent/EVIDENCE_LOG_TEMPLATE.md` |
| 4 | MkDocs konfigurieren | `mkdocs.yml`, `requirements-docs.txt` |
| 5 | llms.txt + AGENTS.md erweitern | `llms.txt`, `AGENTS.md` (ergänzt) |
| 6 | Quality Gates implementieren | `.markdownlint.json`, `.github/workflows/docs-quality.yml`, `scripts/docs-check.sh` |
| 7 | CONTRIBUTING + Review-Workflow | `CONTRIBUTING.md` |
| 8 | Red Tests | Dokumentation der manuellen Checks |
| 9 | Build & Preview | Build-Log in `docs/audits/` |
| 10 | Abschlussreport | `docs/audits/DOCS_AS_CODE_IMPLEMENTATION_REPORT.md` |

---

## 7. Offene Annahmen

| # | Annahme | Status |
|---|---|---|
| A1 | `mkdocs-material` Theme ist kompatibel mit Python 3.14 | Zu verifizieren (Phase 9) |
| A2 | `mkdocs-ezlinks-plugin` oder `mkdocs-wikilinks-plugin` funktionieren mit MkDocs 1.x | Zu verifizieren |
| A3 | GitHub Actions Runner hat Python 3 verfügbar | Standard (ubuntu-latest) |
| A4 | Markdown-Dateien enthalten keine kaputten internen Links | Zu verifizieren (Phase 8) |
| A5 | Das Projekt hat keine Anforderung an öffentliche/private Docs-Trennung | Aktuell internal-only |
| A6 | `docs/alles_verbinden.md` und `docs/GitHub Issues vs Code Verifikation.md` können sicher archiviert oder integriert werden | Zu klären mit Human Review |

---

## 8. Zusammenfassung

Das Positron-Projekt hat eine **solide, aber fragmentierte** Dokumentationsbasis. Die technische Dokumentation (Architektur, API, ADRs, Module, Sicherheit) ist von guter Qualität. Was fehlt, ist:

1. **Ein zentraler Einstiegspunkt** (kein `docs/index.md`)
2. **Eine einheitliche Organisationsstruktur** (Diátaxis)
3. **Automatisierte Qualitätssicherung** (Link-Check, Markdown-Lint, Docs-Build)
4. **KI/Agent-optimierte Einstiegspunkte** (llms.txt, erweiterte AGENTS.md)
5. **Ein Docs-Change-Workflow** (CONTRIBUTING.md, Docs-Update-Regeln)

Die gewählte Plattform **MkDocs** ist die leichtgewichtigste und passendste Lösung für ein TypeScript-Monorepo mit Markdown-basierter Dokumentation.
