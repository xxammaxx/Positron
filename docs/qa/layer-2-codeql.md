# Layer 2b — CodeQL

## Overview

CodeQL is the repo's GitHub-native code scanning layer for JavaScript/TypeScript. It publishes alerts into the Security tab and is treated as a merge gate once severity reaches `high` or above.

## Setup

### Workflow reference

Current workflow: `.github/workflows/codeql.yml`

### Required GitHub settings

- Enable code scanning for the repository.
- Make sure the workflow can write SARIF results to GitHub Security.
- Add the CodeQL status check to branch protection once the workflow is stable.

## Usage

Open **Security → Code scanning alerts** in GitHub to review findings.

What to inspect:

- alert severity
- file and line location
- query name/category
- path/flow context shown in the alert

Severity policy:

- `high` and `critical` alerts are merge-blocking.
- lower severities are informational until triaged.

## CI Integration

The current workflow:

- triggers on push and pull request to `main`, `master`, and `develop`
- runs weekly on Monday at 09:00 UTC
- supports `workflow_dispatch`
- uses `github/codeql-action/init@v3` with `languages: javascript-typescript`
- runs `github/codeql-action/autobuild@v3`
- runs `github/codeql-action/analyze@v3`
- uploads the SARIF file as the `codeql-sarif` artifact

Workflow permissions are `security-events: write`, `contents: read`, and `actions: read`.

## Troubleshooting

- **No alerts appear:** confirm code scanning is enabled and the workflow completed successfully.
- **Security tab is empty:** check repository permissions/visibility and whether SARIF upload completed.
- **Alerts are not blocking merges:** verify branch protection requires the CodeQL status check.
- **False positives:** dismiss them in the Security tab with a reason; keep the triage in the issue or PR evidence trail.
