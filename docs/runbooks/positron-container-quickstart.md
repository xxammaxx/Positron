# Positron Dev Container — Quickstart

**Last updated:** 2026-06-16  
**PR:** Issue #229 PR 13

---

## Prerequisites

- Proxmox VE host at 192.168.1.136 (or adjust IP)
- Root/sudo SSH access
- Human Approval for all install steps

---

## 1. Connect to Proxmox Host

```bash
ssh root@192.168.1.136
```

## 2. Host Health Check

```bash
hostname && pveversion && uptime
lscpu | head -5
free -h
df -h /
```

## 3. Get Next CTID

```bash
pvesh get /cluster/nextid
# Example output: 104
```

## 4. Create Container

```bash
CTID=104  # Replace with actual ID from step 3

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

# Verify
pct status $CTID
pct exec $CTID -- bash -lc "cat /etc/os-release && ip -br addr"
```

## 5. Install Base Tools

```bash
pct exec $CTID -- bash -lc "
apt-get update && apt-get install -y \
  ca-certificates curl wget gnupg git jq unzip zip \
  build-essential pkg-config \
  python3 python3-pip python3-venv \
  sqlite3 xvfb chromium fonts-liberation \
  libnss3 libatk-bridge2.0-0 libgtk-3-0 libgbm1 libasound2 \
  openssh-client
"
```

## 6. Install Node.js LTS

```bash
pct exec $CTID -- bash -lc "
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
apt-get install -y nodejs
"
```

## 7. Clone & Setup Positron

```bash
pct exec $CTID -- bash -lc "
mkdir -p /opt/positron/workspace && \
cd /opt/positron/workspace && \
git clone https://github.com/xxammaxx/Positron.git && \
cd Positron && \
npm ci
"
```

## 8. Validate

```bash
pct exec $CTID -- bash -lc "cd /opt/positron/workspace/Positron && npm test"
pct exec $CTID -- bash -lc "cd /opt/positron/workspace/Positron && npm run typecheck || true"
pct exec $CTID -- bash -lc "cd /opt/positron/workspace/Positron && npm run build || true"
```

## 9. Start Demo

```bash
pct exec $CTID -- bash -lc "cd /opt/positron/workspace/Positron && npm run dev:demo"
```

## 10. Verify Endpoints

```bash
CONTAINER_IP=$(pct exec $CTID -- bash -lc "hostname -I | awk '{print \$1}'")
curl -fsS "http://${CONTAINER_IP}:3000/api/health"
curl -fsS "http://${CONTAINER_IP}:3000/api/infrastructure-gates/status"
```

---

## Getting Container Shell

```bash
pct enter $CTID
# or
pct exec $CTID -- bash -l
```

## Key Paths

| Path | Purpose |
|---|---|
| `/opt/positron/workspace/Positron` | Positron repo |
| `/opt/positron/tools/bin` | External tools (OpenCode, etc.) |
| `~/.positron/positron.db` | SQLite database (persistent stores) |

## Default Ports

| Port | Service |
|---|---|
| 3000 | Positron Backend |
| 5173 | Vite Frontend (dev) |

---

See `docs/deployment/proxmox-positron-dev-container.md` for full documentation.
