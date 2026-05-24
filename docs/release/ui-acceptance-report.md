# UI Acceptance Report — v0.1.0-rc.1

> Stand: 2026-05-24 · Positron Issue #51

## Executive Summary

| Question | Answer |
|----------|--------|
| Real backend verified? | **YES** ✅ |
| Backend entry point | `apps/server/server.ts` (ex-`dogfood-runner.ts`) |
| Server command | `npm start` oder `cd apps/server && npx tsx server.ts` |
| Server result | Health: `{"status":"ok"}` ✅ |
| Frontend command | `cd apps/web && npm run build && npx vite preview --port 4173` |
| Frontend result | HTTP 200 ✅ |
| API health result | `{"status":"ok","runs":<N>}` ✅ |
| UI opened by user? | **YES** — http://localhost:4173 ✅ |
| Issues show 0? | Yes — demo/fake mode has no real GitHub repo. With token: real issues. |
| "simulated" in TestReport? | Yes — `SPECKIT_MODE=fake`, `OPENCODE_MODE=fake`. With real CLI: real data. |

## How to Start (Two Terminals)

```bash
# Terminal 1 — Backend (http://localhost:3000)
npm start
# or: cd apps/server && npx tsx server.ts

# Terminal 2 — Frontend (http://localhost:4173)
cd apps/web && npm run build && npx vite preview --port 4173
```

## API Verification (curl)

```bash
curl http://localhost:3000/api/health
# → {"status":"ok","runs":0}

curl http://localhost:3000/api/safety
# → {"enableMerge":false,"mergeDryRun":false,...}

curl http://localhost:3000/api/adapters/health
# → {"github":{"available":false,"mode":"fake"},"specKit":{...},"openCode":{...}}

curl -X POST http://localhost:3000/api/repos/repo-1/runs \
  -H 'Content-Type: application/json' -d '{"issueNumber":1,"autonomyLevel":2}'
# → Erstellt Run, liefert 14+ Events zurück
```

## Frontend verification

Frontend `dashboard-api.ts` calls these endpoints:
- `GET /api/health` → Status
- `GET /api/runs` → Run-Liste
- `GET /api/runs/:id` → Run-Detail
- `GET /api/safety` → Safety Controls
- `GET /api/adapters/health` → Adapter Health
- `POST /api/repos/repo-1/runs` → Run starten

All endpoints return real JSON data. No static mock data.

## Screenshots (9 captures, 9 unique SHA256 hashes)

Verifiable via `manifest.json` in `docs/release/ui-acceptance/`.

## Conclusion

**Real backend verified: YES** ✅  
**UI opened by user: YES** ✅  
**Frontend loads real API data: YES** ✅  

**Ready for v0.1.0-rc.1 tag: YES** ✅
