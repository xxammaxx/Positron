# Audit Enforcement Discovery — Issue #322

## Timestamp
2026-06-29T11:05:00Z

## Source: Issue #245 Implementation

### GatewayService (packages/tool-gateway/src/gateway.ts)

| Element | Location | Status |
|---------|----------|--------|
| `GatewayService` class | `packages/tool-gateway/src/gateway.ts:43` | EXISTS, fully implemented |
| `onAudit` callback | `packages/tool-gateway/src/gateway.ts:60` | EXISTS, type `((call: ToolCall) => Promise<string>) \| null` |
| `onEvidence` callback | `packages/tool-gateway/src/gateway.ts:51` | EXISTS |
| `onApprovalCheck` callback | `packages/tool-gateway/src/gateway.ts:67` | EXISTS |
| Gate 9: Audit enforcement | `packages/tool-gateway/src/gateway.ts:161-184` | EXISTS, fully implemented |
| `requiresAuditLog` type | `packages/tool-gateway/src/types.ts:77-78` | EXISTS, `boolean \| undefined` |
| `AUDIT_LOG_MISSING` block reason | `packages/tool-gateway/src/types.ts:178` | EXISTS |
| Scanner recommends `requiresAuditLog` | `packages/tool-gateway/src/scanner.ts:193-199` | EXISTS |

### Gate 9 Semantics (gateway.ts:161-184)

```
if (def.requiresAuditLog === true) {
    if (!this.onAudit) {
        return blocked(AUDIT_LOG_MISSING, "no audit callback configured");
    }
    try {
        auditEvidenceId = await this.onAudit(call);
    } catch (auditError) {
        return blocked(AUDIT_LOG_MISSING, "audit log write failed: ...");
    }
}
```

Behavior:
- **Missing callback:** Blocks with `AUDIT_LOG_MISSING`
- **Callback throws:** Blocks with `AUDIT_LOG_MISSING`
- **Callback succeeds:** Audit evidence ID stored, tool execution proceeds
- **Not required:** Tool executes normally, audit callback NOT called

### Existing Tests (#245)

| Test File | Location | Test Count |
|-----------|----------|-----------|
| `audit-enforcement.test.ts` | `packages/tool-gateway/src/__tests__/red/` | 16 test cases |
| `gateway.test.ts` (Gate 9) | `packages/tool-gateway/src/__tests__/` | 6 test cases |
| `gate-assembly.test.ts` (B5) | `packages/run-state/src/__tests__/` | Phase-B gate assembly tests |

### Key Findings

1. **GatewayService is fully implemented** — Gate 9 audit enforcement is complete
2. **ToolRegistry exists** — with scanner-based registration validation
3. **Built-in tools exist** — repo, tests, evidence, github tools are implemented
4. **Server does NOT import GatewayService** — Zero imports from `@positron/tool-gateway` in `apps/server`
5. **Worker does NOT import GatewayService** — Zero imports from `@positron/tool-gateway` in `apps/worker`
6. **No onAudit wiring** — The `onAudit` callback is `null` at runtime because no GatewayService instance exists in the server/worker
7. **Adapters called directly** — Server calls `speckit.runSpecify()`, `opencode.runSlashCommand()` etc. directly, bypassing GatewayService entirely

### Classification

```text
ISSUE_322_AUDIT_ENFORCEMENT_DISCOVERY_STATUS: COMPLETE
```

**Reasoning:** All #245 audit enforcement code is in `packages/tool-gateway`. Gate 9 is fully implemented with tests. The gap is that GatewayService is never instantiated or imported in the server/worker runtime. `onAudit` remains `null` because there's no runtime wiring.
