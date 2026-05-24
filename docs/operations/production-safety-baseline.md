# Production Safety Baseline

> Stand: 2026-05-24 · Positron v0.1.0-rc.1
> Issue: #44 — Safety Baseline after first Auto-Merge
> Status: **Active** 🛡️

## Status: Production-ready für Testrepos

Positron hat den vollständigen Issue-to-Merge-Zyklus validiert. Für Produktiv-Repos ist eine explizite Freigabe pro Repository erforderlich.

## Sicherheitsprofil (Default)

**Nach jedem Test/Merge ist folgendes Profil aktiv:**

```bash
# === Sicherheitsgates (standardmäßig aktiv) ===
POSITRON_MERGE_KILL_SWITCH=true   # Alle Merges sofort blockieren
POSITRON_ENABLE_MERGE=false       # Auto-Merge deaktiviert
POSITRON_ENABLE_PUSH=false        # Push deaktiviert
POSITRON_ENABLE_FIX_LOOP=false    # Auto-Retry deaktiviert
POSITRON_MERGE_DRY_RUN=true       # Merge simulieren
POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE=false  # Keine Fixture-Änderungen

# === CLI-Adapter (standardmäßig fake) ===
POSITRON_SPECKIT_MODE=fake
POSITRON_OPENCODE_MODE=fake

# === GitHub (real, aber nur lesend) ===
GITHUB_MODE=real
```

## Repo-Kategorien

| Kategorie | Merge | Push | Bedingung |
|-----------|-------|------|-----------|
| Testrepos | ✅ kontrolliert | ✅ | Immer mit Dry-Run zuerst |
| Dogfood-Repos | ⚠️ supervisor | ✅ | Operator muss laufend beobachten |
| Produktiv-Repos | ❌ | ❌ | Explizite Freigabe erforderlich |
| Fremde Repos | ❌ | ❌ | Niemals |

## Explizite Freigabe für Produktiv-Repo

Vor dem ersten produktiven Einsatz muss:
1. Repository-Eigentümer informiert sein
2. Branch Protection Rules aktiv sein
3. Required Status Checks konfiguriert sein
4. `POSITRON_MERGE_KILL_SWITCH=false` **NUR** für diesen Run
5. Nach Run: Kill-Switch sofort wieder `true`

## Operator-Checklist (vor echtem Repo-Betrieb)

- [ ] Repository ist als erlaubt klassifiziert
- [ ] Kill-Switch ist aktiv (`true`)
- [ ] Merge ist deaktiviert (`false`)
- [ ] Push ist deaktiviert (`false`)
- [ ] Dry-Run vor jedem Merge
- [ ] 7/7 Gates pass vor echtem Merge
- [ ] `mergeable: clean` (nicht `checking`)
- [ ] Branch folgt `positron/issue-*` Pattern
- [ ] Keine Secrets in Umgebungsvariablen
- [ ] Dashboard läuft und zeigt Safety Controls
- [ ] GitHub Token hat minimal benötigte Scopes
- [ ] Backup-Konfiguration vorhanden

## Rollback-Prozedur

```bash
# 1. Kill-Switch aktivieren
export POSITRON_MERGE_KILL_SWITCH=true

# 2. Server neustarten
# → Alle Merges sofort blockiert

# 3. Falls Merge bereits erfolgt:
cd <repo>
git revert <merge-commit-sha>
git push origin main

# 4. Issue dokumentieren
# → GitHub Issue mit Merge-Revert-Begründung
```

## Audit-Log (mutierende Aktionen)

| Aktion | Log-Ort | Format |
|--------|---------|--------|
| Issue Claim | GitHub Issue-Kommentar | `positron:run=<id>;phase=CLAIMED` |
| Label setzen | GitHub API | Im Issue sichtbar |
| PR erstellen | GitHub PR | PR-Objekt |
| PR mergen | Git Commit + GitHub API | Merge-Commit + PR-State |
| Issue sync | GitHub Issue-Kommentar | `positron:run=<id>;phase=DONE` |

## Rate-Limiting

GitHub API Rate Limits:
- Token-basierte Limits (5000 req/h für authentifizierte Requests)
- Positron macht DELETE requests für Label-Cleanup (bis zu 20 pro Run)
- PR/Pulls GET requests (pro Run)
- Empfehlung: maximal 10 Runs pro Stunde im Normalbetrieb

## Regressionstests für Merge-Gates

```bash
npm test  # Enthält Integrationstests für alle Merge-Gates
```

Die wichtigsten Testszenarien:
1. Kill-Switch blockiert Merge
2. MERGE=OFF blockiert Merge
3. Run-Status blocked/failed blockiert Merge
4. Ohne Test-Evidence blockiert Merge
5. Ohne Branch blockiert Merge
