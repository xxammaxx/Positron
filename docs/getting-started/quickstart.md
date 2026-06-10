# Getting Started with Positron

Diese Anleitung führt dich durch Installation, Konfiguration und den ersten Positron-Run.

## Voraussetzungen

- **Node.js** v22 oder höher
- **npm** v10 oder höher
- **git**
- **Python 3.9+** (nur für Docs-Build, optional)

## Installation

```bash
# 1. Repository klonen
git clone https://github.com/xxammaxx/Positron.git
cd Positron

# 2. Abhängigkeiten installieren
npm install

# 3. Umgebung konfigurieren
cp .env.example apps/server/.env
```

## Konfiguration

Editiere `apps/server/.env` und setze mindestens:

```ini
POSITRON_GITHUB_MODE=fake
POSITRON_REPO_OWNER=dein-username
POSITRON_REPO_NAME=dein-repo
```

Für echte GitHub-API-Nutzung:
```ini
POSITRON_GITHUB_MODE=real
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
POSITRON_ENABLE_PUSH=true
```

> **Sicherheitshinweis:** `.env` ist in `.gitignore`. Gib niemals Secrets preis.

## Erster Build

```bash
# Alles kompilieren
npm run build
```

## Server starten

```bash
# Server im Fake-Mode (kein GitHub-Token nötig)
node apps/server/dist/index.js
```

Der Server läuft auf `http://localhost:3000`.

## Frontend starten

In einem zweiten Terminal:

```bash
cd apps/web && npm run dev
```

Das Frontend läuft auf `http://localhost:5173`.

## Erster Run

1. Öffne `http://localhost:5173` im Browser
2. Registriere ein Repository (`POST /api/repos`)
3. Starte einen Run (`POST /api/repos/:repoId/runs`)
4. Beobachte den Fortschritt im Dashboard und Run-Detail-View

## Nächste Schritte

- [CLI-Nutzung](../workflows/cli.md) — Positron per Kommandozeile steuern
- [GitHub Watcher](../workflows/development.md) — Automatische Issue-Erkennung
- [Development Setup](../runbooks/development.md) — Vollständige Entwicklungsumgebung
- [Architektur-Überblick](../architecture/README.md) — Systemdesign verstehen
