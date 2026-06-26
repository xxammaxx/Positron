# Phase 17 — CodeRabbit Decommission

## Metadata
- **Timestamp**: 2026-06-26T00:00:00Z
- **Owner Approval**: `APPROVE REMOVE CODERABBIT FROM REPO AND RUN FINAL GATES FOR PR 295`
- **Effective Date**: Phase 17 (2026-06-26)

---

## Executive Summary

CodeRabbit is decommissioned from the Positron repository and workflow as of Phase 17. It is no longer:
- An active review gate
- An evidence source
- A merge/readiness/quality decision criterion

Any CodeRabbit comments, status checks, or findings from this point forward are non-decision-relevant and advisory-only.

---

## What Was Removed/Modified

### Production Code (4 files)
| File | Change |
|------|--------|
| `packages/shared/src/github-snapshot-collector.ts` | JSDoc: "coderabbitai" → "external AI reviewer" |
| `packages/shared/src/human-approval-pack.ts` | Warning string: "CodeRabbit/security" → "external AI reviewer/security" |
| `packages/shared/src/__tests__/github-snapshot-collector.test.ts` | Test fixtures: `coderabbitai` → `ai-reviewer-bot`, `CodeRabbit` check → `AI Reviewer` |
| `packages/shared/src/__tests__/safe-apply-plan.test.ts` | Test assertion: matches updated source |

### Active Documentation (5 files)
| File | Change |
|------|--------|
| `docs/evidence/rudolph-beacon/phase-16-owner-merge-package.md` | Updated: CodeRabbit no longer listed as active gate/criteria |
| `docs/evidence/rudolph-beacon/phase-15-owner-merge-decision-package.md` | Updated: added decommission/historical notation |
| `docs/qa/layer-7-evidence-aggregation.md` | Updated: CodeRabbit marked as decommissioned |
| `docs/release/issue-165-7-layer-quality-system-final-report.md` | Updated: CodeRabbit marked as historical/removed |
| `docs/specs/issue-279-phase-0.md` | Updated: marginal note about CodeRabbit decommission |

### Configuration Files
**None removed** — no `.coderabbit.yaml`, `.coderabbit.yml`, or `.coderabbit/` directory existed in the repository.

---

## What Was Preserved (Historical)

### Historical Evidence (NOT modified)
The following directories contain extensive CodeRabbit references from Phases 11-16. These are preserved unmodified as accurate historical records:
- `docs/evidence/rudolph-beacon/phase-11-*` through `phase-16-*`
- `docs/evidence/issue-279-phase-0/` through `phase-1g/`
- `docs/evidence/main-ci-recovery-01/`
- `docs/audits/issue-cleanup-yellow-review-report.md`

These documents accurately reflect that CodeRabbit was an active external reviewer during those phases. Modifying them would falsify history.

---

## What CodeRabbit Was

During Phases 11-16 of the Rudolph Beacon benchmark run, CodeRabbit operated as:
- An external GitHub App (`coderabbitai`) installed on the Positron repository
- An automated AI code reviewer triggered on PR updates
- A source of 11 actionable review comments across 3 review cycles on PR #295
- A status check (`CodeRabbit`) that reported SUCCESS on the final review

At various points, CodeRabbit findings were used as:
- Evidence for GREEN_SAFE fix decisions (Phases 12, 13, 16)
- YELLOW_REVIEW advisory blockers (Phases 14, 15)
- Merge readiness criteria (Phases 14, 15, 16)

---

## Why CodeRabbit Is Decommissioned

1. Owner mandate: `APPROVE REMOVE CODERABBIT FROM REPO AND RUN FINAL GATES FOR PR 295`
2. CodeRabbit is an external dependency whose availability, quality, and consistency are not controlled by the project
3. The project's own local gates (build, typecheck, test, diff check, secrets scan) are sufficient for quality assurance
4. The Speckit workflow, evidence gates, and human/owner review provide stronger guarantees than automated review

---

## New Merge Decision Criteria (Phase 17+)

As of Phase 17, merge readiness is determined by:

| Criterion | Weight |
|-----------|--------|
| Local gates (build, typecheck, test) | REQUIRED |
| `npm test` full suite | REQUIRED |
| PR diff review | REQUIRED |
| Secrets/push-protection | REQUIRED |
| GitHub mergeability | REQUIRED |
| Human/Owner review | REQUIRED |
| Remote CI | ADVISORY ONLY |
| ~~CodeRabbit~~ | ~~DECOMMISSIONED~~ |

---

## Remaining External App

CodeRabbit may still be installed as a GitHub App on the repository. The AI cannot remove GitHub App installations — this requires an Owner action:

```text
OWNER_ACTION_REQUIRED: REMOVE_CODERABBIT_GITHUB_APP
```

See `phase-17-external-coderabbit-removal.md` for detailed Owner steps.

Even if the app remains installed, its output is no longer decision-relevant as of Phase 17.

---

## Open CodeRabbit Comments on PR #295

The 3 actionable CodeRabbit comments currently on PR #295 (from review PRR_kwDOSim3Xs8AAAABD-s-vQ) are:
- **NOT blockers** — CodeRabbit is decommissioned
- **Advisory only** — may be considered or ignored at Owner's discretion
- **No longer tracked** — the YELLOW_REVIEW classification from Phase 16 no longer applies

The prior 8 CodeRabbit comments tracked in Phases 14-16 are closed:
- 5 were resolved (GREEN_SAFE fixes in Phases 12, 16)
- 3 were YELLOW_REVIEW (now obsolete due to decommission)
