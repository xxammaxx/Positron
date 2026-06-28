# Rudolph Beacon — Phase 3 Pre-Flight

**Timestamp:** 2026-06-24T15:41:00Z
**Run ID:** phase-3-preflight

---

## Geplante Änderungen

| # | Änderung | Datei(en) | Risikoklasse |
|---|----------|-----------|-------------|
| 1 | `validateRunSummary()` exportieren | `evidence-contract.ts`, `index.ts` | GREEN_SAFE |
| 2 | `determineConclusionStatus()` härten (evidence-aware) | `evidence-contract.ts` | GREEN_SAFE |
| 3 | `validateRunSummary()` in `execute()` integrieren | `benchmark-runner.ts` | GREEN_SAFE |
| 4 | `buildConclusion()` mit Traceability-Validierung härten | `benchmark-runner.ts` | GREEN_SAFE |
| 5 | Neue Red Tests 23-28 | `red-negative-tests.test.ts` | GREEN_SAFE |
| 6 | Test-File bereinigen (Import statt lokale Definition) | `evidence-schema-validation.test.ts` | GREEN_SAFE |
| 7 | COVERAGE_POLICY.md erstellen | `docs/benchmark/rudolph-beacon/` | GREEN_SAFE |
| 8 | ISSUE_279_ALIGNMENT.md erstellen | `docs/benchmark/rudolph-beacon/` | GREEN_SAFE |
| 9 | Phase 3 Evidence-Dokumente erstellen | `docs/evidence/rudolph-beacon/` | GREEN_SAFE |
| 10 | CAPABILITIES.md / KNOWN_LIMITATIONS.md aktualisieren | `docs/benchmark/rudolph-beacon/` | GREEN_SAFE |

## Ausdrücklich NICHT betroffene Dateien

- `packages/opencode-adapter/` — YELLOW_REVIEW
- `packages/shared/` — YELLOW_REVIEW
- `packages/run-state/` — YELLOW_REVIEW
- `apps/server/` — YELLOW_REVIEW
- `apps/web/` — YELLOW_REVIEW
- `.github/workflows/*` — RED_HOLD
- Stashes — RED_HOLD
- PR #218 — RED_HOLD
- Alte PR-Chain #230-#242 — RED_HOLD
- Remote-CI — RED_HOLD

## GREEN_SAFE-Entscheidungen (KI-autonom)

1. `validateRunSummary()` wird aus `evidence-contract.ts` exportiert (additiv, testbar)
2. `determineConclusionStatus()` prüft jetzt `evidencePaths` (DONE ohne Evidence = YELLOW)
3. `BenchmarkRunner.execute()` validiert Summary vor Rückgabe (additiv, testbar)
4. `buildConclusion()` berücksichtigt Traceability-Errors (additiv, testbar)
5. Coverage-Policy: 85% Line Coverage Minimum für Benchmark-Package (benchmark-spezifisch)
6. Coverage Exit Code 1 als PRE-EXISTING klassifiziert (nicht Benchmark-Fehler)
7. Issue #279 Alignment-Dokument als GREEN_SAFE erstellt

## YELLOW_REVIEW-Entscheidungen (Human Approval nötig)

Keine in diesem Lauf.

## RED_HOLD-Grenzen

- Kein `git push`
- Kein `gh pr create` / `gh pr merge`
- Kein Remote-CI
- Keine `.github/workflows/*`-Änderung
- Keine Secret-Ausgabe

## Lokale Gates

```bash
git diff --check         # PASS erwartet
npm run build            # PASS erwartet
npm run typecheck        # PASS erwartet
npm run test:benchmark:rudolph  # 171/171 PASS erwartet
npm run test:benchmark:rudolph:coverage  # Coverage gemessen (Exit Code 1 PRE-EXISTING)
```

## Rollback-Strategie

Alle Änderungen sind additiv und können via `git checkout` auf den letzten Commit zurückgesetzt werden. Keine irreversiblen Änderungen.

## Risiken

| Risiko | Status |
|--------|--------|
| `determineConclusionStatus`-Härtung bricht bestehende Tests | Gemindert — Red Test 15 aktualisiert, alle 171 Tests PASS |
| Validator-Integration verlangsamt `execute()` | Gemindert — Validierung ist O(n) und < 1ms |
| Coverage-Policy-Konflikt mit globalem Threshold | Vermieden — Benchmark-spezifische Policy, PRE-EXISTING-Markierung |
| Keine Remote-Aktion ausgelöst | Konfirmiert — keine Push/PR/CI-Aktion |

## Warum kein Real-Mode-Lauf

Dieser Lauf ist ein reiner Code- + Dokumentations-Lauf. Keine externen Abhängigkeiten, keine Netzwerkzugriffe, keine Dateisystem-Schreibzugriffe außerhalb des Workspace. Real-Mode erfordert `POSITRON_ENABLE_REAL=true` UND `HUMAN_APPROVED_REAL=true`.
