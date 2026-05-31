# Positron Demo vs Real Mode Matrix

> Generated: 2026-05-30  
> Source: apps/server/src/index.ts, .env configuration

## Current Mode Configuration

| Adapter | Mode | Value |
|---------|------|-------|
| GitHub | **REAL** | `POSITRON_GITHUB_MODE=real` |
| SpecKit | **REAL** | `POSITRON_SPECKIT_MODE=real` |
| OpenCode | **REAL** | `POSITRON_OPENCODE_MODE=real` |
| Git Workspace | FAKE | `POSITRON_WORKSPACE_ROOT` not set |

## Safety Feature Flags

| Flag | Status |
|------|--------|
| `POSITRON_ENABLE_REAL_SPECKIT` | `false` |
| `POSITRON_ENABLE_PUSH` | `false` |
| `POSITRON_ENABLE_MERGE` | `false` |
| `POSITRON_MERGE_DRY_RUN` | `true` |
| `POSITRON_MERGE_KILL_SWITCH` | `true` |
| `POSITRON_ENABLE_FIX_LOOP` | `false` |

## Matrix

| Funktion | Demo Mode | Real Mode | Actual Current Status |
|----------|-----------|-----------|-----------------------|
| **Issues laden** | FakeGitHubAdapter (Zufallsdaten) | GitHub API (echte Issues) | ✅ REAL — GitHub API live |
| **Run starten** | Inline + Fake Adapter | Inline or BullMQ | ✅ REAL — Inline (no Redis, falls back) |
| **Blueprint eingeben** | Statischer Text | GitHub Issue Fetch | ✅ REAL — fetches real GitHub issue body |
| **Demo Run starten** | Fake pipeline | Real pipeline | ⚠️ HYBRID — Adapters real, but git workspace = FAKE |
| **GitHub Issue claimen** | Fake (console.log) | Real GitHub comment | ✅ REAL — GitHubStatusSyncService aktiv |
| **Workspace vorbereiten** | FakeGitWorkspaceAdapter | RealGitWorkspaceAdapter | ❌ FAKE — POSITRON_WORKSPACE_ROOT not set |
| **SpecKit ausführen** | FakeSpecKitAdapter | RealSpecKitAdapter | ⚠️ HYBRID — Adapter REAL, but `POSITRON_ENABLE_REAL_SPECKIT=false` forces artifact-only mode |
| **OpenCode ausführen** | FakeOpenCodeAdapter | RealOpenCodeAdapter | ⚠️ HYBRID — Adapter REAL, but OpenCode CLI only used if `realSpeckit` enabled |
| **TestRunner** | — | Real TestCommandDetector | ⚠️ PARTIAL — Runner exists, but workspace paths are fake |
| **Commit** | Fake commit | Real git commit | ❌ FAKE — WorkspaceAdapter is Fake |
| **Push** | — | Real git push | ❌ DISABLED — `POSITRON_ENABLE_PUSH=false` |
| **PR Create** | Fake | Real GitHub PR | ⚠️ HYBRID — GitHub adapter REAL, but workspace is fake |
| **Merge** | — | Real GitHub Merge | ❌ DISABLED — `POSITRON_ENABLE_MERGE=false`, Kill-Switch active |
| **UI Updates** | Static/Demo | Real SSE events | ✅ REAL — Live event stream |
| **Run Control** | — | Real signals | ✅ REAL — Signal system active |

## Summary

**The system is in a HYBRID state:**

- **Data layer (GitHub):** REAL — Reading issues, posting comments works via live GitHub API
- **Adapter executables (SpecKit, OpenCode):** REAL CLIs are installed and detected — but `POSITRON_ENABLE_REAL_SPECKIT=false` prevents their use in the pipeline
- **Workspace/git operations:** FAKE — No `POSITRON_WORKSPACE_ROOT` configured
- **Write operations (push, merge, PR):** DISABLED by safety flags
- **Pipeline execution:** REAL adapters configured but only artifact-only mode active → pipeline runs through phases but produces limited real artifacts

**What this means for the user:**
- You CAN see real data (GitHub issues, runs, events)
- You CAN start runs
- But runs will fail in `REPO_SYNC` or later phases because the workspace adapter does nothing
- No code is committed, pushed, or merged
