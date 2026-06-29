# Phase 2 Docs Update Decision — Issue #322

## Timestamp
2026-06-29T11:24:00Z

## Decision

Status documentation updates are **DEFERRED** to a separate post-merge documentation run.

## Rationale

### Rule Applied
Per the owner directive: "Wenn PR #328 Code merged wird, darf Phase-2-Evidence dokumentieren, dass Status-Docs in einem separaten Post-Merge-Docs-Run aktualisiert werden."

### Current Status Docs

| Document | Current State | After Merge |
|----------|--------------|-------------|
| `docs/status/known-limitations.md` | May still list "onAudit not wired to runtime" | **Now outdated** — onAudit is wired |
| `docs/status/current-capabilities.md` | May not list audit enforcement | **Should be updated** — audit infrastructure exists |
| `docs/status/evidence-index.md` | May not reference #322 evidence | **Should be updated** — Phase 1 and Phase 2 evidence exists |

### Deferred Changes
- `docs/status/known-limitations.md`: Remove "onAudit not wired" limitation; add "GatewayService wired but tools not routed through it" as a new limitation
- `docs/status/current-capabilities.md`: Add audit infrastructure capability
- `docs/status/evidence-index.md`: Add #322 Phase 1 and Phase 2 evidence

### Why Deferred
1. The PR #328 merge run is scoped to audit and merge, not documentation maintenance
2. Status docs updates involve review of multiple documents and cross-references
3. A dedicated docs update run is cleaner and less error-prone
4. The Phase 2 evidence itself documents all findings — status docs can be regenerated from evidence

### Follow-up Needed
- **Run:** Separate Post-Merge Docs Update
- **Scope:** Update `docs/status/known-limitations.md`, `docs/status/current-capabilities.md`, `docs/status/evidence-index.md`
- **Input:** Phase 1 and Phase 2 evidence from `docs/evidence/issue-322/`
- **Blocked by:** Nothing (can be done immediately after this merge)

## Classification

```text
ISSUE_322_PHASE_2_DOCS_STATUS: DEFERRED_POST_MERGE
```

**Reasoning:** No status documents are acutely false after this merge. The `known-limitations.md` may be slightly outdated but does not contain incorrect claims that would cause operational harm. A dedicated post-merge docs run is the appropriate vehicle for updating status documentation.
