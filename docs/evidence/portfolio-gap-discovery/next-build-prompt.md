# Portfolio Gap Discovery — Next Build Prompt

## Empfohlener nächster Build-Run

### Issue: #307 — Docs: Sync all status docs, README, API overview, changelog, and evidence index

**Begründung:** Dies ist der GREEN_SAFE-Kandidat mit der höchsten Dringlichkeit. Nach mehreren abgeschlossenen Tracks (Rudolph Beacon, CI Recovery, Post-268 Fixes) hat die Dokumentation signifikanten Drift. Falsche Badges, falsche Referenzen und fehlende Dateien untergraben die Glaubwürdigkeit des Repos.

**Alternative:** Falls #307 zu umfangreich erscheint, ist #304 (Playwright tracing lifecycle flake) der nächstbeste GREEN_SAFE-Kandidat. #304 ist technisch fokussiert, hat eine klare Root-Cause-Analyse und kann in einem Build-Run gelöst werden.

---

## Build Prompt (kopierbar)

```text
# POSITRON NEXT RUN — Issue #307: Documentation Reality Sync

## Aufgabe

Synchronisiere alle Positron-Statusdokumente mit der aktuellen Repo-Realität.

## Repo

```
https://github.com/xxammaxx/Positron
Branch: main
Commit: 69c78c8f7dbdd9e51c647767ff27e0c60b286a5e
```

## Scope

1. **`docs/status/current-capabilities.md`** aktualisieren:
   - Test-Anzahl: 917 → 1571+ (nach Rudolph Beacon #279)
   - Rudolph Beacon Benchmark hinzufügen
   - Controlled Real-Mode Probe (#279) hinzufügen
   - CI Recovery (#296) dokumentieren
   - Post-268 Fixes (#297, #298, #299) dokumentieren
   - #243 Baseline Types (AgentCapabilityRegistry, GateType, Evidence-Typen) hinzufügen
   - Stale "#268 is Open" Referenz entfernen

2. **`docs/status/known-limitations.md`** aktualisieren:
   - GitHub Actions Status: "all jobs fail" → "advisory-only, partially functional"
   - #268 als CLOSED markieren
   - #304 (Playwright tracing flake) als Known Limitation hinzufügen
   - GateType/Enforcement-Gaps aus #243 Baseline hinzufügen
   - Fehlende Runtime Enforcements (#244-#247) dokumentieren
   - Abgeschlossene Items (#268, #252) entfernen
   - Rudolph Beacon Limitations hinzufügen

3. **`README.md`** Badges aktualisieren:
   - Test-Badge: `917` → `1571+`
   - Screenshots auf Aktualität prüfen (nicht ersetzen, nur prüfen)

4. **`docs/status/evidence-index.md`** ERSTELLEN:
   - Alle Evidence-Verzeichnisse indexieren
   - rudolph-beacon, post-268, post-299, issue-268, issue-279, closeout-*, etc.

5. **`docs/architecture/api-overview.md`** erweitern:
   - Über #229 Endpoints hinaus alle post-v0.1.0 Endpoints dokumentieren
   - Koordination mit #251 (das nur #229 Endpoints abdeckt)

6. **`docs/changelog/v0.2.0.md`** und **`docs/changelog/v0.3.0.md`** ERSTELLEN:
   - v0.2.0: Issue #229 MVP Finalization Features
   - v0.3.0: Issue #243 Agentic/Vibe-Coding Baseline

## Nicht-Scope

- Keine Code-Änderungen
- Keine Workflow-Änderungen
- Keine manuelle CI
- Keine neuen Features
- #251 (api-overview #229 endpoints) bleibt separates Issue — nicht duplizieren
- Keine Screenshots ersetzen (nur auf Aktualität prüfen)

## Lokale Gates

```powershell
git diff --check
npx biome format docs/
npm run build
npm run typecheck
```

## Evidence

- `docs/evidence/portfolio-gap-discovery/` als Referenz für den Gap-Audit verwenden
- Nach jeder Dateiänderung: `git diff --stat` dokumentieren

## Risiko-Klasse

```
GREEN_SAFE — reine Dokumentation, kein Code-Risiko
```

## Kein Merge

Nur Draft PR erstellen, nicht mergen.
Kein manueller CI-Trigger.
Kein CodeRabbit.
```

---

## Alternativer Build Prompt: Issue #304

```text
# POSITRON NEXT RUN — Issue #304: Playwright tracing lifecycle flake

## Aufgabe

Behebe den deterministischen Playwright-Tracing-Fehler in `e2e/ui-workflow-trace.spec.ts:55`.

## Root Cause (bereits identifiziert)

1. `playwright.config.ts` setzt `trace: 'retain-on-failure'` → automatisches Tracing auf jedem Context
2. Test ruft explizit `context.tracing.start()` auf → "Tracing has been already started"
3. `context.tracing.stop()` ist im `try`-Block, nicht im `finally`-Block

## Fix-Ansatz (Option A bevorzugt)

- Explizite `tracing.start()`/`tracing.stop()` Aufrufe entfernen
- Auf globales `trace: 'retain-on-failure'` verlassen
- Trace-Artefakt-Speicherung in `finally`-Block verschieben falls nötig

## Akzeptanzkriterien

1. `npx playwright test e2e/ui-workflow-trace.spec.ts --repeat-each=5` → 5 passes
2. Alle 26 E2E-Tests bestehen
3. Keine Regression in anderen Tests
4. Evidence: Before/After des Fix

## Risiko-Klasse

```
GREEN_SAFE — kleiner, fokussierter Fix mit bekannter Root Cause
```
```
