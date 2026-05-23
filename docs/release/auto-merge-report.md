# Auto-Merge Report

> Issue: #20
> Datum: 2026-05-23

## Purpose

Automatisches Mergen eines Pull Requests nach erfolgreichem CI-Pass. Der Merge ist **sicherheitsgegated** und nur unter definierten Bedingungen aktiv.

## Merge-Strategie

- **Strategie:** `squash` (default) — komprimiert alle Commits in einen
- Alternativ: `merge` (Standard-Merge-Commit), `rebase`
- Kein `--force`

## Merge-Voraussetzungen

| Bedingung | Geprüft durch |
|-----------|--------------|
| `POSITRON_ENABLE_MERGE=true` gesetzt | Environment-Variable |
| Branch ist `positron/issue-*` | Branch Guard (#19) |
| Offener PR existiert für den Branch | `listPullRequests(head=owner:branch)` |
| PR ist mergeable (keine Konflikte) | GitHub API (405 = not mergeable) |
| Test-Report ist PASS | Run-State-Status |
| Kein BLOCKED/FAILED Status | Run-State-Status |

## Merge-Gates

### Im Code implementiert
- ✅ Environment-Gate (`POSITRON_ENABLE_MERGE=true`)
- ✅ Branch-Schutz (nur `positron/issue-*`)
- ✅ Kein Force-Merge
- ✅ Merge-Sync (Kommentar + `positron:merged` Label)
- ✅ Graceful Skip bei nicht-mergeable PR

### Nicht implementiert (Sicherheitslücken)
- ❌ Required Status Checks werden nicht explizit abgefragt
- ❌ Keine Branch-Protection-Regel-Prüfung
- ❌ Kein Rollback/Revert-Mechanismus
- ❌ Kein Kill-Switch außer Env-Variable

## Merge-Flow

```
MERGE-Phase (Orchestrator)
  │
  ├─ POSITRON_ENABLE_MERGE? ──NEIN──→ DONE (skip)
  │
  ├─ Branch vorhanden? ──NEIN──→ DONE (skip)
  │
  ├─ Open PR gefunden? ──NEIN──→ DONE (skip)
  │
  ├─ mergePullRequest(prNumber, squash)
  │   ├─ merged=true  → syncMerged + DONE
  │   └─ merged=false → DONE (WARN)
  │
  └─ Exception → DONE (WARN)
```

## Sicherheitshinweise

- Auto-Merge ist **standardmäßig deaktiviert** (`POSITRON_ENABLE_MERGE` nicht gesetzt)
- Auto-Merge sollte nur in Repos mit **Branch Protection** aktiviert werden
- Required Status Checks müssen auf GitHub-Ebene konfiguriert sein
- Der Merge-Kommentar enthält Run-ID und Merge-SHA
- Keine Secrets im Merge-Kommentar (redacted)

## Empfohlenes Produktionsprofil

| Profil | POSITRON_ENABLE_MERGE | Beschreibung |
|--------|----------------------|-------------|
| `observe` | `false` (default) | Nur beobachten, keine Mutationen |
| `supervised` | `true` | Merge aktiv, aber mit manueller Freigabe |
| `autonomous-safe` | `true` | Vollautomatisch, nur in geschützten Repos |

## Nächste Schritte

- Issue #21: Safety Audit — Branch Protection, Required Checks, Rollback-Runbook
