# Server/Worker Runtime Discovery — Issue #322

## Timestamp
2026-06-29T11:05:00Z

## Server Architecture (apps/server/src/index.ts)

### Key Functions
| Function | Line | Purpose |
|----------|------|---------|
| `createApp(options)` | 2302 | Main Express app factory, initializes adapters, DB, gate evaluators |
| `executePhase(run, ...)` | 625 | Phase execution switch — calls adapters directly |
| `runFullPipeline(run, ...)` | 1569 | Main pipeline loop — orchestrates phases |
| `resolveOpencodeAdapter()` | 228 | Creates FakeOpenCodeAdapter or RealOpenCodeAdapter |
| `resolveSpeckitAdapter()` | 214 | Creates appropriate SpeckitAdapter |

### Adapter Initialization (createApp)
- `SecretManager` — centralized secret resolution (line 2294)
- `resolveRepositoryConfig()` — repository config (line 2306)
- `resolveAdapter()` — GitHub adapter (line 2307)
- `resolveSpeckitAdapter()` — SpecKit adapter (line 2309)
- `resolveOpenCodeAdapter()` — OpenCode adapter (line 2310)
- `GitHubStatusSyncService` — sync service (line 2311)
- `registerFakeGateEvaluators()` — gate evaluators (line 2316)
- `createInstrumentedOpenCodeAdapter()` — metrics wrapper (line 2320)

### GatewayService: NOT PRESENT
- Zero imports from `@positron/tool-gateway`
- No `GatewayService` instantiation
- No `ToolRegistry` instantiation
- No `onAudit` wiring

### Tool Execution Path
The server executes phases by calling adapter methods directly:
- `speckit.initialize()` / `speckit.runSpecify()`
- `opencode.runSlashCommand()`
- `workspace.prepareWorkspace()`
- GitHub sync operations

These adapter calls bypass GatewayService entirely.

## Worker Architecture (apps/worker/src/pipeline-runner.ts)

### Key Elements
| Element | Line | Purpose |
|---------|------|---------|
| `PipelineDeps` interface | 42 | DI container for worker dependencies |
| `runPipeline(run, deps)` | 1303 | Main pipeline loop (worker version) |
| `executePhase(run, deps)` | (earlier) | Phase execution (worker version) |
| `worker.on('completed')` | 192 | Job completion handler |
| `worker.on('failed')` | 196 | Job failure handler |

### GatewayService: NOT PRESENT
- Zero imports from `@positron/tool-gateway`
- No `GatewayService` in `PipelineDeps` interface
- No `onAudit` wiring

### Worker Entry Point (apps/worker/src/index.ts)
- `registerFakeGateEvaluators()` called at line 109
- `Worker<PipelineJobData, PipelineJobResult>` from BullMQ at line 116
- Calls `runPipeline(data.run, deps)` for each job

## Run-State Gate Evaluators (packages/run-state/src/gate-evaluator.ts)

### Current Gates
| Gate | Evaluator |
|------|-----------|
| `pre_run` | fake pass |
| `pre_write` | fake pass |
| `pre_push` | fake pass |
| `pre_pr` | fake pass |
| `pre_merge` | fake pass |
| `evidence_required` | fake pass |
| `security` | fake pass |
| `human_approval` | fake pass |

These are PHASE-LEVEL gates, separate from GatewayService's TOOL-LEVEL gates.

## Existing Audit/Evidence Infrastructure

| Element | Location | Status |
|---------|----------|--------|
| `storeEvent()` | server/index.ts | DB-based event storage |
| `storeEvent()` | worker/pipeline-runner.ts | DB-based event storage |
| `saveArtifact()` | both | File-based artifact storage |
| `buildEvidence()` | worker | Evidence item builder |
| Evidence gate evaluator | run-state | `evidence_required` gate |

## Injection Points for GatewayService Wiring

### Server
Best injection point: `createApp()` function (line 2302), alongside other adapter initialization.
- After `registerFakeGateEvaluators()` (line 2316)
- Before Express app creation (line 2321)

### Worker
Best injection point: Worker's `PipelineDeps` interface or worker index.ts.
- After `registerFakeGateEvaluators()` (line 109)
- Before `Worker` instantiation (line 116)

## Classification

```text
ISSUE_322_RUNTIME_DISCOVERY_STATUS: COMPLETE
```

**Reasoning:** Full runtime architecture mapped. GatewayService is completely absent from both server and worker. Both use adapter-pattern with direct method calls. The audit sink needs to be wired as a GatewayService callback, and the GatewayService needs to be instantiated in both runtimes.
