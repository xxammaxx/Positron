<#
.SYNOPSIS
  Positron local starter - starts the server and web UI.

.DESCRIPTION
  Verifies the project is built and dependencies are installed, then starts
  the Express server (port 3000) and Vite dev server (port 5173) concurrently.

  Usage:  .\scripts\start-local.ps1
          .\scripts\start-local.ps1 -Help     (show this help)
          .\scripts\start-local.ps1 -ServerOnly
          .\scripts\start-local.ps1 -WebOnly

.OUTPUTS
  Running server and/or web processes. Press Ctrl+C to stop.
#>
param(
    [switch]$Help,
    [switch]$ServerOnly,
    [switch]$WebOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($Help) {
    Get-Help $PSCommandPath -Detailed
    exit 0
}

# ------------------------------------------------------------------
# Detect repo root
# ------------------------------------------------------------------
$ScriptDir = Split-Path -Parent $PSCommandPath
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $RepoRoot

Write-Host "=== Positron Local Starter ===" -ForegroundColor Green
Write-Host "Repo root: $RepoRoot"

# ------------------------------------------------------------------
# Prerequisite checks
# ------------------------------------------------------------------
if (-not (Test-Path "node_modules")) {
    Write-Error "ERROR: node_modules not found. Run .\scripts\install-local.ps1 first."
    exit 1
}

# Check for build output (apps/server/dist/index.js is the server entry)
$checkServer = $true
if ($WebOnly) {
    $checkServer = $false
}

if ($checkServer) {
    if (-not (Test-Path "apps/server/dist/index.js")) {
        Write-Warning "WARNING: apps/server/dist/ not found. The server may not start."
        Write-Host "  Run: npm run build"
        Write-Host "  Or run: .\scripts\install-local.ps1"
        Write-Host ""
        $proceed = Read-Host "Continue anyway? (y/N)"
        if ($proceed -ne 'y' -and $proceed -ne 'Y') {
            Write-Host "Aborted."
            exit 2
        }
    }
}

# ------------------------------------------------------------------
# Start
# ------------------------------------------------------------------
Write-Host ""

if ($ServerOnly) {
    Write-Host "Starting SERVER only (port 3000) ..." -ForegroundColor Cyan
    Write-Host "  > node apps/server/dist/index.js"
    Write-Host "  Press Ctrl+C to stop."
    Write-Host ""
    & node apps/server/dist/index.js
}
elseif ($WebOnly) {
    Write-Host "Starting WEB UI only (port 5173) ..." -ForegroundColor Cyan
    Write-Host "  > npx vite apps/web"
    Write-Host "  Press Ctrl+C to stop."
    Write-Host ""
    & npx vite apps/web
}
else {
    Write-Host "Starting SERVER + WEB UI concurrently ..." -ForegroundColor Cyan
    Write-Host "  Server: http://localhost:3000"
    Write-Host "  Web UI: http://localhost:5173"
    Write-Host ""

    # Verify concurrently is available
    npx concurrently --version 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "concurrently not available - starting processes in separate windows."
        Write-Warning "Run 'npm install' to get concurrently, or use -ServerOnly / -WebOnly."
        exit 3
    }

    Write-Host "  Press Ctrl+C to stop both."
    Write-Host ""

    & npx concurrently `
        --names "SERVER,WEB" `
        --prefix-colors "cyan,magenta" `
        "npm run dev:server" `
        "npm run dev:web"
}

Write-Host ""
Write-Host "=== Positron stopped ===" -ForegroundColor Yellow
exit 0
