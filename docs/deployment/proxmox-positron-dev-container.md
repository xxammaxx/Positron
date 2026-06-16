# Proxmox Positron Dev Container — Deployment Guide

**PR:** Issue #229 PR 13  
**Host:** 192.168.1.135 (Proxmox VE)  
**Created:** 2026-06-16  
**Status:** Documentation — Container creation pending Human Approval

---

## Overview

This guide documents the setup of a dedicated `positron-dev` LXC container on the Proxmox host at `192.168.1.135`. The container provides everything needed for Positron development, testing, UI, browser evidence, OpenCode provider preparation, and Spec Kit preparation.

**SECURITY:** No secrets committed. No runtime autonomy enabled. No tool execution without Human Approval. Container is unprivileged.

---

## Host Scan (Pending)

The following scan should be executed on the Proxmox host before container creation:

```bash
# Connect to Proxmox host (adjust user/key as needed)
ssh root@192.168.1.135

# System info
hostname
pveversion
uptime

# Resources
lscpu
free -h
lsblk -f
df -h
ip -br addr

# Existing resources
pvesh get /cluster/resources --type vm
pvesh get /cluster/nextid
pct list

# Available templates
pveam available --section system | grep -E "debian-12|ubuntu-24|ubuntu-22"
pveam list local
```

**Scan Result:** PENDING — Host 192.168.1.135 not reachable from current environment (SSH timeout). Re-run when host is accessible.

---

## Recommended Container Configuration

### Small Host (≤ 16 GB RAM)

| Parameter | Value |
|---|---|
| Name | `positron-dev` |
| Type | LXC (unprivileged) |
| OS Template | `debian-12-standard` |
| vCPU | 2 |
| RAM | 4096 MB |
| Swap | 2048 MB |
| Disk | 40 GB (local-lvm) |
| Network | vmbr0, DHCP |
| Features | nesting=1 (only if Docker needed) |

### Adequate Host (≥ 32 GB RAM)

| Parameter | Value |
|---|---|
| Name | `positron-dev` |
| Type | LXC (unprivileged) |
| OS Template | `debian-12-standard` |
| vCPU | 4 |
| RAM | 8192 MB |
| Swap | 2048 MB |
| Disk | 80 GB (local-lvm) |
| Network | vmbr0, DHCP or static IP |
| Features | nesting=1,keyctl=1 (only if Docker needed) |

---

## Container Creation

### Human Approval Required

**Before executing any of the following commands, the operator must explicitly approve container creation.**

Expected approval response: `YES`

### Step 1: Download OS Template

```bash
pveam update
pveam download local debian-12-standard_12.7-1_amd64.tar.zst
# Verify exact filename with: pveam list local
```

### Step 2: Get Next Available CTID

```bash
CTID=$(pvesh get /cluster/nextid)
echo "Using CTID: $CTID"
```

### Step 3: Create Container

**Without Docker (recommended for initial setup):**

```bash
pct create $CTID local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \
  --hostname positron-dev \
  --cores 4 \
  --memory 8192 \
  --swap 2048 \
  --rootfs local-lvm:80 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --unprivileged 1 \
  --ostype debian \
  --start 1
```

**With Docker support (requires Human Approval):**

```bash
pct create $CTID local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \
  --hostname positron-dev \
  --cores 4 \
  --memory 8192 \
  --swap 2048 \
  --rootfs local-lvm:80 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --unprivileged 1 \
  --features nesting=1,keyctl=1 \
  --ostype debian \
  --start 1
```

### Step 4: Verify Container

```bash
pct status $CTID
pct exec $CTID -- bash -lc "cat /etc/os-release && ip -br addr"
```

---

## Container Software Installation

All software installation commands require **Human Approval** before execution.

### Base System

```bash
pct exec $CTID -- bash -lc "
apt-get update && apt-get install -y \
  ca-certificates curl wget gnupg git jq unzip zip \
  build-essential pkg-config \
  python3 python3-pip python3-venv \
  sqlite3 \
  xvfb \
  chromium \
  fonts-liberation \
  libnss3 libatk-bridge2.0-0 libgtk-3-0 libgbm1 libasound2 \
  openssh-client
"
```

### Node.js LTS (v22)

```bash
pct exec $CTID -- bash -lc "
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
apt-get install -y nodejs && \
node --version && \
npm --version
"
```

### GitHub CLI

```bash
pct exec $CTID -- bash -lc "
apt-get install -y gh || true
gh --version || true
"
```

### uv (Python package manager)

```bash
# HUMAN APPROVAL REQUIRED before executing curl|sh
pct exec $CTID -- bash -lc "
curl -LsSf https://astral.sh/uv/install.sh | sh
"
```

### Playwright Browsers

```bash
pct exec $CTID -- bash -lc "
npx playwright install --with-deps chromium
"
```

---

## OpenCode Installation

### Human Approval Required

**Command:**

```bash
pct exec $CTID -- bash -lc "
mkdir -p /opt/positron/tools/bin && \
OPENCODE_INSTALL_DIR=/opt/positron/tools/bin \
curl -fsSL https://opencode.ai/install | bash && \
/opt/positron/tools/bin/opencode --version
"
```

**Safety:**
- Install directory: `/opt/positron/tools/bin` (controlled, no sudo)
- Source: `https://opencode.ai/install` (official)
- No secrets in install
- No automatic execution after install
- OpenCode is installed as a provider candidate — NOT auto-started

**Status:** PENDING HUMAN APPROVAL

---

## Spec Kit Installation

### Human Approval Required

**Command:**

```bash
pct exec $CTID -- bash -lc "
uv tool install git+https://github.com/github/spec-kit.git && \
uv tool list
"
```

**Safety:**
- Source: `github/spec-kit` exclusively (no PyPI fallback)
- Installed via `uv tool install` (not curl|sh)
- No automatic execution after install
- Spec Kit is prepared for Positron workflows — NOT auto-started

**Status:** PENDING HUMAN APPROVAL

---

## Positron Repo Setup

### Clone and Install

```bash
pct exec $CTID -- bash -lc "
mkdir -p /opt/positron/workspace && \
cd /opt/positron/workspace && \
git clone https://github.com/xxammaxx/Positron.git && \
cd Positron && \
npm ci
"
```

**Note:** If the repository is private, GitHub authentication is needed. Use `gh auth login` interactively or configure an SSH key. **DO NOT store tokens in logs or configuration files.**

### Validation Commands

```bash
# TypeScript compilation check
pct exec $CTID -- bash -lc "cd /opt/positron/workspace/Positron && npm run typecheck || true"

# Build
pct exec $CTID -- bash -lc "cd /opt/positron/workspace/Positron && npm run build || true"

# Tests
pct exec $CTID -- bash -lc "cd /opt/positron/workspace/Positron && npm test || true"

# Contract tests
pct exec $CTID -- bash -lc "cd /opt/positron/workspace/Positron && npm run test:contracts || true"

# Safety coverage
pct exec $CTID -- bash -lc "cd /opt/positron/workspace/Positron && npm run coverage:safety || true"
```

### Demo Start

```bash
pct exec $CTID -- bash -lc "cd /opt/positron/workspace/Positron && npm run dev:demo"
```

**Expected URLs (if network accessible):**
- Frontend: `http://<container-ip>:5173`
- Backend: `http://<container-ip>:3000`
- Health: `http://<container-ip>:3000/api/health`
- Infrastructure Gates: `http://<container-ip>:3000/api/infrastructure-gates/status`

### Browser/UI Evidence

```bash
# Health check
curl -fsS http://127.0.0.1:3000/api/health

# Infrastructure gates status (read-only, no runtime)
curl -fsS http://127.0.0.1:3000/api/infrastructure-gates/status

# E2E tests (if Playwright is installed)
npx playwright install --with-deps chromium
npm run e2e:ui-workflow || true
```

For headed browser tests in LXC, use `xvfb`:
```bash
xvfb-run npx playwright test --headed
```

---

## Environment Configuration

### Server Store Mode

```bash
# Inside container
export POSITRON_INFRASTRUCTURE_STORE=sqlite
# Default: sqlite (when DB available)
# Fallback: memory (tests, no DB)
```

### Other Relevant Env Vars

| Variable | Default | Description |
|---|---|---|
| `POSITRON_INFRASTRUCTURE_STORE` | `sqlite` | Store mode: `sqlite` or `memory` |
| `POSITRON_DB_PATH` | `~/.positron/positron.db` | SQLite database path |
| `POSITRON_GITHUB_MODE` | `fake` | GitHub adapter mode |
| `POSITRON_SPECKIT_MODE` | `fake` | SpecKit adapter mode |
| `POSITRON_OPENCODE_MODE` | `fake` | OpenCode adapter mode |
| `POSITRON_ADMIN_TOKEN` | `positron-admin-dev` | Dev admin token |

---

## Known Limitations

1. **No runtime execution:** OpenCode, MCP, SpecKit, and Tool Gateway runtimes are NOT started. All infrastructure gates report `missing/not_checked` until providers are configured.
2. **No Docker-in-LXC without explicit approval:** Docker requires `nesting=1` and `keyctl=1` features plus Human Approval.
3. **No automatic installs:** OpenCode and Spec Kit installation requires Human Approval before execution.
4. **No internet exposure:** Container uses DHCP on internal network bridge. No reverse proxy or public exposure configured.
5. **In-memory stores as fallback:** If SQLite DB is unavailable, stores fall back to in-memory mode (data lost on restart).

---

## Security Notes

- Container is **unprivileged** (`--unprivileged 1`)
- No host secrets mounted into container
- No `.env` files with real secrets committed
- No `ghp_`, `github_pat_`, `sk-`, or other API keys in configuration
- OpenCode installed only after Human Approval via official installer
- Spec Kit installed only from `github/spec-kit` after Human Approval
- Gateway default: DISABLED
- MCP exposure default: DISABLED
- No runtime autonomy enabled
- All tool execution requires Human Approval

---

## Container Quick Reference

| Item | Value |
|---|---|
| Host | 192.168.1.135 (Proxmox VE) |
| Container Name | `positron-dev` |
| CTID | PENDING (from `pvesh get /cluster/nextid`) |
| OS | Debian 12 (Bookworm) |
| Node.js | v22 LTS |
| Workspace | `/opt/positron/workspace/Positron` |
| Tools | `/opt/positron/tools/bin` |
| OpenCode Status | PENDING HUMAN APPROVAL |
| Spec Kit Status | PENDING HUMAN APPROVAL |
| Docker | NOT installed (requires separate approval) |

---

## Next Steps After Container Creation

1. Run host scan (`pvesh`, `lscpu`, `free -h`, etc.)
2. Obtain Human Approval for container creation
3. Create container with documented `pct create` command
4. Run base software installation
5. Obtain Human Approval for OpenCode install
6. Obtain Human Approval for Spec Kit install
7. Clone Positron repo and run `npm ci`
8. Run validation: `npm run typecheck`, `npm run build`, `npm test`
9. Start demo: `npm run dev:demo`
10. Verify health endpoints
11. Run browser/UI evidence tests
12. Document results back to Issue #229
