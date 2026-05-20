# Positron MVP Runbook

## Voraussetzungen

- Node.js >= 22 LTS
- npm >= 10
- Git >= 2.45
- GitHub Token mit `repo` Scope in `GITHUB_TOKEN` Env

## Quickstart

```bash
git clone https://github.com/xxammaxx/Positron.git
cd Positron
git checkout positron/issue-8-server-core
npm install
npm run build
npm test
```

## Server starten

```bash
cd apps/server
npx tsx src/index.ts
# Server läuft auf Port 3000
```

## API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| POST | `/api/repos` | Repository registrieren |
| GET | `/api/repos/:id/issues` | Issues eines Repos abrufen |
| POST | `/api/repos/:repoId/runs` | Run für Issue starten |
| GET | `/api/runs` | Alle Runs auflisten |
| GET | `/api/runs/:id` | Run-Details mit Events |
| GET | `/api/health` | Health-Check |

## Run starten

```bash
curl -X POST http://localhost:3000/api/repos/repo-1/runs \
  -H "Content-Type: application/json" \
  -d '{"issueNumber": 42, "autonomyLevel": 2}'
```

Response:
```json
{
  "run": {
    "id": "uuid",
    "phase": "DONE",
    "status": "done",
    "attempt": 1
  },
  "events": [
    { "phase": "CLAIMED" },
    { "phase": "REPO_SYNC" },
    ...
    { "phase": "DONE" }
  ],
  "eventCount": 17
}
```

## MVP-Phasen

```
QUEUED → CLAIMED → REPO_SYNC → ISSUE_CONTEXT
→ WEB_RESEARCH → SPECIFY → PLAN → TASKS
→ ANALYZE → REVIEW → IMPLEMENT → TEST
→ VERIFY → PR_CREATE → DONE
```

## Fehlerbehandlung

- `FAILED_TRANSIENT`: Max 3 Retries
- `FAILED_BLOCKED`: Manuelle Intervention nötig
- `FAILED_UNSAFE`: Sofortiger Stop
