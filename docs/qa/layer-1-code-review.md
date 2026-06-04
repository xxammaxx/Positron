# Layer 1 — Code Review (Optional)

## Overview

Layer 1 adds automated PR review on top of GitHub's normal review controls. CodeRabbit is optional: the repo still works if the GitHub App is not installed, but branch protection and the PR template should still be used.

## Setup

1. Install the CodeRabbit GitHub App for `xxammaxx/Positron` if you want automated PR comments.
2. Keep `.coderabbit.yaml` in the repo root.
3. Keep `.github/PULL_REQUEST_TEMPLATE.md` enabled so every PR includes the evidence checklist.
4. Configure branch protection on `main`.

### `.coderabbit.yaml` reference

Current repo config:

| Key | Current value | Notes |
|-----|---------------|------|
| `language` | `en-US` | Review language |
| `early_access` | `false` | Stable defaults |
| `reviews.profile` | `assertive` | Stronger review style |
| `reviews.request_changes_workflow` | `false` | Informational review comments only |
| `reviews.high_level_summary` | `true` | Summary enabled |
| `reviews.review_status` | `true` | Status feedback enabled |
| `reviews.review_details` | `true` | Detailed comments enabled |
| `reviews.path_filters` | excludes `dist/`, `node_modules/`, `coverage/`, `playwright-report/`, `test-results/`, `reports/` | Ignore generated output |
| `reviews.auto_review.enabled` | `true` | Auto-review on PRs |
| `reviews.auto_review.drafts` | `false` | Skip draft PRs |
| `reviews.tools.eslint.enabled` | `true` | Lint-aware review |
| `reviews.tools.semgrep.enabled` | `true` | Uses `.semgrep.yaml` |
| `reviews.tools.actionlint.enabled` | `true` | Workflow linting |
| `reviews.tools.gitleaks.enabled` | `true` | Secret scanning hints |
| `chat.auto_reply` | `true` | Chat replies enabled |

### Branch protection checklist

- Require at least 1 approving review.
- Dismiss stale reviews.
- Require the repo's relevant status checks before merge.
- Keep the PR template evidence checklist mandatory for PR authors.

## Usage

- Open a PR against `main`.
- Fill in the PR template, especially the evidence checklist.
- Review any CodeRabbit comments before asking for human approval.
- Treat CodeRabbit feedback as advisory unless your team decides otherwise.

## CI Integration

There is no CI job for CodeRabbit. It is a GitHub App integration plus repository settings. Branch protection is what enforces the human-review gate.

## Troubleshooting

- **No CodeRabbit comments:** confirm the GitHub App is installed and the PR is not a draft.
- **Wrong files reviewed:** check `.coderabbit.yaml` path filters.
- **Reviews not blocking merge:** confirm branch protection requires at least one approval and stale reviews are dismissed.
- **Template missing:** verify `.github/PULL_REQUEST_TEMPLATE.md` is present in the repo.
