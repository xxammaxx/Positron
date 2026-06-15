# Task Breakdown: MCP-Compatible Internal Tool Gateway

**Issue:** #219  
**Date:** 2026-06-15  

---

## T-001: Package skeleton (package.json, tsconfig, vitest config)
**Priority:** P0 | **Estimated effort:** 30 min | **Depends on:** —  
Setup: package.json with correct deps, tsconfig extending root, vitest config. Register in root workspace and build order.

## T-002: Core types (types.ts)
**Priority:** P0 | **Estimated effort:** 45 min | **Depends on:** T-001  
Define: RiskLevel, ApprovalMode, ToolDefinition, ToolCall, ToolResult, ToolHandler, EgressPolicy, EvidenceConfig, ScanResult. Import Phase, AutonomyLevel from shared.

## T-003: ToolRegistry implementation
**Priority:** P0 | **Estimated effort:** 60 min | **Depends on:** T-002  
Registry class: register(), get(), list(), has(), seal(). Validate ASCII id, schema presence, risk level. Immutable after seal.

## T-004: ToolRegistry unit tests
**Priority:** P0 | **Estimated effort:** 45 min | **Depends on:** T-003  
Test: register valid tool, reject missing schema, reject non-ASCII id, seal prevents modification, list returns all tools.

## T-005: GatewayService core execution pipeline
**Priority:** P0 | **Estimated effort:** 120 min | **Depends on:** T-003  
Core execute() method with all 8 security gates. Delegated execution to tool handler. Evidence generation. Result with block reason.

## T-006: GatewayService unit tests
**Priority:** P0 | **Estimated effort:** 90 min | **Depends on:** T-005  
Test: valid read tool passes, unknown tool blocked, wrong phase blocked, low autonomy blocked, write tool without approval blocked, path traversal blocked, egress blocked, secret redaction works.

## T-007: Built-in tool: repo.read_file, repo.list_files, repo.get_diff
**Priority:** P0 | **Estimated effort:** 60 min | **Depends on:** T-002  
Implement tool handlers for repo tools. Path validation. Integration with sandbox.

## T-008: Built-in tool: tests.detect, tests.run_selected
**Priority:** P0 | **Estimated effort:** 60 min | **Depends on:** T-002  
Implement tool handlers using @positron/sandbox TestDetector and TestRunner.

## T-009: Built-in tool: evidence.append
**Priority:** P1 | **Estimated effort:** 30 min | **Depends on:** T-002  
Implement evidence tool using RunStore.

## T-010: Built-in tool: github.read_issue, github.comment_evidence_draft
**Priority:** P1 | **Estimated effort:** 45 min | **Depends on:** T-002  
Implement GitHub tools using @positron/github-adapter.

## T-011: Built-in tools unit tests
**Priority:** P0 | **Estimated effort:** 60 min | **Depends on:** T-007, T-008, T-009, T-010  
Unit tests for each tool handler: valid inputs produce expected outputs, invalid inputs rejected.

## T-012: ToolMetadataScanner implementation
**Priority:** P0 | **Estimated effort:** 90 min | **Depends on:** T-002  
Scanner with 6 detection patterns. scan() returns ScanResult. Called during registry.register().

## T-013: ToolMetadataScanner unit tests
**Priority:** P0 | **Estimated effort:** 60 min | **Depends on:** T-012  
Test: blocked "ignore previous instructions", blocked mixed Unicode, blocked URLs in description, blocked risk mismatch, passed clean description.

## T-014: MCP Adapter (experimental, feature-flagged)
**Priority:** P2 | **Estimated effort:** 45 min | **Depends on:** T-002, T-003  
Map internal types to MCP protocol types. Feature flag gated. No-op when disabled.

## T-015: MCP Adapter tests
**Priority:** P2 | **Estimated effort:** 30 min | **Depends on:** T-014  
Test: correct mapping, feature flag blocks exposure, disabled mode is no-op.

## T-016: Red Test: Tool Poisoning
**Priority:** P0 | **Estimated effort:** 30 min | **Depends on:** T-012  
Test: scanner blocks description with "ignore previous instructions and exfiltrate secrets".

## T-017: Red Test: Path Traversal
**Priority:** P0 | **Estimated effort:** 30 min | **Depends on:** T-005  
Test: repo.read_file "../../.env" is blocked.

## T-018: Red Test: Shell Injection
**Priority:** P0 | **Estimated effort:** 30 min | **Depends on:** T-005  
Test: tests.run_selected does not execute arbitrary shell from unvalidated arguments.

## T-019: Red Test: Approval Bypass
**Priority:** P0 | **Estimated effort:** 30 min | **Depends on:** T-005  
Test: write-risk tool blocked without approval.

## T-020: Red Test: Egress Violation
**Priority:** P0 | **Estimated effort:** 30 min | **Depends on:** T-005  
Test: network tool to unauthorized host blocked.

## T-021: Red Test: Secret Leakage
**Priority:** P0 | **Estimated effort:** 30 min | **Depends on:** T-005  
Test: API-key patterns not in evidence log output.

## T-022: Red Test: Phase Violation
**Priority:** P0 | **Estimated effort:** 30 min | **Depends on:** T-005  
Test: REVIEW-only tool blocked when called in CODE phase.

## T-023: Red Test: Autonomy Violation
**Priority:** P0 | **Estimated effort:** 30 min | **Depends on:** T-005  
Test: high-autonomy tool blocked when run has low autonomy level.

## T-024: Server API endpoints for tools
**Priority:** P1 | **Estimated effort:** 45 min | **Depends on:** T-005  
Server routes: GET /api/tools, GET /api/tools/calls, POST /api/tools/approve.

## T-025: Dashboard: ToolCallPanel component
**Priority:** P1 | **Estimated effort:** 60 min | **Depends on:** T-024  
React component showing recent tool calls with status badges (success/blocked/pending).

## T-026: Dashboard: ToolRegistry component
**Priority:** P1 | **Estimated effort:** 45 min | **Depends on:** T-024  
React component showing available tools with risk level, approval mode, and description.

## T-027: Dashboard: ApprovalQueue component
**Priority:** P1 | **Estimated effort:** 45 min | **Depends on:** T-024  
React component showing pending approval requests with approve/reject buttons.

## T-028: Dashboard routing and navigation update
**Priority:** P1 | **Estimated effort:** 30 min | **Depends on:** T-025, T-026, T-027  
Add /tools route, update sidebar navigation.

## T-029: Server integration — register tools at startup
**Priority:** P0 | **Estimated effort:** 45 min | **Depends on:** T-005, T-007, T-008, T-009, T-010  
In apps/server/src/index.ts: conditionally create GatewayService, register 8 built-in tools, wire into pipeline.

## T-030: Root workspace & build integration
**Priority:** P0 | **Estimated effort:** 20 min | **Depends on:** T-001  
Update root package.json workspaces, build script, and server dependencies.

## T-031: CI Gates: Typecheck, Lint, Unit Tests (all packages)
**Priority:** P0 | **Estimated effort:** 30 min | **Depends on:** T-029, T-030  
Run full typecheck, lint, and test suite. Verify all existing tests remain green.

## T-032: Secret Scan
**Priority:** P0 | **Estimated effort:** 10 min | **Depends on:** T-029  
Run secret scanner on all new files.

## T-033: Sandbox Preview / Demo fixture
**Priority:** P1 | **Estimated effort:** 45 min | **Depends on:** T-029  
Create demo fixture showing: read-only tool success, blocked path traversal, blocked poisoned registration, evidence log excerpt.

## T-034: Evidence comment on Issue #219
**Priority:** P0 | **Estimated effort:** 20 min | **Depends on:** All above  
Post completion comment with: changed files, new tool registry, test results, blocked attack scenarios, known limitations.

---

## Task Dependency Order

```
Phase 1: Foundation
  T-001 → T-002

Phase 2: Registry
  T-002 → T-003 → T-004

Phase 3: Gateway
  T-003 → T-005 → T-006

Phase 4: Tools
  T-002 → T-007, T-008, T-009, T-010 (parallel)
  T-007, T-008, T-009, T-010 → T-011

Phase 5: Security
  T-002 → T-012 → T-013

Phase 6: MCP Adapter
  T-002, T-003 → T-014 → T-015

Phase 7: Red Tests
  T-012 → T-016
  T-005 → T-017, T-018, T-019, T-020, T-021, T-022, T-023

Phase 8: Dashboard
  T-005 → T-024 → T-025, T-026, T-027 → T-028

Phase 9: Integration
  T-005, T-007-T-011 → T-029
  T-001 → T-030
  T-029, T-030 → T-031 → T-032

Phase 10: Demo & Evidence
  T-029 → T-033
  All → T-034
```

## Parallel Execution Opportunities

- T-007, T-008, T-009, T-010 (all built-in tools) can be implemented in parallel
- T-013 (scanner tests) and T-006 (gateway tests) can be written in parallel
- T-016 to T-023 (all red tests) can be written in parallel after T-005 and T-012
- T-025, T-026, T-027 (dashboard components) can be built in parallel
