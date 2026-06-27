# Portfolio Gap Discovery Phase 2 — Next Build Prompt for Issue #307

## Empfohlener nächster Build-Run

### Issue: #307 — Docs: Sync all status docs, README, API overview, changelog, and evidence index with post-closeout reality

**Begründung:** Nach dem erfolgreichen Merge von PR #309 (Phase 1 Discovery) ist #307 der GREEN_SAFE-Kandidat mit der höchsten Dringlichkeit. Die Dokumentation weist signifikanten Drift auf (falsche Badges, falsche Issue-Referenzen, fehlende Dateien). #307 adressiert dies umfassend.

**Dependencies:**
- PR #309 ist jetzt GEMERGT → die Discovery-Evidence ist auf `main` verfügbar
- Keine Blocker für #307

---

## Build Prompt (kopierbar)

```text
# POSITRON NEXT RUN — Issue #307: Documentation Reality Sync

Du bist die bauende KI im Repository:

```
https://github.com/xxammaxx/Positron
Branch: main
Commit: 7dc32c76bcd0a64338e9b5898c90be0e419570d4
```

## Bekannter Stand

Portfolio Gap Discovery (PR #309) ist gemergt. Die folgenden Issues wurden als genuine Lücken identifiziert:
- #305 — Evidence Portfolio: Automate post-run capability updates
- #306 — Backlog Hygiene: Milestones, labels, taxonomy
- #307 — Docs: Sync all status docs (DIESER BUILD)
- #308 — Validation: Supervised Full Real Mode pilot

Die Dokumentation weist signifikanten Drift auf:
- README.md Badges zeigen v0.1.0 und 917 Tests → Realität ist 1571+ Tests
- docs/status/current-capabilities.md verweist auf #268 als "Open" (ist CLOSED)
- docs/status/known-limitations.md behauptet GitHub Actions "all jobs fail"
- docs/status/evidence-index.md existiert NICHT
- docs/architecture/api-overview.md nur v3.0 Endpoints (datiert 2026-05-24)
- docs/changelog/v0.2.0.md und v0.3.0.md fehlen

Die Discovery-Evidence liegt unter `docs/evidence/portfolio-gap-discovery/` und kann als Referenz verwendet werden.

## Aufgabe

Synchronisiere alle Positron-Statusdokumente mit der aktuellen Repo-Realität nach den abgeschlossenen Tracks:
- Rudolph Beacon (#279, CLOSED)
- CI Recovery (#296, gemergt)
- Post-268 Fixes (#297, #298, #299, alle CLOSED)
- Issue #243 Baseline Types (Agentic/Vibe-Coding)

## Scope

1. **`docs/status/current-capabilities.md`** aktualisieren:
   - Test-Anzahl: 917 → 1571+ (nach Rudolph Beacon und Post-268 Fixes)
   - Rudolph Beacon Benchmark hinzufügen (#279)
   - Controlled Real-Mode Probe dokumentieren
   - CI Recovery (#296) dokumentieren
   - Post-268 Fixes (#297, #298, #299) dokumentieren
   - #243 Baseline Types (AgentCapabilityRegistry, GateType, Evidence-Typen) hinzufügen
   - Stale "#268 is Open" Referenz entfernen
   - Portfolio Gap Discovery (#309) als neue Capability dokumentieren

2. **`docs/status/known-limitations.md`** aktualisieren:
   - GitHub Actions Status: "all jobs fail" → "advisory-only, partially functional"
   - #268 als CLOSED markieren
   - #304 (Playwright tracing flake) als Known Limitation hinzufügen
   - GateType/Enforcement-Gaps aus #243 Baseline hinzufügen
   - Fehlende Runtime Enforcements (#244-#247) dokumentieren
   - Rudolph Beacon Limitations hinzufügen
   - Abgeschlossene Items (#268, #252) entfernen

3. **`README.md`** Badges aktualisieren:
   - Test-Badge: `917` → `1571+`
   - Screenshots auf Aktualität prüfen (nicht ersetzen, nur Status dokumentieren)

4. **`docs/status/evidence-index.md`** ERSTELLEN:
   - Alle Evidence-Verzeichnisse indexieren
   - `rudolph-beacon/`, `post-268/`, `post-299/`, `issue-268/`, `issue-279/`, `portfolio-gap-discovery/`, `closeout-*/`, etc.
   - Kurze Beschreibung jedes Evidence-Verzeichnisses
   - Datum und Status jedes Eintrags

5. **`docs/architecture/api-overview.md`** erweitern:
   - Über #229 Endpoints hinaus alle post-v0.1.0 Endpoints dokumentieren
   - Koordination mit #251 (das nur #229 Endpoints abdeckt) — nicht duplizieren, aber ergänzen
   - Endpoints aus #243 Baseline, #279 Rudolph Beacon, und Tool Gateway dokumentieren

6. **`docs/changelog/v0.2.0.md`** und **`docs/changelog/v0.3.0.md`** ERSTELLEN:
   - v0.2.0: Issue #229 MVP Finalization Features (Tool Gateway, MCP warm-up types, Oversight UI types, Blueprint Launcher types, Architecture Scanner types)
   - v0.3.0: Issue #243 Agentic/Vibe-Coding Baseline (Orchestrator types, Worktree isolation, GateType enforcement types, Trace/Eval types, Agent capability registry)

## Nicht-Scope

- Keine Code-Änderungen
- Keine Workflow-Änderungen
- Keine manuelle CI (`gh workflow run`, `gh run rerun`)
- Keine neuen Features
- #251 (api-overview #229 endpoints) bleibt separates Issue — nicht duplizieren, nur ergänzen was #251 nicht abdeckt
- #306 (Backlog Hygiene) bleibt separates Issue — keine Labels/Milestones hier
- Keine Screenshots ersetzen (nur auf Aktualität prüfen)
- Keine README-Neuschreibung (Presentation ist #211)

## Lokale Gates

```powershell
git diff --check
npm run build
npm run typecheck
npm test  # optional, da reine Doku-Änderungen
```

## Evidence

- `docs/evidence/portfolio-gap-discovery/repo-docs-reality-audit.md` als Referenz für den Drift-Audit verwenden
- `docs/evidence/portfolio-gap-discovery/report.md` für Übersicht der abgeschlossenen Tracks
- Nach jeder Dateiänderung: `git diff --stat` dokumentieren
- Evidence in `docs/evidence/issue-307/` ablegen

## Risiko-Klasse

```
GREEN_SAFE — reine Dokumentation, kein Code-Risiko
```

## Kein Merge

Nur Draft PR erstellen, nicht mergen.
Kein manueller CI-Trigger.
Kein CodeRabbit.
Kein Auto-Merge.

## Issue-Referenz

- Issue #307: https://github.com/xxammaxx/Positron/issues/307
```

---

## Alternativer Build: Issue #306 (Backlog Hygiene)

Falls #307 zu umfangreich erscheint, kann #306 als Einstieg dienen:

```text
# POSITRON NEXT RUN — Issue #306: Backlog Hygiene

## Aufgabe

Definiere Milestones (v0.3.0, v0.4.0, Backlog), normalisiere Labels (P0/P1/P2 mit priority:high/medium/low konsolidieren), füge type:bug/feature/docs/infra/research/validation Labels hinzu, und dokumentiere die Label-Konvention.

## Nicht-Scope

Keine Issue-Neuzuweisung. Keine Issue-Schließung. Kein Code. Keine CI.
```
