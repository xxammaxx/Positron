# GitHub Repository Pflege & Erscheinungsbild — Hardening Checklist

**Date:** 2026-06-19 | **Source:** Manual review against Positron Prompt/Evidence/GitHub Hardening Standards

---

## Status Values
- `✅ done` — Present and correct
- `🟡 manual` — Requires human action (out of agent scope)
- `🔴 blocked` — API/settings not accessible from here
- `⚪ not-applicable` — Intentionally skipped

---

## Repository Configuration

| Item | Status | Notes |
|------|--------|-------|
| About/Description | 🟡 manual | Set via GitHub UI: "Evidence-Gated AI Agent for Autonomous GitHub Issue Resolution" |
| Website URL | 🟡 manual | Can link to demo or docs |
| Topics/Tags | 🔴 blocked | Set via GitHub UI; suggest: `ai-agent`, `github-issues`, `evidence-gated`, `spec-driven`, `typescript`, `docker` |
| Social Preview Image | 🔴 blocked | Requires image upload in repo settings |
| Default Branch | ✅ done | `main` configured |
| License | ✅ done | MIT (`LICENSE` file present) |

## Issues & PR Templates

| Item | Status | Notes |
|------|--------|-------|
| Issue Templates | ⚪ not-applicable | Standard GitHub Issues used; no issue forms defined |
| Bug Report Template | ⚪ not-applicable | Not present |
| Feature Request Template | ⚪ not-applicable | Not present |
| Pull Request Template | ⚪ not-applicable | Not present — PR descriptions are manual |
| Issue Forms (YAML) | ⚪ not-applicable | Not present |

## Branch Protection & Rulesets

| Item | Status | Notes |
|------|--------|-------|
| Branch Protection (main) | 🔴 blocked | Configurable in GitHub settings; not auto-manageable |
| Rulesets | 🔴 blocked | Require GitHub settings access |
| Required Reviews | 🔴 blocked | Configurable in branch protection |
| Require Status Checks | 🔴 blocked | CI already configured via `quality-gates.yml` |
| Require Conversation Resolution | 🔴 blocked | Configurable in branch protection |

## CI/CD

| Item | Status | Notes |
|------|--------|-------|
| CI Workflow | ✅ done | `quality-gates.yml` — build, typecheck, lint, unit tests |
| Windows Tests | ✅ done | `tool-gateway-windows` job (non-blocking) |
| E2E Tests | ✅ done | `e2e-playwright` job (non-blocking, stability window) |
| Mutation Testing | ✅ done | `mutation-fast` + `mutation-safety` jobs (non-blocking) |
| Issue Verification | ✅ done | `verify-issues.yml` — weekly cron + on PR close |
| Observability Config Check | ✅ done | `observability-config-check` job |
| Release Automation | ⚪ not-applicable | No release workflow defined |

## Security

| Item | Status | Notes |
|------|--------|-------|
| SECURITY.md | ✅ done | Present with vulnerability reporting instructions |
| Secret Scanning | 🟡 manual | Enable via GitHub Security settings |
| Dependabot | 🟡 manual | Enable via GitHub Security settings |
| CodeQL/Code Scanning | 🟡 manual | Could add `codeql-analysis.yml` workflow |
| Dependency Review | 🟡 manual | Could add `dependency-review.yml` |
| npm audit | ✅ done | Available via `npm audit --audit-level=high` |

## Documentation

| Item | Status | Notes |
|------|--------|-------|
| README.md | ✅ done | Comprehensive with badges, screenshots, quickstart |
| CONTRIBUTING.md | ✅ done | Spec-driven workflow, branch/commit conventions |
| CODE_OF_CONDUCT.md | ⚪ not-applicable | Referenced in CONTRIBUTING.md; could be created |
| CHANGELOG | 🟡 manual | `docs/changelog/` directory exists; v0.3.0 entry needed |
| API Documentation | 🟡 manual | `docs/architecture.md` present; api-overview.md outdated |
| Architecture Docs | ✅ done | `docs/architecture.md`, ADRs in `docs/adr/` |
| Deployment Docs | ✅ done | `docs/deployment/container-quickstart.md` |
| Security Docs | ✅ done | `docs/security/` with stop-ask protocol, security model |

## Badges (in README)

| Badge | Status | Notes |
|-------|--------|-------|
| Version | ✅ done | v0.2.0 badge |
| Tests | 🟡 manual | Shows 2108 — should update to 2182 (latest known) |
| E2E | ✅ done | 17 passing |
| License | ✅ done | MIT |
| Docker | ✅ done | docker-ready badge |
| TypeScript | ✅ done | 5.7 badge |
| React | ✅ done | 18 badge |
| Vite | ✅ done | 6 badge |
| CI Status | 🔴 blocked | Needs dynamic GitHub Actions badge URL |

## Screenshots & Demo

| Item | Status | Notes |
|------|--------|-------|
| Dashboard Screenshot | ✅ done | `docs/screenshots/dashboard.png` |
| Evidence Explorer | ✅ done | `docs/screenshots/evidence.png` |
| Admin Panel | ✅ done | `docs/screenshots/admin.png` |
| Run Detail | ✅ done | `docs/screenshots/run-detail.png` |
| Demo Video | ✅ done | `docs/release/video-demo/positron-v0.2.0-demo.webm` |

## Community

| Item | Status | Notes |
|------|--------|-------|
| Discussions | 🟡 manual | Can enable in GitHub settings |
| Projects/Roadmap | 🟡 manual | `docs/roadmap.md` exists; GitHub Projects can be linked |
| Releases/Tags | 🟡 manual | v0.2.0 tagged; v0.3.0 release note needed |

## Prompt Standard

| Item | Status | Notes |
|------|--------|-------|
| Canonical Prompt Standard | ✅ done | `docs/prompts/positron-prompt-standard.md` |
| Red Tests for Standards | ✅ done | `packages/shared/src/__tests__/prompt-standard.contract.test.ts` |
| Prompt Documentation | ✅ done | Reference in standard itself and this checklist |

---

## Recommended Next Actions (Human)

1. **Update test badge** in README from 2108 to 2182
2. **Add CHANGELOG entry** for v0.3.0
3. **Enable Dependabot** and secret scanning in GitHub settings
4. **Update api-overview.md** with Issue #229 endpoints
5. **Consider adding** `codeql-analysis.yml` workflow
6. **Consider adding** PR template under `.github/PULL_REQUEST_TEMPLATE.md`
7. **Update topics/tags** via GitHub repo settings UI
8. **Add dynamic CI badge** using GitHub Actions badge URL

---

*Generated as part of Prompt/Evidence/GitHub Hardening Run 01*
