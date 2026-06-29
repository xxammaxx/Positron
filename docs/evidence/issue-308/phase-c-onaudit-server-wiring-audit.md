# Issue #308 Phase C — onAudit Server Wiring Audit

**Generated:** 2026-06-29T10:00:00+02:00
**Mode:** Phase C Readiness Recheck — NO Real Mode

---

## Audit Scope

Determine whether the `ToolGateway.onAudit` callback is wired at runtime by the server or worker for production use, or exists only as a test mock.

---

## Gateway Definition

**File:** `packages/tool-gateway/src/gateway.ts:60`

```typescript
public onAudit: ((call: ToolCall) => Promise<string>) | null = null;
```

The gateway exposes `onAudit` as an optional callback property. It is called BEFORE tool execution when `requiresAuditLog` is true on the tool definition (Gate 9: Audit Enforcement).

**Gate 9 behavior (lines 168-179):**
- If `requiresAuditLog === true` and `onAudit` is null → **BLOCKS** with `AUDIT_LOG_MISSING` reason.
- If `onAudit` throws → **BLOCKS** (fail-closed).
- If `onAudit` succeeds → returns audit evidence ID, proceeds.

---

## Runtime Wiring Check

### Server (`apps/server/src/index.ts`)

Search: `gateway.onAudit` → **NO RESULTS**
Search: `ToolGateway` → **NO RESULTS**  

The server never:
- Instantiates a `ToolGateway`
- Sets `gateway.onAudit`
- Passes an audit callback

The `ToolGateway` class is defined in `packages/tool-gateway/` but is **NOT consumed at all** in the `apps/server/` codebase.

### Worker (`apps/worker/src/`)

Search: `gateway.onAudit` → **NO RESULTS**
Search: `ToolGateway` → **NO RESULTS**

Same finding — the worker also never instantiates or configures a `ToolGateway`.

---

## Test Coverage

**File:** `packages/tool-gateway/src/__tests__/gateway.test.ts`
**File:** `packages/tool-gateway/src/__tests__/red/audit-enforcement.test.ts`

Tests exist that verify:
- Block when `requiresAuditLog` is true and no `onAudit` callback → ✅ PASS
- Allow when `requiresAuditLog` is true and `onAudit` succeeds → ✅ PASS
- Block when `onAudit` throws → ✅ PASS
- Block when no `onAudit` configured → ✅ PASS

**BUT:** All test `onAudit` callbacks are inline test mocks. No test verifies that the server/worker actually provides a production audit sink.

---

## Findings

| # | Question | Answer |
|---|----------|--------|
| 1 | Does `onAudit` exist in the Gateway? | ✅ YES — defined as `((call) => Promise<string>) | null` |
| 2 | Is `onAudit` wired by server? | ❌ NO — server never instantiates or configures ToolGateway |
| 3 | Is `onAudit` wired by worker? | ❌ NO — worker never instantiates or configures ToolGateway |
| 4 | Does missing `onAudit` block at runtime? | ❌ NO — ToolGateway is never called at runtime |
| 5 | Does audit write failure block? | ✅ YES (in gateway logic) — but gateway is never used |
| 6 | Are there only test mocks or real wiring? | 📋 TEST MOCKS ONLY |
| 7 | Are audit events persisted without secrets? | ❌ UNKNOWN — no runtime audit sink exists |
| 8 | Is there Audit-ID / Trace-ID / Run-ID linking? | ❌ NOT WIRED |
| 9 | Can audit failure lead to silent continuation? | ✅ YES — ToolGateway is unused, so no audit enforcement |

---

## Implications

The `ToolGateway` package provides a comprehensive audit enforcement framework (Gate 9) but:

1. **No integration** — Neither server nor worker integrates the gateway.
2. **No runtime audit** — No audit events are generated or persisted during pipeline execution.
3. **Enforcement gap** — The gate assembly tests validate that the gateway LOGIC is sound, but if the gateway is never used in production, Gate 9 enforcement is theoretical only.
4. **Local probe impact** — If the gateway is not used at all, `onAudit` wiring is not a prerequisite for a local temp workspace probe (since no tools are called through the gateway).

---

## Classification

```text
ON_AUDIT_SERVER_WIRING_STATUS: MISSING
```

**Justification:** The `ToolGateway` class defines `onAudit` and tests verify its behavior, but:
- The gateway is never instantiated in the server or worker
- No runtime audit sink is configured
- Gate 9 enforcement is theoretical at the gateway level
- However, this may NOT block a local temp workspace probe if the probe doesn't use the gateway

**Recommendation:** Create follow-up issue to wire the ToolGateway into the server/worker pipeline, or document that local-only probes are exempt from Gateway-wired audit. For a Controlled Real Probe, audit persistence must be addressed — either via the gateway or via an alternative mechanism.
