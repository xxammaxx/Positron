# Positron Top Blockers

> Generated: 2026-05-30  
> Based on comprehensive diagnostic

---

## Top-10 Blockers

### 1. FakeGitWorkspaceAdapter blocks REPO_SYNC phase
- **Symptom:** Every run fails at `REPO_SYNC` phase with `Workspace path not configured`
- **Affected file:** `packages/sandbox/src/fake-git-workspace.ts`, `apps/server/src/index.ts` (resolveWorkspaceAdapter)
- **Affected endpoint:** `POST /api/runs`, `POST /api/demo-runs`, `POST /api/repos/:repoId/runs`
- **Reproduction:** Start any run → it transitions through REPO_SYNC → fails
- **Expected:** Workspace is prepared (directory created, branch made)
- **Actual:** `FakeGitWorkspaceAdapter.prepareWorkspace()` throws or returns no-op
- **Severity:** **CRITICAL** — blocks every pipeline execution
- **Recommended fix:** Set `POSITRON_WORKSPACE_ROOT=/tmp/positron-workspaces` in `.env` to enable `RealGitWorkspaceAdapter`, or implement `FakeGitWorkspaceAdapter.prepareWorkspace()` to create a temp directory
- **Fix required before release:** ✅ YES

### 2. POSITRON_ENABLE_REAL_SPECKIT=false forces artifact-only mode
- **Symptom:** Spec Kit / OpenCode run in artifact-only mode, producing minimal output
- **Affected file:** `apps/server/src/index.ts` (lines 473-511, 520-543, 550-574)
- **Affected endpoint:** All run pipeline executions
- **Reproduction:** Run pipeline → SPECIFY/PLAN/TASKS phases enter `!realSpeckit` fallback
- **Expected:** Real `specify` and `opencode` CLIs executed for spec/plan/task generation
- **Actual:** `artifact-only` mode — only summary text is produced, no real artifacts
- **Severity:** **CRITICAL** — no real spec/plan/tasks generated
- **Recommended fix:** Set `POSITRON_ENABLE_REAL_SPECKIT=true` in `.env`
- **Fix required before release:** ✅ YES

### 3. Safety POST endpoint requires admin token that is not configured
- **Symptom:** Users cannot change safety settings from UI (returns 503/401)
- **Affected file:** `apps/server/src/index.ts` (lines 2146-2154)
- **Affected endpoint:** `POST /api/safety`
- **Reproduction:** Navigate to Settings → toggle safety switch → error "Admin API disabled: set POSITRON_ADMIN_TOKEN"
- **Expected:** User can toggle safety settings
- **Actual:** `POST /api/safety` checks for `x-admin-token` header and `ADMIN_TOKEN` env var
- **Severity:** **HIGH** — Settings page is read-only for safety
- **Recommended fix:** Set `POSITRON_ADMIN_TOKEN` in `.env`
- **Fix required before release:** ✅ YES (for operational cockpit)

### 4. Safety flags disable all write operations
- **Symptom:** No push, no merge, no real CI interaction possible
- **Affected file:** `.env`
- **Settings:** `POSITRON_ENABLE_PUSH=false`, `POSITRON_ENABLE_MERGE=false`, `POSITRON_MERGE_KILL_SWITCH=true`
- **Severity:** **HIGH** — Core workflow broken
- **Context:** This is semi-intentional for safety — but prevents any real output
- **Recommended fix:** Set `POSITRON_ENABLE_PUSH=true`, `POSITRON_ENABLE_MERGE=true`, `POSITRON_MERGE_KILL_SWITCH=false` after workspace fix
- **Fix required before release:** ✅ YES (selectively)

### 5. Artifact Panel shows 404 for new runs (expected but user-unfriendly)
- **Symptom:** Opening a new run's detail page shows "Artefakt nicht gefunden" errors in console
- **Affected file:** `apps/web/src/components/ArtifactPanel.tsx`
- **Affected endpoint:** `GET /api/runs/:id/artifacts/spec`
- **Severity:** **MEDIUM** — Expected behavior but console errors confuse users
- **Recommended fix:** Handle 404 gracefully in ArtifactPanel — show "awaiting artifacts" state instead of error
- **Fix required before release:** ❌ NO (cosmetic)

### 6. No error displayed when demo run fails silently
- **Symptom:** User clicks "Start Demo Run" → navigates to run detail → sees failed run with no explanation
- **Affected file:** `apps/web/src/components/dashboard/BlueprintPanel.tsx`
- **Reproduction:** Start demo run → pipeline fails at REPO_SYNC → user sees "FAILED_TRANSIENT"
- **Expected:** User feedback about failure reason
- **Actual:** Run appears failed, but the failure reason is not displayed prominently
- **Severity:** **MEDIUM** — User experience issue
- **Recommended fix:** Show lastError from run state in run detail or redirect back with error
- **Fix required before release:** ❌ NO (but recommended)

### 7. GitHub issue listing may be slow or fail
- **Symptom:** Repositories page may hang when loading issues
- **Affected endpoint:** `GET /api/repos/:id/issues`
- **Severity:** **MEDIUM** — Degraded user experience
- **Note:** Depends on GitHub API rate limits and token validity
- **Recommended fix:** Add loading states, caching, and rate limit display
- **Fix required before release:** ❌ NO (enhancement)

### 8. SSE streams are not cleaned up on run completion
- **Symptom:** SSE connections persist after run completes
- **Affected file:** `apps/server/src/index.ts`
- **Severity:** **LOW** — Resource leak
- **Recommended fix:** Add cleanup when run reaches terminal state
- **Fix required before release:** ❌ NO

### 9. No CI/CD integration configured
- **Symptom:** No automated testing in CI, no deployment pipeline
- **Affected files:** `.github/` (minimal config)
- **Severity:** **LOW** — No production readiness
- **Recommended fix:** Set up GitHub Actions for test/build/deploy
- **Fix required before release:** ❌ NO (nice-to-have)

### 10. No user authentication/authorization
- **Symptom:** Any user can access all functionality
- **Affected files:** Entire app
- **Severity:** **LOW** — Not required for MVP/dev
- **Recommended fix:** Add auth layer (e.g., GitHub OAuth)
- **Fix required before release:** ❌ NO (out of scope)

---

## Blocker Summary by Severity

| Severity | Count | Must fix before release |
|----------|-------|------------------------|
| CRITICAL | 2 | ✅ Yes — blocks all pipeline execution |
| HIGH | 2 | ✅ Yes — core workflow broken |
| MEDIUM | 2 | ❌ No — but recommended |
| LOW | 4 | ❌ No — nice-to-have |
