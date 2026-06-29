# Issue #322 Intake

## Timestamp
2026-06-29T11:01:00Z

## Issue Details

### Source
- **URL:** https://github.com/xxammaxx/Positron/issues/322
- **Number:** 322
- **Title:** Issue #308 Follow-up: Wire ToolGateway onAudit into server/worker runtime
- **State:** OPEN
- **Updated:** 2026-06-29T09:11:10Z
- **Labels on issue:** (none set)
- **Labels declared in body:** enhancement, safety, P1, approval:required

### Context
Issue #308 Phase C2 confirmed that `ToolGateway.onAudit` callback exists but is NOT wired into the server/worker runtime. Audit events are generated but have no runtime sink. This is a safety gap for Phase D and Full Real Mode.

### Risk Classification
`YELLOW_VALIDATE` — audit sink missing in runtime path creates a safety gap, but does not directly expose secrets or allow unauthorized writes.

### Type
`validation / runtime-safety`

### Scope
1. Wire ToolGateway `onAudit` callback into server/worker runtime
2. Define audit sink (file, log, or structured store)
3. Implement fail-closed behavior: audit failure blocks
4. Test with local probe only (no Full Real Mode)

### Non-Scope
- No Full Real Mode execution
- No external GitHub writes
- No UI changes
- No production repo as probe target

### Acceptance Criteria
1. `onAudit` is called before audit-required tools execute
2. Audit failure blocks the tool call (fail-closed)
3. Local tests pass (green)
4. Evidence artifacts generated and documented

### References
- Issue #308 Phase C2: onAudit wiring identified as missing
- Issue #245: Audit enforcement (core audit implemented, server wiring missing)

### Owner Decisions Required
- None pending — Owner has explicitly approved this run via:
  `APPROVE ISSUE 322 ONAUDIT SERVER WIRING ONLY`

### Classification

```text
ISSUE_322_INTAKE_STATUS: COMPLETE
```

**Reasoning:** All intake fields populated. Scope, non-scope, and acceptance criteria are clear. Owner approval received. No clarifications needed. Issue is sufficiently detailed to begin implementation.
