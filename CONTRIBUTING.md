# Contributing to Positron

Thank you for your interest in contributing to Positron! Please follow the guidelines below to ensure smooth collaboration.

## Code of Conduct

By participating in this project, you agree to maintain a respectful, inclusive, and harassment-free environment for everyone.

## Development Workflow

Positron follows a **spec-driven development** workflow. Before any implementation code is written, the Speckit workflow MUST complete:

1. `/speckit.constitution` — Project principles
2. `/speckit.specify` — Formal specification
3. `/speckit.plan` — Implementation plan
4. `/speckit.tasks` — Task breakdown
5. `/speckit.taskstoissues` — GitHub issue creation
6. `/speckit.implement` — Only then: implementation begins

**Gate:** No code without completed specification + acceptance criteria + tests defined.

## Branch Naming Convention

All branches must follow this format:

```
positron/issue-<number>-<slug>
```

Examples:
- `positron/issue-42-add-provider-detection`
- `positron/issue-229-infrastructure-gates`

## Commit Message Format

All commits must use the following format:

```
type(issue-<n>): description
```

Valid types: `fix`, `feat`, `test`, `docs`, `refactor`, `chore`, `style`

Examples:
- `fix(issue-42): correct provider detection path mismatch`
- `test(issue-229): add infrastructure gate aggregation tests`
- `docs(issue-229): update state assessment document`

## Testing Requirements

- **No commit without passing tests** — always run the test suite before committing
- All new features must include tests
- All bug fixes must include a regression test
- Contract tests must pass: `npm run test:contracts`
- Unit tests must pass: `npm test`
- TypeScript typecheck must pass: `npm run typecheck`

## Pull Request Requirements

All CI gates must pass before a PR can be merged:

| Gate | Status Required |
|------|----------------|
| Build (TypeScript) | ✅ PASS |
| Typecheck | ✅ PASS |
| Unit Tests | ✅ PASS |
| Contract Tests | ✅ PASS |
| Safety Coverage | ✅ PASS (100%) |
| Secret Scan | ✅ PASS |

## Evidence-Gated Progression

Before claiming completion, provide evidence:

- **Bug Fixed** — Test passes + regression test added
- **Feature Complete** — Acceptance criteria met + test coverage maintained
- **Architecture Decision** — ADR documented + dependency analysis
- **Migration Ready** — Rollback tested + data integrity verified

## Getting Started

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/xxammaxx/Positron.git
cd Positron

# Copy environment configuration
cp .env.example apps/server/.env

# Install dependencies
npm install

# Start development servers
npm run dev:server   # Terminal 1: Backend (Port 3000)
npm run dev:web      # Terminal 2: Frontend (Port 5173)
```

### Running Tests

```bash
# Unit/integration tests
npm test

# Contract tests
npm run test:contracts

# E2E tests
npx playwright test

# Typecheck
npm run typecheck

# Safety coverage
npm run coverage:safety
```

## Questions?

Open a GitHub Discussion or refer to the documentation in the `docs/` directory.

---

*Thank you for contributing to Positron!*
