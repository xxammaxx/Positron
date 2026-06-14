# Positron — Evidence-Gated AI Agent for Autonomous GitHub Issue Resolution

[![Version](https://img.shields.io/badge/version-v0.2.0-blue.svg)](https://github.com/xxammaxx/Positron/releases)
[![Tests](https://img.shields.io/badge/tests-107%20passing-brightgreen.svg)](https://github.com/xxammaxx/Positron/actions)
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

### 🎮 Demo Mode (No GitHub Token Required)

Start Positron in demo mode — fake adapters, safety defaults ON, no real GitHub access:

```bash
npm install
npm run doctor         # Check system health (optional)
npm run dev:demo       # Start server + frontend
```

Open your browser:

| URL | Description |
|-----|-------------|
| http://localhost:5173 | Frontend (React Dashboard) |
| http://localhost:3000 | Backend API |
| http://localhost:3000/api/health | Health Check |

**Demo Mode defaults:**
- `POSITRON_GITHUB_MODE=fake` — no real GitHub API calls
- `POSITRON_ENABLE_PUSH=false` — no git pushes
- `POSITRON_ENABLE_MERGE=false` — no merges
- `POSITRON_MERGE_KILL_SWITCH=true` — merge kill-switch active
- `POSITRON_ENABLE_FIX_LOOP=false` — no autonomous fix loops

### 🔧 Real / Supervised Mode (GitHub Token Required)

For production use with actual GitHub integration:

```bash
cp .env.example .env
# Edit .env: set GITHUB_TOKEN, POSITRON_REPO_OWNER, POSITRON_REPO_NAME
# Set POSITRON_GITHUB_MODE=real for real GitHub API
npm run doctor         # Verify configuration
npm run dev            # Start with safety defaults
```

**⚠️ Important Safety Notes:**
- Push, merge, and fix-loop are **OFF by default**
- Enable only after explicit human approval
- Kill-switch `POSITRON_MERGE_KILL_SWITCH=true` prevents accidental merges
- Never run in real mode against production repos without dry-run first

### 🐳 Docker (Full Stack)

```bash
cp .env.example .env
# Edit .env: set GITHUB_TOKEN and mode flags
docker compose up --build
# → http://localhost:5173
```

Stop with:
```bash
docker compose down
```

### 🏥 System Health

```bash
npm run doctor     # Check Node, ports, Redis, Git, Safety defaults
npm run verify     # Run all tests, contracts, typecheck, build, safety coverage
```

### 🔬 Verify Everything

```bash
npm run verify
# Runs: npm test → test:contracts → typecheck → build → coverage:safety
```

### CLI

```bash
./positron health           # System check
./positron runs             # Last 20 runs
./positron stats            # Admin statistics
./positron cancel <run-id>  # Cancel a run
```

### 🛟 Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 3000/5173 occupied | Kill existing processes: `npx kill-port 3000 5173` |
| Redis not running | Worker falls back to inline (dev-mode only). Start Redis: `docker compose up redis -d` |
| GitHub Token missing | Demo mode works without token. For real mode: set `GITHUB_TOKEN` in `.env` |
| `SQLITE_BUSY: database is locked` | Kill stale server processes; delete `.positron/runs/positron.db` |
| Vite/Frontend won't start | Clear cache: `rm -rf apps/web/node_modules/.vite` |
| Backend health check fails | Check logs; ensure `npm run build` completed successfully |
| CI fails locally (Biome) | Run `npm run format` then `npm run lint` |

---

## Key Features

- **🚀 28-Phase Pipeline** — QUEUED → CLAIMED → SPECIFY → PLAN → TASKS → IMPLEMENT → REVIEW → MERGE → DONE → CLEANUP. Each phase has mandatory evidence gates.
- **📊 Real-Time Dashboard** — SSE-powered live updates, run queue management, attention metrics, system health indicators.
- **🔍 Evidence Explorer** — Browse artifacts, test results, screenshots, and logs from every pipeline phase.
- **⚙️ Admin Panel** — Bulk cancel/retry, database statistics, workspace cleanup, system configuration.
- **🛡️ Safety Gates** — Kill-switch (`POSITRON_MERGE_KILL_SWITCH`), rate-limiting, CSP headers, secret redaction, audit trail enforcement.
- **🔔 Notifications** — Slack/Discord webhooks for run completion, failures, and state changes.
- **🐳 Docker** — Single `docker compose up --build` deploys the full stack (redis, worker, server, web, nginx).
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
npx vitest run                  # 107 unit/integration tests
cd apps/web && npx vitest run   # 58 frontend tests
npx playwright test             # 17 E2E tests
./scripts/dogfood-test.sh       # Full dogfood pipeline test
```

All 107 tests pass. Full E2E workflow proof documented in `docs/release/ui-workflow-proof/`.

---

## Architecture

```
Positron/
├── apps/
│   ├── server/        # Express/TypeScript Backend (Port 3000)
│   │   ├── src/
│   │   │   ├── routes/        # REST API routes
│   │   │   ├── middleware/    # Auth, rate-limit, logging
│   │   │   └── services/     # Pipeline orchestration
│   │   └── __tests__/
│   └── web/           # React/Vite/Tailwind Frontend (Port 5173)
│       ├── src/
│       │   ├── components/   # Dashboard, Evidence, Admin, Runs
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
