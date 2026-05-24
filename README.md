# Positron v0.1.0-rc.1

**Supervised autonomous GitHub Issue-to-PR/merge runner.**

> Status: Release Candidate · Production-ready for test repos and explicitly approved low-risk repos.

Positron überwacht GitHub Issues, durchläuft eine 21-Phasen-Pipeline von Claim über Spec/Plan/Implement/Test bis zu Commit, Push, PR Creation und kontrolliertem Auto-Merge — mit 7 Sicherheitsgates, Kill-Switch und Dry-Run vor jedem Merge.

## Validierter Pfad

```
Issue → CLAIMED → REPO_SYNC → SPECIFY → PLAN → TASKS
→ IMPLEMENT → TEST → COMMIT → PUSH → PR_CREATE
→ DRY-RUN (WOULD_MERGE) → MERGE → DONE
```

Erfolgreich validiert gegen `xxammaxx/positron-external-test`, PR #6, Merge Commit `67a6ab1f`.

## Quickstart

```bash
git clone https://github.com/xxammaxx/Positron.git
cd Positron
npm install
npm run build
npm test                    # 395 tests

# Quick demo (no GitHub token needed — fake mode):
npm start
# → Backend:  http://localhost:3000
# → Health:   http://localhost:3000/api/health
# → Frontend: cd apps/web && npm run build && npx vite preview --port 4173
#             http://localhost:4173

# Real mode (with GitHub token):
cp .env.example .env
# Edit .env: set GITHUB_TOKEN, POSITRON_REPO_OWNER, POSITRON_REPO_NAME
POSITRON_REPO_OWNER=... POSITRON_REPO_NAME=... GITHUB_MODE=real npm start
```

### Backend start (detail)

```bash
# Demo (fake — needs nothing):
cd apps/server && npx tsx server.ts

# Real mode (needs GITHUB_TOKEN):
GITHUB_TOKEN=ghp_... \
POSITRON_REPO_OWNER=xxammaxx POSITRON_REPO_NAME=mytestrepo \
GITHUB_MODE=real \
npx tsx server.ts
```

### Frontend start (separate terminal)

```bash
cd apps/web
npm run build
npx vite preview --port 4173
# → http://localhost:4173
```

### API Endpoints (localhost:3000)

```
GET  /api/health              → {"status":"ok","runs":<N>}
GET  /api/runs                → Alle Runs
GET  /api/runs/:id            → Run-Detail + Events
POST /api/repos/repo-1/runs   → Run starten
GET  /api/safety              → Safety-Gate-Status
GET  /api/adapters/health     → Adapter-Status
GET  /api/runs/:id/events/stream → SSE Live-Updates
```

**Hinweis zu Issues (0):** `GET /api/repos/:id/issues` liefert 0 Issues im Demo-Mode, weil kein reales GitHub-Repo konfiguriert ist. Mit `GITHUB_TOKEN` und `GITHUB_MODE=real` werden echte Issues abgerufen.

## Sicherheitsprofile (Default: Supervised)

```bash
# Safe defaults — alle mutierenden Aktionen deaktiviert
POSITRON_MERGE_KILL_SWITCH=true  # All merges blocked
POSITRON_ENABLE_MERGE=false      # Auto-merge disabled
POSITRON_ENABLE_PUSH=false       # Push disabled
POSITRON_ENABLE_FIX_LOOP=false   # Auto-retry disabled
```

## Dokumentation

| Bereich | Dokument |
|---------|----------|
| Release | [`v0.1.0-rc.1.md`](docs/release/v0.1.0-rc.1.md) |
| Betrieb | [`production-runbook.md`](docs/operations/production-runbook.md) |
| Sicherheit | [`threat-model.md`](docs/security/threat-model.md) — 10 Bedrohungen |
| Auto-Merge | [`auto-merge-safety-runbook.md`](docs/operations/auto-merge-safety-runbook.md) — 7 Gates |
| Isolation | [`agent-environment-isolation.md`](docs/security/agent-environment-isolation.md) |
| Onboarding | [`repository-onboarding-policy.md`](docs/operations/repository-onboarding-policy.md) |
| Env-Referenz | [`env-reference.md`](docs/configuration/env-reference.md) — 25+ Variablen |
| Profile | [`repository-profiles.md`](docs/configuration/repository-profiles.md) — 4 Level |
| Changelog | [`CHANGELOG.md`](CHANGELOG.md) — 48 Issues |

## Metriken (v0.1.0-rc.1)

| Metrik | Wert |
|--------|------|
| Issues | 48 |
| Tests | **395** (all passing) |
| Playwright E2E | 23 tests |
| Build | TypeScript strict, clean |
| Web Bundle | 224 KB JS + 19 KB CSS |
| Phasen | 21 (QUEUED → FAILED_UNSAFE) |

## Lizenz

[MIT](LICENSE)
