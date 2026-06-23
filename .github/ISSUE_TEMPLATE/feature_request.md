---
name: Feature request
about: Propose a scoped feature
title: "feat: "
labels: enhancement
---

## Problem

What user/project problem does this solve?

## Proposed Scope

## Non-Goals

## Verification Contract

How will this be tested?

## Local Gates

Expected gates:

```powershell
git diff --check
npx biome format .
npm run build
npm run typecheck
npm test
```

## Evidence

What evidence should the PR produce?

## Safety Notes

- [ ] No secrets
- [ ] No unscoped remote CI
- [ ] Human approval required for merge
