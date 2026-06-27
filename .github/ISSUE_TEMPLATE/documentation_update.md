---
name: Documentation update
about: Propose a documentation-only change
title: "docs: "
labels: documentation, type:docs, approval:not-required
---

## Summary

What documentation artifact(s) does this affect?

## Context

Why is this documentation change needed?

## Scope

- What will be updated/created?
- Which files?

## Non-Scope

- What is explicitly not part of this change?

## Acceptance Criteria

- [ ] Documentation is accurate and matches current reality
- [ ] Cross-references are updated
- [ ] Format follows existing conventions

## Evidence

What evidence will confirm this is correct?

## Risk Classification

```text
RISK: GREEN_SAFE | YELLOW_REVIEW | RED_HOLD
TYPE: type:docs
```

## Local Gates

- [ ] `git diff --check` passes
- [ ] No code changes outside docs/
- [ ] No secrets included

## Owner Decision Needed?

- [ ] Yes — requires owner approval
- [ ] No — safe to proceed
