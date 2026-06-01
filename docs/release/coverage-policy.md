# Positron Coverage Policy — Final

**Version:** 1.0  
**Status:** Final (Issue #122)  
**Applies to:** v0.3.0 release candidates  

---

## Overview

This policy replaces the previous monolithic "100% everywhere" threshold with a tiered approach. Each tier has appropriate coverage requirements based on the risk profile of the code.

---

## Level A — Critical Safety Modules

**Threshold:** 100% lines, functions, branches, statements

### Included Files

| Module | Files | Rationale |
|--------|-------|-----------|
| Secret Redaction | `packages/shared/src/secret-manager.ts`, `packages/shared/src/utils.ts` (redactSecrets) | Token leak prevention |
| Runtime Config | `apps/server/src/config/runtime-config.ts` | Env-based adapter resolution |
| Safety Service | `apps/server/src/safety-service.ts` | Safety flag state management |
| Admin Auth | `apps/server/src/http/admin-auth.ts` | Admin endpoint protection |
| Repository Config | `packages/shared/src/repository-config.ts` | Owner/repo validation, remote URL building |
| Command Policies | `packages/sandbox/src/speckit-policy.ts`, `opencode-policy.ts`, `commit-policy.ts` | Allowed/blocked command enforcement |
| Workspace Paths | `packages/sandbox/src/paths.ts` | Path traversal prevention |
| Branch Names | `packages/shared/src/utils.ts` (generateBranchName) | Branch naming with injection guards |
| Label Lifecycle | `packages/github-adapter/src/label-lifecycle.ts` | Phase-to-label mapping |
| Sync Templates | `packages/github-adapter/src/sync-templates.ts` | GitHub comment generation (no leak) |
| GitHub Templates | `packages/github-adapter/src/templates.ts` | Comment templates |
| State Machine | `packages/run-state/src/state-machine.ts` | Core pipeline transition validation |
| Adapter Args | `packages/opencode-adapter/src/real-adapter.ts`, `packages/speckit-adapter/src/real-adapter.ts` | CLI command construction (no injection) |
| GitHub PR Body | `packages/github-adapter/src/sync-templates.ts`, `templates.ts` | PR body generation |
| Error Classes | `packages/*/src/*-errors.ts` | Structured error types |
| Pipeline Phase Results | `apps/worker/src/pipeline-runner.ts` (transition helpers) | Phase transition validation |

### Rule
No release candidate may ship if any Level A file has coverage below 100% in any category, UNLESS the uncovered lines are explicitly documented catch-all branches (e.g., `catch {}` that are unreachable in production but required by the type system).

---

## Level B — Runtime Application Modules

**Threshold for rc.1:** 70% lines, 70% functions, 60% branches, 70% statements

### Included Files

All files in `apps/server/src/`, `apps/worker/src/`, `packages/github-adapter/src/`, `packages/opencode-adapter/src/`, `packages/speckit-adapter/src/`, `packages/sandbox/src/`, `packages/run-state/src/` that are NOT in Level A.

### Rule
Level B coverage is measured per-file. Any file below threshold must be documented in the coverage gap report with an explanation and plan. Files with 0% coverage are not acceptable for rc.1.

---

## Level C — UI Components

**Threshold for rc.1:** E2E workflow pass + unit tests for key components

### Key Components

- Dashboard (SSE, state display)
- Run Detail (events, evidence, artifacts)
- Safety Controls (flag management)
- Merge Gates (gate display)
- Event Log (phase timeline)
- Test Report (result display)
- Evidence List (evidence items)
- Blueprint Panel (demo blueprint)

### Rule
Numeric UI coverage is tracked separately. E2E workflow must pass for release. Additional component tests are required for each component listed above.

---

## Level D — Entry Points / Composition

**Threshold:** No numeric threshold. Files must contain ONLY composition/wiring code. No business or safety logic.

### Included Files

- `apps/server/src/index.ts` (the `isDirectRun` auto-start block and `createServer()` wrapper)
- `apps/worker/src/index.ts` (BullMQ worker wiring)
- `apps/web/src/main.tsx` (React root mount)
- Pure barrel `index.ts` files

### Rule
If any Level D file is found to contain business logic or safety decisions, that logic MUST be extracted to a Level A or Level B module. Violations block release.

---

## Release Gates for v0.3.0-rc.1

| Gate | Requirement |
|------|-------------|
| Secret scan | No real tokens in codebase |
| `npm test` | All tests passing (595+ tests) |
| `npm run build` | Clean TypeScript compilation |
| `npm run coverage:safety` | Level A at 100% all categories |
| npm run coverage | Global coverage documented; Level A at 100% |
| Level B per-file | No file below threshold without documented exception |
| UI E2E | Workflow acceptance pass |
| Level D review | No business logic in entry files |

## Command Reference

```bash
npm test                  # All unit tests
npm run build             # TypeScript compilation
npm run coverage          # Full coverage report (all files)
npm run coverage:safety   # Level A safety modules only (100% threshold)
```

## Escalation

If a Level A module cannot reach 100% coverage for legitimate architectural reasons:
1. Document the exact uncovered lines
2. Explain why they cannot be covered
3. Submit as PR comment on the release PR
4. Requires explicit approval from project lead

This policy is effective immediately upon merging to positron/issue-122.
