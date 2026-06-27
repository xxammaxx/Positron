---
name: Research / validation
about: Propose an investigation, spike, or validation task
title: "research: "
labels: type:research, approval:not-required
---

## Summary

What question or hypothesis does this investigation address?

## Context

Why is this research needed before implementation can proceed?

## Scope

- Research questions to answer
- Sources to consult
- Experiments to run
- Output format (report, ADR, evidence file)

## Non-Scope

- What will NOT be implemented as part of this research?
- Any implementation decisions deferred?

## Acceptance Criteria

- [ ] Research questions answered with evidence
- [ ] Findings documented in `docs/evidence/` or ADR
- [ ] Recommendation provided (go/no-go, approach)
- [ ] External sources cited where applicable

## Evidence

- What evidence will the research produce?
- Where will it be stored?

## Risk Classification

```text
RISK: GREEN_SAFE | YELLOW_REVIEW | RED_HOLD
TYPE: type:research
```

## Local Gates

- [ ] All sources are cited
- [ ] No implementation code written
- [ ] No secrets included
- [ ] Evidence is reproducible

## Owner Decision Needed?

- [ ] Yes — research results require owner decision
- [ ] No — findings are informational only
