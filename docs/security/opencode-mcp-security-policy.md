---
title: Positron OpenCode + MCP Security Policy
date: 2026-07-07
---

# OpenCode + MCP security policy

## Defaults

- **Fake mode is the default.** No real tool execution unless explicitly configured by the operator.
- **No secrets in repo config.** Secret values must not be committed, logged, or hardcoded; operator-provided runtime secrets only.
- **No merge/push by default.** Push and merge require explicit human approval.
- **No destructive shell commands by default.** Deletes, force actions, and workspace/branch destruction are blocked unless approved.
- **No external marketplace automation.** Do not install, auto-run, or auto-update external skills or marketplace packages without review.

## Kill switches

- `POSITRON_ENABLE_PUSH=false` (safe default)
- `POSITRON_MERGE_KILL_SWITCH=true` (safe default)

## Security tiers

| Tier | Name | Scope |
|---|---|---|
| 0 | Readonly | Read-only access only |
| 1 | Sandboxed | Isolated execution; no host trust |
| 2 | Human-Gate | Requires explicit operator approval |

## External skills

- **FORBIDDEN:** Paperclip, OpenClaw
- **QUARANTINED:** all other external skills until reviewed and approved

## Operator rule

If a command, skill, or adapter would execute a real-world action, require explicit configuration and approval first.
