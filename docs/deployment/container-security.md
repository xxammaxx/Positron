# Positron Container Security Guide

> **All runtime features start DISABLED and SEALED.** Positron cannot execute real runs, tool operations, MCP commands, merges, or pushes until explicitly configured and approved.

## Security Architecture

### Default Deny Posture

Every potentially dangerous operation starts in a blocked state:

| Operation | Default | Required to Enable |
|-----------|---------|--------------------|
| Real Run Execution | `false` | `POSITRON_ENABLE_REAL_RUN=true` |
| Tool Gateway Execute | `false` | `POSITRON_ENABLE_TOOL_GATEWAY=true` |
| MCP Server Exposure | `false` | `POSITRON_MCP_EXPOSE_ENABLED=true` |
| Auto Merge | Blocked | `POSITRON_ENABLE_MERGE=true` + Kill Switch OFF |
| Push to Remote | `false` | `POSITRON_ENABLE_PUSH=true` |
| Fix Loops | `false` | `POSITRON_ENABLE_FIX_LOOP=true` |
| Infra State Upsert | `false` | `POSITRON_ENABLE_INFRASTRUCTURE_STATE_UPSERT=true` |

### Kill Switches

Independent safety mechanisms that override feature flags:

```env
# Master kill switch — blocks ALL merges regardless of other settings
POSITRON_MERGE_KILL_SWITCH=true
```

### Gate Enforcement

P0 runtime safety gates from PR #255 are active:

- **pre_write** — Blocks write operations without evidence path
- **evidence_required** — Requires evidence before completing phases
- **pre_pr** — Blocks PR creation without evidence + branch
- **pre_merge** — Evaluates kill switch + merge permissions
- **security** — Blocks unsafe states (FAILED_UNSAFE cannot be overridden)
- **human_approval** — Requires human approval for merges in real mode

## Container Hardening

### Non-Root User

The container runs as user `positron` (uid ≠ 0). No privileged operations are possible.

### No Host Mounts

The container does NOT mount:
- Host filesystem paths (except the data volume)
- Docker socket (`/var/run/docker.sock`)
- Host config directories
- Host secret files
- Host `.env` files

### Network

- Only port 3000 is exposed (mapped by compose)
- No `--privileged` flag
- No `--network=host`
- No `host.docker.internal` access
- All internal API calls use `localhost`

### Build Safety

- Multi-stage build reduces attack surface
- No `curl | bash` in Dockerfile
- No secrets in build arguments
- `better-sqlite3` compiled in build stage (no build tools in runtime)
- `.dockerignore` excludes all sensitive files

### No Runtime Execution at Start

The container does NOT start:
- OpenCode coding runs
- SpecKit runtime
- MCP real runs
- Tool execution
- Build pipelines
- GitHub API calls (fake mode)
- External network calls

## Enabling Real Mode (Step by Step)

> ⚠️  **WARNING:** Real mode executes real tools. Only enable this in controlled environments.

### 1. Configure GitHub Token

```bash
# Set in docker-compose.yml environment:
- GITHUB_TOKEN=ghp_your_token
- POSITRON_GITHUB_MODE=real
- POSITRON_REPO_OWNER=your-org
- POSITRON_REPO_NAME=your-repo
```

### 2. Enable Real Runs

```bash
- POSITRON_ENABLE_REAL_RUN=true
```

### 3. Configure OpenCode (optional)

Requires OpenCode CLI installed and accessible to the container.

### 4. Configure SpecKit (optional)

Requires SpecKit CLI installed and accessible to the container.

### 5. Review Safety Gates

Before enabling merge:
```bash
- POSITRON_ENABLE_MERGE=true
- POSITRON_MERGE_KILL_SWITCH=false  # ⚠️  High risk
- POSITRON_MERGE_DRY_RUN=true  # Keep dry-run for safety
```

## Audit Trail

All operations are logged:
- **Run events** → SQLite `run_events` table
- **Artifacts** → SQLite `artifacts` table
- **Container logs** → Docker JSON file driver (max 10MB, 3 files)
- **Evidence** → `/app/data/` persistent volume

## Secret Management

- **Never** commit `.env` files with real secrets
- **Never** hardcode tokens in `docker-compose.yml`
- Use Docker secrets or environment variable files for production
- Positron's `SecretManager` redacts tokens from logs and evidence

## Known Limitations

1. **No persistent multi-process lock** — SQLite advisory locks are process-scoped
2. **adapterSource is scanner-level** — not hard runtime enforcement
3. **Security gate is basic** — no full secret leakage scan yet
4. **No TLS** — container serves HTTP only; use a reverse proxy for HTTPS
5. **Single process** — no horizontal scaling in this MVP
6. **Not for public cloud** — designed for local/homelab use only
