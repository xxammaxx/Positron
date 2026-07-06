---
title: Positron Admin Authentication
date: 2026-07-07
---

# Admin authentication

## Token source

- Admin auth uses `POSITRON_ADMIN_TOKEN`.
- The token must be set by the operator.
- No hardcoded defaults.
- No fallback tokens.

## Supported headers

- `Authorization: Bearer <token>`
- `X-Admin-Token: <token>`

## Failure mode

- No token configured: **503**
- Token configured but missing or wrong: **401**

## Protected endpoints

- All write endpoints require admin auth.
- Current scope: all `POST` endpoints, plus any future `PUT`/`DELETE` endpoints.
- Read-only `GET` endpoints are public.

## Operational rule

- Set `POSITRON_ADMIN_TOKEN` before enabling write operations.
- Keep the token out of source control, logs, and issue/PR text.
