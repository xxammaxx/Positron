# Verification Contract: Stop/Ask Protocol

## PASS

- [x] Protocol defines explicit action categories that always trigger Stop (delete, force push, merge, etc.)
- [x] Protocol defines decision outcomes: ALLOW, DENY, ASK_HUMAN, REQUIRE_DRY_RUN, REQUIRE_BACKUP, REQUIRE_REVIEW
- [x] Protocol defines mandatory fields for ASK_HUMAN requests (action, target, risk, rollback, dry-run result, evidence, recommended decision)
- [x] Protocol covers the full list of prohibited actions from the operator techstack
- [x] Protocol is enforceable — not just advisory
- [x] Protocol includes context for the human decision-maker (not just yes/no)
- [x] Protocol defines what happens when human is not available (default DENY)
- [x] Policy module implemented: `packages/sandbox/src/stop-ask-policy.ts` (Issue #213)
- [x] Policy tests: 64 tests passing in `packages/sandbox/src/__tests__/stop-ask-policy.test.ts`
- [x] Runtime hook implemented: `packages/sandbox/src/gate-approve.ts` (Issue #215)
- [x] GATE_APPROVE integration tests: 33 tests passing in `packages/sandbox/src/__tests__/gate-approve.test.ts`
- [x] Runtime hook maps Stop/Ask decisions to state machine phases
- [x] Runtime hook produces GATE/HUMAN/ERROR events with decision metadata
- [x] Human approval is preserved — never replaced by model decision
- [x] Issue #205 remains completely untouched

## FAIL

- Protocol allows any destructive action without human approval
- Protocol treats ASK_HUMAN as optional
- Protocol lacks rollback requirement for irreversible actions
- Protocol allows the agent to override human decision
- Protocol does not cover force push, merge, or database mutation

## PARTIAL

- Some destructive actions covered but not all
- Decision outcomes defined but not mapped to specific actions
- Human-unavailable behavior not specified

## Required Evidence

- tests: `packages/sandbox/src/__tests__/stop-ask-policy.test.ts` (64 tests, all passing)
- tests: `packages/sandbox/src/__tests__/gate-approve.test.ts` (33 tests, all passing)
- docs: `docs/security/stop-ask-protocol.md` exists with complete action-to-decision mapping
- docs: Updated with GATE_APPROVE runtime hook documentation (Issue #215)
- logs: GATE_APPROVE events include decision, risk, category, action, command, requiredEvidence
- screenshots: N/A
- review: Review-agent confirms protocol completeness (pending for Issue #215)

## Red Tests

### Stop/Ask Policy Module (Issue #213)
- 64 tests covering Category A, B, C actions
- Destructive keywords, decision outcomes, edge cases
- Verification contract compliance

### GATE_APPROVE Integration (Issue #215)
- 33 tests covering:
  - Harmless commands pass through (ALLOW path)
  - rm -rf, DROP TABLE, secret access blocked (DENY path)
  - Force push gated (not automatically allowed)
  - Merge requires human approval or review
  - Secret access never allowed
  - Outside workspace cleanup blocked
  - Events/evidence generated for all decisions
  - Human approval preserved (no auto-approval)
  - Issue #205 isolation verified
  - Stop/Ask delegation verified
  - Structural integrity of result type
  - Valid decision outcomes

## Security Constraints

- Protocol must default to DENY when human is not available
- Protocol must not allow override of DENY by any agent
- Protocol must log all Stop/Ask decisions to immutable audit trail
- GateApproveAction never sets allowed=true for non-ALLOW decisions
- Human approval is always required for Category A actions
- No auto-approval mechanism exists in the runtime hook

## Follow-up Items

- Wire `gateApproveAction()` into the Positron server's GATE_APPROVE phase handler (`apps/server/src/index.ts`)
- Model structured action requests for all pipeline phases
- Implement evidence collection pipeline for REQUIRE_DRY_RUN / REQUIRE_BACKUP / REQUIRE_REVIEW
- Add server-level integration tests for the wired hook
