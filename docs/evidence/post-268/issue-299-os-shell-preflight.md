# Issue #299 — OS / Shell / Path Preflight

**Timestamp:** 2026-06-27T08:55:00Z
**Agent:** issue-orchestrator

---

## Local Environment

| Property | Value |
|----------|-------|
| Operating System | Windows 10 (10.0.19041) |
| Shell | PowerShell 5.1 (Build 19041) |
| Node.js | v24.14.0 |
| npm | 11.9.0 |
| Git | 2.47.0.windows.1 |
| Path Separator | `\` (backslash) |
| File System Case Sensitivity | Case-insensitive (NTFS default) |

## CI Environment (Windows Runner)

| Property | Value |
|----------|-------|
| Runner OS | Windows Server 2025 (10.0.26100) |
| Runner Shell | PowerShell 7 (pwsh.EXE) |
| Node.js | v22.23.0 |
| npm | 10.9.8 |
| Workspace Path | `D:\a\Positron\Positron` |
| Path Separator | `\` (backslash, shown as `/` in Node.js paths) |

## Case Sensitivity Relevance

- Windows NTFS is case-insensitive by default
- Node.js module resolution on Windows is generally case-insensitive
- The ERR_MODULE_NOT_FOUND error is NOT case-sensitivity related (file simply absent from dist/)
- The repo.test.ts assertion error is NOT case-sensitivity related (CWD-dependent path resolution)

## Local Windows Testing

| Capability | Available |
|------------|-----------|
| Windows available for local testing | YES |
| PowerShell 5.1 available | YES |
| Can run npm build locally | YES |
| Can run npm test locally | YES |
| Can reproduce tool-gateway-windows CI setup | YES (partial — working-directory matters) |

## CI-Specific Differences

1. **Build step:** The `build-and-test` (Ubuntu) job runs `npm run build` before tests. The `tool-gateway-windows` job does NOT.
2. **Working directory:** The Windows job runs vitest from `packages/tool-gateway/`, while the Ubuntu job runs from repo root.
3. **Shell:** Windows uses PowerShell 7, Ubuntu uses bash.

## Classification

```text
ISSUE_299_OS_CONTEXT: WINDOWS_LOCAL
```

*Justification:* Running on Windows 10 with PowerShell 5.1, Node 24.14.0. Can reproduce the CI failure locally. Full Windows verification possible.
