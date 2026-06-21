# CI Policy v1 — Local-First, Remote-Advisory

**Gültig ab:** 2026-06-21  
**Entscheider:** Projektleitung (Human Gate)  
**Scope:** Projektweit, bis auf Widerruf  
**Referenz:** Issue [#268](https://github.com/xxammaxx/Positron/issues/268)

## Policy

### §1 Lokale Gates sind maßgeblich

Vor jedem PR müssen folgende lokale Gates grün sein:

| Gate | Befehl | Erwartet |
|------|--------|----------|
| Format | `npx biome format .` | Exit 0 |
| Lint | `npx biome lint .` | Exit 0 |
| Tests | `npm test` (je Package) | Exit 0 |
| Build | `npm run build` (je Package) | Exit 0 |

### §2 GitHub Actions ist advisory-only

- GitHub Actions / Remote-CI hat **keine** Gate-Funktion.
- Ein roter Remote-CI-Status blockiert **nicht** den Merge.
- GitHub-CI-Fehler werden im PR als `advisory/pre-existing` markiert.

### §3 Keine GitHub-CI-Intervention

Folgende Aktionen sind **verboten** ohne separate ausdrückliche Freigabe:

- Manuelles Triggern von Workflows (`gh workflow run`, `gh run rerun`)
- Ändern von Workflow-Dateien (`.github/workflows/*.yml`)
- Hinzufügen neuer Workflows
- Budget-/Billing-Aktivierung für GitHub Actions
- Nutzung kostenpflichtiger Runner (larger runners, macOS, etc.)

### §4 Reaktivierung

Remote-CI wird erst wieder relevant bei explizitem Befehl:

```
APPROVE USE GITHUB CI FOR THIS RUN
```

### §5 Dokumentation

- Alle lokalen Gate-Ergebnisse werden in `.opencode/logs/audit/` dokumentiert.
- Exit-Codes und Evidence werden vor jedem PR gesichert.
- Issue #268 bleibt OPEN als dokumentierter Infrastruktur-/Kosten-Blocker, aber nicht als Entwicklungsblocker.

## Begründung

- GitHub Actions läuft unter Zero-Step-Run (Runner/Quota/Billing).
- Lokale Gates sind vollständig ausreichend für Codequalität.
- Kostenkontrolle: Keine unbeabsichtigten GitHub-Actions-Kosten.
- Fokus: Entwicklungsgeschwindigkeit statt Infrastruktur-Debugging.
