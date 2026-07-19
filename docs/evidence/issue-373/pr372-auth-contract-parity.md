# PR #372 — Auth Contract Parity Closure

## Ausgangslage

| Criteria | Value |
|----------|-------|
| PR Head (before) | `e65b29e38890d74e5be2dc7abedff2e4475ad1e4` |
| PR Head (after) | `<NEW_HEAD>` |
| Audit Finding | 8 client methods use `request()` for `requireAdmin`-protected server endpoints |
| Already Fixed | `startDemoRun()`, `createRun()`, admin functions (getAdminStats, bulkCancelRuns, bulkRetryRuns, cleanupRuns) |

## Server-Endpoint-Inventur

16 `requireAdmin`-protected endpoints across `apps/server/src/index.ts`. All POST-endpoints.

## Client-Auth-Gaps (8 Mismatches)

| Function | Endpoint | Active UI Caller | Classification |
|----------|----------|-----------------|---------------|
| `createRepo` | POST /api/repos | Repositories.tsx:39 | **P1** (active) |
| `startRun` | POST /api/repos/:repoId/runs | Dashboard.tsx:97, Repositories.tsx:70 | **P1** (active) |
| `approveGate` | POST /api/runs/:id/gate | GateControls.tsx:36 | **P1** (active) |
| `reviseGate` | POST /api/runs/:id/gate | GateControls.tsx:54 | **P1** (active) |
| `cancelRun` | POST /api/runs/:id/cancel | RunDetail.tsx:53 | **P1** (active) |
| `controlRun` | POST /api/runs/:id/control | none | **P2** (latent) |
| `saveEvidence` | POST /api/evidence | none | **P2** (latent) |
| `updateSafety` | POST /api/safety | SettingsPage.tsx:129 | **P2** (latent/settings) |

## Reparaturen

All 8 functions changed from `request()` → `adminRequest()` in `apps/web/src/api.ts`.

| Function | Vorher | Nachher |
|----------|--------|---------|
| `createRepo` | `request()` | `adminRequest()` |
| `startRun` | `request()` | `adminRequest()` |
| `controlRun` | `request()` | `adminRequest()` |
| `approveGate` | `request()` | `adminRequest()` |
| `reviseGate` | `request()` | `adminRequest()` |
| `saveEvidence` | `request()` | `adminRequest()` |
| `updateSafety` | `request()` | `adminRequest()` |
| `cancelRun` | `request()` | `adminRequest()` |

No other production code changed. No server changes. No UI component changes.

## Auth-Paritätsmatrix (Final)

| Geschützter Endpoint | Clientmethode | Helper | Status |
|---------------------|--------------|--------|--------|
| POST /api/repos | createRepo | adminRequest | ✅ |
| POST /api/runs | createRun | adminRequest | ✅ |
| POST /api/repos/:repoId/runs | startRun | adminRequest | ✅ |
| POST /api/runs/:id/control | controlRun | adminRequest | ✅ |
| POST /api/runs/:id/gate | approveGate | adminRequest | ✅ |
| POST /api/runs/:id/gate | reviseGate | adminRequest | ✅ |
| POST /api/evidence | saveEvidence | adminRequest | ✅ |
| POST /api/safety | updateSafety | adminRequest | ✅ |
| POST /api/runs/:id/cancel | cancelRun | adminRequest | ✅ |
| POST /api/demo-runs | startDemoRun | adminRequest | ✅ |
| GET /api/admin/stats | getAdminStats | adminRequest | ✅ |
| POST /api/admin/runs/bulk-cancel | bulkCancelRuns | adminRequest | ✅ |
| POST /api/admin/runs/bulk-retry | bulkRetryRuns | adminRequest | ✅ |
| POST /api/admin/runs/cleanup | cleanupRuns | adminRequest | ✅ |

**PROTECTED_CLIENT_WRITES_USING_REQUEST = 0**
**PROTECTED_CLIENT_WRITES_USING_ADMIN_REQUEST = ALL (14)**

## Test Token Alignment

| File | Before | After |
|------|--------|-------|
| docker-compose.test.yml (test service) | `positron-admin-dev` | `positron-test-token-dev` |
| docker-compose.test.yml (e2e service) | `positron-admin-dev` | `positron-test-token-dev` |

Canonical test token: `positron-test-token-dev` (matches Playwright config, CI workflow)

## Sicherheitsinvarianten

| Invariant | Status |
|-----------|--------|
| Server fail-closed | ✅ Unverändert |
| Default token | ✅ Keiner |
| Produktions-Secret | ✅ Keines |
| Public Reads | ✅ Unverändert (alle 13 GETs auf `request()`) |
| Protected Writes | ✅ Vollständig `adminRequest()` |
| Auth-Bypass | ✅ Keiner |

## Regressionstests

`apps/web/src/__tests__/api-auth-parity.test.ts` — 62 tests:
- 8 protected methods × 6 test cases ea. (token header, no-token 401, wrong-token, URL, method, body keys)
- 13 public GET methods do NOT send admin header
- 2 negative tests (empty token, no hardcoded token)

## Lokale Gates

| Gate | Ergebnis |
|------|----------|
| Diff Check | PASS |
| Format (changed files) | PASS (biome applied) |
| Typecheck | PASS |
| Build | PASS |
| Web Unit Tests | 272/272 PASS |
| Server Tests | 2121/2121 PASS |
| E2E Playwright | 26/26 PASS |

## Geänderte Dateien

1. `apps/web/src/api.ts` — 8 `request()` → `adminRequest()` changes + format
2. `apps/web/src/__tests__/api-auth-parity.test.ts` — new: 62 auth contract tests
3. `docker-compose.test.yml` — test token alignment (2 lines)

## Security Verdict

**PASS** — No auth bypass, no default token, no hardcoded production token, server fail-closed unchanged, public reads unchanged, all protected writes correctly authenticated.
