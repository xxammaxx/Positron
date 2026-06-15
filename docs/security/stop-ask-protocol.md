# Stop/Ask Protocol — Extended for MCP/Blueprint/Oversight

**Issue:** #229
**Baseline:** Existing stop-ask-policy in `packages/sandbox/src/stop-ask-policy.ts`

---

## Overview

The Stop/Ask Protocol defines which actions in Positron MUST trigger a stop (halt execution) and which MUST trigger an ask (request human input). This document extends the existing protocol to cover MCP operations, Blueprint launches, Provider/model changes, and Oversight decisions.

---

## Decision Outcomes

```
ALLOW               — Action proceeds automatically
DENY                — Action permanently blocked for this run
ASK_HUMAN           — Action paused until human responds
REQUIRE_DRY_RUN     — Dry run must be executed and pass before action proceeds
REQUIRE_BACKUP      — Backup must be created before action proceeds
REQUIRE_REVIEW      — Code review must pass before action proceeds
PAUSE_RUN           — Entire run pauses until human intervenes
ABORT_RUN           — Run is aborted entirely
```

---

## Level 1: Always Stop (Critical)

These actions ALWAYS stop execution. No autonomy level can override.

| Action | Outcome | Category |
|---|---|---|
| `delete` / `rm -rf` | ASK_HUMAN + REQUIRE_BACKUP | destructive |
| Database drop/truncate | ASK_HUMAN + REQUIRE_BACKUP | destructive |
| Irreversible migration | ASK_HUMAN + REQUIRE_BACKUP | destructive |
| Push to remote | ASK_HUMAN | git |
| Merge to main/master | ASK_HUMAN | git |
| Force push | DENY | git |
| Dependency major version upgrade | ASK_HUMAN | dependency |
| Secret/credential access | DENY + PAUSE_RUN | security |
| External API mutation (non-GitHub) | ASK_HUMAN | network |
| Production repository action | ASK_HUMAN | production |
| Workspace cleanup outside allowed root | DENY | filesystem |
| Global AGENTS.md modification | DENY | config |
| Global MCP config modification | DENY | config |

## Level 2: Always Ask (High Risk)

These actions ALWAYS require human input, even at high autonomy.

| Action | Outcome | Category |
|---|---|---|
| Provider config modification | ASK_HUMAN | provider |
| Model switch for real run | ASK_HUMAN + REQUIRE_REVIEW | provider |
| Spec Kit version switch | ASK_HUMAN + REQUIRE_REVIEW | spec |
| MCP server connection/registration | ASK_HUMAN | mcp |
| MCP exposure enable | ASK_HUMAN + REQUIRE_REVIEW | mcp |
| Gateway enable | ASK_HUMAN + REQUIRE_REVIEW | gateway |
| Tool runtime activation | ASK_HUMAN | gateway |
| Blueprint requests auto-merge | DENY + ABORT_RUN | blueprint |
| Blueprint requests unrestricted MCP | DENY + ABORT_RUN | blueprint |
| Blueprint requests Human Approval bypass | DENY + ABORT_RUN | blueprint |
| Unvetted model auto-approval | DENY + ABORT_RUN | provider |
| OpenCode install (silent) | DENY | provider |

## Level 3: Controlled Execution (Medium Risk)

These actions require verification but may proceed with constraints.

| Action | Outcome | Category |
|---|---|---|
| Free model selection | REQUIRE_WARMUP | provider |
| Model warm-up (first time) | ALLOW (with evidence) | provider |
| MCP warm-up (first time) | ALLOW (with evidence) | mcp |
| Blueprint file import | ALLOW (with validation) | blueprint |
| Blueprint validation | ALLOW | blueprint |
| Run plan creation | ALLOW (with evidence) | blueprint |
| Oversight question creation | ALLOW | oversight |
| Evidence generation | ALLOW | evidence |

## Level 4: Low Risk (Allowed)

These actions are low risk and do not require stops.

| Action | Outcome | Category |
|---|---|---|
| Read-only tool calls | ALLOW | tools |
| Tool Gateway status read | ALLOW | monitoring |
| Health check calls | ALLOW | monitoring |
| Metrics collection | ALLOW | monitoring |
| Evidence read | ALLOW | evidence |
| Oversight status read | ALLOW | oversight |
| Provider status read | ALLOW | provider |

---

## Stop/Ask Decision Flow

```
Action Requested
  │
  ├─ Is action in "Always Stop" list? ── YES ──► Execute required outcome
  │                                                  (DENY/ASK/REQUIRE_*)
  │
  ├─ Is action in "Always Ask" list? ── YES ──► Create oversight question
  │                                               → Wait for human response
  │
  ├─ Is action in "Controlled Execution"? ── YES ──► Verify constraints
  │                                                   → Proceed or block
  │
  └─ Is action in "Low Risk"? ── YES ──► ALLOW
                                          → Log evidence
```

---

## Timeout Behavior

For any ASK_HUMAN action with a timeout:

| Timeout Duration | Default Behavior |
|---|---|
| < 30 seconds | ASK_HUMAN (keep waiting) |
| 30-300 seconds | PAUSE_RUN (auto-pause after timeout) |
| > 300 seconds | PAUSE_RUN (auto-pause, notify operator) |
| Never | **NEVER auto-ALLOW** |

**Rule: Timeout = DENY or PAUSE, NEVER ALLOW.**

---

## Oversight Question Format

When a stop/ask triggers a question, it MUST include:

```typescript
interface OversightQuestion {
  id: string;
  runId: string;
  phase: string;
  action: string;
  risk: "low" | "medium" | "high" | "critical";
  reason: string;
  proposedOutcome: string;
  context: {
    toolId?: string;
    mcpServer?: string;
    modelRef?: string;
    blueprintId?: string;
  };
  options: Array<{
    action: string;
    label: string;
    consequence: string;
  }>;
  timeout: number; // ms
  createdAt: string;
}
```

---

## Implementation Note

The existing stop-ask-policy.ts in `packages/sandbox/src/` handles git/merge/push boundaries. This extension adds:

1. **MCP boundaries** — MCP server registration, exposure enable
2. **Provider boundaries** — OpenCode install, model switch, Spec Kit sync
3. **Blueprint boundaries** — validation failures, auto-merge requests
4. **Oversight boundaries** — question creation, answer storage
5. **Gateway boundaries** — gateway enable, tool activation

These new boundaries should be implemented in the sandbox package's stop-ask-policy.ts alongside the existing checks.

---

## Approval Gate Wiring (PR 8)

PR 8 wires the Oversight Human Question Queue into the provider install and MCP warm-up gates:

- **Approval Gates** (`packages/shared/src/approval-gates.ts`): Defines 8 gate kinds, 7 statuses, 7 decision effects, and a full approval gate state machine.
- **Provider Install Wiring**: OpenCode install requests create `provider_install_approval` questions with `riskLevel: high` and `defaultDecision: DENY`. Gate effect is `stores_approval_only` — NO install execution.
- **MCP Warm-up Wiring**: MCP warm-up failures create `mcp_warmup_failure` questions with appropriate risk levels. Human ALLOW does NOT override failed required MCP readiness — the readiness check remains the ground truth.
- **Evidence**: All approval events generate redacted evidence records. Private paths and secrets are excluded.
- **Safety**: Critical risk gates default to DENY. `opencode_install` gates can only have `stores_approval_only` or `allows_next_gate_check` effects. No approval decision executes installs, tools, OpenCode, MCP, or Spec Kit.

### Approval Gate Decision Effects

| Effect | Meaning |
|---|---|
| `stores_approval_only` | Decision is recorded, no action taken |
| `allows_next_gate_check` | Clears gate for next stage check |
| `requires_dry_run` | Dry run required before proceeding |
| `requires_review` | Code/security review required |
| `pauses_run` | Run paused until further input |
| `aborts_run` | Run aborted entirely |
| `blocked_no_effect` | Gate cannot proceed regardless |
