<#
.SYNOPSIS
  Positron local installer - installs dependencies and builds the project.

.DESCRIPTION
  Checks Node.js/npm prerequisites, installs dependencies (npm ci preferred),
  builds all packages/apps, and runs a typecheck. No secrets or remote CI needed.

  Usage:  .\scripts\install-local.ps1
          .\scripts\install-local.ps1 -WhatIf   (dry-run, prints what would happen)
          .\scripts\install-local.ps1 -Help     (show this help)

.OUTPUTS
  Exit code 0 on success, non-zero on failure.
#>
param(
    [switch]$Help,
    [switch]$WhatIf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ------------------------------------------------------------------
# Help / Dry-Run
# ------------------------------------------------------------------
if ($Help) {
    Get-Help $PSCommandPath -Detailed
    exit 0
}

if ($WhatIf) {
    Write-Host "[DRY-RUN] Would install Positron locally:" -ForegroundColor Cyan
    Write-Host "  1. Detect repo root from script location"
    Write-Host "  2. Check Node.js >= 22"
    Write-Host "  3. Check npm availability"
    Write-Host "  4. Run: npm ci   (fallback: npm install)"
    Write-Host "  5. Run: npm run build"
    Write-Host "  6. Run: npm run typecheck (advisory)"
    Write-Host "  7. Print next steps"
    exit 0
}

# ------------------------------------------------------------------
# 1. Detect repo root
# ------------------------------------------------------------------
$ScriptDir = Split-Path -Parent $PSCommandPath
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")

Write-Host "=== Positron Local Installer ===" -ForegroundColor Green
Write-Host "Repo root: $RepoRoot"
Set-Location $RepoRoot

if (-not (Test-Path "package.json")) {
    Write-Error "ERROR: package.json not found at $RepoRoot - not a valid Positron repo."
    exit 1
}

# ------------------------------------------------------------------
# 2. Check Node.js
# ------------------------------------------------------------------
Write-Host ""
Write-Host "[1/5] Checking Node.js ..."

try {
    $raw = node --version 2>&1
    $nodeVersion = $raw.ToString().TrimStart('v')
    $nodeMajor = [int]($nodeVersion.Split('.')[0])
} catch {
    Write-Error "ERROR: Node.js is not installed or not in PATH."
    Write-Host "  Install Node.js >= 22 from https://nodejs.org/"
    exit 2
}

if ($nodeMajor -lt 22) {
    Write-Warning "WARNING: Node.js v$nodeVersion found - v22+ recommended."
    Write-Host "  Continue anyway? The project may work with v20+."
    Write-Host "  Install Node.js >= 22 from https://nodejs.org/"
}
else {
    Write-Host "  Node.js v$nodeVersion - OK"
}

# ------------------------------------------------------------------
# 3. Check npm
# ------------------------------------------------------------------
Write-Host "[2/5] Checking npm ..."

try {
    $npmVersion = (npm --version 2>&1).ToString().Trim()
} catch {
    Write-Error "ERROR: npm is not available."
    exit 3
}

Write-Host "  npm v$npmVersion - OK"

# ------------------------------------------------------------------
# 4. Install dependencies
# ------------------------------------------------------------------
Write-Host "[3/5] Installing dependencies ..."

$ciFailed = $false

if (-not $WhatIf) {
    try {
        Write-Host "  Running: npm ci"
        npm ci 2>&1 | ForEach-Object { Write-Host "    $_" }
        if ($LASTEXITCODE -ne 0) {
            $ciFailed = $true
        }
    } catch {
        $ciFailed = $true
    }

    if ($ciFailed) {
        Write-Warning "  npm ci failed - falling back to npm install."
        Write-Host "  Running: npm install"
        npm install 2>&1 | ForEach-Object { Write-Host "    $_" }
        if ($LASTEXITCODE -ne 0) {
            Write-Error "ERROR: npm install also failed. Check network and npm configuration."
            exit 4
        }
    }
}

# ------------------------------------------------------------------
# 5. Build
# ------------------------------------------------------------------
Write-Host "[4/5] Building project ..."

if (-not $WhatIf) {
    Write-Host "  Running: npm run build"
    npm run build 2>&1 | ForEach-Object { Write-Host "    $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Error "ERROR: Build failed. Check TypeScript errors above."
        exit 5
    }
}

# ------------------------------------------------------------------
# 6. Typecheck (advisory)
# ------------------------------------------------------------------
Write-Host "[5/5] Running typecheck (advisory) ..."

if (-not $WhatIf) {
    Write-Host "  Running: npm run typecheck"
    npm run typecheck 2>&1 | ForEach-Object { Write-Host "    $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "  Typecheck returned non-zero exit code - not blocking."
    }
}

# ------------------------------------------------------------------
# Done
# ------------------------------------------------------------------
Write-Host ""
Write-Host "=== Installation complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  Start server + web:   .\scripts\start-local.ps1"
Write-Host "  Package for release:  .\scripts\package-local-release.ps1"
Write-Host "  Run tests:            npm test"
Write-Host "  Docker (full stack):  docker compose up --build"
Write-Host ""
exit 0
