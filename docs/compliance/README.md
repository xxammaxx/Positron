---
title: Positron Compliance Overview
status: YELLOW_REVIEW
date: 2026-07-07
---

# Compliance overview

## Status

- Current status: **YELLOW_REVIEW** (improved from **RED_HOLD**)
- GDPR/DSGVO: **not fully implemented**; documented gap

## Data processed

Positron processes:

- runs
- events
- evidence artifacts

## Protected write paths

- Write endpoints are protected with admin auth.
- Public endpoints are read-only.

## Admin token rules

- `POSITRON_ADMIN_TOKEN` is operator-set only.
- No hardcoded defaults.
- No fallback tokens.
- Supported headers: Bearer token or `X-Admin-Token`.

## Governance gaps

- No secrets in issues or PRs.
- Retention and deletion policy remains open.
- Full Real Mode (#308) remains blocked until separately validated.
