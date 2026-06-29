# Documentation / Status Update Check — Issue #322

## Timestamp
2026-06-29T11:12:00Z

## Evaluation

### Status Docs Check

| Document | Needs Update? | Rationale |
|----------|--------------|-----------|
| `docs/status/current-capabilities.md` | NOT_NEEDED | This is a Draft PR — no production behavior changed |
| `docs/status/known-limitations.md` | NOT_NEEDED | Limitation "audit not wired" will be removed after merge |
| `docs/status/evidence-index.md` | NOT_NEEDED | Evidence index update deferred to post-merge run |
| `README.md` | NOT_NEEDED | No user-facing changes |

### Decision
Status docs are NOT updated in this run. The implementation is a Draft PR. Post-merge, a separate run will update:
- `known-limitations.md` — remove "onAudit not wired" limitation
- `current-capabilities.md` — add audit sink as available infrastructure
- `evidence-index.md` — add issue-322 evidence references

## Classification

```text
ISSUE_322_DOCS_STATUS: DEFERRED_POST_MERGE
```

**Reasoning:** Draft PR. No existing docs become incorrect due to this branch. Status docs will be updated after merge in a dedicated post-merge documentation run.
