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

# Configure (copy and edit)
cp .env.example .env
# Set: GITHUB_TOKEN, POSITRON_REPO_OWNER, POSITRON_REPO_NAME

# Start server
cd apps/server
GITHUB_TOKEN=... npx tsx dogfood-runner.ts
# Dashboard: http://localhost:3000
```

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
