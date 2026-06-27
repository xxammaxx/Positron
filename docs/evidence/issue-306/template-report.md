# Issue Template Report — Issue #306

**Generated:** 2026-06-27T14:10:00+02:00

---

## Existing Templates (Pre-Run)

| File | Type | Format | Status |
|------|------|--------|--------|
| `bug_report.md` | Bug report | Markdown frontmatter | ✅ Pre-existing (#252) |
| `feature_request.md` | Feature request | Markdown frontmatter | ✅ Pre-existing (#252) |
| `config.yml` | Template config | YAML | ✅ Pre-existing |

## Created Templates

| File | Type | Format | Sections |
|------|------|--------|----------|
| `documentation_update.md` | Documentation update | Markdown frontmatter | Summary, Context, Scope, Non-Scope, Acceptance Criteria, Evidence, Risk Classification, Local Gates, Owner Decision |
| `research_validation.md` | Research / validation | Markdown frontmatter | Summary, Context, Scope, Non-Scope, Acceptance Criteria, Evidence, Risk Classification, Local Gates, Owner Decision |
| `architecture_decision.md` | Architecture decision | Markdown frontmatter | Summary, Context, Alternatives, Decision, Consequences, Scope, Non-Scope, Acceptance Criteria, Evidence, Risk Classification, Local Gates, Owner Decision |
| `technical_debt.md` | Technical debt / cleanup | Markdown frontmatter | Summary, Context, Scope, Non-Scope, Acceptance Criteria, Evidence, Risk Classification, Local Gates, Owner Decision |

## Template Completeness Checklist

| Criterion | docs | research | architecture | tech-debt |
|-----------|------|----------|-------------|-----------|
| Summary | ✅ | ✅ | ✅ | ✅ |
| Context | ✅ | ✅ | ✅ | ✅ |
| Scope | ✅ | ✅ | ✅ | ✅ |
| Non-Scope | ✅ | ✅ | ✅ | ✅ |
| Acceptance Criteria | ✅ | ✅ | ✅ | ✅ |
| Evidence | ✅ | ✅ | ✅ | ✅ |
| Risk Classification | ✅ | ✅ | ✅ | ✅ |
| Local Gates | ✅ | ✅ | ✅ | ✅ |
| Owner Decision Needed? | ✅ | ✅ | ✅ | ✅ |

## Consistency Check

- All templates use Markdown frontmatter format (consistent with existing `bug_report.md` and `feature_request.md`)
- All templates include the mandatory sections from the issue #306 specification
- `config.yml` unchanged
- No workflow files modified
- Default labels match the new `type:` taxonomy

## Template Directory Contents (Post-Run)

```
.github/ISSUE_TEMPLATE/
├── architecture_decision.md   ← NEW
├── bug_report.md              ← existing
├── config.yml                 ← existing
├── documentation_update.md    ← NEW
├── feature_request.md         ← existing
├── research_validation.md     ← NEW
└── technical_debt.md          ← NEW
```

---

## Classification

```text
ISSUE_306_TEMPLATE_STATUS: CREATED
```

**Rationale:** All 4 missing templates created. All sections present. Format consistent with existing templates.
