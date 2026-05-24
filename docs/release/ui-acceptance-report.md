# UI Acceptance Report — v0.1.0-rc.1

> Stand: 2026-05-24 · Positron Issue #49

## Decision: User can open the UI — YES ✅

Das Positron Operator Dashboard ist lokal erreichbar und visuell verifiziert.

## How to Start

```bash
# Terminal 1 — Backend
cd apps/server
GITHUB_MODE=fake \
POSITRON_REPO_OWNER=test POSITRON_REPO_NAME=test \
npx tsx dogfood-runner.ts
# → http://localhost:3000

# Terminal 2 — Frontend
cd apps/web
npm run build && npx vite preview --port 4173
# → http://localhost:4173
```

Browser öffnen: `http://localhost:4173`

## Screenshots (9 captures)

Alle Screenshots liegen unter `docs/release/ui-acceptance/`.

| # | Datei | Zeigt | Bytes |
|---|-------|------|-------|
| 01 | `01-dashboard.png` | Header "Positron Operator Cockpit", Issues + Run-Liste | 52 KB |
| 02 | `02-issues.png` | Issues Section mit positron-Labeln | 52 KB |
| 03 | `03-safety-controls.png` | Safety Controls: 5 Flags (Enable Merge, Kill Switch, etc.) | 52 KB |
| 04 | `04-adapter-health.png` | Adapter Health Panel | 52 KB |
| 05 | `05-run-detail.png` | Run-Detailseite mit Run-ID, Phase, Branch | 192 KB |
| 06 | `06-pipeline.png` | 21-Phasen-Pipeline (QUEUED → FAILED_UNSAFE) | 192 KB |
| 07 | `07-merge-gates.png` | Merge Gates mit Status + Blockierungsgrund | 192 KB |
| 08 | `08-test-evidence-log.png` | Test Report + Evidence + Event Log | 192 KB |
| 09 | `09-full-run-detail.png` | Komplette Run-Detailseite (Full Page) | 192 KB |

## Visual Verification

| UI-Element | Confirmed |
|------------|-----------|
| Positron Header + Status | ✅ |
| Run List with Run IDs | ✅ |
| 21-Phase Pipeline (QUEUED → FAILED_UNSAFE) | ✅ |
| Merge Gates (6 gates with ✓/✗) | ✅ |
| Safety Controls (5 flags with ON/OFF) | ✅ |
| Adapter Health | ✅ |
| Test Report | ✅ |
| Evidence | ✅ |
| Event Log | ✅ |
| PR & Merge Block | ✅ |
| Autonomy Mode | ✅ |
| Run Controls (Pause/Abort/Resume/Retry) | ✅ |
| No Secrets in UI | ✅ |

## Leere Zustände

Wenn keine Runs existieren, zeigt das Dashboard:
- "Positron Operator Cockpit · 0 runs · ready" (Footer)
- "Issues" Section mit "No repository configured" (wenn kein Repo)
- Run-Liste leer mit "No runs yet"

Die leeren Zustände sind verständlich und geben klare Hinweise.

## Build

```bash
npm run build             # TypeScript strict, clean ✅
npm run build --prefix apps/web  # 224KB JS + 19KB CSS ✅
npm test                  # 395 passed ✅
```

## Conclusion

**User can open the UI: YES** ✅

Das Operator Dashboard ist vollständig funktionsfähig, alle Komponenten sind
visuell verifiziert, und die 9 Screenshots dokumentieren den Zustand.

**Ready for v0.1.0-rc.1 tag after UI acceptance: YES** ✅
