# Auto-Merge Safety Runbook

> Stand: 2026-05-24 · Positron v0.1.0-rc.1

## Sicherheitsprofil (nach Auto-Merge-Test)

**Standardkonfiguration nach jedem Test:**

```bash
POSITRON_MERGE_KILL_SWITCH=true   # Alle Merges sofort blockieren
POSITRON_ENABLE_MERGE=false       # Auto-Merge deaktiviert
POSITRON_ENABLE_PUSH=false        # Push deaktiviert
POSITRON_ENABLE_FIX_LOOP=false    # Fix-Loop deaktiviert
```

**Nur für kontrollierte Dogfood/Merge-Tests explizit aktivieren.**

## 7 Merge-Gates

| # | Gate | Prüfung | Fail → |
|---|------|---------|--------|
| 1 | Auto-Merge Enabled | `POSITRON_ENABLE_MERGE=true` | Merge übersprungen |
| 2 | Kill-Switch | `POSITRON_MERGE_KILL_SWITCH=false` | SOFORT-BLOCK |
| 3 | Run Status Active | `run.status === 'active'` | Merge blockiert |
| 4 | Test Evidence | TEST-Phase mit INFO-Level | Merge blockiert |
| 5 | Branch | `current.branch !== null` | Merge blockiert |
| 6 | PR Open | `pr.state === 'open'` | Merge blockiert |
| 7 | Mergeable (API) | GitHub mergeable=true (4 Polls) | Merge blockiert |

## Kill-Switch-Verhalten

- **Aktiviert (`true`):** ALLE Merges sofort blockiert. Kein API-Call.
- **Deaktiviert (`false`):** Merge nur mit bestandenen Gates.
- **Reaktivierung:** Nach jedem erfolgreichen Test sofort wieder aktivieren.

## Dry-Run vs. Real Merge

| Modus | Env | Verhalten |
|-------|-----|-----------|
| Dry-Run | `POSITRON_MERGE_DRY_RUN=true` | Alle Gates evaluieren, nie mergen |
| Real Merge | `POSITRON_MERGE_DRY_RUN=false` | Mergen wenn WOULD_MERGE |

**Regel: Immer erst Dry-Run mit WOULD_MERGE, dann erst echten Merge.**

## Mergeability-Polling

- 4 Versuche (initial + 3 Retries)
- 5 Sekunden zwischen Versuchen
- Nur `mergeable: true` zählt als clean
- `mergeable: null` → retry
- `mergeable: false` → WOULD_BLOCK

## Erlaubte Branches

```
✅ positron/issue-<N>-<slug>
❌ main, master, develop, staging, production
❌ --force (hart blockiert)
```

## Erlaubte Repos

| Kategorie | Erlaubt | Bedingung |
|-----------|---------|-----------|
| Testrepos | ✅ | Nur mit MERGE_DRY_RUN=true |
| Dogfood-Repos | ✅ | Mit Operator-Überwachung |
| Produktiv-Repos | ⚠️ | Explizite Freigabe pro Repo |

## Notfall: Merge rückgängig

```bash
# 1. Kill-Switch sofort aktivieren
export POSITRON_MERGE_KILL_SWITCH=true

# 2. Server neustarten
# → Alle laufenden Merges werden blockiert

# 3. Merge rückgängig machen (manuell)
git revert <merge-commit-sha>
git push origin main
```

## Notfall: Fehlgeschlagener Merge

Positron loggt Merge-Fehler als WARN-Event. GitHub-Issue erhält einen Kommentar.
Der Run endet mit `FAILED_BLOCKED` oder `DONE` mit Merge-Fehler-Meldung.

## Audit-Trail

Jeder Merge erzeugt:
- RunEvent (MERGE phase, INFO/WARN)
- GitHub Issue-Kommentar
- Git Commit auf base branch
- Dashboard-Event (via SSE)

## Regressionstest für Merge-Gates

```bash
# Test: Kill-Switch blockiert
POSITRON_MERGE_KILL_SWITCH=true  → WOULD_BLOCK (Kill-Switch)

# Test: MERGE=OFF blockiert
POSITRON_ENABLE_MERGE=false      → WOULD_BLOCK (Auto-Merge)

# Test: Alle Gates pass
MERGE=ON, KILL=OFF               → WOULD_MERGE (7/7)
```
