# Phase C3 — Next Prompt

## Recommended Next Build

```text
POSITRON NEXT RUN — Issue #322: Wire ToolGateway onAudit into server/worker runtime
```

## Prerequisites

- Owner approval: `APPROVE ISSUE 322 ONAUDIT SERVER WIRING ONLY`
- Current main branch: `c5015a3b352f5d00b12e7b9c0d3e4bb2a71b4ac6`

## Context

Issue #322 is the highest-priority blocker for Phase D readiness. It addresses Limitation L1 (onAudit server/worker wiring missing). Resolving #322 would close the most critical gap before Phase D can be considered.

## Scope

From Issue #322:
- Wire ToolGateway onAudit callback into server/worker runtime
- Define audit sink (file, log, or structured store)
- Implement fail-closed behavior: audit failure blocks
- Test with local probe only (no Full Real Mode)

## Non-Scope
- No Full Real Mode
- No Supervised Real Run
- No external GitHub writes
- No UI changes
- No production repo as probe target

## Acceptance Criteria
1. onAudit is called before audit-pflichtigen tools execute
2. Audit failure blocks the tool call (fail-closed)
3. Local tests pass (green)
4. Evidence artifacts generated and documented

## Alternative: If Owner Wants Broader Pre-Phase D Work

If the Owner prefers to resolve multiple blockers before re-evaluating Phase D:

```text
POSITRON NEXT RUN — Issue #308 Phase D Blocker Resolution Sprint
```

Resolve in priority order:
1. **#322** (onAudit wiring) — P1, YELLOW_VALIDATE
2. **#323** (pre_run/pre_push decision) — P2, GREEN_SAFE/YELLOW_VALIDATE
3. **#321** (MERGE→DONE gating) — P1, YELLOW_VALIDATE

Then re-evaluate Phase D readiness after all three are resolved.

## Alternative: Phase D With Limited Scope

If the Owner wants Phase D to proceed immediately with limited scope:

```text
APPROVE ISSUE 308 PHASE D LIMITED SCOPE — NO AUDIT PERSISTENCE, FILE-BASED AUDIT ONLY
```

This would:
- Accept file-based audit (as proven in Phase C2) as sufficient
- Exclude MERGE→DONE from Phase D scope
- Proceed with Phase D Controlled Real Probe without server/worker audit wiring

**Not recommended** — audit persistence is a safety requirement. But it's an option if the Owner accepts the risk.

## Owner Action Items (No New Run)

If the Owner prefers not to start a new run yet:
- **Close PR #313:** `gh pr close 313 --repo xxammaxx/Positron` (approval: `APPROVE CLOSE OBSOLETE PR 313`)
- **Remove CodeRabbit App:** GitHub Settings → Integrations → GitHub Apps (Issue #326)
- **Clean dist artifacts:** `git checkout -- packages/shared/dist/` or gitignore (Issue #325)
