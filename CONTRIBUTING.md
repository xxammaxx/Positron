# Contributing to Positron

Positron uses GitHub as the source of truth and requires specification before implementation.

## Workflow

1. Read `AGENTS.md` and `.specify/memory/constitution.md`.
2. Work from one approved GitHub issue.
3. Document repository context, specification, plan, and tasks in the issue.
4. Create a branch named `positron/issue-<number>-<slug>`.
5. Keep the change scoped and reversible.
6. Run the relevant tests and document results.
7. Open a draft pull request for human review.

Do not push directly to `main` or `master`.

## Development

```bash
npm install
npm run dev:demo
```

Core validation:

```bash
npm test
npm run build
npm run coverage:safety
npm run test:contracts
npm run typecheck
```

## Commit Messages

```text
fix(issue-<n>): description
test(issue-<n>): description
docs(issue-<n>): description
```

## Safety and Hygiene

- Never commit `.env`, tokens, runtime databases, traces, videos, or `test-results/`.
- Do not weaken push, merge, fix-loop, or kill-switch defaults without an explicit security issue and human approval.
- Stage explicit paths. Do not use `git add .` in a mixed working tree.
- Redact private repository names, local paths, and personal data from evidence.
- Stop after three unsuccessful fix loops and document the blocker.
