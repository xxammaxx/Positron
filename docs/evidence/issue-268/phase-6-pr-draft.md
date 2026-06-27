# Pull Request Draft — Issue #268 CI Recovery

## Title

```
fix(issue-268): repair CI workflow configuration and formatting gates
```

## Body

```markdown
## Summary

This PR implements the 5-step CI Recovery Repair Plan for Issue #268. It repairs
GitHub Actions workflow configuration, normalizes Biome formatting, and documents
local gate verification.

## Scope

**ONLY** workflow YAML changes + Biome formatting + evidence.

- No logic changes
- No feature work
- No dependency changes
- No remote CI triggers
- No stash operations

## Fix A ✅ LF Normalization / Biome Format

- `.gitattributes` already existed (PR #269) — LF enforcement in place
- `npx biome format --write .` executed — 50 files formatted
- `npx biome format .` → **EXIT 0** (447 files checked, No fixes applied)
- Pre-existing `evidence/github-issue-cleanup/issues-all.json` (1.2 MiB) exceeds
  Biome max file size (1.0 MiB) — not a formatting error, documented in config

## Fix B ✅ Permissions in quality-gates.yml

```yaml
permissions:
  contents: read
  actions: write
```

Previously: no `permissions:` block (inherited default repo settings).

## Fix C ✅ Issue Verification Workflow Repair

- Node version: `20` → `22` (parity with quality-gates workflow)
- Removed unnecessary `gh auth login --with-token` step (GITHUB_TOKEN is automatic)
- Added `actions: write` to job-level permissions

## Fix D ✅ Build Before Stryker

- `mutation-fast` job: Added `npm run build` step before `test:mutation:fast`
- `mutation-safety` job: Added `npm run build` step before `test:mutation:safety`

Previously, Stryker mutation tests ran without TypeScript compilation, which
would fail on non-compiled TypeScript in CI.

## Fix E ✅ Redis Service for E2E

Added Redis 7 Alpine service container to `e2e-playwright` job:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - 6379:6379
    options: >-
      --health-cmd "redis-cli ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

## Files Changed

**Workflow fixes (2 files, intentional):**
- `.github/workflows/quality-gates.yml` (+20 lines) — Fixes B, D, E
- `.github/workflows/verify-issues.yml` (+3/-3 lines) — Fix C

**Evidence (1 file, new):**
- `docs/evidence/issue-268/phase-5step-repair-summary.json` — gate results

**Biome formatting (50 files):**
- `packages/benchmark-rudolph/` — source + tests + evidence JSON
- `packages/shared/` — source + tests
- `scripts/` — `.mjs` scripts

## Local Gates (authoritative per CI Policy v1)

| Gate | Result |
|------|--------|
| `git diff --check` | ✅ PASS |
| `npx biome format .` | ✅ PASS (447 files, 0 fixes) |
| `npm run build` | ✅ PASS (10 projects) |
| `npm run typecheck` | ✅ PASS (10 projects) |
| `npx vitest run` | ✅ **1375/1375 PASS** (64 files) |
| `npm test --workspace apps/web` | ✅ **196/196 PASS** (8 files) |
| **Total** | **✅ 1571/1571 PASS (72 test files)** |

## CI Status (Advisory-Only per CI Policy v1)

**GitHub Actions are advisory-only for this repository at the moment.
This PR does not request manual CI execution. The zero-step/runner failure
remains tracked by Issue #268 and cannot be fully validated remotely until
the platform/quota problem is resolved.**

### Known Limitations

- Zero-step runner failures are a **GitHub platform issue** (runner quota/billing
  on private repos) — NOT fixed by workflow config changes
- GitHub-CI remains **advisory-only** per CI Policy v1 (bound architecture
  decision from 2026-06-21)
- **No remote CI was triggered** — all verification is local-only
- The workflow changes (Redis service, permissions, build steps) cannot be
  validated against actual GitHub Actions until the platform issue is resolved
- `evidence/github-issue-cleanup/issues-all.json` (1.2 MiB) exceeds Biome
  max file size config — pre-existing, not blocking

### Risks

- Workflow changes SHOULD work correctly but CANNOT be validated against
  live GitHub Actions until the runner/quota issue is resolved
- `actions: write` permission in both workflows is the minimum required for
  `upload-artifact` — no over-permissioning
- No remote CI was triggered — zero risk of billing consumption from this PR

### Non-Goals

- Does NOT fix the GitHub Actions runner quota/billing issue
- Does NOT add self-hosted runners
- Does NOT modify CodeRabbit configuration
- Does NOT touch PRs #218, #228, #229, or #230-#242
- Does NOT modify `.env`, secrets, or MCP configuration
- Does NOT enable auto-merge or CI re-runs

### Reviewer Notes

1. The 50 formatting-only files are mechanical — review the 2 workflow YAML files
2. All formatting changes are verified as `FORMAT_ONLY` (no semantic changes)
3. The Phase 5 evidence file formatting was fixed in Phase 6
4. This PR was prepared without remote CI — local gates are authoritative

### Owner Request

- **Please review the 2 workflow files** for correctness
- **Approve or request changes**
- **Do NOT trigger CI manually** — CI remains advisory-only
- **Do NOT auto-merge** — requires explicit `APPROVE MERGE`
- **If acceptable**: run `APPROVE MERGE ISSUE 268 CI RECOVERY PR` to permit merge
```

## PR Metadata

| Property | Value |
|----------|-------|
| **Base** | `main` |
| **Head** | `positron/issue-268-ci-recovery-5step` |
| **Type** | Draft (not ready for merge review) |
| **Labels** | None |
| **Reviewers** | None (Owner review only) |
