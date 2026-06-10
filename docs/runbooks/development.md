# Development Runbook

Tägliche Entwicklungsumgebung, Build-Prozesse und Troubleshooting für Positron-Entwickler.

## Voraussetzungen

| Tool | Version | Prüfen |
|---|---|---|
| Node.js | v22+ | `node --version` |
| npm | v10+ | `npm --version` |
| git | 2.x | `git --version` |
| Python 3 (Docs) | 3.9+ | `python --version` |

## Erstinstallation

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Docs-Abhängigkeiten installieren (optional, für Docs-Build)
pip install -r requirements-docs.txt

# 3. Umgebung konfigurieren
cp .env.example apps/server/.env
# Editiere apps/server/.env
```

## Täglicher Workflow

### Entwicklung starten

```bash
# Terminal 1: Server bauen und starten
npm run build
node apps/server/dist/index.js

# Terminal 2: Frontend Dev Server
cd apps/web && npm run dev
```

### Tests ausführen

```bash
# Alle Unit/Integration-Tests
npm test

# Frontend-Tests
cd apps/web && npx vitest run

# E2E-Tests (headless)
npm run test:e2e

# E2E-Tests (visible browser)
npm run test:e2e:headed

# TypeScript-Typprüfung
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Dokumentation bauen

```bash
# MkDocs Dev Server (Live-Reload)
mkdocs serve

# MkDocs Build (strikter Modus)
mkdocs build --strict

# Markdown-Linting
npx markdownlint "docs/**/*.md" "*.md"
```

### Sauber bauen

```bash
npm run clean
npm run build
```

## Branch-Strategie

```
positron/issue-<number>-<slug>
```

Beispiel: `positron/issue-42-fix-race-condition`

## Commit-Konvention

```
fix(issue-<n>): <Beschreibung>
test(issue-<n>): <Beschreibung>
docs(issue-<n>): <Beschreibung>
feat(issue-<n>): <Beschreibung>
```

## Umgebungsvariablen

Siehe `.env.example` für die vollständige Liste.

| Variable | Beschreibung | Default |
|---|---|---|
| `POSITRON_GITHUB_MODE` | `fake` oder `real` | `fake` |
| `POSITRON_REPO_OWNER` | GitHub Repository Owner | — |
| `POSITRON_REPO_NAME` | GitHub Repository Name | — |
| `POSITRON_ENABLE_PUSH` | Push erlauben | `false` |
| `POSITRON_ENABLE_MERGE` | Merge erlauben | `false` |
| `POSITRON_MERGE_KILL_SWITCH` | Merge blockieren | `true` |
| `POSITRON_ENABLE_WATCHER` | Issue-Poller aktivieren | `false` |
| `POSITRON_SPECKIT_MODE` | `fake` oder `real` | `fake` |
| `POSITRON_OPENCODE_MODE` | `fake` oder `real` | `fake` |
| `GITHUB_TOKEN` | GitHub Personal Access Token | — |

## Troubleshooting

### Server startet nicht

1. Prüfe, ob `apps/server/.env` existiert und konfiguriert ist
2. Prüfe `POSITRON_REPO_OWNER` und `POSITRON_REPO_NAME`
3. `npm run build` ausführen
4. Logs prüfen: `node apps/server/dist/index.js 2>&1`

### Datenbank-Fehler

- Standard-Pfad: `~/.positron/positron.db`
- Prüfe Schreibrechte im Pfad
- `POSITRON_DB_PATH` kann in `.env` überschrieben werden

### GitHub Rate-Limiting (real mode)

- Setze `GITHUB_TOKEN` in `apps/server/.env`
- Wechsle zu `POSITRON_GITHUB_MODE=fake` für lokale Tests

### Merge wird nie ausgeführt

Prüfe in `.env`:
- `POSITRON_ENABLE_MERGE=true`
- `POSITRON_MERGE_KILL_SWITCH=false`
- `POSITRON_ENABLE_PUSH=true`

### Frontend kann API nicht erreichen

- Server muss laufen (`http://localhost:3000`)
- Prüfe `/api/health` im Browser
- CORS-Konfiguration prüfen

### TypeScript-Build-Fehler nach Clean

```bash
npm install    # node_modules neu installieren
npm run build  # Build wiederholen
```

### MkDocs-Build schlägt fehl

```bash
pip install -r requirements-docs.txt  # Python-Pakete installieren
mkdocs build --strict                 # Build wiederholen
```

## Docs-Workflow

Jede Code-Änderung, die Verhalten, API oder Konfiguration betrifft, **muss** die Dokumentation aktualisieren. Siehe [CONTRIBUTING.md](https://github.com/xxammaxx/Positron/blob/main/CONTRIBUTING.md) für Details.
