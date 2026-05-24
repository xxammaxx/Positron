# Operator Dashboard Enhancement Report

> Stand: 2026-05-24
> Basis: Issue #22 Operator Dashboard
> Enhancement: Issue #28
> Tests: 390 + 14 Playwright E2E

## Status: PASS ✅

Das Operator Dashboard ist von „Grundansicht vorhanden" zu „vollständig bedienbares Kontrollzentrum für Positron" erweitert.

## Enhancement-Übersicht

| Bereich | Vorher (Issue #22) | Nachher (Issue #28) |
|---------|-------------------|---------------------|
| Phasen | 12 von 21 | **Alle 21 Phasen** inkl. ISSUE_CONTEXT, CLARIFY_OPTIONAL, ANALYZE, MERGE, 3× FAILED |
| PR/Merge | Nur Text „PR created during run" | **Klickbarer PR-Link**, Terminal-Status (Merged/Blocked/Failed) |
| TestReport | Nur „Test phase completed" | **Strukturiertes Rendering** mit PASS/FAIL, Count, Duration |
| Evidence | Nicht vorhanden | **EvidenceList** mit Items, Status, Summary |
| GitHub Sync | Nicht sichtbar | **Sync-Status** aus Events extrahiert (ok/warn/failed) |
| EventLog | Einfache Liste, kein Filter | **Filterbar** nach Level (5 Stufen) und Phase |
| Autonomie | Nur „Level N" | **Level-Name + Beschreibung** (Observer → CI Auto-PR) |
| Merge-Gates | Status-Badges | **Erklärender Text + Tooltip** für jedes Gate |
| SafetyControls | Env-Variable-Namen | **Live-Server-Zustand** mit ON/OFF-Indikatoren |
| Run Controls | Nicht vorhanden | **Pause/Abort/Resume/Retry UI** (disabled, Tooltip) |
| E2E Tests | Keine | **14 Playwright-Tests** in 4 Dateien |

## Neue Komponenten (5)

- `TestReport.tsx` — Strukturiertes Test-Summary-Rendering
- `EvidenceList.tsx` — Evidence-Items mit Status und Summary
- `EventLog.tsx` — Filterbar nach Level und Phase
- `AutonomyDisplay.tsx` — Level-Name + Beschreibung
- `ControlButtons.tsx` — Pause/Abort/Resume/Retry (disabled)

## Erweiterte Komponenten (4)

- `RunPipeline.tsx` — 21 Phasen mit Fehlerphasen-Markierung
- `RunDetailPage.tsx` — PR-Link, Terminal-Label, Evidence, Sync-Status
- `MergeGateStatus.tsx` — Erklärender Text + Tooltip pro Gate
- `SafetyControls.tsx` — Live-Server-Zustand per API

## Backend

- Neuer Endpoint: `GET /api/safety` — Live-Safety-State (enableMerge, mergeDryRun, enablePush, killSwitch, enableFixLoop)
- PR/TestReport/Evidence wird **clientseitig** aus Event-Messages extrahiert — kein Backend-Change nötig

## Architektur-Entscheidung: Clientseitige Anreicherung

PR-URL, TestReport, Evidence und Sync-Status werden in `enrichDetail()` aus den vorhandenen `RunEvent`-Messages extrahiert. Das vermeidet Backend-Änderungen für eine rein visuelle Verbesserung.

**Regex-Beispiele:**
- `PR #(\d+) created: (https?://\S+)` → PR-URL
- `Events mit phase === 'TEST'` → TestReport
- `Events mit phase und level` → Evidence
- `Events die 'sync' enthalten` → Sync-Status

## Playwright E2E Tests

| Testdatei | Tests | Prüft |
|-----------|-------|-------|
| `dashboard.spec.ts` | 7 | Header, Footer, Sections, Navigation |
| `run-detail.spec.ts` | 6 | Pipeline, PR, TestReport, Evidence, Autonomy, Controls |
| `merge-gates.spec.ts` | 3 | Gates, Indicators, Blocked/Ready |
| `safety-controls.spec.ts` | 4 | Flags, ON/OFF, Live-State |

## Build-Metriken

| Metrik | Wert |
|--------|------|
| JS Bundle | 220.81 KB (vorher: 208 KB) |
| CSS Bundle | 18.63 KB (vorher: 13 KB) |
| TypeScript | Strict, clean |
| Tests | 390 pass, 5 skipped |

## Noch nicht in diesem Issue

- ❌ Run-Control Backend (Pause/Abort/Resume/Retry) — UI disabled mit Erklärung
- ❌ Websocket/SSE Echtzeit-Updates — nächstes Issue (#29)
- ❌ Auto-Merge, Fix-Loop, Reviewer — explizit Out of Scope
