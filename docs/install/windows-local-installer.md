# Positron — Windows Local Installer

## Overview

This document describes how to install and run Positron locally on Windows using PowerShell scripts. No Docker, Redis, or GitHub-CI is required for basic local usage.

## Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Windows | Windows 10+ | Windows 11 |
| Node.js | v20 | v22+ |
| npm | v10+ | comes with Node.js |
| Git | any recent | for cloning |
| PowerShell | 5.1+ | built into Windows |

> **Note:** Positron runs in `fake` mode by default — no GitHub token, no remote API access, no Redis needed. This is sufficient for local development and exploration.

## Installation

### Step 1: Clone the repository

```powershell
git clone https://github.com/xxammaxx/Positron.git
cd Positron
git switch main
```

> **Note:** The repository is currently private. You need repository access.

### Step 2: Run the installer

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-local.ps1
```

This script will:
1. Detect the repository root
2. Check Node.js version (v22+ recommended)
3. Check npm availability
4. Run `npm ci` to install exact dependency versions (falls back to `npm install`)
5. Run `npm run build` to compile all packages and apps
6. Run `npm run typecheck` (advisory, non-blocking)

### Step 3: Start Positron

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

This starts:
- **Server** on http://localhost:3000 (Express/TypeScript backend)
- **Web UI** on http://localhost:5173 (React/Vite/Tailwind frontend)

Press `Ctrl+C` to stop both processes.

### Start options

```powershell
# Server only
.\scripts\start-local.ps1 -ServerOnly

# Web UI only
.\scripts\start-local.ps1 -WebOnly
```

## Packaging for Release

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\package-local-release.ps1
```

Creates `.local-release/positron/` with:
- `README_START_HERE.md` — full start guide with version/commit info
- `MANIFEST.txt` — version, commit, runtime versions
- `scripts/` — copies of install/start/package scripts
- `docs/` — copy of this install document

> The release folder is gitignored and not committed.

## Alternative: Docker (Full Stack)

Positron includes a full Docker Compose stack with Redis, worker, and nginx reverse proxy:

```bash
docker compose up --build
# → http://localhost:5173
```

This is the recommended path for production-like deployment and requires Docker + Redis.

## Configuration

Copy the example environment file and configure as needed:

```powershell
copy .env.example apps/server/.env
```

Key settings for local usage:

| Variable | Default | Local |
|----------|---------|-------|
| `POSITRON_GITHUB_MODE` | `fake` | Keep as `fake` |
| `POSITRON_SPECKIT_MODE` | `fake` | Keep as `fake` |
| `POSITRON_OPENCODE_MODE` | `fake` | Keep as `fake` |
| `POSITRON_ENABLE_PUSH` | `false` | Keep as `false` |
| `POSITRON_ENABLE_MERGE` | `false` | Keep as `false` |
| `POSITRON_MERGE_KILL_SWITCH` | `true` | Keep as `true` |

## Running Tests

```powershell
# Core/packages tests (917 tests)
npm test

# Frontend tests (196 tests)
npm test --workspace apps/web

# E2E tests (advisory only)
npx playwright test
```

## Troubleshooting

### "node_modules not found"

Run the installer first:
```powershell
.\scripts\install-local.ps1
```

### "Build failed"

Check TypeScript errors:
```powershell
npm run typecheck
```

### "Node.js not found"

Install Node.js from https://nodejs.org/ (v22 LTS recommended).

### "npm ci failed"

The installer automatically falls back to `npm install`. If that also fails, check:
- Network connectivity
- npm registry access (`npm config get registry`)
- Disk space

### "Port 3000 or 5173 already in use"

The server uses port 3000 and the web UI uses port 5173. Stop any existing processes using these ports:
```powershell
netstat -ano | findstr ":3000"
netstat -ano | findstr ":5173"
```

## Known Limitations

| Limitation | Detail |
|------------|--------|
| **GitHub Actions** | advisory-only (zero-step CI), see Issue [#268](https://github.com/xxammaxx/Positron/issues/268) |
| **Repository visibility** | Currently private — no public distribution |
| **Docker** | Full production stack requires Redis (via Docker) |
| **Worker** | Requires Redis for queue processing |
| **Real mode** | Requires GitHub token + configuration |
| **Biome lint** | Advisory backlog — not blocking |

## Script Reference

| Script | Purpose |
|--------|---------|
| `scripts/install-local.ps1` | Check prerequisites, install deps, build |
| `scripts/start-local.ps1` | Start server + web UI |
| `scripts/package-local-release.ps1` | Create local release package |

All scripts support `-Help` for usage and `-WhatIf` for dry-run (where applicable).

## Next Steps

- Read [CONTRIBUTING.md](../CONTRIBUTING.md) for development workflow
- Read [SECURITY.md](../SECURITY.md) for security policy
- See [Current Status](../status/current-capabilities.md) for project capabilities
- See [Known Limitations](../status/known-limitations.md) for full list
