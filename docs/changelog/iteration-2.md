---
title: Phase 1-3: Vollständige Quellcode-Rekonstruktion
date: 2026-05-24
author: Positron Team
---

# Phase 1-3: Vollständige Quellcode-Rekonstruktion

## Summary

The Positron v3.0 repository was reconstructed from scratch into a working multi-package TypeScript monorepo. The rebuild restored the orchestration server, the run-state machine, all adapter packages, the sandbox layer, shared types/utilities, and the React web application.

## Delivered

- All 7 workspace packages rebuilt.
- Root build infrastructure restored (`package.json`, `tsconfig.json`, Vitest config, workspace wiring).
- Complete React/TypeScript web application restored.
- Server build succeeds with zero TypeScript errors.
- Test suite passes: **53/53**.
- Vite production build succeeds.

## Package inventory

Counts below reflect the current verified source tree, including smoke tests.

### `packages/shared/src/` — 12 files

- `index.ts`
- `types.ts`
- `constants.ts`
- `utils.ts`
- `repository-config.ts`
- `interfaces.ts`
- `speckit-types.ts`
- `speckit-errors.ts`
- `opencode-types.ts`
- `opencode-errors.ts`
- `live-e2e.ts`
- `__tests__/smoke.test.ts`

### `packages/run-state/src/` — 6 files

- `index.ts`
- `state-machine.ts`
- `db/connection.ts`
- `db/constants.ts`
- `db/schema.ts`
- `__tests__/smoke.test.ts`

### `packages/sandbox/src/` — 14 files

- `index.ts`
- `adapter.ts`
- `command-runner.ts`
- `commit-policy.ts`
- `detector.ts`
- `dogfood-fixture.ts`
- `fake-adapter.ts`
- `paths.ts`
- `opencode-policy.ts`
- `real-adapter.ts`
- `speckit-policy.ts`
- `test-runner.ts`
- `test-templates.ts`
- `__tests__/smoke.test.ts`

### `packages/speckit-adapter/src/` — 5 files

- `index.ts`
- `real-adapter.ts`
- `fake-adapter.ts`
- `artifact-scanner.ts`
- `__tests__/smoke.test.ts`

### `packages/opencode-adapter/src/` — 6 files

- `index.ts`
- `real-adapter.ts`
- `fake-adapter.ts`
- `sqlite-mcp.ts`
- `sqlite-mcp-proxy.ts`
- `__tests__/smoke.test.ts`

### `packages/github-adapter/src/` — 15 files

- `index.ts`
- `adapter.ts`
- `client.ts`
- `comments.ts`
- `errors.ts`
- `fake-adapter.ts`
- `issues.ts`
- `label-lifecycle.ts`
- `labels.ts`
- `real-adapter.ts`
- `sync-service.ts`
- `sync-templates.ts`
- `sync-types.ts`
- `templates.ts`
- `types.ts`

### `apps/web/src/` — 18 files

- `App.tsx`
- `api.ts`
- `main.tsx`
- `types.ts`
- `components/ArtifactPanel.tsx`
- `components/Dashboard.tsx`
- `components/GateControls.tsx`
- `components/HealthIndicator.tsx`
- `components/LogViewer.tsx`
- `components/NotFound.tsx`
- `components/PhaseBadge.tsx`
- `components/PhaseTimeline.tsx`
- `components/Repositories.tsx`
- `components/RunDetail.tsx`
- `hooks/useMetrics.ts`
- `hooks/useRun.ts`
- `hooks/useSSE.ts`
- `__tests__/smoke.test.tsx`

## Build configuration restored

Verified configuration files include:

- Root: `package.json`, `tsconfig.json`, `vitest.config.ts`
- Apps: `apps/server/package.json`, `apps/server/tsconfig.json`, `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`
- Packages: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/run-state/package.json`, `packages/run-state/tsconfig.json`, `packages/sandbox/package.json`, `packages/sandbox/tsconfig.json`, `packages/speckit-adapter/package.json`, `packages/speckit-adapter/tsconfig.json`, `packages/opencode-adapter/package.json`, `packages/opencode-adapter/tsconfig.json`, `packages/github-adapter/package.json`, `packages/github-adapter/tsconfig.json`
- Tooling: `.opencode/package.json`

## Verification

- `tsc --build` — 0 errors
- Tests — 53/53 passing
- Vite frontend build — successful
