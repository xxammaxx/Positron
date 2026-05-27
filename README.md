# Positron — Evidence-Gated Agent Execution

**Positron** ist ein agentisches Ausführungssystem für GitHub Issues. Es durchläuft einen 27-Phasen-Pipeline-Workflow (Spec → Plan → Tasks → Implement → Review → Merge) und produziert für jeden Schritt prüfbare Artefakte.

## Quickstart

### Docker (empfohlen)
```bash
git clone https://github.com/xxammaxx/Positron.git
cd Positron
docker compose up -d
# Server: http://localhost:3000
# Web UI: http://localhost:5173
```

### Manueller Start
```bash
git clone https://github.com/xxammaxx/Positron.git
cd Positron
./start.sh
# Server: http://localhost:3000
# Web UI: http://localhost:5173
```

### CLI
```bash
./positron health           # System-Check
./positron runs             # Letzte 20 Runs
./positron stats            # Admin-Statistiken
./positron cancel <run-id>  # Run abbrechen
```

## Konfiguration

Alle Einstellungen via Umgebungsvariablen oder `apps/server/.env`:

| Variable | Default | Beschreibung |
|:---------|:--------|:-------------|
| `GITHUB_MODE` | `fake` | `real` für echten GitHub-Zugriff |
| `GITHUB_TOKEN` | — | GitHub Personal Access Token |
| `POSITRON_ENABLE_PUSH` | `false` | Git-Push erlauben |
| `POSITRON_ENABLE_MERGE` | `false` | Auto-Merge erlauben |
| `POSITRON_MERGE_KILL_SWITCH` | `true` | Not-Aus |
| `POSITRON_WORKSPACE_ROOT` | — | Pfad für echten Workspace |
| `POSITRON_WEBHOOK_URL` | — | Slack/Discord Webhook |

## Features

- 🚀 27-Phasen-Pipeline: QUEUED → DONE inkl. Spec/Plan/Tasks/Review/Merge
- 📊 Dashboard: Echtzeit-SSE-Updates, Metriken, Attention-Queue
- 🔍 Evidence-Explorer: Artefakte, Testergebnisse, Screenshots
- ⚙️ Admin-Panel: Bulk-Cancel, Bulk-Retry, Cleanup, DB-Stats
- 🎨 Brutalist-Design: Dark/Light-Theme, Mobile-Responsive
- 🔒 Sicherheit: CSP, Rate-Limiting, Secret-Redaction, Kill-Switch
- 🐳 Docker: docker compose up in 2 Minuten
- 📝 CLI: positron health, runs, status, cancel, stats
- 🔔 Notifications: Slack/Discord-Webhooks

## Tests

```bash
npx vitest run         # 69 Tests
cd apps/web && npx vitest run  # 58 Tests  
npx playwright test    # 17 E2E-Tests
./scripts/dogfood-test.sh  # Dogfood-Test
```

## Architektur

```
Positron/
├── apps/
│   ├── server/   # Express/TypeScript Backend (Port 3000)
│   └── web/      # React/Vite/Tailwind Frontend (Port 5173)
├── packages/
│   ├── github-adapter/    # GitHub API (Fake/Real)
│   ├── speckit-adapter/   # Spec-Kit CLI
│   ├── opencode-adapter/  # OpenCode CLI
│   ├── run-state/         # State Machine + DB
│   ├── sandbox/           # Git Workspace (Fake/Real)
│   └── shared/            # Typen, Utilities
└── docker-compose.yml
```

## Lizenz

MIT
