# Layer 2a — Semgrep

## Overview

Semgrep is the repo's OSS static-analysis security layer. It scans TypeScript, React, JavaScript, secrets, SQL-injection, XSS, and SSRF patterns using `.semgrep.yaml`.

## Setup

### Configuration reference

Current `.semgrep.yaml` rules:

- `r/typescript.best-practice`
- `r/typescript.lang.security`
- `r/typescript.react.security`
- `r/javascript.browser.security`
- `r/secrets`
- `r/sql-injection`
- `r/xss`
- `r/supply-chain1`
- `r/ssrf`

Path exclusions:

- `dist/`
- `node_modules/`
- `coverage/`
- `playwright-report/`
- `test-results/`
- `reports/`
- `.stryker-tmp/`
- `*.config.js`
- `*.config.js.map`

### Local install

You can run Semgrep with a local install or a container. The repo does not require an npm dependency for this layer.

## Usage

Run the scan locally:

```bash
semgrep --config .semgrep.yaml
```

Useful variants:

```bash
semgrep --validate --config .semgrep.yaml
semgrep --config .semgrep.yaml --sarif --output semgrep.sarif
```

Interpretation:

- `ERROR` findings are merge-blocking.
- Non-ERROR findings should be triaged, but they do not block this layer by default.

## CI Integration

The workflow is `.github/workflows/semgrep.yml`.

- Triggers: push and pull request to `main`, `master`, and `develop`, plus `workflow_dispatch`.
- Permissions: `contents: read` and `security-events: write`.
- Runner: `ubuntu-latest`.
- Action: `semgrep/semgrep-action@v1` with `config: .semgrep.yaml` and `generateSarif: "1"`.
- SARIF upload: `github/codeql-action/upload-sarif@v3` with `if: always()`.
- Artifact upload: `semgrep.sarif` saved as the `semgrep-sarif` artifact for 7 days.

## Troubleshooting

- **Findings look noisy:** keep suppressions minimal and inline; prefer `# nosemgrep` with a short reason.
- **Need a temporary baseline:** triage the initial results first, then reduce suppressions over time.
- **SARIF not visible in GitHub:** confirm code scanning is enabled and the workflow has `security-events: write`.
- **Workflow fails before upload:** the SARIF upload step still runs `if: always()`, so check the job logs for the original Semgrep error.
