# Issue #308 Phase D Readiness Recheck After #322 — Limited Scope Proposal

**Generated:** 2026-06-29T14:06:00+02:00

## Recommended Scope

```text
LIMITED_PHASE_D_APPROVAL_PACKAGE_ONLY
```

**Purpose:** Create a detailed, owner-reviewable approval package for a later minimal Phase D probe. No probe is executed in this scope.

## What This Scope Includes

1. Readiness assessment document suite
2. Blocking issue impact analysis (#321-#326)
3. PR #313 obsolescence decision
4. Kill-switch and env safety audit
5. Local gates verification (build, typecheck, test)
6. Phase D readiness decision
7. Draft approval package
8. Follow-up action plan

## What This Scope Excludes

- ❌ No Phase D probe execution
- ❌ No Controlled Real Run
- ❌ No Full Real Mode
- ❌ No Supervised Real Run
- ❌ No production repo as probe target
- ❌ No GitHub writes through pipeline
- ❌ No workflow changes
- ❌ No merge
- ❌ No push
- ❌ No PR through pipeline
- ❌ No external tool execution
- ❌ No manual CI
- ❌ No CodeRabbit reactivation
- ❌ No #321/#323/#324/#325/#326 implementation
- ❌ No issue/label/milestone mutations (except Start/Completion comments on #308)

## Candidate Later Probe Options (Not Executing Now)

### Option A: Local Temp Workspace + Gateway-Routed No-Op Tool
- **Risk:** GREEN/YELLOW
- **Description:** Create temporary directory outside production repo, route a no-op write tool through GatewayService with onAudit, verify audit sink writes, verify cleanup deletes workspace.
- **No:** GitHub writes, push, merge, PR, production repo usage

### Option B: Local Temp Workspace + Gateway-Routed Real Adapter (No-Op)
- **Risk:** YELLOW
- **Description:** Same as Option A but uses a real adapter configured with no-op behavior (e.g., FakeGitWorkspaceAdapter).
- **No:** GitHub writes, push, merge, PR, production repo usage

### Option C: Production Repo / GitHub Write Probe
- **Risk:** RED_HOLD
- **Description:** Any probe that uses the production repo or performs GitHub write operations.
- **NOT APPROVED FOR NOW.** Requires all limitations resolved and separate owner approval.

## Hard Boundaries for Any Future Probe

| Boundary | Rule |
|----------|------|
| Workspace | Temporary directory outside production repo (`C:\Users\xxammaxx\AppData\Local\Temp\`) |
| No Push | `POSITRON_ENABLE_PUSH` must be absent or `false` |
| No Merge | `POSITRON_MERGE_KILL_SWITCH` must be active or absent |
| No PR | No `gh pr create` through pipeline |
| No GitHub Writes | No `gh issue comment`, `gh pr merge`, etc. through pipeline |
| External Tools | Only local filesystem operations + `git init` in temp workspace if explicitly approved |
| Kill-Switches | All default-safe (no bypass env vars set) |
| Audit Sink | Must write to disk for every audited tool call |
| Cleanup | Must verifiably delete temp workspace |
| Secret Scan | Must be clean (no secrets in artifacts) |
| Real Mode | `POSITRON_REAL_MODE` must be `false` or absent |

## Classification

```text
PHASE_D_LIMITED_SCOPE_STATUS: PROPOSED_SAFE_PACKAGE
```

**Rationale:** The proposed scope (approval package only — no probe) is inherently safe. It involves only documentation generation, evidence collection, and analysis. The candidate later probe options are clearly bounded with explicit hard boundaries. No production repo, no GitHub writes, no real mode.
