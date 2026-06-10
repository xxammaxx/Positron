# Docs Quality Check (PowerShell)
# Runs on Windows. For CI use .github/workflows/docs-quality.yml

param(
    [switch]$SkipSecrets,
    [switch]$SkipLinks,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$exitCode = 0

Write-Host "=== Docs Quality Check ===" -ForegroundColor Cyan

# 1. Essential files check
Write-Host "`n[1/5] Checking essential files..." -ForegroundColor Yellow
$essentialFiles = @(
    "docs\index.md",
    "docs\glossary.md",
    "docs\architecture\README.md",
    "llms.txt",
    "AGENTS.md",
    "CONTRIBUTING.md"
)
foreach ($file in $essentialFiles) {
    if (Test-Path -LiteralPath $file) {
        Write-Host "  OK: $file" -ForegroundColor Green
    } else {
        Write-Host "  MISSING: $file" -ForegroundColor Red
        $exitCode = 1
    }
}

# 2. Markdown lint
Write-Host "`n[2/5] Running markdownlint..." -ForegroundColor Yellow
try {
    npx markdownlint "docs/**/*.md" "*.md" --config .markdownlint.json 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Markdown issues found (non-critical)" -ForegroundColor Yellow
    } else {
        Write-Host "  OK: No markdown issues" -ForegroundColor Green
    }
} catch {
    Write-Host "  WARNING: markdownlint not available. Install: npm install" -ForegroundColor Yellow
}

# 3. Secret scan
if (-not $SkipSecrets) {
    Write-Host "`n[3/5] Scanning for secrets..." -ForegroundColor Yellow
    $secretPattern = "(ghp_|github_pat_|sk-[a-zA-Z0-9]{20,}|eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})"
    $docsFiles = Get-ChildItem -Path "docs" -Recurse -Include "*.md" -ErrorAction SilentlyContinue
    $rootMDFiles = Get-ChildItem -Path "." -Filter "*.md" -ErrorAction SilentlyContinue
    $allFiles = $docsFiles + $rootMDFiles
    
    $secretsFound = $false
    foreach ($file in $allFiles) {
        $matches = Select-String -Path $file.FullName -Pattern $secretPattern -AllMatches -ErrorAction SilentlyContinue
        if ($matches) {
            Write-Host "  SECRET FOUND in: $($file.Name)" -ForegroundColor Red
            $secretsFound = $true
        }
    }
    if (-not $secretsFound) {
        Write-Host "  OK: No secrets found" -ForegroundColor Green
    } else {
        $exitCode = 1
    }
}

# 4. MkDocs build
if (-not $SkipBuild) {
    Write-Host "`n[4/5] Building MkDocs..." -ForegroundColor Yellow
    try {
        mkdocs build --strict 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  OK: MkDocs build successful" -ForegroundColor Green
        } else {
            Write-Host "  FAILED: MkDocs build has errors" -ForegroundColor Red
            $exitCode = 1
        }
    } catch {
        Write-Host "  WARNING: MkDocs not available. Install: pip install -r requirements-docs.txt" -ForegroundColor Yellow
    }
}

# 5. Link check
if (-not $SkipLinks) {
    Write-Host "`n[5/5] Checking internal links..." -ForegroundColor Yellow
    try {
        python scripts/docs_link_check.py docs/ 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  Broken links found" -ForegroundColor Red
            $exitCode = 1
        }
    } catch {
        Write-Host "  WARNING: Link checker not available (Python required)" -ForegroundColor Yellow
    }
}

# Summary
Write-Host "`n=== Docs Quality Check Complete ===" -ForegroundColor Cyan
if ($exitCode -eq 0) {
    Write-Host "Result: PASS" -ForegroundColor Green
} else {
    Write-Host "Result: FAIL (see above)" -ForegroundColor Red
}

exit $exitCode
