# Phase C2 — OS/Shell/Path Preflight

## Tool Versions

| Tool | Version |
|------|---------|
| Node.js | v24.14.0 |
| npm | 11.9.0 |
| git | 2.47.0.windows.1 |

## PowerShell

| Field | Value |
|-------|-------|
| Major | 5 |
| Minor | 1 |
| Build | 19041 |
| Revision | 6456 |

## Paths

| Variable | Value |
|----------|-------|
| Working Directory | `C:\Positron` |
| TEMP | `C:\Users\xxammaxx\AppData\Local\Temp` |

## Capabilities

| Capability | Available |
|------------|-----------|
| `node` | YES |
| `npm` | YES |
| `git` | YES |
| `Get-Location` | YES |
| `New-Item` | YES |
| `Remove-Item` | YES |
| Network (for gh CLI) | YES |
| File system write | YES (within TEMP) |

## Platform

- OS: Windows (win32)
- Shell: PowerShell 5.1

## Classification

```text
PHASE_C2_OS_SHELL_STATUS: READY
```

**Rationale:** All required tools present at expected versions. TEMP directory exists and is writable. Working directory is the Positron repo root. No blockers.
