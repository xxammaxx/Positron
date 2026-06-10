# Orchestrierung — Issue-to-Merge-Workflow

Datum: 2026-06-09
Status: Draft
Diataxis: Explanation

## Überblick

Die Orchestrierung ist das Herzstück von Positron. Sie steuert den vollständigen
Lebenszyklus eines Issues — von der Aufnahme aus GitHub bis zum Merge des Pull
Requests. Der Workflow ist in 11 klar definierte Schritte unterteilt, die durch
die [Quality Gates](qualitaetspruefung.md) und die [State Machine](../architecture/README.md)
abgesichert sind.

## Kompletter Issue-to-Merge-Workflow

```
Issue (GitHub)
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  1. Issue Ingestion (ISSUE_CONTEXT)                     │
│  ─────────────────────────────────────────────────────── │
│  • GitHub-Issue laden (Body, Comments, Labels)          │
│  • Issue-Kontext analysieren und klassifizieren         │
│  • Ersten GitHub-Kommentar posten (Run gestartet)       │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  2. Speckit: Spec → Plan → Tasks                        │
│  ─────────────────────────────────────────────────────── │
│  • SPECIFY: Spezifikation schreiben (spec.md)           │
│  • PLAN: Implementierungsplan (plan.md)                 │
│  • TASKS: Task-Aufschlüsselung (tasks.md)               │
│  • Alle Artefakte in GitHub kommentieren                │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  3. Verification Contract Definition (TASKS → ANALYZE)  │
│  ─────────────────────────────────────────────────────── │
│  • Contract mit spec-hash, ACs, Test-Commands erstellen │
│  • Contract im Run-Event-System persistieren            │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  4. Red Tests schreiben (ANALYZE → REVIEW)              │
│  ─────────────────────────────────────────────────────── │
│  • Tests basierend auf Acceptance Criteria schreiben    │
│  • Tests müssen fehlschlagen (Red Phase)                │
│  • Testabdeckung dokumentieren                          │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  5. Agent-Code ausführen (IMPLEMENT)                    │
│  ─────────────────────────────────────────────────────── │
│  • OpenCode-Agent starten                               │
│  • Code gemäß plan.md implementieren                    │
│  • Files im Sandbox-Workspace ändern                    │
│  • Fortschritt via SSE streamen                         │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  6. CI/Security Gates prüfen (TEST → VERIFY)            │
│  ─────────────────────────────────────────────────────── │
│  • Tests ausführen (Unit, Integration, E2E)             │
│  • Security-Scan: Secrets, Policy-Verstöße              │
│  • TypeScript-Check                                     │
│  • Lint-Prüfung                                         │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  7. Sandbox Preview zeigen (VERIFY)                     │
│  ─────────────────────────────────────────────────────── │
│  • Diff generieren und prüfen                           │
│  • Preview-URL bereitstellen (falls Frontend-Änderung)  │
│  • Datei-Liste der Änderungen                           │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  8. Reviewer-Agent bewertet (VERIFY → COMMIT)           │
│  ─────────────────────────────────────────────────────── │
│  • Code-Review: Logik, Stil, Sicherheit                 │
│  • Prüft Einhaltung der Acceptance Criteria             │
│  • Prüft Contract-Erfüllung                             │
│  • Reviewer-Report erstellen                            │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  9. Human Approval entscheidet (COMMIT → PR_CREATE)     │
│  ─────────────────────────────────────────────────────── │
│  • Nutzer benachrichtigen (mit Diff + Testreport)       │
│  • Human-Review anfordern                              │
│  • Optionen: APPROVE / REVISE / ABORT                   │
│  • Nur APPROVE erlaubt Fortsetzung                      │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ 10. Evidence-Kommentar dokumentiert (COMMIT)            │
│  ─────────────────────────────────────────────────────── │
│  • Zusammenfassung des Runs im GitHub Issue posten      │
│  • Metriken, Testergebnisse, Diff verlinken             │
│  • Evidence-Log aktualisieren                           │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ 11. Merge nach Gate (PR_CREATE → MERGE → DONE)          │
│  ─────────────────────────────────────────────────────── │
│  • PR auf GitHub erstellen                              │
│  • CI-Checks abwarten (extern)                          │
│  • Merge-Kill-Switch prüfen (POSITRON_MERGE_KILL_SWITCH)│
│  • Merge durchführen (automatisch oder manuell)         │
│  • Branch aufräumen (CLEANUP)                           │
│  • Issue schließen (optional)                           │
└─────────────────────────────────────────────────────────┘
```

## Orchestrierungsprinzipien

### 1. Fragend beginnen

Jeder Schritt beginnt mit einer Frage: "Was ist der nächste validierte Zustand?"
Der Orchestrator führt keine Annahmen über den Kontext — er überprüft jeden
Schritt gegen die [Quality Gates](qualitaetspruefung.md).

### 2. Keine Annahmen

Der Orchestrator vertraut keiner Phase, ohne vorher die erforderlichen Artefakte
geprüft zu haben. Jeder Übergang wird validiert.

**Falsch:** "Der Test wurde in der letzten Session bestanden, also überspringen wir ihn."

**Richtig:** "Der Test muss erneut ausgeführt werden, weil sich der Code geändert hat."

### 3. Iterative Steuerung

Der Orchestrator arbeitet in kleinen, überprüfbaren Schritten:

1. Aktuelle Phase prüfen
2. Gate-Check für nächste Phase ausführen
3. Bei Bestehen: Übergang ausführen
4. Bei Fehlschlag: [Eskalation](../reference/fehlerbehandlung.md) einleiten

### 4. Persistente Artefakte

Jeder Schritt produziert persistente Artefakte:

| Schritt | Artefakt | Speicherort |
|---|---|---|
| Issue Ingestion | Issue-Kopie | SQLite (RunRecord) |
| Speckit | spec.md, plan.md, tasks.md | `.specify/<run-id>/` |
| Code-Änderung | Diff, Files | Git-Workspace |
| Test | Test-Report | SQLite (CommandResult) |
| Evidence | Evidence-Log | GitHub-Issue |
| PR | Pull Request | GitHub |

## Trust-Tier-System

Die Orchestrierung verwendet das Trust-Tier-System, um Agenten und Tools
entsprechend ihrer Vertrauenswürdigkeit zu behandeln:

| Tier | Zugriff | Beispiele | Einsatz im Workflow |
|---|---|---|---|
| **Tier 0 (Readonly)** | GitHub MCP (search/read), Brave Search, Context7 | Schritt 1 (Recherche), Schritt 10 (Doku) |
| **Tier 1 (Sandboxed)** | Playwright, Docker, SQLite (project-local) | Schritt 4 (Tests), Schritt 6 (Gates) |
| **Tier 2 (Human-Gate)** | FileSystem (external), PostgreSQL (readonly) | Schritt 9 (Human Approval) |

Siehe [Agent Isolation](../security/agent-environment-isolation.md) für Details.

## Agenten-Rollen im Workflow

| Rolle | Aufgabe | Trust-Tier |
|---|---|---|
| **Issue Orchestrator** | Workflow-Steuerung, Delegation | L1 |
| **Research Agent** | Web-Recherche, Kontext-Analyse | L0 |
| **Spec Agent** | Spezifikation, Plan, Tasks | L1 |
| **Implementation Agent** | Code schreiben (OpenCode) | L1 |
| **Test Agent** | Tests schreiben und ausführen | L1 |
| **Review Agent** | Code-Review, Qualitätsprüfung | L1 (Leaf) |
| **Security Agent** | Security-Scan, Policy-Prüfung | L2 |
| **Compliance Agent** | DSGVO-Prüfung, Datenklassifizierung | L2 |

## Verwandte Dokumente

- [Quality Gates](qualitaetspruefung.md) — Gate-Matrix für alle Phasenübergänge
- [Fehlerbehandlung](../reference/fehlerbehandlung.md) — 5-Schritte-Eskalation
- [Verification Contract](../reference/verification-contract.md) — Spezifikations-Prüfung
- [Vibe Coding](../reference/vibe-coding.md) — Issue-Größen und Session-Grenzen
- [Agentenmetriken](../reference/agentenmetriken.md) — Metriken pro Run
- [Context Engineering](../reference/context-engineering.md) — Context-Tier-Modell
- [State Machine](../architecture/README.md) — Phasenübergänge
- [AGENTS.md](https://github.com/xxammaxx/Positron/blob/main/AGENTS.md) — Agenten-Regeln
