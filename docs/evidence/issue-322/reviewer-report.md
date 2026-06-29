# Reviewer Report — Issue #322

## For the Reviewer (Human Owner)

### What to Review

1. **`packages/tool-gateway/src/audit-sink.ts`** — Audit sink module
   - Is the JSONL format adequate?
   - Is the fail-closed contract correct?
   - Are secrets truly excluded from audit entries?

2. **`apps/server/src/index.ts`** (lines ~2318-2330) — Server wiring
   - Is the GatewayService initialization in the right place?
   - Is `{ enabled: true }` correct for current fake/dry-run mode?

3. **`apps/worker/src/index.ts`** (lines ~112-120) — Worker wiring
   - Same questions as server wiring

4. **`apps/worker/src/pipeline-runner.ts`** (PipelineDeps)
   - Is `gateway?: GatewayService` the right pattern?

5. **`packages/tool-gateway/src/__tests__/audit-sink.test.ts`** — Tests
   - Do the 22 tests adequately cover the audit contract?
   - Any missing edge cases?

### What NOT to Review
- No Real Mode concerns — explicitly out of scope
- No Phase D readiness claims
- No production behavior changes
- No workflow/CI changes

### Merge Decision Criteria
- [ ] Code review passes (no blocking issues)
- [ ] All tests pass (confirmed: 1858/1858)
- [ ] Scope is clean (no unrelated changes)
- [ ] Security audit is clean (no bypass paths, no secrets)
- [ ] Audit sink format is acceptable

### Post-Merge
- Update `docs/status/known-limitations.md` — remove "onAudit not wired"
- Re-assess Issue #308 Phase D readiness
- #321 and #323 remain to be decided if Phase D scope broadens
- PR #313 remains obsolete if still open
