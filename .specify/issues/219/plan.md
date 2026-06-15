# Implementation Plan: MCP-Compatible Internal Tool Gateway

**Issue:** #219  
**Date:** 2026-06-15  
**Estimated Complexity:** High (new package, 9 new source files, 10+ test files, dashboard integration)

---

## Phase 1: Foundation — Shared Types & Package Setup

### 1.1 Create package skeleton
- `packages/tool-gateway/package.json` — depends on `@positron/shared`, `@positron/run-state`, `@positron/sandbox`
- `packages/tool-gateway/tsconfig.json` — extends root tsconfig
- `packages/tool-gateway/vitest.config.ts` — extends root vitest config
- Register in root `package.json` workspaces
- Add to root `tsc -b` build order

**Files:** 4 new files, 2 modified  
**Risk:** Low  

### 1.2 Define core types
- `packages/tool-gateway/src/types.ts`
- `ToolDefinition`, `ToolCall`, `ToolResult`, `RiskLevel`, `ApprovalMode`, `EgressPolicy`, `EvidenceConfig`
- `ToolHandler` function type
- Import `Phase`, `AutonomyLevel` from `@positron/shared`

**Files:** 1 new file  
**Risk:** Low  

---

## Phase 2: Tool Registry

### 2.1 Implement ToolRegistry
- `packages/tool-gateway/src/registry.ts`
- `ToolRegistry` class with `register()`, `get()`, `list()`, `has()`
- Immutable after finalization (`seal()`)
- Registration validates: ASCII id, schema presence, valid risk level

**Files:** 1 new source, 1 test  
**Risk:** Low  

---

## Phase 3: Gateway Service

### 3.1 Implement GatewayService
- `packages/tool-gateway/src/gateway.ts`
- Core `execute(toolCall)` method with full security pipeline
- **Gate 1:** Schema validation (inputSchema)
- **Gate 2:** Tool lookup (registry allowlist)
- **Gate 3:** Phase check (allowedPhases)
- **Gate 4:** Autonomy check (requiredAutonomyLevel vs run autonomyLevel)
- **Gate 5:** Approval check (riskLevel + approvalMode)
- **Gate 6:** Workspace boundary (path resolution for file tools)
- **Gate 7:** Egress check (network target validation)
- **Gate 8:** Secret redaction (arguments and output)
- Execution delegation to tool handler
- Evidence event generation
- Result assembly

**Files:** 1 new source, 1 test  
**Risk:** High (core security logic)  

---

## Phase 4: Built-in Tools

### 4.1 repo.read_file, repo.list_files, repo.get_diff
- `packages/tool-gateway/src/tools/repo.ts`
- Path validation against workspace root
- Delegates to sandbox or direct fs (read-only mode)
- `get_diff` uses git diff command

### 4.2 tests.detect, tests.run_selected
- `packages/tool-gateway/src/tools/tests.ts`
- Delegates to `@positron/sandbox` TestCommandDetector and TestRunner
- `run_selected` only runs pre-detected commands (no arbitrary shell)

### 4.3 evidence.append
- `packages/tool-gateway/src/tools/evidence.ts`
- Creates evidence event via RunStore

### 4.4 github.read_issue, github.comment_evidence_draft
- `packages/tool-gateway/src/tools/github.ts`
- Delegates to `@positron/github-adapter`
- `comment_evidence_draft` creates a draft comment (not published without approval)

**Files:** 4 new source files, 4 test files  
**Risk:** Medium  

---

## Phase 5: Security Layer — Tool Metadata Scanner

### 5.1 Implement ToolMetadataScanner
- `packages/tool-gateway/src/scanner.ts`
- Detection patterns:
  1. "ignore previous instructions" / "disregard" / "forget" patterns
  2. Unicode mixture (Latin + Cyrillic + CJK simultaneously)
  3. URL/exfiltration patterns (http://, https://, ftp://, data: URLs in description)
  4. Mismatched risk profile (description claiming safe but risk level is destructive)
  5. HTML/script injection patterns
  6. Base64-encoded hidden payloads
- `scan(toolDef: ToolDefinition): ScanResult { passed: boolean; warnings: string[]; blocked: boolean }`
- Called during `registry.register()`

**Files:** 1 new source, 1 test  
**Risk:** Medium  

---

## Phase 6: MCP Adapter (Experimental)

### 6.1 MCP Protocol mapping
- `packages/tool-gateway/src/mcp-adapter.ts`
- Maps internal `ToolDefinition` to MCP `Tool` type
- Maps internal `ToolCall` → MCP `CallToolRequest`
- Maps internal `ToolResult` → MCP `CallToolResult`
- Feature flag gated: `POSITRON_MCP_EXPOSE_ENABLED` (default: false)
- When disabled, adapter is a no-op

**Files:** 1 new source, 1 test  
**Risk:** Low (isolated, feature-flagged)  

---

## Phase 7: Dashboard Integration

### 7.1 API endpoint for tool data
- `apps/server/src/routes/tools.ts` (or inline in index.ts)
- `GET /api/tools` — list registered tools
- `GET /api/tools/calls?runId=X` — list tool calls for a run
- `POST /api/tools/approve` — approve a pending tool call

### 7.2 Dashboard components
- `apps/web/src/components/tools/ToolCallPanel.tsx` — shows recent tool calls
- `apps/web/src/components/tools/ToolRegistry.tsx` — shows available tools
- `apps/web/src/components/tools/ApprovalQueue.tsx` — pending approvals
- Update `App.tsx` routing: add `/tools` route
- Update `Sidebar.tsx`: add Tools nav item

**Files:** 3-4 new frontend files, 1-2 server changes  
**Risk:** Medium  

---

## Phase 8: Package Integration & Registration

### 8.1 Register in root workspace + build
- Update root `package.json` workspaces list
- Update root `tsc -b` build command
- Update `apps/server` dependencies to include `@positron/tool-gateway`

### 8.2 Register built-in tools at server startup
- In `apps/server/src/index.ts`: conditionally initialize GatewayService
- Register all 8 built-in tools
- Wire into run pipeline (tool calls from phases)

**Files:** 4 modified files  
**Risk:** Medium  

---

## Phase 9: Red Tests (Attack Scenarios)

### 9.1 8 Red Test files
All in `packages/tool-gateway/src/__tests__/red/`:

1. **tool-poisoning.test.ts** — Block poisoned tool registration
2. **path-traversal.test.ts** — Block `../../.env` path
3. **shell-injection.test.ts** — Validate no arg composition
4. **approval-bypass.test.ts** — Write tool blocked without approval
5. **egress-violation.test.ts** — Network attempt blocked
6. **secret-leakage.test.ts** — Secrets redacted from logs
7. **phase-violation.test.ts** — REVIEW-only tool blocked in CODE
8. **autonomy-violation.test.ts** — High-autonomy tool blocked at low level

**Files:** 8 new test files  
**Risk:** Low (test-only)  

---

## Phase 10: CI Integration & Gates

### 10.1 Typecheck, Lint, Unit Tests
- `npx tsc -b packages/tool-gateway`
- `npx vitest run --config packages/tool-gateway/vitest.config.ts`
- Existing pipeline tests must remain green

### 10.2 Secret Scan
- Run secret scanning on all new files
- Verify no API keys, tokens, or credentials in source

### 10.3 Integration verification
- Verify `npm test` in root still passes
- Verify `npx vitest run` includes new package

**Risk:** Low (verification only)  

---

## Dependency Graph

```
packages/tool-gateway/
  ├── @positron/shared (types, utils, redactSecrets)
  ├── @positron/run-state (createEvent)
  ├── @positron/sandbox (TestDetector, TestRunner, paths)
  └── @positron/github-adapter (read_issue, comment)

apps/server/
  └── @positron/tool-gateway (registration at startup)

apps/web/
  └── API calls to /api/tools/*
```

## File Count Summary

| Category | New Files | Modified Files |
|----------|-----------|----------------|
| Package skeleton + types | 5 | 2 (root pkg, build) |
| Registry + Gateway + Scanner | 3 | 0 |
| Built-in tools (4) | 4 | 0 |
| MCP Adapter | 1 | 0 |
| Tests (unit + red) | 13 | 0 |
| Server integration | 1 | 2 |
| Dashboard components | 3 | 2 |
| **Total** | **30** | **6** |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Secret exposure in logs | Medium | High | Existing redaction + red tests |
| Path traversal bypass | Low | High | Multiple gate layers |
| Breaking existing pipeline | Low | High | Regression tests first |
| Scope creep (community MCP) | Medium | High | Feature flag default off |
| Performance overhead | Low | Medium | Lazy tool loading |
