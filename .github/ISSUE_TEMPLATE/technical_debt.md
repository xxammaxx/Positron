---
name: Technical debt / cleanup
about: Propose a technical debt cleanup, refactor, or code quality improvement
title: "refactor: "
labels: type:technical-debt, refactor, approval:not-required
---

## Summary

What technical debt or cleanup is being proposed?

## Context

Why is this important now? What problems does the current state cause?

## Scope

- Files/modules to refactor
- Specific improvements
- Expected outcomes (performance, readability, maintainability)

## Non-Scope

- What behavior must NOT change?
- What features are NOT part of this cleanup?

## Acceptance Criteria

- [ ] Behavior is identical (no regression)
- [ ] Tests still pass
- [ ] Code quality metrics improve
- [ ] No new dependencies added (unless scoped)

## Evidence

- Before/after metrics (lines, complexity, test coverage)
- Diff summary

## Risk Classification

```text
RISK: GREEN_SAFE | YELLOW_REVIEW | RED_HOLD
TYPE: type:technical-debt
```

## Local Gates

- [ ] `git diff --check`
- [ ] `npm run build`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] No behavior changes

## Owner Decision Needed?

- [ ] Yes — large-scale refactor or risky change
- [ ] No — small, safe cleanup
