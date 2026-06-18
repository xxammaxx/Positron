# Proxmox / CT 120 Deployment Notes

> CT 120 is the current Positron development container on Proxmox host 192.168.1.135.

## Option A — Direct Run in CT 120 (No Docker)

This is the **recommended** path for CT 120 since Docker-in-LXC is not configured:

```bash
# On CT 120:
cd /path/to/Positron
git pull
npm ci
npm run build
npm --workspace apps/server run dev
# → http://<CT-IP>:3000
```

> **Note:** Without Redis, the server runs the pipeline inline (no worker process needed).

## Option B — Containerized (Requires Docker/Podman)

Only if Docker/Podman is installed and approved on the target host:

```bash
docker compose up --build
# → http://localhost:3000
```

### Docker-in-LXC Warning

If running Docker inside CT 120 (an LXC container):

- **Do NOT** enable Docker-in-LXC without explicit approval
- **Do NOT** enable nesting without separate approval
- Docker-in-LXC requires: `nesting=1`, `keyctl=1` in CT config + appropriate apparmor profile
- The containerized deployment is portable — it works on any Docker host

### CT 120 Current Configuration

| Setting | Value |
|---------|-------|
| Host | 192.168.1.135 |
| Container ID | 120 |
| Role | Development / demo host |
| Docker? | Not available (LXC without nesting) |
| Recommended | Direct run (Option A) |

## Network Access

From your local machine to CT 120:

```bash
# Web UI
http://192.168.1.135:3000

# API Health
curl http://192.168.1.135:3000/api/health
```

## No Proxmox Configuration Changes

This deployment does NOT modify:
- Proxmox host configuration
- CT template/configs
- LXC nesting settings
- Storage or network settings
- Firewall rules
- Apparmor profiles
