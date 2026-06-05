# Layer 4: Playwright Browser Evidence

## Purpose

Automated browser-based verification of the Positron UI and end-to-end workflow.
Every E2E run produces a complete evidence package: screenshots, trace, video (on failure),
and redacted console/network logs.

## Artifacts per E2E Run

| Artifact | Location | Condition | Description |
|----------|----------|-----------|-------------|
| Screenshots | `test-results/screenshots/*.png` | Programmatic | Key UI states captured via `artifacts.js` |
| Trace | `test-results/*/trace.zip` | Every test | Full Playwright trace replay |
| Video | `test-results/*/video.webm` | Failure only (CI) | Screen recording of failed test |
| Console Logs | `test-results/evidence/evidence-log.json` | Programmatic | Redacted browser console messages |
| Network Logs | `test-results/evidence/evidence-log.json` | Programmatic | Redacted request/response pairs |
| HTML Report | `playwright-report/` | Always | Playwright HTML report |

## CI Integration

See `.github/workflows/quality-gates.yml` → `e2e-playwright` job.

- **Status:** Non-blocking (`continue-on-error: true`)
- **Artifacts:** `playwright-report/**` and `test-results/**` uploaded on every run
- **Promotion:** After 5 consecutive green main runs → promote to blocking

## Local Usage

```bash
# Headless (CI mode)
npm run test:e2e

# Headed — see the browser
npm run test:e2e:headed

# Slow motion — watch interactions step by step
npm run test:e2e:slow

# Debug — breakpoints in Playwright Inspector
npm run test:e2e:debug

# Observe — headed + slow + observe hooks
npm run test:e2e:observe

# Specific spec
npx playwright test e2e/ui-workflow-trace.spec.ts
```

## Screenshot Manifest

Predefined key UI states captured during workflow (`e2e/support/artifacts.js`):

| State | Page/Component | Trigger |
|-------|---------------|---------|
| dashboard-loaded | Dashboard | Initial page load |
| health-verified | Dashboard | Backend health check confirms |
| new-run-modal | NewRunModal | "+ New Run" button clicked |
| run-started | Dashboard | Run created via API/UI |
| run-detail-phase | RunDetail | Run page with phase timeline |
| dashboard-complete | Dashboard | Run reached terminal state |
| blueprint-before | BlueprintPanel | Before blueprint opened |
| blueprint-loaded | BlueprintPanel | Blueprint content loaded |
| demo-run-before | Dashboard | Before demo run started |
| demo-run-started | Dashboard | Demo run in progress |
| run-in-list | Dashboard | Run visible in sidebar list |
| runs-page | RunsPage | Dedicated runs page |
| evidence-page | EvidencePage | Evidence/artifacts tab |
| settings-page | SettingsPage | Settings/configuration |
| system-health | SystemHealth | System health dashboard |

## Console & Network Capture

`e2e/support/console-network.js` captures and redacts:
- Console messages (log, warn, error, debug)
- Network requests/responses (URL, status, duration)
- All output is redacted: tokens, API keys, authorization headers, secrets

## Playwright Config

`playwright.config.ts`:
```typescript
use: {
  trace: "retain-on-failure",      // Full trace replay on failure
  video: CI ? "retain-on-failure" : "off",  // Video on failure in CI
  screenshot: "only-on-failure",   // Screenshot on failure
}
```

## Stability Window

| Run | Date | Status | Notes |
|-----|------|--------|-------|
| 1 | — | — | — |
| 2 | — | — | — |
| 3 | — | — | — |
| 4 | — | — | — |
| 5 | — | — | — |

Threshold for promotion to blocking: **5 consecutive green main runs**.

Date: 2026-06-05 | Issue: #170 | Epic: #165
