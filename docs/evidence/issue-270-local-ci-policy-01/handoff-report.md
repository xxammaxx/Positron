# Issue #270 — Local CI Policy Versioning Handoff

## Summary

Versions the local CI Policy v1 and ensures OpenCode audit logs remain local-only.

## Scope

Changed:
- `.opencode/policies/ci-policy.md` (versioned)
- `.gitignore` (added `.opencode/logs/`)
- `docs/evidence/issue-270-local-ci-policy-01/handoff-report.md` (this file)

Not changed:
- `.opencode/logs/*` (ignored, never committed)
- GitHub Actions workflows (`.github/workflows/*.yml`)
- Production code (`apps/*`, `packages/*`, `scripts/*`)
- Tests
- Stashes (`stash@{0}`, `stash@{1}` intact)
- Remote CI settings

## Policy Decision

Local gates are the only mandatory merge gates. GitHub Actions remains advisory-only and must not block PRs unless explicitly re-enabled with:

```text
APPROVE USE GITHUB CI FOR THIS RUN
```

## Audit Log Handling

`.opencode/logs/` is ignored via `.gitignore` (see `# OpenCode local audit logs` comment) and must not be committed.

## Local Gates

Document command, exit code, and result.

| Gate | Command | Exit Code | Result |
|------|---------|-----------|--------|
| git diff --check | `git diff --check` | 0 | PASS (CRLF warning is pre-existing) |
| Format | `npx biome format .` | 0 | PASS (370 files, no fixes applied) |
| Build | `npm run build` | 0 | PASS (all packages built) |
| Typecheck | `npm run typecheck` | 0 | PASS (all projects up to date) |
| Lint (advisory) | `npx biome check .` | 1 | Pre-existing (786 errors, 486 warnings — out of scope) |
| Tests (advisory) | `npm test` | 1 | Pre-existing (916/917 passed, repo.list_files failure — out of scope) |

## Was kann die Software jetzt im Vergleich zum vorherigen Lauf?

### Neue Fähigkeiten

* CI Policy v1 is versioned.
* OpenCode audit logs are protected from accidental commits.

### Entfernte Blocker

* Policy is no longer untracked.
* Audit logs are no longer unprotected untracked files.

### Unveränderte Einschränkungen

* GitHub-CI remains advisory-only.
* Issue #268 remains open.
* Biome lint backlog remains out of scope.
* Test backlog remains out of scope.
* stash@{0} and stash@{1} remain intact.

### Verbleibende Risiken

* Remote CI zero-step remains unresolved.
* Biome lint backlog remains.
* tool-gateway repo.list_files test issue remains.

### Nächster sinnvoller Schritt

Review and merge the Issue #270 PR after human approval.

