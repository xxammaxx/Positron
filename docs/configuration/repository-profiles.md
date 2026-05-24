# Repository Profiles — Configuration Matrix

> Stand: 2026-05-24 · Positron v0.1.0-rc.1
> Eine Konfigurationsprofil pro Risikoklasse.

## Profile im Vergleich

| Env Variable | Level 1 (Test) | Level 2 (Low-Risk) | Level 3 (Production) | Level 4 (Critical) |
|-------------|----------------|-------------------|---------------------|-------------------|
| `POSITRON_ENABLE_PUSH` | `true` | `true` | `true` | `false` |
| `POSITRON_ENABLE_MERGE` | `true` | `false`* | `false` | `false` |
| `POSITRON_MERGE_DRY_RUN` | `false` | `true` | `true` | `true` |
| `POSITRON_MERGE_KILL_SWITCH` | `false` | `true` | `true` | `true` |
| `POSITRON_ENABLE_FIX_LOOP` | `true` | `false` | `false` | `false` |
| `POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE` | `false` | `false` | `false` | `false` |
| `POSITRON_SPECKIT_MODE` | `fake` | `fake` | `fake` | `fake` |
| `POSITRON_OPENCODE_MODE` | `fake` | `fake` | `fake` | `fake` |

*\* Level 2 kann Merge aktivieren nach erfolgreichem Test-Run und Operator-Review.*

## Push/Merge/Fix-Loop Matrix

| Aktion | Level 1 | Level 2 | Level 3 | Level 4 |
|--------|---------|---------|---------|---------|
| Issue lesen | ✅ | ✅ | ✅ | ✅ |
| Labels setzen | ✅ | ✅ | ✅ | ✅ |
| Kommentare | ✅ | ✅ | ✅ | ✅ |
| Workspace klonen | ✅ | ✅ | ✅ | ✅ |
| Commit lokal | ✅ | ✅ | ✅ | ✅ |
| Push remote | ✅ | ✅ | ✅ | ❌ |
| PR erstellen | ✅ | ✅ | ✅ | ❌ |
| Merge (Dry-Run) | ✅ | ✅ | ✅ | ❌ |
| Merge (echt) | ✅ | ⚠️* | ❌ | ❌ |
| Fix-Loop | ✅ | ❌ | ❌ | ❌ |
| Fixture Change | ❌ | ❌ | ❌ | ❌ |

## Profile als .env

### Level 1 — Test
```bash
POSITRON_ENABLE_PUSH=true
POSITRON_ENABLE_MERGE=true
POSITRON_MERGE_DRY_RUN=false
POSITRON_MERGE_KILL_SWITCH=false
POSITRON_ENABLE_FIX_LOOP=true
```

### Level 2 — Low-Risk (Default)
```bash
POSITRON_ENABLE_PUSH=true
POSITRON_ENABLE_MERGE=false
POSITRON_MERGE_DRY_RUN=true
POSITRON_MERGE_KILL_SWITCH=true
POSITRON_ENABLE_FIX_LOOP=false
```

### Level 3 — Production
```bash
POSITRON_ENABLE_PUSH=true
POSITRON_ENABLE_MERGE=false
POSITRON_MERGE_DRY_RUN=true
POSITRON_MERGE_KILL_SWITCH=true
POSITRON_ENABLE_FIX_LOOP=false
```

### Level 4 — Critical (Observe Only)
```bash
POSITRON_ENABLE_PUSH=false
POSITRON_ENABLE_MERGE=false
POSITRON_MERGE_DRY_RUN=true
POSITRON_MERGE_KILL_SWITCH=true
POSITRON_ENABLE_FIX_LOOP=false
```

## Autonomie-Profile pro Risikoklasse

| Profil | Level 1 | Level 2 | Level 3 | Level 4 |
|--------|---------|---------|---------|---------|
| Observe (Level 0) | ✅ | ✅ | ✅ | ✅ |
| Research & Spec (Level 1) | ✅ | ✅ | ✅ | ❌ |
| Supervised Build (Level 2) | ✅ | ✅ | ⚠️ | ❌ |
| Autonomous Sandbox (Level 3) | ✅ | ❌ | ❌ | ❌ |
| CI Auto-PR (Level 4) | ✅ | ❌ | ❌ | ❌ |

## CODEOWNERS / Reviewer

| Level | Anforderung |
|-------|------------|
| Level 1 | Keine |
| Level 2 | Optional (empfohlen) |
| Level 3 | Pflicht — min. 1 Reviewer |
| Level 4 | Pflicht — min. 2 Reviewer |

## Branch Protection

| Level | Anforderung |
|-------|------------|
| Level 1 | Keine |
| Level 2 | Empfohlen |
| Level 3 | Pflicht — PR required, 1 approval |
| Level 4 | Strict — PR required, 2 approvals, all checks |
