# Contributing to Positron

Danke, dass du zu Positron beitragen möchtest! Dieses Dokument beschreibt den Workflow für Contributions.

## Wichtige Dokumente

Bevor du beginnst, lies bitte:

1. **[AGENTS.md](AGENTS.md)** — Regeln für KI-Agenten und Entwickler
2. **[Constitution](.specify/memory/constitution.md)** — Nicht verhandelbare Projektgrundlage
3. **[Development Runbook](docs/runbooks/development.md)** — Entwicklungsumgebung

## Workflow

### Issue-basiert

Jede Arbeit beginnt mit einem GitHub Issue:

1. Prüfe, ob bereits ein Issue existiert
2. Wenn nicht, erstelle eines mit passendem Template (Bug, Feature, Security)
3. Warte auf Zuweisung oder Diskussion im Issue
4. Erstelle einen Branch: `positron/issue-<number>-<slug>`

### Branch-Regel

```
positron/issue-<number>-<slug>
```

Beispiele:
- `positron/issue-42-fix-race-condition`
- `positron/issue-99-add-dark-mode`

### Commit-Konvention

```
fix(issue-<n>): <Beschreibung>
test(issue-<n>): <Beschreibung>
docs(issue-<n>): <Beschreibung>
feat(issue-<n>): <Beschreibung>
chore(issue-<n>): <Beschreibung>
refactor(issue-<n>): <Beschreibung>
```

### Pull Request

1. PR von deinem Branch gegen `main`
2. Fülle das PR-Template aus
3. Stelle sicher, dass alle Checks grün sind
4. Fordere Review an
5. Merge erst nach Approval

## Dokumentations-Regeln (Docs-as-Code)

### Wann muss Dokumentation aktualisiert werden?

**Jede** Code-Änderung, die Folgendes betrifft, MUSS die Dokumentation aktualisieren:

- **API-Änderungen** (neue/geänderte Endpunkte, Parameter, Responses)
- **Konfigurationsänderungen** (neue/geänderte Umgebungsvariablen)
- **CLI-Änderungen** (neue/geänderte Befehle oder Flags)
- **Verhaltensänderungen** (Änderungen an State Machine, Phasen, Gates)
- **Architekturänderungen** (neue ADR oder Änderung von Abhängigkeiten)
- **Sicherheitsänderungen** (Trust-Tier-Änderungen, neue Policies)

### Wie wird Dokumentation aktualisiert?

1. **Im selben PR:** Feature-Code und Docs-Update gehören in denselben Pull Request.
2. **Diátaxis-Prinzip:** Ordne neue Inhalte dem richtigen Quadranten zu:
   - Tutorial / Getting Started → `docs/getting-started/`
   - How-to → `docs/how-to/`
   - Reference → `docs/reference/`
   - Explanation → `docs/explanation/`
3. **MkDocs-Navigation:** Füge neue Seiten in `mkdocs.yml` unter `nav:` hinzu.
4. **Glossary:** Neue Fachbegriffe in `docs/glossary.md` eintragen.

### Welche Dateien dürfen NICHT ohne Review geändert werden?

Diese Dateien sind etablierte Sources of Truth und benötigen Review vor Änderung:

- `.specify/memory/constitution.md`
- `AGENTS.md`
- `docs/architecture/adr/*.md` (ADRs sind immutable — nur neue ADRs hinzufügen)
- `mkdocs.yml`
- `.github/workflows/*.yml`
- `package.json` (Root)
- `tsconfig.json`

## Testing

### Vor jedem PR

```bash
# Unit/Integration-Tests
npm test

# E2E-Tests
npm run test:e2e

# TypeScript-Prüfung
npm run typecheck

# Linting
npm run lint

# Docs-Build (wenn Docs geändert)
mkdocs build --strict
npx markdownlint "docs/**/*.md" "*.md"
```

### Test-Erwartungen

- Neue Features brauchen Tests
- Bugfixes brauchen einen Regressionstest
- Docs-Änderungen brauchen `mkdocs build --strict`
- Nicht den Test-Coverage-Prozentsatz senken

## Evidence-Gated Progression

Die Positron-Constitution verlangt Evidence-Gated Progression (Artikel IV). Ein Task ist erst fertig, wenn:

1. Tests ausgeführt und bestanden
2. Build/Lint/Typecheck dokumentiert
3. Akzeptanzkriterien gemappt
4. Diff zusammengefasst
5. Risiken dokumentiert
6. GitHub-Issue kommentiert

### Für KI-generierte Beiträge

KI-generierte Dokumentation und Code-Beiträge:

- **Dürfen nicht ungeprüft gemerged werden.**
- Müssen fachlich auf Korrektheit geprüft werden.
- Reviewer müssen technische Korrektheit, Links, Beispiele und Sicherheitsrisiken prüfen.
- Evidence-Log muss geführt werden (siehe `docs/agent/EVIDENCE_LOG_TEMPLATE.md`).

### Klassifizierung von Inhalten

| Klassifizierung | Beschreibung | Markierung |
|---|---|---|
| **Öffentlich** | Für externe Nutzer sichtbar | Keine Markierung |
| **Intern** | Nur für das Entwicklungsteam | Kommentar `<!-- INTERNAL -->` |
| **Sensibel** | Enthält Architektur-Details zu Sicherheitsmechanismen | Review vor Veröffentlichung |

## Style Guidelines

- **Sprache:** Deutsch für Konzepte, Englisch für Code/API-Referenzen
- **Markdown:** `.markdownlint.json` beachten
- **Code-Beispiele:** Mit Sprachkennzeichnung (` ```typescript `)
- **Shell-Befehle:** Mit `bash`-Kennzeichnung (` ```bash `)
- **Links:** Relative Links bevorzugen

## Security

- Keine Secrets, Tokens oder Zugangsdaten in Code, Dokumentation oder Logs
- `.env` niemals committen (ist in `.gitignore`)
- Keine `sudo`-Befehle ohne explizite Genehmigung
- Keine Änderungen an `main`/`master` direkt
- Sicherheits-Issues über das Security-Template melden

## Fragen?

Öffne ein Issue oder kommentiere in einem bestehenden Issue.
