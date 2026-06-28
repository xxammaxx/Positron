# Closeout Batch B — apps/web JSX/TSX Test Config Fix Handoff

## Summary

Fixes the apps/web Vitest JSX/TSX test backlog by correcting import resolution so Vite resolves to `.tsx` source files instead of stale compiled `.js` artifacts that contain raw JSX.

## Root Cause

Verified root cause: The `apps/web/src/` directory contains compiled `.js` files (from tsc with `"jsx": "react-jsx"`) that preserve JSX syntax. When vitest's esbuild-based import analysis encounters these `.js` files (imported from test files with explicit `.js` extensions), it fails because esbuild does not expect JSX in `.js` files.

**Error:** `Failed to parse source for import analysis because the content contains invalid JS syntax. If you are using JSX, make sure to name the file with the .jsx or .tsx extension.`

**5 failing test files (0 tests each):**
- `src/__tests__/BlueprintPanel.test.tsx`
- `src/__tests__/PhasePipeline.test.tsx`
- `src/__tests__/smoke.test.tsx`
- `src/__tests__/voice-smoke.test.tsx`
- `src/__tests__/VoiceControls.test.tsx`

## Fix Applied

### 1. Config: `apps/web/vite.config.ts`
Added `resolve.extensions` prioritizing `.tsx` over `.js`:
```typescript
resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
},
```

### 2. Test files (5 files)
Removed `.js` extensions from local source imports, allowing Vite to resolve to `.tsx` source files:
- `BlueprintPanel.test.tsx` — 2 imports changed
- `PhasePipeline.test.tsx` — 1 import changed
- `VoiceControls.test.tsx` — 2 imports changed
- `smoke.test.tsx` — 9 imports changed
- `voice-smoke.test.tsx` — 5 imports changed

## Scope

Changed:
- `apps/web/vite.config.ts` — added `resolve.extensions`
- `apps/web/src/__tests__/BlueprintPanel.test.tsx` — import paths
- `apps/web/src/__tests__/PhasePipeline.test.tsx` — import paths
- `apps/web/src/__tests__/VoiceControls.test.tsx` — import paths
- `apps/web/src/__tests__/smoke.test.tsx` — import paths
- `apps/web/src/__tests__/voice-smoke.test.tsx` — import paths
- `docs/evidence/closeout-apps-web-tests-01/handoff-report.md` — this file

Not changed:
- Production code — unchanged
- Workflows — unchanged
- Dependencies — unchanged
- Lockfiles — unchanged
- Stashes — untouched
- GitHub-CI — unchanged
- Root workspace config — unchanged

## Verification

| Gate | Command | Result |
|---|---|---|
| git diff --check | `git diff --check` | PASS |
| biome format | `npx biome format .` | PASS (370 files, no fixes) |
| apps/web test | `npm test --workspace apps/web` | **8/8 passed, 196/196 tests** |
| build | `npm run build` | PASS |
| typecheck | `npm run typecheck` | PASS (all projects up to date) |
| full test suite | `npm test` | **50/50 passed, 917/917 tests** |
| biome check (advisory) | `npx biome check .` | 786 errors (pre-existing lint backlog, unchanged) |

### apps/web test detailed results (post-fix)

```
 Test Files  8 passed (8)
      Tests  196 passed (196)
```

Breakdown:
- `src/voice/__tests__/redact-for-speech.test.ts` — 29 tests PASS
- `src/voice/__tests__/voice-output.test.ts` — 46 tests PASS
- `src/__tests__/voice-smoke.test.tsx` — 34 tests PASS (was FAIL)
- `src/voice/__tests__/voice-settings.test.ts` — 12 tests PASS
- `src/__tests__/VoiceControls.test.tsx` — 15 tests PASS (was FAIL)
- `src/__tests__/smoke.test.tsx` — 40 tests PASS (was FAIL)
- `src/__tests__/PhasePipeline.test.tsx` — 11 tests PASS (was FAIL)
- `src/__tests__/BlueprintPanel.test.tsx` — 9 tests PASS (was FAIL)

Note: Dashboard tests show `act()` warnings (pre-existing, not addressed here).

## Known Remaining Limitations

- Issue #268 remains open (GitHub-CI advisory-only)
- GitHub-CI remains advisory-only
- Biome lint backlog remains (786 errors, unchanged)
- Issue #279 remains architecture continuation
- #229 PR chain remains untouched
- React `act()` warnings in Dashboard smoke tests (pre-existing)
- No stash operations performed
- No remote CI executed

## Was kann die Software jetzt im Vergleich zum vorherigen Lauf?

### Neue Fähigkeiten
- apps/web tests are now fully runnable: **196 tests across 8 files, all green**
- 5 previously dead TSX test files now execute and pass (was 0 tests each)
- JSX/TSX Vitest transform config is repaired

### Entfernte Blocker
- JSX/TSX Vitest transform blocker removed via extension-less import resolution
- apps/web test backlog reduced from 5 failing files to 0

### Unveränderte Einschränkungen
- No remote CI participation
- No stash operations (stash@{0} and stash@{1} remain untouched)
- No #229/#279 changes
- Biome lint backlog remains out of scope
- No production code changes

### Verbleibende Risiken
- React `act()` warnings in Dashboard smoke tests (cosmetic, pre-existing)
- Biome lint backlog (pre-existing, not in scope)
- flaky timing test may occasionally fail (pre-existing, not addressed here)

### Nächster sinnvoller Schritt
Review and merge this PR after human approval (`APPROVE MERGE CLOSEOUT APPS WEB TESTS PR <PR_NUMMER>`).
