# Stop/Ask Protocol

## Purpose

The Stop/Ask Protocol defines which agent actions must be halted and escalated to human decision before execution. It is the primary safety mechanism preventing catastrophic agent mistakes.

## Protocol: When to Stop

### Category A — Always Stop (No Exceptions)

These actions must **never** proceed without explicit human approval:

| Action | Risk | Default Decision |
|---|---|---|
| `rm -rf` (recursive delete) | Data loss | DENY |
| `git push --force` | History rewrite, branch destruction | DENY |
| `git push` to main/master | Protected branch compromise | DENY |
| `DROP TABLE` / `TRUNCATE` | Irreversible data loss | DENY |
| Database migration that drops columns | Data loss | DENY |
| `DELETE FROM` without WHERE | Mass data loss | DENY |
| Delete branch (remote) | Collaboration disruption | DENY |
| Production API mutation | External impact | DENY |
| External deployment trigger | Uncontrolled release | DENY |
| Secret/credential access | Exposure risk | DENY |
| Global AGENTS.md modification | Safety bypass | DENY |
| MCP configuration modification | Safety bypass | DENY |
| `git merge` (to protected branch) | Integration risk | DENY |

### Category B — Stop Unless Evidence Provided

These actions require human approval but may proceed if the agent provides:

| Action | Required Evidence |
|---|---|
| `npm install <new-dep>` | Dependency audit, license check, bundle size impact |
| Major version upgrade | Breaking change analysis, migration plan |
| `git merge` (feature branch to feature branch) | Test results, conflict resolution plan |
| Filesystem write outside workspace | Path validation, purpose justification |
| Database schema change (non-destructive) | Migration script, rollback script, dry-run result |
| External API call (read) | Domain allowlist check, rate limit estimation |
| Configuration file modification | Diff preview, rollback plan |

### Category C — Allowed with Audit

These actions are permitted without human approval but must be logged:

| Action | Audit Requirement |
|---|---|
| `git commit` | Commit message + diff summary |
| `npm test` | Test results |
| `npm run build` | Build output |
| File write within workspace | Path + content hash |
| Issue comment | Comment content |
| PR creation | PR body + linked issue |
| Test execution | Test report |

## Decision Outcomes

| Outcome | Meaning | When Used |
|---|---|---|
| `ALLOW` | Proceed immediately | Category C actions; Category B with sufficient evidence |
| `DENY` | Block permanently | Category A actions without override |
| `ASK_HUMAN` | Pause and escalate | Category A and B actions requiring human judgment |
| `REQUIRE_DRY_RUN` | Run simulation first | Database migrations, destructive operations |
| `REQUIRE_BACKUP` | Create backup before proceeding | Database changes, configuration modifications |
| `REQUIRE_REVIEW` | Get second agent review | Code changes, PR creation |

## ASK_HUMAN Request Format

When an action triggers `ASK_HUMAN`, the operator must present:

```markdown
## Action Requires Human Approval

### Action
- **Command:** `<exact command or operation>`
- **Category:** `<A/B>`
- **Risk Level:** `<HIGH/MEDIUM/LOW>`

### Target
- **File/Database/Resource:** `<what is affected>`
- **Scope:** `<single file / multiple files / entire workspace>`

### Risk Assessment
- **What could go wrong:** `<worst-case scenario>`
- **Likelihood:** `<HIGH/MEDIUM/LOW>`

### Rollback Plan
- **Can this be undone?:** `<YES/NO/PARTIAL>`
- **How to roll back:** `<specific steps>`

### Evidence
- **Dry-run result:** `<output of dry-run if available>`
- **Test results:** `<relevant test output>`
- **Backup location:** `<path to backup if created>`

### Recommended Decision
- **Agent recommendation:** `<ALLOW/DENY>`
- **Reasoning:** `<brief justification>`

### Human Decision
- [ ] APPROVE — Proceed
- [ ] DENY — Do not proceed
- [ ] MODIFY — Proceed with changes (describe below)
- [ ] DEFER — Ask for more information
```

## Human Unavailable Behavior

When a human decision is required but the human is not available:

1. **Default: DENY** — No action proceeds
2. **Timeout threshold:** Define maximum wait time per action category
3. **Queue behavior:** Action waits in `GATE_APPROVE` phase until timeout or human response
4. **Escalation:** After timeout, action transitions to `BLOCKED_MERGE` or `FAILED_BLOCKED`

## Audit Trail

All Stop/Ask decisions must be logged:

```json
{
  "timestamp": "ISO8601",
  "run_id": "uuid",
  "action": "command or operation",
  "category": "A|B|C",
  "decision_outcome": "ALLOW|DENY|ASK_HUMAN|REQUIRE_DRY_RUN|REQUIRE_BACKUP|REQUIRE_REVIEW",
  "human_decision": "APPROVE|DENY|MODIFY|DEFER|null",
  "human_identity": "who approved",
  "evidence_refs": ["hash1", "hash2"],
  "rollback_applied": false
}
```

## Enforcement

The Stop/Ask Protocol must be enforced by:

1. **Policy gate** — `packages/sandbox/src/stop-ask-policy.ts` validates actions before execution
2. **State machine** — `GATE_APPROVE` phase blocks progression until human decision
3. **Runtime hook** — `packages/sandbox/src/gate-approve.ts` provides the `gateApproveAction()` function that bridges the policy with the state machine pipeline
4. **Audit log** — Immutable record of all decisions
5. **No bypass** — No agent, environment variable, or configuration flag shall override the protocol

### Runtime Hook (GATE_APPROVE Integration)

The `gateApproveAction()` function (Issue #215) integrates the Stop/Ask Policy directly into the runtime approval gate:

| Stop/Ask Decision | Runtime Behavior | Next State Machine Phase |
|---|---|---|
| `ALLOW` | Action proceeds with audit event | `MERGE` (or next pipeline phase) |
| `DENY` | Action blocked, ERROR event emitted | `BLOCKED_MERGE` |
| `ASK_HUMAN` | Action paused, HUMAN event emitted | `GATE_APPROVE` (waits for human) |
| `REQUIRE_DRY_RUN` | Action blocked pending evidence | `GATE_APPROVE` (waits for dry-run) |
| `REQUIRE_BACKUP` | Action blocked pending evidence | `GATE_APPROVE` (waits for backup) |
| `REQUIRE_REVIEW` | Action blocked pending evidence | `GATE_APPROVE` (waits for review) |

**Event/Evidence produced:**
- `ALLOW` → GATE-level event with audit payload
- `DENY` → ERROR-level event with decision metadata
- `ASK_HUMAN` → GATE-level event + HUMAN-level event
- All events include: `decision`, `risk`, `category`, `action`, `command`, `requiredEvidence`

**Follow-up needed:**
- Wire `gateApproveAction()` into the server's GATE_APPROVE phase handler (current state: standalone module, callable from server)
- Model structured action requests for all pipeline phases
- Implement evidence collection pipeline for `REQUIRE_DRY_RUN` / `REQUIRE_BACKUP` / `REQUIRE_REVIEW`

**Remaining limitations:**
- `REQUIRE_BACKUP` is not currently triggered by any pattern in the policy (defined but unused)
- Runtime integration with server's `index.ts` GATE_APPROVE handler is not yet wired (separate follow-up)
- No automatic evidence collection — callers must provide evidence manually

## Prohibited Bypass Mechanisms

- Environment variables (`SKIP_STOP_ASK=true`)
- Configuration flags (`bypassSafety: true`)
- Agent self-approval (any agent marking its own action as ALLOW)
- Timeout-based auto-approval
- Silent denial (human must be explicitly informed of ASK_HUMAN events)
