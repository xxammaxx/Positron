# Positron OpenCode Preflight — Prompt/Evidence/GitHub Hardening Run

## Run Metadata

| Field | Value |
|-------|-------|
| **Datum/Zeit des Runs** | 2026-06-19 (Windows 10 local) |
| **OpenCode-Version** | 1.15.0 (`opencode --version`) |
| **OpenCode-Agent/Modus** | Issue Orchestrator (Plan-/Analysemodus — Read-Only) |
| **Prompt Source** | OpenCode Prompt — PR-/CI-Gate + Prompt-Archiv-/Evidence-/GitHub-Hardening mit OS-/Shell-Preflight |

---

## Operating System Detection

### Detected Runtime

| Property | Value |
|----------|-------|
| **OS** | Windows 10.0.19045 |
| **Architecture** | x64 |
| **Shell** | Windows PowerShell 5.1 (PSVersion 5.1.19041.6456) |
| **PSEdition** | Desktop |
| **CLRVersion** | 4.0.30319.42000 |
| **Path style** | Backslash (`\`), Drive letters (`C:\`) |
| **Package manager** | npm (11.9.0), pnpm available |
| **Preferred command family** | PowerShell 5.1 |
| **Commands that must be avoided** | Bash-specific: `grep`, `sed -i`, `cat file \| head`, `rm -rf`, `cp -r`, `mkdir -p`, `export VAR=value cmd`, `source file` |
| **Encoding risk** | **HIGH** — Console codepage: 850 (ibm850), not UTF-8. OutputEncoding is DOS. CRLF line ending warnings observed in git. |
| **Confidence** | HIGH — verified via `$PSVersionTable`, `[System.Runtime.InteropServices.RuntimeInformation]`, `chcp`, `git --version`, `node --version` |

### Available Core Commands

| Command | Status | Version | Notes |
|---------|--------|---------|-------|
| `git` | ✅ Available | 2.47.0.windows.1 | |
| `gh` | ✅ Available | GitHub CLI | Authenticated |
| `node` | ✅ Available | v24.14.0 | |
| `npm` | ✅ Available | 11.9.0 | |
| `pnpm` | ✅ Available | as pnpm.ps1 | |
| `opencode` | ✅ Available | 1.15.0 | |
| `python` | Not checked | — | Not immediately needed |

### Encoding Details

```
Console OutputEncoding: ibm850 (Codepage 850, Windows-1252)
chcp: Aktive Codepage: 850
```

⚠️ **Risk:** Codepage 850 is a DOS codepage. Files with characters outside the ASCII/latin-1 range may display incorrectly in the console. All file operations via Node.js/tools handle UTF-8 correctly. Console output may be garbled for non-ASCII characters.

---

## Repository Status

### Git State

| Property | Value |
|----------|-------|
| **Repository** | `xxammaxx/Positron` |
| **Remote URL** | `https://github.com/xxammaxx/Positron.git` |
| **Current Branch** | `feature/hermes-opencode-adapter-capability-pack` |
| **Latest Commit** | `52f3f62` — `docs(issue-256): correct test count in current-capabilities.md (2181->2182)` |
| **Working Tree** | **DIRTY** — 14 modified files + ~40 untracked files |
| **Remote Tracking** | No upstream configured for current branch |

### Modified Files (staged or unstaged)

```
 M .gitignore
 M docs/status/current-capabilities.md
 M docs/status/known-limitations.md
 M packages/opencode-adapter/src/index.ts
 M packages/opencode-adapter/src/real-adapter.ts
 M packages/shared/dist/index.d.ts
 M packages/shared/dist/index.d.ts.map
 M packages/shared/dist/index.js
 M packages/shared/dist/index.js.map
 M packages/shared/dist/interfaces.d.ts
 M packages/shared/dist/interfaces.d.ts.map
 M packages/shared/dist/types.d.ts
 M packages/shared/dist/types.d.ts.map
 M packages/shared/src/agent-types.ts
```

### Untracked Significant Directories/Files

```
docs/adr/        — 5 new ADRs (agentic-safety, browser-evidence, operator-techstack, sqlite-concurrency, verification-contract-first)
docs/architecture/ — tool-gateway-mcp-provider-integration
docs/evidence/   — 3 evidence subdirectories (adapter-capability-01, dogfood-fixture-01, dogfood-real-dry-run-02)
docs/plans/      — issue-229-tasks
docs/release/    — 2 release documents
docs/research/   — empty
docs/roadmap.md
docs/security/   — required-mcp-server-inventory
docs/specs/      — empty
docs/testing/    — empty
e2e/             — 6 new spec files
packages/opencode-adapter/ — new agents and tests (DeterministicFixtureAgent, DryRunAgent)
packages/tool-gateway/ — red test
```

---

## PR/CI Reality Check

### PR #147 — DOES NOT EXIST

```
gh pr view 147 → GraphQL: Could not resolve to a PullRequest with the number of 147.
```

**Finding:** PR #147 does not exist in `xxammaxx/Positron`.

### Branch `feature/optimizer-placeholder-hardening` — DOES NOT EXIST

```
git branch --all | Select-String "optimizer-placeholder-hardening" → no output
```

**Finding:** No local or remote branch matches.

### Commit `e5792bb` — DOES NOT EXIST

```
git log --oneline --all | Select-String "e5792bb" → no output
```

**Finding:** Commit hash not present in repository.

### Real Working State

| Property | Value |
|----------|-------|
| **Current Branch** | `feature/hermes-opencode-adapter-capability-pack` |
| **Latest Commit** | `52f3f62` |
| **Related PRs** | #256 (containerized deployment MVP, targets positron/issue-243-p0-runtime-safety) |
| **Working State** | In-progress adapter capability pack development (DeterministicFixtureAgent, DryRunAgent) |

### Open PRs (20 total)

Relevant subset:
- #256 — `feat(deploy): add containerized Positron deployment MVP`
- #255 — `feat(issue-243): enforce P0 runtime safety gates`
- #242 — 229 chain (infrastructure state stores)
- #241 — 229 chain (infrastructure state stores)
- #240-#230 — 229 chain (tool gateway, oversight, blueprints, infra)
- #228 — tool gateway monitoring
- #218 — Stop/Ask policy integration
- #212 (draft) — GitHub presentation polish
- #210 (CONFLICTING) — hard gate resolution
- #208 (CONFLICTING) — vibe coding orchestration

### CI/Workflow Status

- **quality-gates.yml** — Build, typecheck, Biome format/lint, unit tests on push/PR to main
- **verify-issues.yml** — Issue verification on PR close + weekly cron
- CI triggered on `main/master/develop` branches only
- No CI run found for current branch `feature/hermes-opencode-adapter-capability-pack` (expected — branch targets no CI-triggering base)
- Local reproduction: `npm test`, `npm run typecheck`, `npm run lint` available

---

## Scope Definition

### Files that will be read (read-only)

- `docs/prompts/` — currently contains only `.gitkeep`
- `docs/evidence/` — existing evidence structure
- `docs/status/` — current-capabilities.md, known-limitations.md
- `docs/adr/` — existing ADRs
- `.specify/memory/constitution.md` — already read
- `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md` — already in context
- `package.json`, CI workflow files — already read
- `README.md` — for GitHub presentation assessment
- Test directories — for existing test structure

### Files that may be changed

- `docs/prompts/` — add canonical prompt standard
- `docs/evidence/prompt-hardening-01/` — evidence for this run
- `docs/status/current-capabilities.md` — update if needed
- Test files — add prompt validation tests (Red Tests)
- `packages/shared/src/` — possible test helpers
- `docs/repository-hardening-checklist.md` — create if needed

### Areas explicitly NOT touched

- ❌ PR #145 — no access, no change
- ❌ `main` branch — no merge, no push
- ❌ All 20 existing open PRs — no modification
- ❌ `apps/web/` — no UI changes
- ❌ `apps/server/` — no backend changes
- ❌ `.env` or secrets — never accessed
- ❌ Docker/container config — no change
- ❌ Migration scripts — no change
- ❌ OpenCode global config — no change without explicit Human Approval

### Planned Tests/Gates

1. `npm run typecheck` — TypeScript typecheck
2. `npm run lint` — Biome lint
3. `npm test` — Full test suite
4. `npm run test:contracts` — Contract tests
5. `npm run build` — Full build
6. Red Tests for prompt standard (new)

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Codepage 850 encoding | Medium | All file writes via tools use UTF-8; console output may garble |
| PowerShell 5.1 limitations | Low | Avoiding PowerShell 7-only features |
| Dirty working tree | Medium | Only modify docs/ and test files; no touch of adapter code |
| No existing prompt validation tests | Low | Add minimal vitest-based Red Tests |
| Stale handoff state | Resolved | Documented real state in this preflight |

### Rollback/Checkpoint Strategy

- All new files go under `docs/evidence/prompt-hardening-01/` — removable without impact
- Changes to existing files are minimal and documented
- Git status tracked before and after each phase
- No destructive operations

### Human Approval Required

- ✅ **Merge**: YES — blocked until Human Approval
- ✅ **Push**: YES — only after all local gates pass and Human Approval
- ✅ **Force Push**: PROHIBITED
- ✅ **Auto-Merge**: PROHIBITED
- ✅ **OpenCode Global Config Change**: PROHIBITED without explicit Human Approval

---

## OS/Shell Decision

```
Detected runtime:
- OS: Windows 10.0.19045 (x64)
- Shell: Windows PowerShell 5.1
- Path style: Backslash (C:\...)
- Package manager: npm
- Preferred command family: PowerShell 5.1
- Commands that must be avoided: Bash-exclusive syntax (grep, sed -i, cat pipe, rm -rf, cp -r, export, source)
- Encoding risk: Codepage 850 — use tools for file I/O, not console pipes
- Confidence: HIGH
```

---

## Context Manifest

- **Gelesene Dateien:** constitution.md, current-capabilities.md, known-limitations.md, agent-types.ts (diff), .gitignore (diff), package.json, quality-gates.yml, verify-issues.yml, ADR-verification-contract-first-workflow.md, AGENTS.md, CONTRIBUTING.md, SECURITY.md
- **Geänderte Dateien:** None yet (read-only phase)
- **Genutzte Kommandos:** $PSVersionTable, System.Runtime check, git --version, git branch --show-current, git log, git status, git remote, gh pr view, gh pr list, npm run --json, chcp, opencode --version
- **Annahmen:** Stale handoff state replaced with live reality; this run is standalone hardening on current branch
- **Confidence:** HIGH for OS/shell/repo detection; MEDIUM for full scope impact
- **Offene Risiken:** Codepage 850 encoding, dirty working tree management, no CI on current branch

---

*Preflight completed in read-only Plan/Analysis mode. Ready to proceed to Build/Edit mode for hardening phases.*
