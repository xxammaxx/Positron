# Positron v0.2.0 — Product Hunt & Show HN Launch Post

---

## Title

**Positron — Evidence-Gated AI Agent for Autonomous GitHub Issue Resolution**

## Tagline

28-phase pipeline: QUEUED → CLAIMED → SPECIFY → PLAN → TASKS → IMPLEMENT → REVIEW → MERGE → DONE → CLEANUP. Every step auditable, every phase gated by verifiable evidence.

---

## Key Features

### 1. 🚀 28-Phase Autonomous Pipeline
Positron runs a complete software development workflow: from issue QUEUED → CLAIMED → SPECIFY → PLAN → TASKS → IMPLEMENT → REVIEW → MERGE → DONE → CLEANUP. A happy-path run progresses through ~17 execution phases in about 14 seconds on its own repository.

### 2. 🛡️ Safety-First Architecture
Every safety layer is built-in, not bolted on:
- **Kill-Switch** (`POSITRON_MERGE_KILL_SWITCH=true`) — blocks all merges by default
- **Evidence Gates** — no phase completes without passing tests + captured artifacts
- **Secret Redaction** — tokens and API keys are masked in all logs
- **Rate Limiting** — 100 req/min per IP
- **Audit Trail** — every agent decision logged with timestamps and evidence hashes

### 3. 🔍 Evidence-Gated Progression
Unlike traditional CI/CD or agent frameworks, Positron requires **verifiable proof** at every pipeline phase:
- Tests must pass before MERGE
- Screenshots and logs captured at each step
- Immutable audit trail for compliance and debugging
- All artifacts browsable in the Evidence Explorer

### 4. 📊 Real-Time Dashboard with SSE
Live-updating dashboard showing:
- Run queue and phase progression
- System health indicators (GitHub adapter, SpecKit, OpenCode)
- Attention metrics and performance data
- Event timeline with millisecond precision

### 5. 🔧 Full Stack — Ready to Deploy
- **Docker**: `docker compose up -d` in 2 minutes
- **CLI**: `positron health`, `runs`, `stats`, `cancel`
- **Web UI**: React/Vite dashboard, admin panel, evidence explorer
- **API**: REST endpoints for all operations

---

## Demo

▶️ **[Watch the Demo Video](https://github.com/xxammaxx/Positron/blob/main/docs/release/video-demo/positron-v0.2.0-demo.webm)**

Screenshots:
| Dashboard | Evidence Explorer | Admin Panel |
|:---:|:---:|:---:|
| ![Dashboard](../screenshots/dashboard.png) | ![Evidence](../screenshots/evidence.png) | ![Admin](../screenshots/admin.png) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 22 + TypeScript 5.7 |
| **Frontend** | React 18, Vite 6, Tailwind CSS 3 |
| **Backend** | Express 4, SQLite (better-sqlite3) |
| **State Machine** | Custom 28-phase pipeline engine |
| **Container** | Docker + docker-compose |
| **E2E Tests** | Playwright 1.60 |
| **Unit Tests** | Vitest 4 |

---

## First Comment (Safety & Governance)

> **Why the Kill-Switch?**
>
> Positron is designed to operate autonomously, but we believe autonomous agents need **hard safety boundaries**. That's why:
>
> 1. **Merge Kill-Switch**: `POSITRON_MERGE_KILL_SWITCH=true` is the default. Even when everything works, the agent cannot merge code without explicit human approval.
> 2. **Evidence Gates**: Before any phase transition, the system verifies that required evidence exists — test results, screenshots, log output. No evidence, no progression.
> 3. **Fake Mode by Default**: `GITHUB_MODE=fake` means the agent starts in simulation mode. Real GitHub access requires explicit configuration.
> 4. **Audit Trail**: Every tool call, decision, and phase transition is logged with timestamps and SHA-256 hashes of evidence files. Nothing is invisible.
> 5. **Max Fix Loops**: If the agent fails 3 times on the same task, it stops automatically and reports the failure.
>
> We believe the future of AI coding agents isn't just about capability — it's about **trust through transparency**. Positron is our attempt to build that future.

---

## Links

- **GitHub Repository**: https://github.com/xxammaxx/Positron
- **Documentation**: https://github.com/xxammaxx/Positron#readme
- **Demo Video**: https://github.com/xxammaxx/Positron/blob/main/docs/release/video-demo/positron-v0.2.0-demo.webm
- **Workflow Proof Report**: https://github.com/xxammaxx/Positron/blob/main/docs/release/ui-workflow-proof-report.md
- **Dogfood Pipeline Results**: https://github.com/xxammaxx/Positron/issues/102

---

## Product Hunt Specifics

- **Category**: Developer Tools → AI Code Assistant
- **Hunter**: (self-submit or find a hunter)
- **Tags**: open-source, developer-tools, AI, automation, github, agent

## Show HN Tips

- Post title: "Show HN: Positron – Evidence-gated AI agent that resolves GitHub issues autonomously"
- Focus on the safety architecture — HN users care about agent safety
- Mention the 28-phase pipeline and the dogfood results (13.7s end-to-end happy path)
- Link to the workflow proof report for credibility
