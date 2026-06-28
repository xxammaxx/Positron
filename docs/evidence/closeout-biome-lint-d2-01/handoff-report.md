# Closeout Batch D2 — Biome Lint Mechanical Fixes Handoff

## Summary

Applies the second safe Biome lint batch after D1 (which removed `organizeImports` and `useNodejsImportProtocol`).
D2 targets: `noUnusedTemplateLiteral` (all instances) and `useConst` (safe mechanical subset).

## Baseline

| Metric | Before D2 | After D2 | Delta |
|---|---|---|---|
| Total errors | 498 | 478 | -20 |
| Total warnings | 489 | 696 (*) | — |
| `noUnusedTemplateLiteral` | 115 | **0** | -115 |
| `useConst` (safe) | 3 | **0** | -3 |
| `useConst` (restructuring) | 3 | 3 | deferred |

(*) Warning count increase attributed to `--max-diagnostics=none` revealing previously hidden diagnostics.

## D2 Selected Rules

### noUnusedTemplateLiteral (115 instances)
- All safe mechanical: template literals without interpolation → string literals
- Applied via `biome lint --only=style/noUnusedTemplateLiteral --write --unsafe`
- 13 source files changed

### useConst — safe subset (3 instances)
- `scripts/record-demo.mjs` — `let exitCode = 0` → `const exitCode = 0`
- `apps/server/src/index.ts` — `let current = run` → `const current = run`
- `apps/worker/src/pipeline-runner.ts` — `let current = run` → `const current = run`
- All never reassigned, FIXABLE

## Scope

### Changed (16 files)

```
apps/server/src/cli.ts
apps/server/src/index.ts
apps/web/src/components/RunDetail.tsx
apps/worker/src/pipeline-runner.ts
e2e/diagnostic-reality-check.spec.ts
packages/github-adapter/src/sync-templates.ts
packages/github-adapter/src/templates.ts
packages/sandbox/src/dogfood-fixture.ts
packages/sandbox/src/test-templates.ts
packages/speckit-adapter/src/index.ts
packages/speckit-adapter/src/real-adapter.ts
scripts/capture-screenshots.mjs
scripts/chaos-drill.mjs
scripts/queue-backlog-drill.mjs
scripts/record-demo.mjs
scripts/verify-issues.mjs
```

116 insertions, 116 deletions (symmetric — pure string literal conversion)

### Not Changed

- Workflows (`.github/workflows/*`)
- Dependencies / lockfiles
- Stashes
- GitHub-CI configuration
- `.opencode/*`
- `noExplicitAny` (77 instances remain)
- `noDelete` (20 instances remain)
- `useLiteralKeys` (114 instances remain)
- `noConsoleLog` (320 warnings remain)
- Issue #279 (architecture replacement)
- #229 PR chain
- PR #218, PR #228

## Verification

| Gate | Command | Result |
|---|---|---|
| Whitespace | `git diff --check` | Clean |
| Format | `npx biome format .` | 370 checked, no fixes |
| Build | `npm run build` | Success |
| Typecheck | `npm run typecheck` | Success |
| Unit/Integration | `npm test` | **917/917** passed |
| Frontend | `npm test --workspace apps/web` | **196/196** passed |
| Biome D2 rules | `npx biome lint --only=style/noUnusedTemplateLiteral .` | 0 remaining |
| Biome useConst safe | `npx biome lint --only=style/useConst .` | 3 remaining (all restructuring cases) |

## Known Remaining Limitations

- Remaining Biome lint backlog: 478 errors, ~696 warnings
- `noExplicitAny` (77), `noDelete` (20), `useLiteralKeys` (114), `noConsoleLog` (320) remain deferred
- 3 `useConst` restructuring cases deferred (HealthIndicator.js, HealthIndicator.tsx, real-adapter.ts)
- `noCommaOperator` (104) is the next lowest-risk mechanical rule
- Issue #268 remains OPEN — GitHub-CI advisory-only
- Issue #279 remains OPEN — architecture replacement
- #229 PR chain remains untouched
- PR #218/#228 remain untouched

## Was kann die Software jetzt im Vergleich zum vorherigen Lauf?

### Neue Fähigkeiten
- Second safe lint batch is fixed
- D2 lint categories reduced: `noUnusedTemplateLiteral` fully eliminated

### Entfernte Blocker
- `noUnusedTemplateLiteral` (115 instances) reduced to 0
- 3 safe `useConst` instances fixed

### Unveränderte Einschränkungen
- No remote CI
- No stash operations
- No dependency changes
- No `noExplicitAny`/`noDelete`/`useLiteralKeys`/`noConsoleLog` changes
- No #229/#279 changes

### Verbleibende Risiken
- Remaining lint categories (478 errors)
- Issue #279 Phase 0
- Old PR chain disposition

### Nächster sinnvoller Schritt
Review and merge this PR after human approval, then continue with Biome lint Batch D3 (potentially `noCommaOperator` as next safe mechanical rule).
