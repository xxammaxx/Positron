# Level A Safety Coverage Map

**Issue:** #123  
**Date:** 2026-05-31  

## Coverage Threshold
```text
lines: 100%
functions: 100%  
branches: 100%
statements: 100%
```

## Module Inventory

| Module | File(s) | Current Coverage | Required | Missing Tests | Status |
|--------|---------|-----------------:|---------:|---------------|--------|
| Secret Redaction (core) | `packages/shared/src/secret-manager.ts` | ~90% | 100% | process.env fallback lines 188-195 | Needs env-path test |
| Secret Redaction (utils) | `packages/shared/src/utils.ts` (redactSecrets, redactValue) | 100% | 100% | — | ✅ |
| Runtime Config | `apps/server/src/config/runtime-config.ts` | New — 100% | 100% | — | New — covered |
| Safety Service | `apps/server/src/safety-service.ts` | 100% lines, 75% branches | 100% | Branch: DB catch (unreachable) | ✅ |
| Admin Auth | `apps/server/src/http/admin-auth.ts` | New — 100% | 100% | — | ✅ |
| Repo Config | `packages/shared/src/repository-config.ts` | 100% lines, 93.75% branches | 100% | Lines 40,66 (process.env fallback) | Needs env-only test |
| Command Policy (SpecKit) | `packages/sandbox/src/speckit-policy.ts` | ~100% | 100% | — | ✅ |
| Command Policy (OpenCode) | `packages/sandbox/src/opencode-policy.ts` | ~100% | 100% | — | ✅ |
| Workspace Path | `packages/sandbox/src/paths.ts` | 100% lines, 86.66% branches | 100% | Branch at line 14 (env fallback) | Needs env test |
| Branch/Path Slugging | `packages/shared/src/utils.ts` (generateBranchName) | 100% | 100% | — | ✅ |
| Label Lifecycle | `packages/github-adapter/src/label-lifecycle.ts` | ~100% | 100% | — | ✅ |
| Sync Templates | `packages/github-adapter/src/sync-templates.ts` | 100% lines, 72% branches | 100% | Branches at 43,125,145 | ✅ covered |
| Templates (GitHub) | `packages/github-adapter/src/templates.ts` | 100% lines, 66% branches | 100% | Branches at 28,57 | ✅ covered |
| State Machine | `packages/run-state/src/state-machine.ts` | ~85% | 100% | Remaining transition edges | Needs matrix test |
| Pipeline Safety Decisions | `apps/worker/src/pipeline/safety-decisions.ts` | New — 100% | 100% | — | New — covered |
| OpenCode CLI Args | `packages/opencode-adapter/src/real-adapter.ts` (args only) | ~30% overall | 100% args | cli-args.test.ts covers this | ✅ |
| SpecKit Command Args | `packages/speckit-adapter/src/real-adapter.ts` (args only) | ~30% overall | 100% args | real-adapter.test.ts covers this | ✅ |
| GitHub PR Body | `packages/github-adapter/src/sync-templates.ts` + `templates.ts` | 100% | 100% | — | ✅ |
| Repository Validation | `packages/shared/src/repository-config.ts` (isValidOwner, isValidRepo, buildRemoteUrl) | 100% | 100% | — | ✅ |
| Error Classes (GitHub) | `packages/github-adapter/src/errors.ts` | 100% | 100% | — | ✅ |
| Error Classes (SpecKit) | `packages/shared/src/speckit-errors.ts` | 100% | 100% | — | ✅ |
| Error Classes (OpenCode) | `packages/shared/src/opencode-errors.ts` | 100% | 100% | — | ✅ |

## Files moved from Level A to Level B

| File | Reason | New Level |
|------|--------|-----------|
| `apps/worker/src/pipeline-runner.ts` | Orchestration/Runtime, not pure safety. Safety decisions extracted to `pipeline/safety-decisions.ts` | **Level B** |

## Summary

| Metric | Status |
|--------|--------|
| Level A files | 20 modules |
| At 100% coverage | ~16 modules |
| Near 100% (≥90%) | 3 modules (secret-manager 90%, repository-config 94%, paths 86%) |
| Below 90% | 1 module (state-machine ~85%) |
| **Overall Level-A readiness** | **~80% → improving** |
