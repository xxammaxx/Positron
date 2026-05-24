# UI Acceptance Report — v0.1.0-rc.1

> Stand: 2026-05-24 · Positron Issue #50

## Decision: User can open the UI — YES ✅

Das Positron Operator Dashboard ist lokal erreichbar, visuell geprüft, und alle 9 Screenshots sind mit eindeutigen Hashes dokumentiert.

## How to Start (Two Terminals)

```bash
# Terminal 1 — Backend (http://localhost:3000)
cd apps/server
GITHUB_TOKEN=<your-token> \
POSITRON_REPO_OWNER=xxammaxx \
POSITRON_REPO_NAME=positron-external-test \
GITHUB_MODE=real \
npx tsx dogfood-runner.ts

# Terminal 2 — Frontend (http://localhost:4173)
cd apps/web
npm run build
npx vite preview --port 4173
```

Browser öffnen: **http://localhost:4173**

## Screenshot Artifacts (9 captures, all unique)

Siehe `docs/release/ui-acceptance/` und `manifest.json`.

| # | File | Hash (SHA256) | Size | Description |
|---|------|---------------|------|-------------|
| 01 | `01-dashboard.png` | `1e02aca3a11f8222` | 63 KB | Dashboard Overview — Header, Issues, Run List, Footer |
| 02 | `02-issue-queue.png` | `b8b461798bae357c` | 4 KB | Issue Queue — Labels, positron:ready, Run-Button |
| 03 | `03-safety-controls.png` | `546947a1efa2cc86` | 13 KB | Safety Controls — 5 flags: Merge, Dry-Run, Push, Kill-Switch, Fix-Loop |
| 04 | `04-adapter-health.png` | `30db8b81bdff7238` | 2 KB | Adapter Health — GitHub, SpecKit, OpenCode availability |
| 05 | `05-run-detail-pipeline.png` | `e802122e709cac67` | 192 KB | Full Run Detail — Run info header with 21-phase pipeline |
| 06 | `06-merge-gates.png` | `f26cc8e2ab0c7498` | 114 KB | Merge Gates — Gate indicators with status and blocked reasons |
| 07 | `07-test-report-evidence.png` | `e334c6aa137ccdca` | 2 KB | Test Report card with PASS/FAIL status and evidence items |
| 08 | `08-event-log.png` | `afae87b28c86bb62` | 2 KB | Event Log — filter dropdowns by Level and Phase |
| 09 | `09-pr-autonomy-controls.png` | `4fb9bb57397f0d84` | 137 KB | PR & Merge, Autonomy Mode, Run Controls (Pause/Abort/Resume/Retry) |

## Reproducibility

```bash
# Alle Screenshots regenerieren:
cd apps/web
npx playwright test --config=playwright.config.ts e2e/ui-acceptance.spec.ts
# → 9 passing, 31s, outputs to docs/release/ui-acceptance/
```

## Validation

| Check | Result |
|-------|--------|
| Backend erreichbar | ✅ http://localhost:3000 |
| Frontend erreichbar | ✅ http://localhost:4173 |
| Screenshots existieren | ✅ 9 files in repo |
| Alle unterschiedlich | ✅ 9/9 unique SHA256 hashes |
| Manifest.json | ✅ 9 entries with file/route/timestamp/hash/description |
| Playwright reproduzierbar | ✅ 9 passing, 31s |
| Keine Secrets im UI | ✅ |
| npm test | 395 passed ✅ |
| npm run build | TypeScript strict ✅ |
| Web preview | 224KB ✅ |

## Conclusion

**User can open the UI: YES** ✅

**Ready for v0.1.0-rc.1 tag after UI acceptance: YES** ✅
