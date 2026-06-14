# GitHub Wiki and Docs-Site Plan

## Current Status

- Repository homepage: not configured
- Published GitHub Pages or docs site: not verified
- GitHub Wiki content: not verified as an active source of truth
- `mkdocs.yml`: not present in the current root checkout

No homepage URL should be added until a real, maintained site exists.

## Docs-as-Code Recommendation

Keep authoritative technical documentation in this repository so changes are reviewed with code, tests, and safety policy. Use the README as the entry point and link to focused pages under `docs/`.

## Option A: GitHub Wiki

Advantages:

- Low setup effort
- Familiar GitHub editing experience

Tradeoffs:

- Separate Git history and review flow
- Easier for content to drift from code
- Weaker fit with the repository's issue/spec/evidence workflow

## Option B: MkDocs and GitHub Pages

Advantages:

- Versioned with the repository
- Pull-request review and link validation
- Clear navigation for architecture, safety, runbooks, and QA

Tradeoffs:

- Requires a maintained `mkdocs.yml`, dependencies, and deployment workflow
- Pages deployment adds another CI/security surface

## Recommendation

Choose docs-as-code with MkDocs and GitHub Pages only after:

1. The root documentation inventory is consolidated.
2. A minimal navigation structure is approved.
3. Link checking and strict docs builds are green.
4. A dedicated issue defines Pages permissions and deployment controls.
5. A real site is deployed and verified before setting the repository homepage.

This track is useful but not blocking for the current repository-polish pull request.
