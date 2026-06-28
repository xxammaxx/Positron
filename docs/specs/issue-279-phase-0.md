# Issue #279 Phase 0 — Positron KI-Lösung Architecture Spec

## 1. Kurzfazit

Positron ist eine **lokale, evidence-gated KI-/Agenten-Orchestrierungslösung**, die als Koordinations-Schicht zwischen OpenCode-Agenten, GitHub Issues/PRs, SpecKit Workflows, MCP-Tools und lokalen Entwicklungs-Gates operiert. Sie klassifiziert Risiken, blockiert gefährliche Aktionen, erzwingt Human-Approval-Gates und produziert prüfbare Evidence-Artefakte.

Positron = lokales Agenten-/Repo-Orchestrierungs- und Evidence-System für kontrollierte OpenCode-/GitHub-/SpecKit-/MCP-/Dry-Run-/Fixture-Agentenläufe, mit lokalen Gates als Source of Truth, sicherem Installer, Status-/Evidence-Portfolio und klaren Human-Approval-Gates.

## 2. Problem

Welche Probleme löst Positron?

- **Agenten bauen sonst im Kreis.** Ohne strukturierte Orchestrierung iterieren KI-Agenten unkontrolliert, erzeugen kaskadierende Fehler und können keine belastbaren Ergebnisse liefern.
- **GitHub Issues/PRs können stale, gestapelt oder widersprüchlich sein.** Ohne Live-State-Reconciliation arbeiten Agenten mit veralteten Annahmen.
- **Remote-CI ist im privaten Repo nicht zuverlässig verfügbar.** GitHub Actions scheitert aktuell an Runner-Quota-Erschöpfung (Issue #268). Positron macht lokale Gates zur Source of Truth.
- **Human Approval muss einfache Entscheidungspakete statt technische Einzelentscheidungen erhalten.** Der Operator soll strategische Freigaben geben können, ohne jede technische Detailentscheidung verstehen zu müssen.
- **Installer/Start/Packaging müssen lokal reproduzierbar sein.** Kein Docker/Redis-Zwang für lokale Entwicklung.
- **Evidence muss Source of Truth sein.** Jede Aktion, jedes Gate-Ergebnis, jeder Merge muss dokumentierte Beweise hinterlassen.

## 3. Zielbild

Positron soll können:

1. **Repo/GitHub-Zustand live rekonstruieren** (Reality Refresh)
2. **Issues/PRs klassifizieren** nach Risikoklassen
3. **Agentenläufe in fixture/dry-run/real trennen** für sichere Exploration
4. **Riskante Aktionen blockieren oder in Human Approval überführen**
5. **Lokale Gates ausführen und dokumentieren** (build, typecheck, test, format)
6. **Evidence-Handoffs erzeugen** für jede abgeschlossene Phase
7. **Status-/Portfolio-/Mermaid-Dokumentation aktuell halten**
8. **Lokalen Installer/Start/Package bereitstellen** (Windows-first)

## 4. Nicht-Ziele (Phase 0)

- Kein Remote-CI als Pflichtgate (Issue #268 bleibt advisory-only)
- Kein automatischer Merge ohne Human Approval
- Kein Stash-Autorecovery
- Keine alte #229 Chain wiederbeleben
- Keine unkontrollierten GitHub-Schreibaktionen
- Kein echter .exe/.msi Installer in Phase 0
- Keine PR #218 Aktion in Phase 0 (read-only audit only)

## 5. Kernmodule (Zielarchitektur)

### 5.1 GitHub Context Reconciler
Liest live von GitHub: Issue/PR-Status, Labels, Comments, Reviews. Rekonstruiert den aktuellen Repo-Zustand. Ersetzt veraltete Kontext-Annahmen durch Live-Daten.

### 5.2 Issue/PR Decision Engine
Klassifiziert Issues und PRs nach Risikoklassen (GREEN_SAFE, YELLOW_REVIEW, RED_HOLD, TOOL_GAP, DEFER_TO_279). Entscheidet automatisiert nur GREEN_SAFE/DO_NOT_APPLY. Alles andere erfordert Human Approval.

### 5.3 Evidence Gate
Validiert, dass vor jedem Merge/Fortschritt die erforderlichen Evidence-Artefakte existieren. Blockiert Fortschritt bei fehlender Evidence.

### 5.4 Local Gate Runner
Führt Pflichtgates aus: `git diff --check`, `npx biome format .`, `npm run build`, `npm run typecheck`, `npm test`. Dokumentiert Ergebnisse als Evidence.

### 5.5 Agent Runtime Abstraction
Trennt Agentenläufe in drei Execution Modes:
- **fixture** — vollständig deterministisch, keine externen Calls
- **dry-run** — liest live, schreibt nie
- **real** — voller Zugriff, nur mit Human Approval

### 5.6 OpenCodeDryRunAgent
Führt OpenCode-Agenten im dry-run Modus aus. Sammelt Entscheidungen und Actions ohne Seiteneffekte.

### 5.7 DeterministicFixtureAgent
Führt Agenten mit vorhersehbaren, testbaren Fixtures aus. Garantiert reproduzierbare Ergebnisse für Testzwecke.

### 5.8 Tool Permission / MCP Manifest Layer
Definiert und enforced Zugriffsrechte für Tools. Default-deny für schreibende Aktionen. MCP Capability Manifest dokumentiert verfügbare Tools.

### 5.9 Installer / Local Release Layer
`install-local.ps1`, `start-local.ps1`, `package-local-release.ps1`. Windows-first. Kein Docker-Zwang. `.local-release/` gitignored.

### 5.10 Living Status / Portfolio Layer
Hält `docs/status/current-capabilities.md`, `docs/status/known-limitations.md`, `docs/evidence/` aktuell. Automatisch durch Evidence-Handoffs gespeist.

### 5.11 Mermaid Architecture Map Layer
Visualisiert System-Architektur, Decision Flows, Evidence Gates als Mermaid-Diagramme in `docs/architecture/`.

## 6. Execution Modes

| Mode | Lese-Zugriff | Schreib-Zugriff | Netzwerk | Human Gate |
|------|-------------|----------------|----------|------------|
| **fixture** | Nur Fixtures | Kein | Kein | Nein |
| **dry-run** | Live (readonly) | Kein | Lesend | Nein |
| **real** | Live | Mit Gate | Mit Gate | Ja |

### 6.1 Fixture-Mode
- Vollständig deterministisch
- Keine echten GitHub/Dateisystem/Netzwerk-Zugriffe
- Für automatisierte Tests und CI nutzbar
- `DeterministicFixtureAgent` implementiert

### 6.2 Dry-Run-Mode
- Liest echte GitHub/Repo-Daten
- Schreibt NIE (keine Commits, keine PRs, keine Issue-Kommentare)
- Simuliert Entscheidungen und protokolliert "was würde passieren"
- `OpenCodeDryRunAgent` implementiert

### 6.3 Real-Mode
- Voller Zugriff
- Jeder schreibende Schritt muss durch Human Approval Gate
- Evidence-Pflicht für alle Aktionen
- Nur nach expliziter `APPROVE RUN` Freigabe

## 7. Risk Classes

| Klasse | Bedeutung | Auto-Aktion | Benötigt |
|--------|-----------|-------------|----------|
| **GREEN_SAFE** | Sicher, keine Aktion nötig | DO_NOT_APPLY/NO_ACTION | Keine |
| **YELLOW_REVIEW** | Prüfbedarf, nicht automatisch | Keine automatische Aktion | Human Approval |
| **RED_HOLD** | Gefährlich, nicht anfassen | KEINE Aktion | Separater Prompt |
| **UNKNOWN** | Nicht klassifizierbar | Keine | Manuelle Analyse |
| **TOOL_GAP** | Tool kann Daten nicht lesen | Keine | Tool-Verbesserung |
| **DEFER_TO_279** | Auf #279 verschoben | Keine | #279 Phase 1+ |

## 8. Local Gates Contract

### Pflichtgates (müssen PASS sein)
```
git diff --check
npx biome format .
npm run build
npm run typecheck
npm test
npm test --workspace apps/web
```

### Advisory (dürfen FAIL sein)
```
npx biome check .        (bekannter Lint-Backlog)
GitHub-CI                 (Issue #268, advisory-only)
```

### Acceptance
- Build PASS
- Typecheck PASS
- npm test core PASS (916+/917, timing flake toleriert)
- apps/web PASS (196/196)
- biome check darf rot bleiben (Restbacklog)

## 9. GitHub-CI Policy

Issue #268 bleibt OPEN. GitHub Actions ist advisory-only. Keine CI-Reruns ohne explizite `APPROVE USE GITHUB CI FOR THIS RUN`. Lokale Gates sind Source of Truth für Merge-Entscheidungen.

## 10. Installer Contract

- `install-local.ps1` — npm install + Abhängigkeits-Checks
- `start-local.ps1` — Server + Worker + Web starten
- `package-local-release.ps1` — lokales Release-Paket erstellen
- `.local-release/` gitignored
- Windows-first
- Kein .exe/.msi Anspruch in Phase 0
- Dokumentiert in `docs/install/windows-local-installer.md`

## 11. PR #218 Handling

PR #218 (Stop/Ask Policy + GATE_APPROVE integration) wurde read-only auditiert:

- **Status:** OPEN, MERGEABLE, not draft
- **Scope:** `packages/sandbox/src/` (stop-ask-policy.ts, gate-approve.ts) + Tests + Docs
- **Findings:** 9 CodeRabbit actionable findings, alle unaddressed (historical — CodeRabbit decommissioned Phase 17, 2026-06-26)
- **Risiko:** Sicherheitskritisch (Runtime Enforcement Layer)
- **Entscheidung:** DO_NOT_MERGE_NOW — YELLOW_REVIEW
- **Nächster Schritt:** Separater PR #218 Fix/Close-Prompt erforderlich
- **Phase 0 Aktion:** Nur Audit, kein Merge, kein Close

PR #218 bleibt außerhalb Phase 0, bis separat entschieden.

## 12. Issue #229 Handling

Issue #229 (alte MCP/OpenCode Bootstrap Chain) bleibt OPEN für Traceability.
Issue #279 ist der Replacement-Pfad.
PR #228 und PRs #230–#242 wurden als superseded geschlossen (2026-06-23).

## 13. Red Tests / Negative Scenarios

Folgende Szenarien MÜSSEN blockiert werden:

1. **Stale PR chain must not be merged** — Alte, stale Chain darf nicht automatisch gemerged werden.
2. **Conflicting PR base must not be auto-fixed** — Konflikte dürfen nicht automatisch gelöst werden.
3. **GREEN_SAFE with DO_NOT_APPLY must execute zero actions** — Bei "keine Aktion nötig" darf nichts passieren.
4. **YELLOW_REVIEW must require Human Approval** — Gelbe Fälle erfordern explizite Freigabe.
5. **RED_HOLD must not be touched** — Rote Fälle werden nicht automatisch angefasst.
6. **Remote CI failure must not block local merge gate** — GitHub-CI-Defekt darf lokalen Merge nicht blockieren.
7. **Installer smoke evidence must not claim .exe/.msi** — Keine falschen Behauptungen zum Installer.
8. **Stash entries must not be applied automatically** — Stashes werden nie automatisch angewendet.

## 14. Acceptance Criteria (Phase 0)

Phase 0 ist done, wenn:

- [x] Zielarchitektur dokumentiert ist (dieses Dokument)
- [x] Scope für Phase 1 klar ist
- [x] PR #218 dependency eingeordnet ist (DO_NOT_MERGE_NOW, YELLOW_REVIEW)
- [x] Lokale Gates grün sind (build/typecheck/test PASS)
- [x] Evidence-Handoff existiert (`docs/evidence/issue-279-phase-0/handoff-report.md`)
- [x] Keine Codeimplementierung gemacht wurde
- [x] Mermaid-Diagramme existieren

## 15. Phase 1 Vorschlag (nicht in diesem Lauf ausführen)

Nach Review/Merge dieses Phase-0-PRs soll Phase 1 als kleiner, scoped Implementierungslauf beginnen:

### Phase 1 Scope (Vorschlag)
1. **GitHub Context Reconciler MVP** — Live-Issue/PR-Status lesen und klassifizieren
2. **Decision Manifest Validator** — Risikoklassen validieren und Human-Approval-Gates durchsetzen
3. **Evidence Gate CLI** — Evidence-Artefakte prüfen vor Merge
4. **Local Gate Runner Integration** — Pflichtgates als automatisierte Check-Kette

### Phase 1 Constraints
- Maximal 5–8 Dateien pro PR
- Keine Dist/Build-Artefakte
- Keine Stacked PR Chain (wie alte #229)
- Jeder PR unabhängig review-bar
- Local Gates als Merge-Gate
- Human Approval für jeden Merge
