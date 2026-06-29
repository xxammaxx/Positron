# Phase C2 — Kill-Switch Preflight

## Method

Environment variables checked via `Get-ChildItem -Path env:` filtered by Positron-related prefixes. No `.env` file read. No secrets displayed.

## Kill-Switch Variables

| Variable | Value | Expected | Status |
|----------|-------|----------|--------|
| `POSITRON_ENABLE_PUSH` | NOT SET | `!= true` | ✅ SAFE |
| `POSITRON_ENABLE_MERGE` | NOT SET | `!= true` | ✅ SAFE |
| `POSITRON_MERGE_KILL_SWITCH` | NOT SET | `!= false` | ✅ SAFE |
| `POSITRON_ENABLE_REAL` | NOT SET | `!= true` | ✅ SAFE |
| `HUMAN_APPROVED_REAL` | NOT SET | `!= true` | ✅ SAFE |
| `POSITRON_WORKSPACE_ROOT` | NOT SET | n/a | ✅ SAFE |
| `POSITRON_SPECKIT_MODE` | NOT SET | fake or unset | ✅ SAFE |
| `POSITRON_OPENCODE_MODE` | NOT SET | fake or unset | ✅ SAFE |

## Analysis

All kill-switch variables are **absent** (not set in the environment). This means:

1. **Push is blocked by default** — `POSITRON_ENABLE_PUSH` is not `true`
2. **Merge is blocked by default** — `POSITRON_ENABLE_MERGE` is not `true`
3. **Merge kill-switch is active by default** — `POSITRON_MERGE_KILL_SWITCH` is not `false` (absence means blocked)
4. **Real Mode is blocked by default** — `POSITRON_ENABLE_REAL` is not `true`
5. **Human-approved Real Mode is blocked** — `HUMAN_APPROVED_REAL` is not `true`
6. **Speckit and OpenCode modes** — default to fake/dry-run when not set

## Additional Env Var Scan

Only Positron-related env vars found:

- `OPENCODE` — OpenCode runtime identifier
- `OPENCODE_PID` — Process ID
- `OPENCODE_PROCESS_ROLE` — Process role
- `OPENCODE_RUN_ID` — Run identifier

These are system-level OpenCode runtime variables, not Positron pipeline variables. They do not affect kill-switch or safety behavior.

## No Sensitive Variables

No environment variables matching patterns `PUSH`, `MERGE`, `REAL`, `APPROVED`, `WORKSPACE`, `SPECKIT`, `OPENCODE`, `SECRET`, `TOKEN`, `KEY`, or `PASSWORD` beyond the ones listed above were found.

## Classification

```text
PHASE_C2_KILL_SWITCH_STATUS: READY
```

**Rationale:** All kill-switches are in their safe default state (absent = blocked). Push, merge, and real mode are all blocked. No dangerous env vars active. No RED_HOLD conditions detected. It is safe to proceed with the temp workspace probe.
