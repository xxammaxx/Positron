# RealAdapter Safety Boundary Audit

**Issue:** #124  
**Date:** 2026-05-31  

## packages/opencode-adapter/src/real-adapter.ts

| Function | Safety-Relevant? | Reason | Target Level | Extraction |
|----------|:----------------:|--------|:------------:|:-----------|
| `healthCheck()` | Partially | CLI `--version` arg construction is safety-relevant; orchestration/error-handling is runtime | L1 (args) + L2 (runtime) | `buildOpenCodeVersionCommand()` |
| `runSlashCommand()` | Partially | Argument construction, prompt building, and result classification are safety-relevant; HTTP/process execution is runtime | L1 (args/prompt/result) + L2 (runtime) | `buildOpenCodeRunCommand()` + `buildOpenCodePrompt()` + `classifyOpenCodeResult()` |
| Constructor | Low | Evidence directory setup is runtime | L2 | — |
| `mapPhase()` | Partially | Phase-name mapping is a pure string function | L1 | Map is already a simple table |

**Key safety concerns:**
- CLI argument construction must NOT use unsupported flags (`--issue`, `--mode`, `--unsafe`)
- Prompt must NOT contain secrets
- Result classification must NOT allow dangerous commands through
- Missing binary must be detected (no silent fall-through)

## packages/speckit-adapter/src/real-adapter.ts

| Function | Safety-Relevant? | Reason | Target Level | Extraction |
|----------|:----------------:|--------|:------------:|:-----------|
| `healthCheck()` | Partially | `specify version` arg construction is safety-relevant | L1 (args) + L2 (runtime) | `buildSpecKitVersionCommand()` |
| `initialize()` | Partially | `specify init` args are safety-relevant; mode guard is safety-critical | L1 (args/mode guard) + L2 (runtime) | `buildSpecKitInitCommand()` + `validateSpecKitMode()` |
| `runSpecify()` / `runPlan()` / `runTasks()` / `runAnalyze()` | Partially | CLI args + result classification are safety-relevant | L1 | `buildSpecKitRunCommand()` + `classifySpecKitResult()` |
| `detectArtifacts()` | Partially | Artifact path validation is safety-relevant (no traversal) | L1 | Already uses `isPathSafe()` from artifact-scanner.ts |
| Constructor | Low | Evidence directory setup is runtime | L2 | — |

**Key safety concerns:**
- `initialize()` only allowed in `safe-cli` mode (mode guard)
- No install/download commands (`uvx`, `npm install -g`, etc.)
- CLI args must not allow arbitrary input
- Artifact paths must stay inside workspace (no traversal)
- Unknown slash commands must be classified correctly

## Classification Summary

### Extract to Level A (safety functions)

| Package | File | Functions |
|---------|------|-----------|
| opencode-adapter | `src/build-opencode-command.ts` | `buildOpenCodeRunCommand()`, `buildOpenCodeVersionCommand()`, `buildOpenCodePrompt()`, `classifyOpenCodeResult()` |
| speckit-adapter | `src/build-speckit-command.ts` | `buildSpecKitVersionCommand()`, `buildSpecKitInitCommand()`, `buildSpecKitRunCommand()`, `classifySpecKitResult()`, `validateSpecKitMode()` |

### Keep in Level B (runtime wrappers)

The RealAdapter classes themselves remain as runtime wrappers calling the extracted safety functions. This keeps the argument construction tested at 100% while the orchestration code is tested at Level B thresholds.
