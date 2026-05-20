# Issue #10 Initial Assessment

**Datum:** 2026-05-20
**Branch:** `positron/issue-8-server-core`

## Existing relevant modules

| Modul | Pfad | Relevanz |
|-------|------|---------|
| generateBranchName() | `packages/shared/src/utils.ts` | ✅ Bereits implementiert (Umlaute, Slug) |
| redactSecrets/redactValue | `packages/shared/src/utils.ts` | ✅ Secret-Redaction für Logs |
| Sandbox (Stub) | `packages/sandbox/src/index.ts` | ❌ Nur `createWorktree()` Stub |
| Server Orchestrator | `apps/server/src/index.ts` | ✅ Phasen, Run-Erzeugung |
| @positron/shared | `packages/shared/` | ✅ RUN_STATE_VERSION, Typen |

## Current run lifecycle integration points

Server `executePhase()` nutzt `REPO_SYNC` Phase — hier muss GitWorkspaceAdapter.prepareWorkspace() eingehängt werden.

## Existing security utilities

- `redactSecrets()`: 7 Pattern (ghp_, github_pat_, Bearer, sk-, anthropic_, gemini_, api_key=)
- `redactValue()`: Total (undefined, null, symbol, Error, zirkulär)
- `generateBranchName()`: Normalisierung + Slug

## Missing pieces

| Anforderung | Status |
|-------------|--------|
| GitWorkspaceAdapter Interface | ❌ |
| Real implementation (clone/fetch/branch) | ❌ |
| Fake/test implementation | ❌ |
| CommandRunner (spawn-based) | ❌ |
| CommandPolicy | ❌ |
| Remote URL validation | ❌ |
| Workspace path safety | ❌ |
| Git status/diff parsing | ❌ |
| Fehlerklassen | ❌ |
| Branch-Name path-traversal Schutz | ⚠️ generateBranchName existiert, braucht Härtung |

## Proposed implementation plan

1. CommandRunner: `node:child_process` spawn-based, kein `shell: true`
2. CommandPolicy: Erlaubt clone/fetch/branch/status/diff; verbietet push/commit/rm/sudo
3. GitWorkspaceAdapter Interface + Real-Implementierung
4. Fake-Implementierung für Tests
5. Integration mit Server (REPO_SYNC Phase)
6. Decision: **clone-per-run** (einfacher, testbarer)

## Test-first plan

1. Branch-Naming (inkl. path-traversal, shell injection)
2. Workspace-Pfad-Sicherheit
3. Remote-URL-Validierung
4. CommandPolicy (erlaubt/verboten)
5. Integrationstest mit lokalem Git-Remote
