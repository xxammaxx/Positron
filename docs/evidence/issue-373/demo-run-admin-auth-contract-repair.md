# Issue #373 — Demo-Run Admin Auth Contract Repair

## Ausgangszustand

- Branch: `fix/post-merge-quality-gates-371`
- Start-Head: `058e7c78cd67cca30ed5caf0f1e8dab62a48dde4`
- End-Head: `c364dff` (fix(issue-373): authenticate demo run requests and restore E2E flow)
- PR: #372 (Draft)
- Issue: #373 (Open)
- Bestätigter Fehler: `POST /api/demo-runs` → 401 — `startDemoRun()` sendete keinen Admin-Token

## Root Cause

Frontend `api.startDemoRun()` in `apps/web/src/api.ts:365` verwendete `request()` (keine Auth-Header),
während Server `POST /api/demo-runs` durch `requireAdmin`-Middleware geschützt ist.
Token-Flow: UI → `request()` → kein `X-Admin-Token` → `requireAdmin` → 401/503

## Entscheidung

**Option A:** `request()` → `adminRequest()` (1-Wort-Änderung).
`adminRequest()` sendet `X-Admin-Token` Header aus `localStorage`.
Server-Security unverändert, fail-closed bleibt bestehen.

## Sicherheitsbewertung

- `requireAdmin` unverändert: JA
- fail-closed bleibt bestehen: JA (401 bei falschem Token, 503 bei nicht konfiguriertem Token)
- Kein Default-Token im Produktionscode: JA
- Kein Auth-Bypass: JA
- Test-Token `positron-test-token-dev`: ephemer, nur für E2E
- Kein Stage-3-Kontakt: JA

## Änderungen

| Datei | Zweck |
|-------|-------|
| `apps/web/src/api.ts:365` | `request()` → `adminRequest()` |
| `playwright.config.ts` | `POSITRON_ADMIN_TOKEN` in `FAKE_MODE_ENV` |
| `e2e/diagnostic-reality-check.spec.ts` | Token-Injection vor Demo-Run-Klick |
| `e2e/ui-workflow-trace.spec.ts` | Token-Injection vor Demo-Run-Klick |
| `e2e/workflow-proof.spec.ts` | Token-Injection vor Demo-Run-Klick |

## Tests

| Gate | Befehl | Ergebnis | Exit-Code |
|------|--------|----------|-----------|
| Diff Check | `git diff --check` | PASS | 0 |
| Format (changed files) | `npx biome format` | PASS | 0 |
| Typecheck | `npm run typecheck` | PASS | 0 |
| Build | `npm run build` | PASS | 0 |
| Server Tests | `npm test -w apps/server` | 172/172 PASS | 0 |
| Web Tests | `npm test -w apps/web` | 205/205 PASS | 0 |
| Full Test Suite | `npm test` | 2326/2326 PASS | 0 |

*Anmerkung:* Die Testzahlen basieren auf dem Stand nach Commit `c364dff` (Fix + Token-Injection). Die vorherige run-report.md zeigte 1892/1892 (vor Server-Test-Suite-Aktivierung) und 2141/2141 (nach Stage-3-Integration). Der Sprung auf 2326 (2121 Backend + 205 Web) spiegelt die vollständige Server-Test-Suite wider.

## Playwright-Evidence

- Playwright-Tests NICHT in diesem Lauf ausgeführt (benötigt separate Server/Webserver-Instanz)
- Token-Injection-Code ist in den Spec-Dateien vorhanden
- `POSITRON_ADMIN_TOKEN` in `playwright.config.ts` konfiguriert

## Verbleibende Risiken

- **9 weitere Write-Methoden** (`createRepo`, `createRun`, `startRun`, etc.) verwenden ebenfalls `request()` statt `adminRequest()`
- Biome-Backlog #340 weiterhin offen
- Redis ECONNREFUSED in E2E-Umgebung (pre-existing infra)
- Playwright-Tests müssen in separatem Lauf mit gestarteten Servern ausgeführt werden

## Klassifikation

**AMBER_REVIEW** — Auth-Vertrag repariert, Tests grün, E2E-Token-Injection vorhanden, aber Playwright-E2E-Lauf mit Servern steht noch aus.

## Cross-Reference

Dieser Fix ist Teil des Issue-#373-Tracks. Der vorherige Fix (DashboardPage-Crash) ist dokumentiert in:
- [`docs/evidence/issue-373/run-report.md`](run-report.md) — ManagedProject → ManagedTargetProject Contract Repair
