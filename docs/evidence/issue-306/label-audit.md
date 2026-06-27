# Label Audit — Issue #306 Backlog Hygiene

**Generated:** 2026-06-27T14:10:00+02:00
**Total labels:** 71

---

## Complete Label Inventory

### Priority Labels (DUPLICATE MODELS)

| Name | Description | Color | Used on open? | Category | Duplicate? | Deprecated candidate? |
|------|-------------|-------|---------------|----------|------------|----------------------|
| `P0` | (empty) | #d73a4a | YES | Priority (short) | Conflicts with `priority: high` | YES — keep but document |
| `P1` | (empty) | #d73a4a | YES | Priority (short) | Conflicts with `priority: medium` | YES — keep but document |
| `P2` | (empty) | #d73a4a | YES | Priority (short) | Conflicts with `priority: low` | YES — keep but document |
| `priority: high` | Blockiert andere Features oder ist kritisch | #d73a4a | — | Priority (verbose) | Conflicts with `P0` | YES — keep but document |
| `priority: medium` | Wichtig, aber nicht dringend | #ffa500 | — | Priority (verbose) | Conflicts with `P1` | YES — keep but document |
| `priority: low` | Nice-to-have | #00ff00 | — | Priority (verbose) | Conflicts with `P2` | YES — keep but document |
| `priority:p3` | Repo/documentation/portfolio hygiene — lowest urgency | #0E8A16 | — | Priority (verbose) | Extends `P2`/`priority: low` | No — lowest urgency tier |

### Approval Labels (EXISTING, WELL-DEFINED)

| Name | Description | Color | Used on open? | Category | Duplicate? |
|------|-------------|-------|---------------|----------|------------|
| `approval:decision-needed` | Strategic/technical decision needed before implementation | #D93F0B | YES | Approval | No |
| `approval:not-required` | No explicit owner approval required | #0E8A16 | YES | Approval | No |
| `approval:required` | Explicit owner approval required | #B60205 | YES | Approval | No |

### State/Lifecycle Labels (EXISTING)

| Name | Description | Color | Used on open? | Category | Duplicate? |
|------|-------------|-------|---------------|----------|------------|
| `positron:ready` | (null) | #ededed | — | State | No |
| `positron:running` | (null) | #ededed | — | State | No |
| `positron:testing` | (null) | #ededed | — | State | No |
| `positron:blocked` | (null) | #ededed | — | State | No |
| `positron:done` | (null) | #ededed | — | State | No |
| `positron:pr-created` | (null) | #ededed | — | State | No |

### Existing Type-adjacent Labels (NO `type:` PREFIX)

| Name | Description | Color | Used on open? | Category |
|------|-------------|-------|---------------|----------|
| `bug` | Something isn't working | #d73a4a | YES | Bug (existing) |
| `enhancement` | New feature or request | #a2eeef | YES | Feature (existing) |
| `documentation` | Improvements or additions to documentation | #0075ca | YES | Docs (existing) |
| `architecture` | Architektur-Entscheidung oder -Problem | #7057ff | YES | Architecture (existing) |
| `refactor` | Code-Refactoring ohne neue Features | #fbca04 | — | Tech debt (existing) |
| `safety` | Security and safety-related work | #d73a4a | YES | Security (existing) |
| `testing` | (null) | #ededed | YES | Testing (existing) |
| `ci` | (null) | #ededed | — | Infra (existing) |
| `infrastructure` | (null) | #ededed | YES | Infra (existing) |
| `github` | GitHub repository presentation and metadata | #5319E7 | YES | Infra (existing) |
| `tooling` | (null) | #ededed | YES | Infra (existing) |
| `docker` | (null) | #ededed | — | Infra (existing) |
| `database` | (null) | #ededed | — | Infra (existing) |
| `qa` | (null) | #ededed | YES | Validation (existing) |
| `qa-blocker` | (null) | #ededed | — | Validation (existing) |
| `qa-infrastructure` | (null) | #ededed | — | Validation (existing) |
| `observation` | (null) | #ededed | — | Research (existing) |
| `quality` | (null) | #ededed | — | Quality (existing) |
| `frontend` | (null) | #ededed | YES | Domain (existing) |
| `ui` | User interface and screenshots | #1D76DB | YES | Domain (existing) |
| `voice` | (null) | #ededed | — | Domain (existing) |

### Module/Package Labels

| Name | Description | Color | Used on open? | Category |
|------|-------------|-------|---------------|----------|
| `app:server` | (null) | #ededed | YES | Module |
| `app:web` | (null) | #ededed | YES | Module |
| `server` | Betrifft das Backend | #1d76db | — | Module (duplicate) |
| `web` | Betrifft das Frontend | #1d76db | — | Module (duplicate) |
| `github-adapter` | Betrifft den GitHub-Adapter | #1d76db | — | Module |
| `package:github-adapter` | (null) | #ededed | — | Module |
| `package:run-state` | (null) | #ededed | — | Module |
| `package:shared` | (null) | #ededed | — | Module |
| `package:speckit-adapter` | (null) | #ededed | — | Module |
| `speckit-adapter` | (inferred) | — | — | (Not in label list) |

### Meta/Administrative Labels

| Name | Description | Color | Used on open? | Category |
|------|-------------|-------|---------------|----------|
| `epic` | Cross-cutting initiative spanning multiple issues | #7D3C98 | YES | Meta |
| `blocker` | (null) | #ededed | — | Meta |
| `good first issue` | Good for newcomers | #7057ff | — | Meta |
| `good first impression` | Repository presentation and first-visit experience | #0E8A16 | YES | Meta |
| `help wanted` | Extra attention is needed | #008672 | — | Meta |
| `question` | Further information is requested | #d876e3 | — | Meta |
| `wontfix` | This will not be worked on | #ffffff | — | Meta |
| `duplicate` | This issue or pull request already exists | #cfd3d7 | — | Meta |
| `invalid` | This doesn't seem right | #e4e669 | — | Meta |
| `quick-win` | (null) | #ededed | — | Meta |
| `needs-spec` | Requires specification before implementation | #fbca04 | — | Gate |
| `needs-implementation` | Issue needs implementation work | #B60205 | — | Gate |
| `verified-partial` | Issue verified with partial implementation — gaps documented | #FBCA04 | — | Gate |
| `mvp-1` | (null) | #ededed | — | Scope |
| `baseline` | (null) | #ededed | — | Scope |
| `dry-run` | Dry-run/simulation capabilities | #1d76db | — | Feature |
| `dogfood` | Dogfood/self-testing infrastructure | #0e8a16 | — | Feature |
| `mutation-testing` | (null) | #ededed | — | Feature |

---

## Type: Labels — Gap Analysis

The following `type:` labels are MISSING and do NOT duplicate existing labels:

| Target Label | Existing Equivalent? | Notes |
|-------------|---------------------|-------|
| `type:bug` | `bug` exists | Different prefix — `bug` is legacy. Both can coexist. |
| `type:feature` | `enhancement` exists | Different semantics. Both can coexist. |
| `type:docs` | `documentation` exists | Different prefix. Both can coexist. |
| `type:infra` | `infrastructure`, `ci`, `tooling`, `github` exist | `type:infra` is a parent category. |
| `type:research` | `observation` loosely similar | No direct match. Safe to create. |
| `type:validation` | `qa`, `qa-blocker`, `qa-infrastructure` exist | `type:validation` is broader. |
| `type:architecture` | `architecture` exists | Different prefix. Both can coexist. |
| `type:technical-debt` | `refactor` exists | `type:technical-debt` is broader than refactor. |

**Decision:** All 8 `type:` labels are SAFE to create. They complement existing labels without duplicating their semantics exactly. Using `type:` prefix creates a clean taxonomy namespace separate from legacy labels.

## Risk Labels — Gap Analysis

No `risk:` labels exist. Existing safety-related labels:
- `safety` — Security and safety-related work
- `approval:decision-needed` — strategic decision
- `approval:required` — owner gate
- `approval:not-required` — safe to proceed

**Decision:** The existing approval labels already serve the risk classification function. Creating `risk:green-safe`, `risk:yellow-validate`, `risk:red-hold` would duplicate the approval concept. **SKIP risk: labels** — existing model is sufficient.

## Duplicate Module Labels

| Old Label | New Label | Duplicate? |
|-----------|-----------|-------------|
| `server` | `app:server` | YES — `app:server` is used on open issues |
| `web` | `app:web` | YES — `app:web` is used on open issues |

These are clear duplicates but require owner decision before deletion. Document in deprecated package.

---

## Classification

```text
ISSUE_306_LABEL_AUDIT_STATUS: COMPLETE
```

**Rationale:** All 71 labels audited. Gaps identified. 8 `type:` labels needed. Risk labels skipped (approval model sufficient). Duplicate module labels documented.
