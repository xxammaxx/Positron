# Layer 4 — Browser Verification

## Overview

This layer captures browser evidence from Playwright so UI validation is inspectable, not just pass/fail. It covers screenshots, failure video, traces, and local debug workflows.

## Setup

Current repo scripts:

- `npm run test:e2e`
- `npm run test:e2e:headed`
- `npm run test:e2e:debug`
- `npm run test:e2e:slow`
- `npm run test:e2e:observe`
- `npm run test:e2e:ui`

Environment flags used for local debug runs:

- `PW_HEADED=1`
- `PWDEBUG=1`
- `PW_SLOWMO=1000`

Target Playwright behavior:

```ts
use: {
  trace: "on",
  video: "retain-on-failure",
  screenshot: "only-on-failure",
}
```

## Usage

- Run `npm run test:e2e` for the standard headless suite.
- Use `npm run test:e2e:headed` when you want a visible browser.
- Use `npm run test:e2e:debug` when you need Playwright Inspector.
- Capture named screenshots for key UI states such as Dashboard, Run detail, Evidence, and Settings.
- Open traces with the Playwright Trace Viewer after a run fails.

## CI Integration

The current `e2e-playwright` job in `.github/workflows/quality-gates.yml` is non-blocking and uploads browser evidence as artifacts.

Current CI behavior:

- `continue-on-error: true`
- headless Chromium only
- safe test env: `VITEST=true`, `POSITRON_DISABLE_QUEUE=true`, fake adapters, and empty `GITHUB_TOKEN`
- artifact upload for `playwright-report/**` and `test-results/**`

If you add extra evidence files, keep them under one of those paths or update the workflow upload list.

## Troubleshooting

- **No screenshots:** confirm the spec actually calls `page.screenshot()` or the Playwright config captures the state you need.
- **No video on failure:** check that the test failed in a way that triggers Playwright recording and that `test-results/**` was uploaded.
- **Trace file missing:** verify `trace: "on"` is set in the Playwright config.
- **Debug scripts don't open:** install Chromium with `npx playwright install chromium`.
- **Port conflicts:** free ports 3000 and 5173 before rerunning E2E.
