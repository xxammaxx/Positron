# Operator Dashboard Runbook

> Positron — Bedienungsanleitung für das Operator Cockpit
> Stand: 2026-05-24

## Übersicht

Das Operator Dashboard ist das Kontrollzentrum für Positron. Es zeigt alle aktiven und abgeschlossenen Runs, deren Phasen, Status, Test-Ergebnisse, Merge-Gates und Safety-Controls.

## Start

```bash
# Server starten (Port 3000)
cd apps/server
npx tsx src/index.ts

# Web UI starten (Port 5173)
cd apps/web
npx vite --port 5173

# Oder mit Playwright E2E
npx playwright test --config apps/web/playwright.config.ts
```

## Dashboard-Ansicht

### Aufbau

```
┌──────────────────────────────────────────────┐
│  Positron Operator Cockpit          [Status] │
├──────────────────────┬───────────────────────┤
│  Safety Controls     │  Adapter Health       │
│  5 Flags mit ON/OFF  │  GitHub/SpecKit/OC    │
├──────────────────────┼───────────────────────┤
│  Issue Queue         │  Run List             │
│  • positron-ready    │  • Alle Runs          │
│  • Run-Button        │  • Klick → Detail     │
└──────────────────────┴───────────────────────┘
```

### Safety Controls (live vom Server)

| Flag | Env Variable | Wirkung |
|------|-------------|---------|
| Enable Merge | `POSITRON_ENABLE_MERGE` | Erlaubt Auto-Merge |
| Dry Run | `POSITRON_MERGE_DRY_RUN` | Simuliert Merge nur |
| Enable Push | `POSITRON_ENABLE_PUSH` | Erlaubt Git Push |
| Kill Switch | `POSITRON_MERGE_KILL_SWITCH` | Blockiert ALLE Merges sofort |
| Fix Loop | `POSITRON_ENABLE_FIX_LOOP` | Automatischer Retry bei transienten Fehlern |

Status wird live vom Server abgefragt (`GET /api/safety`).

### Adapter Health

Zeigt Verfügbarkeit von:
- **GitHub** — fake/real mode, grün/rot
- **Spec Kit** — Version oder N/A
- **OpenCode** — Version oder N/A

Kollabierbar — per Klick auf- und zuklappbar.

### Issue Queue

Zeigt offene Issues des konfigurierten Repos. Issues mit `positron:`-Label werden oben angezeigt. Klick auf „Run" startet einen neuen Durchlauf.

### Run List

Alle Runs mit:
- Run-ID (gekürzt), Issue-Nummer
- Phase, Status, Attempt
- Branch-Name
- Startzeit
- Klick → Detail-Ansicht

## Run-Detail-Ansicht

### Aufbau

```
┌──────────────────────────────────────────────┐
│  ← Dashboard                      [Status]   │
├──────────────────────────────────────────────┤
│  Run Info (ID, Issue, Phase, Branch, ...)    │
│  ┌────────────────────────────────────────┐   │
│  │ QUEUED CLAIMED REPO_SYNC ... DONE      │   │
│  └────────────────────────────────────────┘   │
├──────────────────────┬───────────────────────┤
│  Merge Gates         │  PR & Merge           │
│  6 Gates mit ✓/✗    │  Link zu PR ↗         │
│  + Erklärung         │                       │
├──────────────────────┼───────────────────────┤
│  Event Log           │  Test Report          │
│  [Level▼] [Phase▼]   │  PASS/FAIL + Details  │
│  Gefilterte Events   │                       │
├──────────────────────┼───────────────────────┤
│  Run Controls        │  Evidence List        │
│  ⏸ ⏹ ▶ 🔄          │  Items mit Status     │
│  (disabled)          │                       │
└──────────────────────┴───────────────────────┘
```

### 21 Phasen (RunPipeline)

Die Pipeline zeigt die State-Machine visuell:

| Farbe | Bedeutung |
|-------|-----------|
| Grün (emerald) ✅ | Phase erreicht und bestanden |
| Blau (sky, blinkend) 🔄 | Aktuelle Phase |
| Grau (slate) ⬜ | Phase noch nicht erreicht |
| Rot (red) ❌ | Phase fehlgeschlagen (ERROR) |
| Rot-border (Fehlerphasen) 🛑 | FAILED_TRANSIENT / _BLOCKED / _UNSAFE |

Vollständige Phasenliste:
```
QUEUED → CLAIMED → REPO_SYNC → ISSUE_CONTEXT →
WEB_RESEARCH → SPECIFY → CLARIFY_OPTIONAL →
PLAN → TASKS → ANALYZE → REVIEW → IMPLEMENT →
TEST → VERIFY → COMMIT → PR_CREATE → MERGE → DONE
FAILED_TRANSIENT → FAILED_BLOCKED → FAILED_UNSAFE
```

### Merge Gates

6 Gates mit Live-Status und Erklärung per Tooltip:
1. **Auto-Merge Enabled** — `POSITRON_ENABLE_MERGE`
2. **Dry-Run** — `POSITRON_MERGE_DRY_RUN`
3. **Kill-Switch** — `POSITRON_MERGE_KILL_SWITCH`
4. **Run Status Active** — run.status === 'active'
5. **Test Evidence** — TEST phase events vorhanden
6. **Branch Exists** — run.branch !== null

Blocked-Reasons werden als Liste angezeigt.

### Test Report

Strukturierte Anzeige:
- ✅/❌ PASS/FAIL Status
- Anzahl Tests (passed/failed/total)
- Duration in ms
- Letzte Test-Message

### Evidence

Liste von Evidence-Items aus Run-Events:
- Phase-Einträge (phase:QUEUED, phase:CLAIMED, ...)
- Branch-Evidence
- Test-Evidence
- Status: ✅ pass / ❌ fail / ⏭️ skipped

### Event Log

Filterbar nach:
- **Level:** ALL / INFO / WARN / ERROR / GATE / HUMAN
- **Phase:** Alle erreichten Phasen

Farbcodierung: ERROR=rot, WARN=gelb, GATE=violett, HUMAN=cyan, INFO=neutral

### Autonomy Mode

Level-Anzeige mit Name und Beschreibung:

| Level | Name | Beschreibung |
|-------|------|-------------|
| 0 | Observer | Read-only — analyse but never modify |
| 1 | Research & Spec | Research and specification — no code changes |
| 2 | Supervised Build | Code changes with ask-gates, push after approval |
| 3 | Autonomous Sandbox | Autonomous in isolated workspace, no main merge |
| 4 | CI Auto-PR | Automatic PR creation, merge only with green checks |

### Run Controls (vorbereitet, noch deaktiviert)

Buttons für Pause/Abort/Resume/Retry sind sichtbar aber deaktiviert. Tooltip zeigt:
> „Backend endpoint not implemented"

Die Steuerung wird mit Issue #30 aktiviert.

### GitHub Sync Status

Zeigt alle Events, die „sync" im Message-Text enthalten:
- Phase, in der der Sync stattfand
- Status: ✅ ok / ⚠️ warn / ❌ failed
- Zeitstempel

## Environment-Variablen-Checkliste

```bash
# Minimal-Konfiguration zum Testen
GITHUB_TOKEN=ghp_xxx
POSITRON_REPO_OWNER=mein-owner
POSITRON_REPO_NAME=mein-repo

# Safety Gates
POSITRON_ENABLE_MERGE=true          # Auto-Merge erlauben
POSITRON_MERGE_DRY_RUN=true         # Merge nur simulieren
POSITRON_ENABLE_PUSH=true           # Git Push erlauben
POSITRON_MERGE_KILL_SWITCH=true     # Alle Merges blockieren
POSITRON_ENABLE_FIX_LOOP=true       # Fix-Loop aktivieren
```

## E2E Tests ausführen

```bash
# Alle E2E Tests
npx playwright test --config apps/web/playwright.config.ts

# Nur Dashboard-Tests
npx playwright test --config apps/web/playwright.config.ts apps/web/e2e/dashboard.spec.ts

# Nur Run-Detail-Tests
npx playwright test --config apps/web/playwright.config.ts apps/web/e2e/run-detail.spec.ts

# Mit Trace (bei Fehlern)
npx playwright test --config apps/web/playwright.config.ts --trace on
```

## Bekannte Einschränkungen

1. **Keine Echtzeit-Updates** — Run-Status-Seite muss manuell neu geladen werden (kommt in Issue #29 mit SSE)
2. **Keine Run-Steuerung** — Pause/Abort/Resume/Retry ist UI-only (kommt in Issue #30)
3. **In-Memory-Daten** — Nach Server-Neustart sind alle Runs weg (SQLite-Persistenz geplant)
4. **Keine globale Suche** — Nur Dashboard + Detail, keine Issue/Run-Suche
5. **Keine Authentifizierung** — Dashboard ist ohne Login erreichbar (nur für lokalen/entwicklungsbetrieb)
