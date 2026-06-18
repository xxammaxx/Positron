# Positron — Evidence-Gated AI Agent for Autonomous GitHub Issue Resolution

[![Version](https://img.shields.io/badge/version-v0.2.0-blue.svg)](https://github.com/xxammaxx/Positron/releases)
[![Tests](https://img.shields.io/badge/tests-2108%20passing-brightgreen.svg)](https://github.com/xxammaxx/Positron/actions)
[![E2E](https://img.shields.io/badge/e2e-17%20passing-brightgreen.svg)](https://github.com/xxammaxx/Positron/actions)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED?logo=docker)](https://github.com/xxammaxx/Positron)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev/)

**Positron** is an evidence-gated AI agent execution system for GitHub Issues. It runs a **28-phase pipeline** (QUEUED → CLAIMED → SPECIFY → PLAN → TASKS → IMPLEMENT → REVIEW → MERGE → DONE → CLEANUP) where every phase produces verifiable artifacts. A happy-path run progresses through ~17 execution phases. Each step is auditable, replayable, and gated by evidence requirements.

> **🇩🇪 German:** Positron ist ein agentisches Ausführungssystem für GitHub Issues. Es durchläuft eine 28-Phasen-Pipeline (QUEUED → CLAIMED → SPECIFY → PLAN → TASKS → IMPLEMENT → REVIEW → MERGE → DONE → CLEANUP) und produziert für jeden Schritt prüfbare Artefakte.

---

## Demo

[▶️ Watch the Demo Video](docs/release/video-demo/positron-v0.2.0-demo.webm)

![Dashboard](docs/screenshots/dashboard.png)
*Dashboard — Real-time SSE updates, run queue, system health*

| Evidence Explorer | Admin Panel | Run Detail |
|:---:|:---:|:---:|
| ![Evidence](docs/screenshots/evidence.png) | ![Admin](docs/screenshots/admin.png) | ![Run Detail](docs/screenshots/run-detail.png) |

---

## Quickstart

### Containerized MVP (Safe Demo Mode)

```bash
# One command — no secrets, no config, no real runs
docker compose up --build
# → Web UI:  http://localhost:3000
# → API:     http://localhost:3000/api/health
# → Gates:   http://localhost:3000/api/infrastructure-gates/status
```

> **Safe by default:** Tool Gateway sealed, Real Run disabled, Merge Kill Switch active. No GitHub token needed. See [Container Quickstart](docs/deployment/container-quickstart.md).

### Verify

```bash
# Health check
curl http://localhost:3000/api/health

# Full smoke test
node scripts/healthcheck.js --smoke
```

### Local Development

```bash
cp .env.example apps/server/.env
npm install
# Terminal 1: Server
npm run dev:server
# Terminal 2: Web frontend
npm run dev:web
# → http://localhost:5173
```

### CLI

```bash
./positron health           # System check
./positron runs             # Last 20 runs
./positron stats            # Admin statistics
./positron cancel <run-id>  # Cancel a run
```

For more deployment options (Proxmox CT 120, Podman, Real Mode), see [Deployment Docs](docs/deployment/).

---

## Key Features

- **🚀 28-Phase Pipeline** — QUEUED → CLAIMED → SPECIFY → PLAN → TASKS → IMPLEMENT → REVIEW → MERGE → DONE → CLEANUP. Each phase has mandatory evidence gates.
- **📊 Real-Time Dashboard** — SSE-powered live updates, run queue management, attention metrics, system health indicators.
- **🔍 Evidence Explorer** — Browse artifacts, test results, screenshots, and logs from every pipeline phase.
- **⚙️ Admin Panel** — Bulk cancel/retry, database statistics, workspace cleanup, system configuration.
- **🛡️ Safety Gates** — Kill-switch (`POSITRON_MERGE_KILL_SWITCH`), rate-limiting, CSP headers, secret redaction, audit trail enforcement.
- **🔌 Infrastructure Gates & Providers Dashboard** — 8 infrastructure gates (provider detection, model profile, model warm-up, Spec Kit sync, MCP warm-up, tool gateway, human approval, security) with read-only operator overview at `/providers`.
- **🔔 Notifications** — Slack/Discord webhooks for run completion, failures, and state changes.
- **🐳 Docker** — Single `docker compose up --build` deploys Web UI + API + SQLite in one container on port 3000. Safe demo mode — no secrets, no real runs.
- **📝 CLI** — `positron health`, `runs`, `stats`, `cancel`, `status` for operational management.
- **🎨 Brutalist Design** — Dark/light theme, mobile-responsive, accessible UI.

---

## Safety Architecture

Positron implements **evidence-gated progression** — no phase completes without verifiable proof:

| Layer | Mechanism | Enforced By |
|-------|-----------|-------------|
| **Merge Gate** | `POSITRON_MERGE_KILL_SWITCH=true` blocks all merges | Server-side config |
| **Push Gate** | `POSITRON_ENABLE_PUSH=false` blocks git pushes | Server-side config |
| **Evidence Gate** | Each pipeline phase requires passing tests + captured artifacts | Pipeline engine |
| **Audit Trail** | Every agent decision logged with timestamps + evidence hashes | Audit enforcer |
| **Rate Limiting** | Maximum 100 requests/minute per IP | Express middleware |
| **Secret Redaction** | `GITHUB_TOKEN`, API keys masked in logs | Log sanitizer |
| **Max Fix Loops** | Automatic stop after 3 failed attempts | State machine |

---

## Configuration

All settings via environment variables or `apps/server/.env`:

| Variable | Default | Description |
|:---------|:--------|:------------|
| `GITHUB_MODE` | `fake` | `real` for actual GitHub access |
| `GITHUB_TOKEN` | — | GitHub Personal Access Token |
| `POSITRON_ENABLE_PUSH` | `false` | Allow git push |
| `POSITRON_ENABLE_MERGE` | `false` | Allow auto-merge |
| `POSITRON_MERGE_KILL_SWITCH` | `true` | Emergency stop |
| `POSITRON_WORKSPACE_ROOT` | — | Path for real workspace |
| `POSITRON_WEBHOOK_URL` | — | Slack/Discord webhook |

---

## Tests

```bash
npx vitest run                  # 2108 unit/integration tests (of 2111; 3 pre-existing)
npx playwright test             # 25 E2E tests
./scripts/dogfood-test.sh       # Full dogfood pipeline test
```

2108/2111 unit/integration tests pass (3 pre-existing failures: Windows-specific + timeout). 140/140 contract tests pass. See `docs/status/` for full evidence index.

---

## Architecture

```
Positron/
├── apps/
│   ├── server/        # Express/TypeScript Backend (Port 3000)
│   │   ├── src/
│   │   │   ├── routes/        # REST API routes
│   │   │   ├── middleware/    # Auth, rate-limit, logging
│   │   │   ├── infrastructure/ # State stores, gate evaluation
│   │   │   └── services/     # Pipeline orchestration
│   │   └── __tests__/
│   └── web/           # React/Vite/Tailwind Frontend (Port 5173)
│       ├── src/
│       │   ├── components/   # Dashboard, Evidence, Admin, Runs
│       │   ├── pages/        # Oversight, BlueprintLauncher, Providers
│       │   ├── hooks/        # SSE, API consumers
│       │   └── __tests__/
│       └── e2e/
├── packages/
│   ├── github-adapter/    # GitHub API (Fake/Real modes)
│   ├── speckit-adapter/   # Spec-Kit CLI integration
│   ├── opencode-adapter/  # OpenCode CLI integration
│   ├── run-state/         # State machine + SQLite
│   ├── sandbox/           # Git workspace (Fake/Real)
│   └── shared/            # Types, SSE events, utilities
├── docs/
│   ├── screenshots/       # Product screenshots
│   ├── status/            # Current capabilities, limitations, evidence index
│   ├── security/          # Stop/ask protocol, security model
│   └── release/          # Release artifacts, proof reports
└── docker-compose.yml
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 22, TypeScript 5.7 |
| **Frontend** | React 18, Vite 6, Tailwind CSS 3 |
| **Backend** | Express 4, SQLite (better-sqlite3) |
| **State Machine** | Custom pipeline engine (28 phases) |
| **E2E Testing** | Playwright 1.60 |
| **Unit Testing** | Vitest 4 |
| **Container** | Docker + docker-compose |

---

## Dogfood Results (v0.2.0)

Positron successfully completed a **full dogfood run** on its own repository:

- **28-Phase State Machine**: Happy path (CLAIMED → DONE) completed in **13.7 seconds**
- **107 Tests**: All green
- **SSE Live Updates**: Dashboard + Event Timeline functional
- **PR Auto-Creation**: Blocked by Kill-Switch as configured
- **Evidence Trail**: Complete with screenshots, logs, test results

> Full proof: `docs/release/ui-workflow-proof-report.md`

---

## License

MIT

---

*Built with TypeScript, React, Vite, Tailwind CSS, Express, SQLite, Docker, and Playwright.*
