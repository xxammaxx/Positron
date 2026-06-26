# Phase 19 — CodeRabbit External App Removal Reminder

## Metadata
- **Timestamp (UTC):** 2026-06-26T08:15:00Z (approx)
- **Phase:** 19

## Status

| Field | Value |
|-------|-------|
| CodeRabbit repo-intern | DECOMMISSIONED (Phase 17, commit `5494851`) |
| CodeRabbit als Gate | NICHT VERWENDET |
| CodeRabbit in Code | KEINE aktiven Referenzen |
| CodeRabbit in Evidence | NUR HISTORISCH |
| CodeRabbit externe GitHub App | MÖGLICHERWEISE NOCH INSTALLIERT |

## Owner-Aktion erforderlich

Die KI entfernt die externe CodeRabbit-GitHub-App **nicht** ohne separate Owner-Aktion.

### Owner-Schritte zur Entfernung:

1. **GitHub Repository Settings öffnen:**
   - https://github.com/xxammaxx/Positron/settings

2. **Integrations / GitHub Apps prüfen:**
   - Navigiere zu Settings → Integrations → GitHub Apps
   - Suche nach "CodeRabbit" oder "coderabbit"

3. **CodeRabbit-Zugriff entfernen:**
   - Wähle die CodeRabbit-App aus
   - Klicke auf "Uninstall" oder "Remove"

4. **Webhooks prüfen:**
   - Navigiere zu Settings → Webhooks
   - Suche nach CodeRabbit-Webhooks
   - Entferne falls vorhanden

5. **Optional: Report erstellen lassen:**
   - Nach der Entfernung kann eine Bestätigungs-Evidence-Datei erstellt werden

## Hintergrund

- CodeRabbit wurde in Phase 17 als aktives Gate decommissioned
- Die repo-interne Decommission (Commit `5494851`) entfernte alle aktiven CodeRabbit-Referenzen
- Die externe GitHub-App kann unabhängig davon noch installiert sein
- Dies beeinträchtigt die Funktionalität nicht, da CodeRabbit intern nicht mehr verwendet wird
- Entfernung ist rein administrativ und optional
