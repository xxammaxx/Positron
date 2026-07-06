---
title: Production Security Checklist
date: 2026-07-07
---

# Production checklist

- [ ] Set `POSITRON_ADMIN_TOKEN` (strong, random, never hardcoded)
- [ ] Set `REDIS_PASSWORD` (strong, never default)
- [ ] Verify Redis is **not** exposed on a host port
- [ ] Verify all services use `no-new-privileges:true`
- [ ] Verify all services use `cap_drop: ALL`
- [ ] Verify nginx and web use `read_only: true`
- [ ] Do **not** use fake/`ghp_fake` `GITHUB_TOKEN` in production
- [ ] Set `POSITRON_ENABLE_PUSH=false`
- [ ] Set `POSITRON_MERGE_KILL_SWITCH=true`
- [ ] Verify CORS origin is specific, not wildcard
- [ ] Document all host config mounts with risk classification
- [ ] Run security checks before deploying
