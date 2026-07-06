---
title: Docker Compose Security Hardening
date: 2026-07-07
---

# Docker hardening

## Baseline controls

- All services:
  - `security_opt: no-new-privileges:true`
  - `cap_drop: ALL`
- Server and worker:
  - no-new-privileges
  - cap_drop ALL
- nginx and web:
  - `read_only: true`
  - tmpfs for required writable paths

## Redis

- Internal-only; no host port exposure.
- Protected mode enabled.
- `requirepass` enabled.
- Password comes from `REDIS_PASSWORD`.

## Admin token

- No default admin token.
- `POSITRON_ADMIN_TOKEN` must be operator-provided.

## Host mounts

Document every host bind mount and classify its risk before deployment.

Recommended classes:

- **Read-only tooling mount**
- **Workspace data mount**
- **Secret-bearing mount**
- **Operator home directory mount**

## Deployment rule

- Treat any host mount as sensitive until reviewed.
- Prefer read-only mounts and minimal write scope.
