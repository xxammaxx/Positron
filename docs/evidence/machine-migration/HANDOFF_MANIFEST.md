# Handoff Manifest — Positron Migration Run A

## Canonical Source

```text
GitHub repo: xxammaxx/Positron
Default branch: main
Transfer method: GitHub only
Local files are NOT canonical unless committed and pushed
```

## Migration Status

```text
POSITRON_MIGRATION_SOURCE_REALITY_STATUS: CURRENT
SOURCE_SECRET_ENV_STATUS: CLEAN
SOURCE_LOCAL_GATES: YELLOW_PREEXISTING
```

## Current Known State

| Item | Value |
|------|-------|
| **Local main HEAD** | `f7502ea9806aee388a5fbd3688034113ef950fb9` (on branch `docs/issue-308-phase-d-readiness-after-322`) |
| **Remote main HEAD** | `2198bc99e44b3742bc8c2dfd5491c815ac306eb6` |
| **PR #329** | OPEN, Draft, MERGEABLE — Phase D readiness |
| **PR #328** | MERGED — onAudit wiring |
| **Issue #322** | OPEN — closure recommended |
| **Issue #308** | OPEN — `READY_FOR_LIMITED_PHASE_D_APPROVAL_PACKAGE` |
| **PR #313** | OPEN, Draft, stale — CLOSE_AS_OBSOLETE recommended |
| **Issues #321-#326** | OPEN — limitation tracking |
| **Tests** | 1858/1858 PASS |
| **Build** | 5 pre-existing errors (YELLOW_PREEXISTING) |

## What the New Machine Must Do First

1. **Fresh clone:**
   ```bash
   git clone https://github.com/xxammaxx/Positron.git
   cd Positron
   ```

2. **Verify prerequisites:**
   ```bash
   node --version  # >=18
   npm --version   # >=9
   git --version   # >=2.40
   ```

3. **Install dependencies:**
   ```bash
   npm ci
   ```

4. **Run local gates:**
   ```bash
   npm run build
   npm run typecheck
   npm test
   ```

5. **Review open PRs:**
   - PR #329: Phase D readiness — review or merge
   - PR #313: Stale — consider closing

6. **Review open Issues:**
   - #322: Close if satisfied
   - #308: Continue Phase D or next phase
   - #313: Close as obsolete

7. **DO NOT copy any local files** from the old machine except:
   - Explicitly released non-secret configuration notes (if any exist)

## Do Not Transfer

| Category | Examples | Reason |
|----------|----------|--------|
| `.env` files | `apps/server/.env` | Contains local secrets |
| Tokens | GitHub, npm | Machine-specific credentials |
| SSH Keys | `id_rsa`, `id_ed25519` | Machine-specific keys |
| GitHub credentials | `~/.config/gh/` | Per-machine auth |
| npm tokens | `~/.npmrc` | Per-machine auth |
| node_modules | All 44 directories | Fresh `npm ci` required |
| dist/build artifacts | `packages/shared/dist/` | Should be rebuilt |
| Local stashes | 3 stashes on old branches | Historical only |
| Local logs with secrets | Any | Not needed |
| Browser Sessions | Cookies, localStorage | Not applicable |

## Optional Manual Setup on New Machine

1. **GitHub CLI Login:**
   ```bash
   gh auth login
   ```

2. **SSH Key or HTTPS Auth:** Set up separately per machine policy

3. **Node/npm:** Install via preferred method (nvm, nvm-windows, direct install, winget)

4. **PowerShell / Git Bash / WSL:** Document which shell is used

5. **Environment Variables:**
   - Create `apps/server/.env` from `.env.example`
   - Set `GITHUB_TOKEN` with a valid PAT (fine-grained, repo-scoped)
   - Do NOT transfer old `.env` values

## Next Recommended Work

```text
1. Review PR #329 — Phase D Readiness documentation
2. Owner decision: Close Issue #322 (onAudit complete) — requires explicit approval
3. Owner decision: Close PR #313 as obsolete — requires explicit approval
4. Continue Issue #308 Phase D Approval Package or decide next phase
5. Resolve Issues #321-#326 per documented limitations
```

## Transfer Verification Checklist

- [ ] Fresh clone successful
- [ ] `npm ci` completed without errors
- [ ] `npm run build` shows same 5 pre-existing errors (no new ones)
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (1858/1858 expected)
- [ ] GitHub auth working (`gh auth status`)
- [ ] Can view PR #329: `gh pr view 329`
- [ ] Can view Issue #308: `gh issue view 308`
- [ ] New `.env` created (not copied)
- [ ] No files copied from old machine
