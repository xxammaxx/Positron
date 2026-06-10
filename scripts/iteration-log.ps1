# iteration-log.ps1
# PowerShell 5.1 — Automatische Iterationsprotokoll-Erstellung
#
# Usage:
#   .\scripts\iteration-log.ps1            # Erstellt docs/changelog/iteration-<n>.md
#   .\scripts\iteration-log.ps1 -DryRun    # Zeigt an, was erstellt würde (ohne Schreiben)

param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Pfad zum changelog-Verzeichnis (relativ zum Skript)
$scriptDir = $PSScriptRoot
if (-not $scriptDir) {
    # Fallback, falls $PSScriptRoot nicht gesetzt (z.B. bei PowerShell ISE)
    $scriptDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Path
}

$changelogDir = Join-Path -Path $scriptDir -ChildPath "..\docs\changelog"
$resolvedChangelogDir = [System.IO.Path]::GetFullPath($changelogDir)

# Prüfen und ggf. Verzeichnis erstellen
if (-not (Test-Path -LiteralPath $resolvedChangelogDir)) {
    if ($DryRun) {
        Write-Host "[DRY RUN] Directory would be created: $resolvedChangelogDir"
    } else {
        New-Item -ItemType Directory -Path $resolvedChangelogDir -Force | Out-Null
        Write-Host "Created directory: $resolvedChangelogDir"
    }
}

# Bestehende Iterationsdateien zählen
$existingFiles = @(Get-ChildItem -Path $resolvedChangelogDir -Filter "iteration-*.md" -ErrorAction SilentlyContinue)
$nextNumber = $existingFiles.Count + 1

# Zielpfad
$newFileName = "iteration-$nextNumber.md"
$newFilePath = Join-Path -Path $resolvedChangelogDir -ChildPath $newFileName

# Prüfen ob Datei bereits existiert
if (Test-Path -LiteralPath $newFilePath) {
    Write-Error "File already exists: $newFilePath"
    exit 1
}

# Template-Inhalt
$template = @"
# Iteration $nextNumber

## Metadaten
- **Datum:** <YYYY-MM-DD>
- **Zeitstempel:** <HH:MM UTC>
- **Workflow-Zustand:** <Zustand beim Abschluss dieser Iteration>
- **Bearbeitet von:** <Nutzer / KI / gemeinsam>

## Umgesetzt
- ...

## Geänderte Dateien
- ...

## Neue Erkenntnisse
- ...

## Offene Probleme
- ...

## Fehler & Eskalationen
- [Fehlertyp] – [Beschreibung] – [Lösung / Status]

## Nächste Schritte
- ...
"@

# DryRun oder echte Erstellung
if ($DryRun) {
    Write-Host "[DRY RUN] Would create: $newFilePath"
    Write-Host "[DRY RUN] Iteration number: $nextNumber"
    Write-Host "[DRY RUN] Template content would be:"
    Write-Host "---"
    Write-Host $template
    Write-Host "---"
} else {
    # Datei mit UTF-8 Encoding (mit BOM, kompatibel zu PS 5.1) schreiben
    $template | Out-File -FilePath $newFilePath -Encoding utf8 -Force
    Write-Host "Created: $newFilePath"
}

# Pfad immer ausgeben (für Weiterverarbeitung)
Write-Output $newFilePath
