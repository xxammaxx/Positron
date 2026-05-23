# Production Safety Gates

> Positron — Betriebssicherheits-Dokumentation
> Stand: 2026-05-23

## Sicherheitsgates — Übersicht

Jede mutierende Aktion in Positron ist durch ein explizites Environment-Gate geschützt. Ohne Gate wird die Aktion übersprungen oder blockiert.

| Aktion | Gate | Default |
|--------|------|---------|
| GitHub Write (Labels, Comments) | `POSITRON_LIVE_TEST_ALLOW_WRITE=true` | ❌ Blockiert |
| Pull Request erstellen | Immer aktiv (Read: Create) | ✅ Erlaubt |
| Commit | Immer aktiv (lokal) | ✅ Erlaubt |
| Push | `POSITRON_ENABLE_PUSH=true` | ❌ Blockiert |
| Auto-Merge | `POSITRON_ENABLE_MERGE=true` | ❌ Blockiert |
| Spec Kit CLI (real) | `POSITRON_SPECKIT_MODE=real` | ❌ Blockiert |
| OpenCode CLI (real) | `POSITRON_OPENCODE_MODE=real` | ❌ Blockiert |
| Live E2E Tests | `POSITRON_ENABLE_LIVE_GITHUB_TESTS=true` | ❌ Blockiert |

## Branch Protection

### Geschützte Branches (niemals Push/Merge-Ziel ohne Schutz)
- `main`
- `master`
- `develop`
- `staging`
- `production`

### Erlaubte Branches (Positron-kontrolliert)
- `positron/issue-<N>-<slug>` — Positron-Work-Branches

### Push-Regeln
- Kein `--force` (`-f`)
- Kein `--force-with-lease`
- Kein `--delete`
- Kein Push auf geschützte Branches
- Nur mit `POSITRON_ENABLE_PUSH=true`

## Merge-Gates

Auto-Merge ist nur erlaubt, wenn **ALLE** Bedingungen erfüllt sind:

1. ✅ `POSITRON_ENABLE_MERGE=true`
2. ✅ Branch ist `positron/issue-*`
3. ✅ Offener PR existiert
4. ✅ PR ist mergeable (GitHub API)
5. ✅ Run-Status ist nicht BLOCKED/FAILED
6. ✅ Test-Report ist PASS

**Empfehlung:** Auto-Merge nur in Repos mit GitHub Branch Protection aktivieren, die Required Status Checks erzwingen.

## Not-Aus / Kill-Switch

| Methode | Wirkung |
|--------|---------|
| `POSITRON_ENABLE_MERGE=false` | Auto-Merge deaktiviert, Pipeline läuft weiter |
| `POSITRON_ENABLE_PUSH=false` | Push deaktiviert, Commits bleiben lokal |
| Server-Stop | Gesamte Pipeline gestoppt |
| Branch Protection (GitHub) | Merge wird von GitHub abgelehnt |

## Rollback / Revert

Kein automatisierter Rollback-Mechanismus implementiert. Manuelles Vorgehen:
1. `git revert <merge-sha>` im betroffenen Repo
2. Optional: Issue mit `positron:failed` markieren
3. Positron-Run manuell neustarten

## Audit-Log

Alle mutierenden GitHub-Aktionen hinterlassen:
- HTML-Kommentar-Marker im Issue: `<!-- positron:run=<id>;phase=<phase>;kind=<kind> -->`
- `positron:live-e2e=true` Marker bei Live-Tests
- Label-Transitionen im Lifecycle
- Sync-Kommentare mit Run-ID

## Produktionsprofile

| Profil | PUSH | MERGE | SPECKIT | OPENCODE | Geeignet für |
|--------|------|-------|---------|----------|-------------|
| `observe` | ❌ | ❌ | detect | detect | Beobachten, Testen |
| `supervised` | ✅ | ❌ | detect | detect | PRs erstellen, manuell reviewen |
| `autonomous-safe` | ✅ | ✅ | safe-cli | safe-cli | Vollautomatisch in geschützten Repos |

**Aktuelles Default-Profil:** `observe` (alle mutierenden Aktionen deaktiviert)

## Empfehlung vor produktivem Einsatz

1. GitHub Branch Protection mit Required Status Checks einrichten
2. `CODEOWNERS`-Datei für Reviewer-Pflicht
3. Positron nur in privaten/nicht-kritischen Repos starten
4. Issue #21 (Safety Audit) abschließen
5. Orchestrator-Level Live E2E durchführen
