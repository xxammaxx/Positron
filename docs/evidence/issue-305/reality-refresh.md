# Reality Refresh — Issue #305

## Metadata
- **Timestamp:** 2026-06-27T13:00:00Z
- **Run ID:** issue-305-reality-refresh-01
- **Executor:** issue-orchestrator

## Repository State

| Property | Value |
|----------|-------|
| **Branch** | `main` |
| **Local HEAD** | `98010380cbeeb0127b558bf82a16cbbaf42d7328` |
| **Remote main HEAD** | `98010380cbeeb0127b558bf82a16cbbaf42d7328` |
| **Sync Status** | In sync (local == remote) |
| **Working Tree** | Clean (no uncommitted changes) |
| **Git Status (porcelain)** | (empty — working tree clean) |

## Recent Commits

```
9801038 docs(issue-306): add backlog hygiene merge evidence
f16309c Merge pull request #311 from xxammaxx/docs/issue-306-backlog-hygiene
b79dea7 docs(issue-306): add backlog hygiene taxonomy and templates
82059c1 docs(issue-307): add documentation sync merge evidence
abe11e6 Merge pull request #310 from xxammaxx/docs/issue-307-docs-reality-sync
```

## Issue #305 — Details

| Property | Value |
|----------|-------|
| **Title** | Evidence Portfolio: Automate post-run capability and limitation updates |
| **State** | OPEN |
| **Labels** | enhancement, architecture, P2 |
| **Created** | 2026-06-27T11:20:19Z |
| **Updated** | 2026-06-27T11:20:19Z |
| **Assignees** | (none) |
| **Risk** | GREEN_SAFE (read-only for manual content, append-only) |
| **Type** | feature / automation |

### Issue Body Summary

Goal: After a Positron run completes, evidence artifacts should automatically update the Living Evidence Portfolio files:
- `docs/status/current-capabilities.md` — new capabilities added
- `docs/status/known-limitations.md` — new limitations added
- `docs/status/evidence-index.md` — new evidence paths added

Key requirements:
1. Incremental updates (append, not replace)
2. Conflict detection (don't overwrite manual edits)
3. Evidence-gated (only update if valid evidence exists)
4. Manual sections preserved
5. Optional feature (must be enabled)

Non-scope: UI (#248), trace/eval aggregation (#247), new dashboard, Real Mode.

## Related Issues Status

| Issue | Title | Status | Relevance |
|-------|-------|--------|-----------|
| #248 | Display LivingEvidencePortfolio in Operator Dashboard | OPEN | UI layer — NOT in scope |
| #247 | Trace and Eval Aggregation | OPEN | Data source — NOT in scope |
| #253 | Manual portfolio baseline update | CLOSED | Predecessor (manual one-time) |
| #306 | Backlog Hygiene | CLOSED | Completed (Phase 2 merge) |
| #307 | Docs Reality Sync | CLOSED | Completed |
| #308 | Full Real Mode Pilot | OPEN | Related but NOT blocking |
| #304 | Stabilize Playwright tracing | OPEN | Unrelated |
| #268 | CI Infrastructure Tracker | CLOSED | Completed |
| #279 | Rudolph Beacon replacement | CLOSED | Completed |
| #297 | Flaky Playwright E2E | CLOSED | Completed |
| #298 | Biome JSON formatting | CLOSED | Completed |
| #299 | Windows module resolution | CLOSED | Completed |

## PR #218 Status

| Property | Value |
|----------|-------|
| **State** | OPEN |
| **Title** | feat(safety): integrate Stop/Ask policy with GATE_APPROVE |
| **Base** | main |
| **Head** | positron/issue-215-gate-approve-stop-ask |
| **Action** | NOT TO BE TOUCHED |

## PR Chain #230–#242 Status

All 13 PRs in the Issue #229 chain remain **CLOSED** and intentionally untouched. No action required.

## CodeRabbit Status

| Check | Status |
|-------|--------|
| `.coderabbit.yaml` file | ABSENT |
| `.github/workflows/coderabbit*` | ABSENT |
| Branch protection rule | None (HTTP 404) |
| Status | Decommissioned — remains decommissioned |

## Secrets / Push Protection

| Check | Status |
|-------|--------|
| `.env` file contents | NOT accessed |
| Secrets in evidence files | NONE |
| Push protection warnings | NONE detected |

## Portfolio Files

| File | Status | Size |
|------|--------|------|
| `docs/status/current-capabilities.md` | EXISTS | 157 lines |
| `docs/status/known-limitations.md` | EXISTS | 97 lines |
| `docs/status/evidence-index.md` | EXISTS | 93 lines |

## Evidence Directories

32 evidence directories exist under `docs/evidence/`, including:
- `issue-263-implementation-01`, `issue-268-*` (multiple phases)
- `issue-279-*` (phases 0-1g), `issue-306`, `issue-307`
- `post-268`, `post-299`, `portfolio-gap-discovery`
- `rudolph-beacon`, `main-ci-recovery-01`

## Classification

```
ISSUE_305_REALITY_STATUS: CURRENT
```

### Justification
- Branch is `main` at HEAD `9801038` — matches remote
- Working tree is clean — no uncommitted changes
- Issue #305 is OPEN with clear acceptance criteria
- No blocking issues open (related issues are parallel, not blockers)
- All prerequisite issues (#253, #306, #307) are CLOSED/COMPLETED
- PR #218 and chain #230–#242 untouched
- CodeRabbit remains decommissioned
- No secret leakage detected
