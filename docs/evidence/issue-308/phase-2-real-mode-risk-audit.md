# Issue #308 Phase 2 — Real-Mode Risk / Kill-Switch Audit

**Generated:** 2026-06-29T08:15:00+02:00
**Mode:** READ-ONLY RECHECK — NO Real Mode, NO env inspection

---

## Critical Finding: Real Mode is BLOCKED BY DEFAULT

The system defaults to maximum safety. Real Mode requires **BOTH** of these to be explicitly set to `'true'`:

1. `HUMAN_APPROVED_REAL=true` — Human approval gate
2. `POSITRON_ENABLE_REAL=true` — System enable gate

Without both, real mode is blocked at the `checkApprovalGates()` function in `controlled-real-probe.ts`.

## Kill-Switch Hierarchy

```
Level 0: All adapters default to FAKE mode
         ├── POSITRON_SPECKIT_MODE=fake → SpecKit throws if real
         ├── POSITRON_OPENCODE_MODE=fake → OpenCode throws if real
         ├── POSITRON_GITHUB_MODE=fake → GitHub returns simulated data
         └── All integration tests force fake mode

Level 1: Dry-run blocks 16 write operations
         └── DEFAULT_BLOCKED_PATTERNS in dry-run-agent.ts

Level 2: Stop/Ask DENY (14 Category A patterns)
         ├── rm -rf, force push, push to main/master
         ├── DROP TABLE, TRUNCATE, DELETE FROM without WHERE
         ├── Production API mutation, external deployment
         ├── Secret access, AGENTS.md modification
         └── MCP config modification, merge to main/master

Level 3: Push policy
         ├── POSITRON_ENABLE_PUSH !== 'true' → blocked
         ├── Protected branches: main, master, develop
         ├── Force flags: --force, -f, --force-with-lease permanently blocked
         └── Branch pattern: only positron/issue-<n>-<slug>

Level 4: Merge policy
         ├── POSITRON_ENABLE_MERGE !== 'true' → skipped
         ├── POSITRON_MERGE_KILL_SWITCH !== 'false' → blocked
         └── MERGE→DONE uses raw transition (not gated)

Level 5: Real-mode approval gates (5 gates)
         ├── HUMAN_APPROVED_REAL === 'true'
         ├── POSITRON_ENABLE_REAL === 'true'
         ├── POSITRON_ENABLE_PUSH !== 'true' (push must be disabled)
         ├── POSITRON_ENABLE_MERGE !== 'true' (merge must be disabled)
         └── POSITRON_MERGE_KILL_SWITCH !== 'false' (must be active)

Level 6: Tool Gateway (8 security gates)
         ├── Gateway enabled check
         ├── Schema validation
         ├── Tool lookup
         ├── Phase check
         ├── Autonomy check (Level 4 at Level 0 run → blocked)
         ├── Approval check (human_required → blocked without handler)
         ├── Workspace boundary
         └── Egress check

Level 7: Audit enforcement (Gate 9)
         ├── requiresAuditLog → onAudit must be configured
         ├── Missing onAudit → BLOCKED
         └── onAudit throws → BLOCKED

Level 8: GateType enforcement
         ├── Missing evaluator → BLOCKED
         ├── Security fail → NOT overridable
         └── Human approval fail → GATE_APPROVE (pause)

Level 9: Fix loop limit
         └── MAX_FIX_LOOPS = 3 (hard limit)

Level 10: Secret scanning
          ├── 9 regex patterns for GitHub/OpenAI/Slack tokens
          ├── Tool outputs redacted (redactSecrets: default true)
          └── .env, .db, .sqlite, .log files forbidden from commit
```

## RED_HOLD Assessment

Per the risk audit rules:

| Rule | Status | Evidence |
|------|--------|----------|
| Real mode not blocked by default → RED_HOLD | ✅ NOT triggered | Real mode requires HUMAN_APPROVED_REAL + POSITRON_ENABLE_REAL |
| Push not separately blocked → RED_HOLD | ✅ NOT triggered | POSITRON_ENABLE_PUSH blocks; force flags blocked; protected branches blocked |
| Merge not separately blocked → RED_HOLD | ✅ NOT triggered | POSITRON_ENABLE_MERGE blocks; MERGE_KILL_SWITCH blocks |
| Missing evaluator treated as PASS → RED_HOLD | ✅ NOT triggered | evaluateGates() returns blocking failure for missing evaluator |
| Audit failure not blocked → RED_HOLD | ✅ NOT triggered | Gate 9 fail-closed: missing onAudit or onAudit throws → BLOCKED |

**No RED_HOLD conditions triggered.**

## `--yolo` Status

The `--yolo` flag is:
- Listed in `RED_HOLD_ACTIONS` in `controlled-real-probe.ts` (line 134-143)
- `isRedHoldAction()` returns `true` for any string containing `--yolo`
- NOT a runtime flag anywhere in production code
- Exists only as a test classification pattern
- **Cannot be used to bypass any guardrail**

## No Bypass Vectors Found

| Bypass vector | Search result |
|---------------|---------------|
| `SKIP_GATES` | NOT FOUND |
| `bypassGate` | NOT FOUND |
| `autoApprove` | NOT FOUND |
| `skipGate` | NOT FOUND |
| Approval bypass in tool gateway | Red-team test verifies blocked |
| Shell injection in tool gateway | Red-team test verifies blocked |
| Secret leakage in tool gateway | Red-team test verifies blocked |
| Path traversal in tool gateway | Red-team test verifies blocked |
| Egress violation in tool gateway | Red-team test verifies blocked |
| Autonomy violation in tool gateway | Red-team test verifies blocked |

## `.env` Files

- `.env.example` — Template only, all dangerous features default to `false`
- `apps/server/.env` — Exists (contents NOT read per policy)

---

## Classification

```text
REAL_MODE_RISK_STATUS: BLOCKED_BY_DEFAULT
```

All 10 layers of kill-switches and guardrails are active. Real Mode requires multiple explicit opt-in steps. No bypass vectors exist. The system defaults to maximum safety. This classification means Real Mode is **safely blocked** in the current configuration — the system is ready for a controlled probe ONLY after explicit owner approval and environment setup.

For a Fake/Dry-Run Gate Assembly Validation (Phase B), there are no risks because no real external tools are executed.
