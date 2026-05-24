# Repository Onboarding Policy

> Stand: 2026-05-24 · Positron v0.1.0-rc.1

## Ziel

Jedes neue Repository, auf dem Positron laufen soll, durchläuft einen strukturierten Onboarding-Prozess. Kein Repository wird ohne Prüfung onboarded.

## Onboarding-Prozess

### Schritt 1 — Risikoklassifizierung

Das Repository wird einer der 4 Risikoklassen zugeordnet (siehe `repository-risk-classification.md`):

- 🟢 Level 1: Test — sofort freigegeben
- 🟡 Level 2: Low-Risk — nach Checkliste freigegeben
- 🟠 Level 3: Production — nach Review freigegeben
- 🔴 Level 4: Critical — nur Observe-Mode

### Schritt 2 — Sicherheitsprüfung

| Prüfung | Level 1 | Level 2 | Level 3 | Level 4 |
|---------|---------|---------|---------|---------|
| Repo-Eigentümer informiert | — | ✅ | ✅ | ✅ |
| Branch Protection aktiv | Optional | Empfohlen | ✅ | ✅ Strict |
| Required Status Checks | Optional | Empfohlen | ✅ | ✅ |
| CODEOWNERS definiert | — | — | ✅ | ✅ |
| GitHub Token Scopes | `repo` | `repo` | `repo` | Read-only |
| Secrets-Check | ✅ | ✅ | ✅ | ✅ |

### Schritt 3 — Positron-Konfiguration

```bash
# Level 1 (Test)
POSITRON_ENABLE_PUSH=true
POSITRON_ENABLE_MERGE=true
POSITRON_MERGE_KILL_SWITCH=false

# Level 2 (Low-Risk)
POSITRON_ENABLE_PUSH=true
POSITRON_ENABLE_MERGE=false        # Erst nach Validierung
POSITRON_MERGE_KILL_SWITCH=true    # Sicherheitsnetz

# Level 3 (Production)
POSITRON_ENABLE_PUSH=true          # Nur positron/issue-*
POSITRON_ENABLE_MERGE=false        # Manuell nach Review
POSITRON_MERGE_KILL_SWITCH=true    # Immer aktiv
POSITRON_MERGE_DRY_RUN=true        # Dry-Run vor jedem Merge

# Level 4 (Critical)
POSITRON_ENABLE_PUSH=false         # Niemals
POSITRON_ENABLE_MERGE=false        # Niemals
POSITRON_MERGE_KILL_SWITCH=true    # Dauerhaft
```

### Schritt 4 — Test-Run

Vor erstem echten Einsatz: Dry-Run gegen das Repo ausführen.

Checklist:
- [ ] Positron kann Issues lesen
- [ ] Positron kann Labels setzen
- [ ] Positron kann Kommentare schreiben
- [ ] Workspace wird korrekt erstellt
- [ ] Dry-Run zeigt erwartetes Ergebnis
- [ ] Kill-Switch funktioniert

### Schritt 5 — Dokumentation

Jeder onboardete Run wird dokumentiert:
- Repository-URL
- Risikoklasse
- Datum der Freigabe
- Konfiguration
- Ergebnis des Test-Runs
- Operator (wer hat freigegeben)

## Freigabeprozess

| Klasse | Wer? | Dokumentation |
|--------|------|---------------|
| Level 1 | Automatisch | Issue-Kommentar |
| Level 2 | Positron-Operator | GitHub Issue + Checkliste |
| Level 3 | Repo-Eigentümer + Operator | PR mit Konfiguration |
| Level 4 | CTO / Security | Formeller Review |

## Offboarding

Wenn Positron nicht mehr auf einem Repo laufen soll:
1. GitHub Token-Rechte entziehen oder rotieren
2. Positron-Konfiguration für dieses Repo entfernen
3. Issue mit Offboarding-Datum dokumentieren

## Verbotene Repos

Positron darf **niemals** auf folgenden Repos laufen:
- Repos mit echten Nutzerdaten (DSGVO)
- Repos mit Finanztransaktionen
- Repos mit sicherheitskritischer Infrastruktur
- Repos von fremden Organisationen ohne explizite Einladung
