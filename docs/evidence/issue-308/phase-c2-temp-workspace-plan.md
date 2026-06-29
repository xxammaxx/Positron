# Phase C2 — Temp Workspace Plan

## Plan

Create a temporary workspace directory **outside** the Positron repository for the controlled probe.

## Directory Strategy

### Windows Path

```powershell
$RunId = "issue-308-phase-c2-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$TempRoot = Join-Path $env:TEMP $RunId
# Example: C:\Users\xxammaxx\AppData\Local\Temp\issue-308-phase-c2-20260629-160000
```

### Structure

```
$TempRoot/
├── workspace/           ← Probe workspace (git init, probe file)
│   └── probe.txt        ← Non-sensitive probe content
├── audit-log.jsonl      ← Structured audit trail
└── probe-result.json    ← Probe result metadata
```

## Requirements Met

| Requirement | Status |
|-------------|--------|
| Absolute path | ✅ `$env:TEMP\$RunId` |
| Outside repo | ✅ Not under `C:\Positron` |
| Empty or new | ✅ Created fresh with `New-Item` |
| No production `.git` | ✅ Fresh `git init` in subdirectory, not production repo |
| No secrets | ✅ Only non-sensitive probe content |
| Cleanup possible | ✅ `Remove-Item -Recurse -Force` |

## Prohibited Operations (Documented for Audit)

The following are explicitly NOT performed during the probe:

| Operation | Reason |
|-----------|--------|
| `git push` | Kill-switch: `POSITRON_ENABLE_PUSH != true` |
| `gh pr create` | Scope: no PR through pipeline |
| `gh pr merge` | Kill-switch: `POSITRON_ENABLE_MERGE != true` |
| `gh issue edit` | Scope: no issue mutation beyond completion comment |
| `gh workflow run` | Scope: no manual CI |
| Network-only steps | Not required for file-system probe |
| Production repo usage | Probe executes in TEMP only |

## Classification

```text
PHASE_C2_TEMP_WORKSPACE_PLAN_STATUS: READY
```

**Rationale:** The temp workspace plan uses an absolute path outside the repo in the system TEMP directory. All requirements are met. No blockers.
