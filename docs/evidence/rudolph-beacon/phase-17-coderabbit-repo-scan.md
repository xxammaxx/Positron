# Phase 17 — CodeRabbit Repo Scan

## Metadata
- **Timestamp**: 2026-06-26T00:00:00Z
- **Scan Methods**: `git grep -i coderabbit`, `git ls-files | Select-String coderabbit`, manual review of `.github/`, templates, docs, scripts

---

## Scan Results by Classification

### ACTIVE_PRODUCTION_CODE (4 files — will be modified)

| # | File | Line(s) | Content | Action |
|---|------|---------|---------|--------|
| 1 | `packages/shared/src/github-snapshot-collector.ts` | 68 | JSDoc: "Reviews from coderabbitai that mention..." | Replace with generic "external AI reviewer" |
| 2 | `packages/shared/src/human-approval-pack.ts` | 360 | Warning: "CodeRabbit/security findings may apply" | Replace with generic "external AI reviewer/security findings" |
| 3 | `packages/shared/src/__tests__/github-snapshot-collector.test.ts` | 109, 110, 115, 207 | Test fixtures with `coderabbitai` username | Replace with generic `ai-reviewer-bot` |
| 4 | `packages/shared/src/__tests__/safe-apply-plan.test.ts` | 360 | Test assertion matching "CodeRabbit/security findings" | Match updated source string |

### ACTIVE_DOC_REFERENCES — Phase Decision Docs (2 files — will be updated)

| # | File | Content | Action |
|---|------|---------|--------|
| 5 | `docs/evidence/rudolph-beacon/phase-16-owner-merge-package.md` | CodeRabbit as active gate/criteria | Add decommission notice; update merge criteria |
| 6 | `docs/evidence/rudolph-beacon/phase-15-owner-merge-decision-package.md` | CodeRabbit as active criteria | Add decommission notice |

### ACTIVE_DOC_REFERENCES — Other Docs (3 files — will be updated)

| # | File | Line(s) | Content | Action |
|---|------|---------|---------|--------|
| 7 | `docs/qa/layer-7-evidence-aggregation.md` | 14 | `.coderabbit.yaml` as optional layer | Update to note CodeRabbit decommissioned |
| 8 | `docs/release/issue-165-7-layer-quality-system-final-report.md` | 13, 28 | CodeRabbit as L1 reviewer, `.coderabbit.yaml` configured | Mark as historical/removed |
| 9 | `docs/specs/issue-279-phase-0.md` | 163 | 9 CodeRabbit findings reference | Historical spec — add marginal note |

### HISTORICAL_EVIDENCE — Untouched (preserved as-is)

Extensive references across:
- `docs/evidence/rudolph-beacon/phase-11-*` through `phase-16-*` (60+ references)
- `docs/evidence/issue-279-phase-0/` handoff reports
- `docs/evidence/issue-279-phase-1a/` through `phase-1g/` handoff reports
- `docs/evidence/main-ci-recovery-01/handoff-report.md`
- `docs/audits/issue-cleanup-yellow-review-report.md`

**Policy**: These are historical records of past phases. They accurately reflect that CodeRabbit was an active external reviewer during those phases. They will NOT be modified. The decommission document (`phase-17-coderabbit-decommission.md`) provides the authoritative record of the transition.

### EXTERNAL_APP_REFERENCE (1 finding)

| Aspect | Detail |
|--------|--------|
| GitHub App | `coderabbitai` user on PR #295 |
| Status Check | `CodeRabbit` as StatusContext |
| Can AI remove? | NO — external GitHub App installation |

### FALSE_POSITIVE (0)

None found.

### CONFIG_FILES (0 — NONE FOUND)

| File Pattern | Status |
|-------------|--------|
| `.coderabbit.yaml` | ❌ Not in repo |
| `.coderabbit.yml` | ❌ Not in repo |
| `.coderabbit/` directory | ❌ Not in repo |
| `.github/coderabbit.yaml` | ❌ Not in repo |
| `.github/coderabbit.yml` | ❌ Not in repo |
| PR templates with CodeRabbit requirement | ❌ Not in repo |
| `.github/workflows/` CodeRabbit config | ❌ Not in repo |

---

## Summary

| Category | Count | Action |
|----------|-------|--------|
| ACTIVE_PRODUCTION_CODE | 4 files | Modified (generic language) |
| ACTIVE_DOC_REFERENCES (phase docs) | 2 files | Updated (decommission notice) |
| ACTIVE_DOC_REFERENCES (other docs) | 3 files | Updated (historical notation) |
| HISTORICAL_EVIDENCE | 60+ files | Preserved as-is |
| EXTERNAL_APP_REFERENCE | 1 instance | Owner action required |
| CONFIG_FILES | 0 | Nothing to remove |

```text
CODERABBIT_REPO_STATUS: ACTIVE_REFERENCES_FOUND
```

**Note**: While no configuration files exist, there are 9 files with active references (production code + active docs) that require modification. The external GitHub App installation requires a separate Owner action.
