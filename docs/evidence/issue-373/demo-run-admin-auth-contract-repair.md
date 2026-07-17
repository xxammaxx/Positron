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

### Commit c364dff (Auth Fix)
- Playwright-Tests in diesem Lauf nicht ausgeführt (benötigt separate Server/Webserver-Instanz)
- Token-Injection-Code in den Spec-Dateien vorhanden
- `POSITRON_ADMIN_TOKEN` in `playwright.config.ts` konfiguriert

### Commit 1aa2e43 (Token-Fixture-Härtung + Runtime Proof)

## Runtime Proof

- **Head:** `1aa2e43dcfdf9e2a8d9cb0dddf72efd71cb5805e`
- **Date:** 2026-07-17T11:45:00Z
- **Environment:** Local (Linux, Node.js v22)
- **Redis:** Docker (redis:7-alpine, PONG confirmed, healthy)
- **Server:** Auto-started by Playwright webServer, mode=fake, killSwitch=true
- **Worker:** Inline pipeline (POSITRON_DISABLE_QUEUE=true)
- **Browser:** Chromium (Playwright, headless)

## Auth Contract

| Prüfung | Ergebnis |
|---------|----------|
| No token → 401 | Confirmed (server integration tests) |
| Wrong token → 401 | Confirmed (server integration tests) |
| Valid test token → 2xx | Confirmed (POST /api/demo-runs → 201) |
| Header X-Admin-Token present | YES |
| Header value captured | NO (not logged) |

## Playwright (Lokal, HEAD 1aa2e43)

| Suite | Passed | Failed | Skipped | Duration |
|-------|--------|--------|---------|----------|
| diagnostic-reality-check | 6 | 0 | 0 | ~29s |
| ui-workflow-trace | 1 | 0 | 0 | ~28s |
| workflow-proof (14 steps) | 14 | 0 | 0 | ~29s |
| smoke | 3 | 0 | 0 | included |
| full-run-lifecycle | 0 | 1 | 1 | ~15s (timeout) |
| **Total** | **24** | **1** | **1** | **~1.6m** |

## Demo Workflow

| Phase | Status |
|-------|--------|
| POST /api/demo-runs | 2xx ✅ |
| Run ID erzeugt | YES |
| "Demo run started" visible | YES |
| Navigation to run detail | YES |
| Run end state | DONE |
| Duration | <30s |

## Console and Network

| Type | Count |
|------|-------|
| Uncaught errors | 0 |
| Unhandled rejections | 0 |
| 401 on demo-runs | 0 |
| Redis errors | 0 |
| Vite HMR noise | Present but non-blocking |
| Failed requests (4xx/5xx) | 0 (except pre-existing full-run-lifecycle) |

## Token-Fixture-Härtung (Commit 1aa2e43)

| Prüfung | Ergebnis |
|---------|----------|
| Source of Truth | SINGLE (`playwright.config.ts:42`) |
| Token-Duplikation entfernt | YES (3 Specs → 1 Shared Fixture) |
| Fallback `|| 'positron-test-token-dev'` entfernt | YES (alle 3 Specs) |
| CI-Workflow Token aligned | YES (`positron-admin-dev` → `positron-test-token-dev`) |
| Token-Propagation an Test-Worker | YES (`process.env` in playwright config) |
| Shared Fixture | `e2e/fixtures/admin-auth.ts` |
| Fail-fast bei fehlendem Token | YES |
| Token statisch, test-only, non-secret | YES |

## CI Token Mismatch (Root Cause für CI-Fehler)

- CI-Workflow (`quality-gates.yml:230`) setzte: `POSITRON_ADMIN_TOKEN=positron-admin-dev`
- Playwright-Config (`FAKE_MODE_ENV`) setzt: `POSITRON_ADMIN_TOKEN=positron-test-token-dev`
- Server (via `webServer.env` → `FAKE_MODE_ENV`): `positron-test-token-dev`
- Test-Worker (erben CI-Env): `positron-admin-dev`
- Browser injected: `positron-admin-dev` → Server validiert: `positron-test-token-dev` → **401**
- **Fix**: CI-Workflow auf `positron-test-token-dev` geändert + `process.env`-Propagation

## Normal Run Auth Fix (Commit 872f6de, 2026-07-17)

### Runtime Proof

- **Head:** `872f6de37c4f7ec652a4ad75ec482ab318cd1825`
- **Date:** 2026-07-17T12:44:00Z
- **Environment:** Local (Linux, Node.js v22) + CI (GitHub Actions, ubuntu-latest)
- **Root Cause:** `api.createRun()` used `request()` (no auth headers) while server `POST /api/runs` is protected by `requireAdmin`. Additionally, `full-run-lifecycle.spec.ts` never imported `installAdminToken`.
- **Fix:** Changed `createRun()` to `adminRequest()`. Fixed `installAdminToken` fixture for dual-mode (addInitScript + evaluate). Integrated fixture into `full-run-lifecycle.spec.ts` `beforeEach`.

### Auth Contract (Normal Run)

| Prüfung | Ergebnis |
|---------|----------|
| No token → 401 | Confirmed (regression tests) |
| Wrong token → 401 | Confirmed (regression tests) |
| Valid test token → 2xx | Confirmed (POST /api/runs → 201, local + CI) |
| Header X-Admin-Token present | YES |
| Header value captured | NO (not logged) |

### Playwright (Lokal + CI, HEAD 872f6de)

| Suite | Passed | Failed | Skipped | Duration |
|-------|--------|--------|---------|----------|
| diagnostic-reality-check | 6 | 0 | 0 | ~29s |
| ui-workflow-trace | 1 | 0 | 0 | ~28s |
| workflow-proof (14 steps) | 14 | 0 | 0 | ~29s |
| smoke | 3 | 0 | 0 | included |
| full-run-lifecycle | 2 | 0 | 0 | ~9s |
| **Total** | **26** | **0** | **0** | **~1.5m** |

### Full-Run-Lifecycle Workflow

| Phase | Status |
|-------|--------|
| POST /api/runs | 2xx ✅ |
| Run ID erzeugt | YES |
| Navigation to /runs/:id | YES |
| Pipeline sichtbar | YES |
| Run end state | DONE |
| No 401 | YES |
| No waitForURL timeout | YES |
| Duration | <10s |

### CI Status (Run 29574452503, Head 872f6de)

| Job | Result |
|-----|--------|
| e2e-playwright | **PASS (26/26, 1.4m)** |
| build-and-test | FAIL (Biome #340 only) |
| mutation-fast/safety | PASS |
| observability | PASS |
| tool-gateway-windows | PASS |

### Normal Run Auth Proof

| Field | Value |
|-------|-------|
| Local test | 26/26 PASS |
| CI run | 29574452503 |
| POST /api/runs status | 2xx |
| Admin header present | YES |
| Token value captured | NO |
| Run ID | erzeugt |
| Navigation | /runs/:id |
| Final phase | DONE |

### Regression Tests (api-createRun-auth.test.ts)

| # | Case | Assertion |
|---|------|-----------|
| 1 | Valid token → 2xx, header present | `tokenSent === TEST_TOKEN` |
| 2 | No token → throws 401 | `rejects.toThrow()` |
| 3 | Wrong token → throws 401 | `rejects.toThrow()` |
| 4 | URL forwarded in body | `body.issueUrl` matches |
| 5 | POST method + endpoint correct | `url === '/api/runs'` |

## Verbleibende Risiken

- **6 weitere Write-Methoden** (`createRepo`, `startRun`, `saveEvidence`, `updateSafety`, `cancelRun`, controlRun/approveGate/reviseGate) verwenden ebenfalls `request()` statt `adminRequest()`. `createRun()` ist in diesem Commit gefixt.
- Biome-Backlog #340 weiterhin offen (blockiert `build-and-test` CI-Job)
- `docker-compose.test.yml` verwendet noch `positron-admin-dev` (eigenes Test-Environment, P2)

## Klassifikation

**AMBER_REVIEW_CI_POLICY_BLOCKED** — Functional E2E: GREEN (26/26, local + CI). Gesamt-CI: RED nur durch separates Biome-Governance-Problem (#340).

## Cross-Reference

Dieser Fix ist Teil des Issue-#373-Tracks. Der vorherige Fix (DashboardPage-Crash) ist dokumentiert in:
- [`docs/evidence/issue-373/run-report.md`](run-report.md) — ManagedProject → ManagedTargetProject Contract Repair
