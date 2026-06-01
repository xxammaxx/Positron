# Coverage Gap Report — Top 20 Uncovered Files

**Generated:** 2026-05-31  
**Current Coverage:** 46.89% Lines | 37.15% Branches | 48.81% Functions | 45.6% Statements

## Top 20 Files by Uncovered Lines

| Rank | File | Lines % | Funcs % | Branches % | Uncovered | Why Hard | Strategy |
|------|------|:-------:|:-------:|:----------:|:---------:|----------|----------|
| 1 | `apps/server/index.ts` | 52.6% | 47.9% | 41.5% | **545** | 2909-Zeilen-Monolith, tie gekoppelt | Route-by-Route extrahieren, DI für Adapter |
| 2 | `apps/worker/pipeline-runner.ts` | 59.0% | 47.5% | 46.5% | **159** | 937 Zeilen, 16 Phasen inline | executePhase exportiert + phase-dispatch extrahieren |
| 3 | `packages/github-adapter/real-adapter.ts` | 0.0% | 0.0% | 0.0% | **119** | Benötigt Octokit-Mock | vi.mock('@octokit/rest') für createPullRequest etc. |
| 4 | `apps/server/cli.ts` | 0.0% | 0.0% | 0.0% | **86** | runCommand exportiert, parseArgs privat | vi.stubGlobal('fetch') + vi.spyOn(process.exit) |
| 5 | `packages/sandbox/real-adapter.ts` | 0.0% | 0.0% | 0.0% | **79** | Echte Git-Befehle | Integration-only — über FakeAdapter abdecken |
| 6 | `packages/github-adapter/sync-service.ts` | 0.0% | 0.0% | 0.0% | **74** | 8 Sync-Methoden, FakeGitHubAdapter injizieren | Teste mit FakeGitHubAdapter + In-Memory DB |
| 7 | `apps/worker/index.ts` | 0.0% | 0.0% | 0.0% | **65** | BullMQ Worker + Job Processor | vi.mock('bullmq') |
| 8 | `apps/server/sse/broadcaster.ts` | 22.8% | 9.1% | 4.4% | **44** | SSE, Rate-Limiting, EventSource | Mock Response-Objekte, vi.useFakeTimers |
| 9 | `apps/server/real-mode-check.ts` | 0.0% | 0.0% | 0.0% | **43** | Standalone-Diagnose, process.exit | Niedrige Priorität |
| 10 | `packages/opencode-adapter/real-adapter.ts` | 31.7% | 57.1% | 15.5% | **43** | CLI-Argumente, healthCheck getestet | Restliche runImplement/runSlashCommand-Pfade |
| 11 | `apps/server/github-watcher.ts` | 22.6% | 14.3% | 10.0% | **41** | GitHub Polling, DB-Insert | FakeGitHubAdapter + vi.useFakeTimers |
| 12 | `packages/opencode-adapter/sqlite-mcp.ts` | 0.0% | 0.0% | 0.0% | **39** | SQLite MCP-Server | In-Memory SQLite |
| 13 | `packages/run-state/db/connection.ts` | 0.0% | 0.0% | 0.0% | **29** | Prozess-Env-Abhängig | Low priority |
| 14 | `packages/sandbox/command-runner.ts` | 17.1% | 27.3% | 0.0% | **29** | spawn-Mock benötigt | vi.mock('node:child_process') |
| 15 | `apps/server/demo/live-run-handler.ts` | 3.7% | 50.0% | 0.0% | **26** | SSE, Security-Gate, State | Supertest mit Fake-Deps |
| 16 | `packages/sandbox/test-runner.ts` | 0.0% | 0.0% | 0.0% | **26** | command-runner integration | vi.mock('./command-runner.js') |
| 17 | `packages/github-adapter/fake-adapter.ts` | 73.3% | 57.7% | 51.3% | **24** | Restliche Methoden | Erweitern |
| 18 | `packages/sandbox/dogfood-fixture.ts` | 0.0% | 0.0% | 0.0% | **22** | fs.writeFileSync | vi.mock('node:fs') |
| 19 | `packages/opencode-adapter/sqlite-mcp-proxy.ts` | 0.0% | 0.0% | 0.0% | **19** | Dispatch-Logik | vi.mock('./sqlite-mcp.js') |
| 20 | `packages/sandbox/detector.ts` | 42.3% | 100% | 38.5% | **15** | fs.mock oder temp dirs | Bestehender Test mit temp dir |

## Summary

- **Total uncovered lines across Top 20:** ~1,600
- **Blueprint to 60%:** Need to cover ~440 additional lines
- **Best bets:** server index.ts extraction (545 uncovered → even 30% = 163), pipeline-runner (159), github real-adapter (119)
