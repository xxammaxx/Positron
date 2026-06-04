# Tasks: Testing & Verification Framework — 7-Layer Autonomous Quality System

## Metadata

- **Issue:** #165
- **Phase:** Speckit Phase 4 — Tasks
- **Date:** 2026-06-04
- **Inputs read fully:** `spec.md`, `plan.md`, `.specify/memory/constitution.md`, `AGENTS.md`
- **Architecture basis:** `docs/architecture/adr-001-7-layer-testing-verification-framework.md`
- **Additional ADR:** `docs/architecture/adr-002-evidence-backed-validation.md`

## Non-Negotiable Evidence Rule

Layer 7 must never trust a plain “test success” claim. Every completion claim must be backed by at least one artifact: Screenshot, Trace, Report, Log, Review, or Runtime Event. **No evidence = no validation.** Missing optional artifacts are allowed only when explicitly marked as skipped/degraded with a backing skip log or report.

## Task Matrix

| Task ID | Layer | Title | Files affected (create/modify) | Dependencies | Effort | Evidence Gate |
|---|---:|---|---|---|---|---|
| L1-T1 | 1 | Create CodeRabbit repo configuration | Create `.coderabbit.yaml` | None | S | YAML exists; config validation log or CodeRabbit app reads config |
| L1-T2 | 1 | Create PR evidence checklist template | Create `.github/PULL_REQUEST_TEMPLATE.md` | None | S | PR template rendered in a test PR screenshot/log |
| L1-T3 | 1 | Document CodeRabbit and branch protection setup | Create `docs/qa/layer-1-code-review.md`; modify `docs/qa-tooling.md` | L1-T1, L1-T2 | S | Docs diff + branch-protection checklist artifact |
| L1-T4 | 1 | Verify CodeRabbit app installation | External GitHub App setting; no product code | L1-T1 | M | CodeRabbit review comment or GitHub App installation screenshot/log |
| L1-T5 | 1 | Verify branch protection enforcement | External GitHub branch protection setting | L1-T2, L1-T3 | M | GitHub branch protection screenshot/API JSON; test PR blocked until review |
| L2A-T1 | 2 | Create Semgrep ruleset configuration | Create `.semgrep.yaml` | None | S | `semgrep --validate --config .semgrep.yaml` log |
| L2A-T2 | 2 | Add Semgrep GitHub Actions workflow | Create `.github/workflows/semgrep.yml` | L2A-T1 | M | Workflow run log + uploaded `semgrep.sarif` artifact |
| L2A-T3 | 2 | Enable Semgrep SARIF upload and artifact retention | Modify `.github/workflows/semgrep.yml` | L2A-T2 | S | GitHub Code Scanning SARIF upload log + artifact link |
| L2A-T4 | 2 | Document Semgrep baseline and suppression policy | Create `docs/qa/layer-2-semgrep.md`; modify `docs/qa-tooling.md` | L2A-T2 | S | Docs diff + Semgrep baseline report |
| L2B-T1 | 2 | Add CodeQL workflow for JavaScript/TypeScript | Create `.github/workflows/codeql.yml` | None | S-M | CodeQL workflow run log |
| L2B-T2 | 2 | Verify CodeQL Security tab and SARIF/code scanning upload | External GitHub Security tab | L2B-T1 | M | Security tab screenshot/API result + CodeQL analysis log |
| L2B-T3 | 2 | Document CodeQL severity and branch-protection policy | Create `docs/qa/layer-2-codeql.md`; modify `docs/qa-tooling.md` | L2B-T2 | S | Docs diff + branch protection policy checklist |
| L2C-T1 | 2 | Create SonarQube project configuration | Create `sonar-project.properties` | L3-T1 | S | Sonar scanner dry-run/log references project key and LCOV paths |
| L2C-T2 | 2 | Add local SonarQube Docker Compose service | Create `docker-compose.sonarqube.yml` | None | S | `docker compose config` log; local startup screenshot/log when available |
| L2C-T3 | 2 | Add SonarQube quality gate check script | Create `scripts/sonarqube-quality-gate.mjs` | L2C-T1 | M | Fixture/local quality-gate report JSON/log |
| L2C-T4 | 2 | Add coverage import script from Vitest LCOV to SonarQube | Create `scripts/sonarqube-coverage-import.mjs` or package script; modify `package.json` | L2C-T1, L3-T1 | M | LCOV path validation report + scanner log |
| L2C-T5 | 2 | Add opt-in SonarQube CI job | Modify `.github/workflows/quality-gates.yml` | L2C-T1, L2C-T3, L2C-T4 | M | CI log showing skip without `SONAR_*` and gate result when configured |
| L2C-T6 | 2 | Write SonarQube manual QA runbook | Create `docs/qa/layer-2-sonarqube.md`; modify `docs/qa-tooling.md` | L2C-T2, L2C-T5 | S | Runbook doc + manual QA checklist artifact |
| L4-T1 | 4 | Enable Playwright trace, failure video, and screenshots | Modify `playwright.config.ts` | None | S | Playwright run report containing trace/video/screenshot settings |
| L4-T2 | 4 | Add named screenshot helper for key UI states | Create `e2e/support/artifacts.ts` | L4-T1 | S | Screenshot manifest/log with Dashboard/Run/Evidence/Settings paths |
| L4-T3 | 4 | Add console and network evidence capture | Create `e2e/support/console-network.ts`; modify E2E setup/specs | L4-T1 | M | Console/network JSON logs with redaction proof |
| L4-T4 | 4 | Update E2E specs to capture required page screenshots | Modify `e2e/*.spec.ts` | L4-T2, L4-T3 | M | CI/local `test-results/screenshots/*.png` artifacts |
| L4-T5 | 4 | Upload Playwright report, screenshots, videos, traces, logs | Modify `.github/workflows/quality-gates.yml` | L4-T4 | S | GitHub Actions artifact links for `playwright-report`, `test-results`, `e2e-artifacts` |
| L4-T6 | 4 | Add and verify headed/debug local scripts | Modify `package.json`; docs | L4-T1 | S | Logs for `PW_HEADED=1` and `PWDEBUG=1` scripts or documented manual screenshots |
| L4-T7 | 4 | Document browser evidence operations | Create `docs/qa/layer-4-browser-verification.md`; modify `docs/qa-tooling.md` | L4-T5 | S | Docs diff + artifact inventory report |
| L6A-T1 | 6 | Install Sentry server dependency | Modify `apps/server/package.json`, lockfile | None | S | `npm ls -w apps/server @sentry/node` log |
| L6A-T2 | 6 | Add optional Sentry initialization module | Create `apps/server/src/instrumentation/sentry.ts` | L6A-T1 | M | Unit test/log proving disabled when `SENTRY_DSN` missing |
| L6A-T3 | 6 | Add run-context Sentry breadcrumbs | Create/modify `apps/server/src/instrumentation/run-context.ts`; run lifecycle files | L6A-T2 | M | Unit test showing redacted `run.id`, `run.phase`, `adapter.mode` breadcrumb |
| L6A-T4 | 6 | Wire Sentry into server entry and error handling | Modify `apps/server/src/index.ts` | L6A-T2, L6A-T3 | M | Server smoke log with no DSN; manual Sentry event screenshot when configured |
| L6A-T5 | 6 | Document Sentry env config and verification | Create/update `docs/qa/layer-6-runtime-verification.md`; `docs/observability.md` | L6A-T4 | S | Docs diff + graceful-disable smoke report |
| L6B-T1 | 6 | Install OpenTelemetry dependencies | Modify `apps/server/package.json`, lockfile | None | M | `npm ls -w apps/server @opentelemetry/sdk-node` log |
| L6B-T2 | 6 | Add optional OTEL SDK initialization module | Create `apps/server/src/instrumentation/otel.ts` | L6B-T1 | M | Unit test/log proving disabled when endpoint missing |
| L6B-T3 | 6 | Add run lifecycle spans and attributes | Modify run lifecycle code; `run-context.ts` | L6B-T2, L6A-T3 | L | Trace/log showing spans with `run.id` and `run.phase` |
| L6B-T4 | 6 | Add runtime instrumentation tests | Create `apps/server/src/__tests__/runtime-instrumentation.test.ts` | L6A-T4, L6B-T3 | M | Vitest JSON/report for instrumentation tests |
| L6B-T5 | 6 | Add CI runtime verification smoke job | Modify `.github/workflows/quality-gates.yml`; package scripts | L6B-T4 | S | CI `runtime-verify` log showing graceful skip/no external telemetry |
| L6B-T6 | 6 | Verify traces in Jaeger/Zipkin or console | Optional local env/config docs | L6B-T3 | M | Console trace log or Jaeger/Zipkin screenshot |
| L5-T1 | 5 | Define AI UI review spec | Create `docs/ui-review-spec.md` | L4-T4 | S | Spec doc with expected pages and visual criteria |
| L5-T2 | 5 | Add screenshot collection script | Create `scripts/collect-ui-screenshots.mjs` | L4-T4 | M | Screenshot manifest JSON artifact |
| L5-T3 | 5 | Add provider adapter interface and provider chain | Create `scripts/ai-ui/providers/*.mjs` or equivalent; create `scripts/ai-ui-review.mjs` | L5-T1, L5-T2 | L | Unit/fixture report showing Local → OpenAI-compatible → Anthropic → Gemini resolution |
| L5-T4 | 5 | Implement local LLM placeholder provider | Modify provider files | L5-T3 | S | Local skipped/basic review report artifact |
| L5-T5 | 5 | Implement OpenAI-compatible provider | Modify provider files | L5-T3 | M | Dry-run/request-shape fixture report; no token logged |
| L5-T6 | 5 | Implement Anthropic provider | Modify provider files | L5-T3 | M | Dry-run/request-shape fixture report; no token logged |
| L5-T7 | 5 | Implement Gemini provider | Modify provider files | L5-T3 | M | Dry-run/request-shape fixture report; no token logged |
| L5-T8 | 5 | Add GitHub comment posting for AI UI review | Create `scripts/post-ai-ui-review.mjs` | L5-T3 | M | Dry-run comment payload log or test issue comment link |
| L5-T9 | 5 | Add non-blocking post-E2E CI job | Modify `.github/workflows/quality-gates.yml`; package scripts | L5-T2, L5-T3, L5-T8 | M | CI artifact `ai-ui-review.md`; skip log when no provider configured |
| L5-T10 | 5 | Document AI UI Review setup and graceful skip | Create `docs/qa/layer-5-ai-ui-review.md`; modify `docs/qa-tooling.md` | L5-T9 | S | Docs diff + skipped/provider-run report |
| L7-T1 | 7 | Define artifact contract and evidence template | Create `scripts/evidence/templates/evidence-report.md`; docs | L1-T3, L2A-T4, L2B-T3, L2C-T6, L4-T7, L5-T10, L6A-T5 | M | Artifact contract doc + template render fixture |
| L7-T2 | 7 | Implement evidence parsers for tests, coverage, mutation, Playwright | Create `scripts/evidence/parsers/vitest.mjs`, `coverage.mjs`, `mutation.mjs`, `playwright.mjs` | L7-T1, L3-T1, L4-T5 | L | Parser fixture test report + `evidence-summary.json` |
| L7-T3 | 7 | Implement evidence parsers for Semgrep, CodeQL, SonarQube, AI UI, runtime | Create parser files for SARIF/Sonar/AI/runtime | L7-T1, L2A-T3, L2B-T2, L2C-T5, L5-T9, L6B-T5 | L | Parser fixture test report + missing-artifact degradation report |
| L7-T4 | 7 | Implement `collect-evidence` artifact aggregator | Create `scripts/collect-evidence.mjs` | L7-T2, L7-T3 | L | Generated `evidence-report.md` and `evidence-summary.json` |
| L7-T5 | 7 | Enforce “claim requires artifact” validation | Modify `scripts/collect-evidence.mjs`; add fixtures/tests | L7-T4 | M | Test report showing unsupported claim marked invalid/missing |
| L7-T6 | 7 | Implement evidence GitHub comment posting | Create `scripts/post-evidence-comment.mjs`; modify `package.json` | L7-T4 | M | Dry-run payload + posted comment link when token available |
| L7-T7 | 7 | Add `evidence-collect` CI job with artifact downloads | Modify `.github/workflows/quality-gates.yml` | L7-T4, L7-T6, L5-T9, L6B-T5, L2C-T5 | M | CI job log + uploaded evidence artifacts |
| L7-T8 | 7 | Default evidence target to Issue 165 | Modify CI env/package docs | L7-T7 | S | CI env log showing `POSITRON_EVIDENCE_ISSUE=165`; issue comment link |
| L7-T9 | 7 | Add redaction, truncation, and graceful missing-artifact behavior | Modify evidence scripts | L7-T4, L7-T6 | M | Redaction fixture test + oversized-comment truncation report |
| L7-T10 | 7 | Document Layer 7 operations and trust model | Create `docs/qa/layer-7-evidence.md`; modify `docs/qa-tooling.md` | L7-T9 | S | Docs diff + final evidence contract checklist |
| L3-T1 | 3 | Verify current test commands and artifact paths | Existing CI/package scripts; no required code change | None | M | Baseline report: build/typecheck/unit/integration/contracts/property/coverage paths |
| L3-T2 | 3 | Fix Stryker mutation-fast CI ENOENT | Modify `stryker.fast.config.json`; optional `scripts/stryker-ci-sanitize.mjs`; `.gitignore` | L3-T1 | M-L | CI/local mutation-fast report with no ENOENT |
| L3-T3 | 3 | Fix observability-config-check promtool Docker issue | Modify `.github/workflows/quality-gates.yml`; observability validation scripts/docs | L3-T1 | M | CI observability validation log with Docker fallback/binary fallback |
| L3-T4 | 3 | Track E2E stability window | Create `scripts/check-e2e-stability-window.mjs` or docs table; modify docs | L4-T5, L7-T7 | M | Stability report showing consecutive green main runs |
| L3-T5 | 3 | Promote mutation-fast to blocking after fix | Modify `.github/workflows/quality-gates.yml`; branch protection docs | L3-T2 | S | CI config diff + branch-protection/API evidence |
| L3-T6 | 3 | Promote E2E to blocking after ≥5 green runs | Modify `.github/workflows/quality-gates.yml`; branch protection docs | L3-T4 | S | Five-run stability report + CI config diff |
| L3-T7 | 3 | Document backend verification and promotion policy | Create `docs/qa/layer-3-backend-verification.md`; modify `docs/qa-tooling.md` | L3-T2, L3-T3, L3-T6 | S | Docs diff + acceptance criteria mapping report |

## Layer Dependencies (Dependency Graph)

```text
                 ┌──────────────────────────┐
                 │ L1 Code Review            │
                 │ config/docs/app verify    │
                 └────────────┬─────────────┘
                              │
┌──────────────────────────┐  │   ┌──────────────────────────┐
│ L2a Semgrep              │  │   │ L6 Runtime               │
│ SARIF producer           │  │   │ Sentry + OTEL smoke      │
└────────────┬─────────────┘  │   └────────────┬─────────────┘
             │                │                │
┌────────────▼─────────────┐  │                │
│ L2b CodeQL               │  │                │
│ code scanning producer   │  │                │
└────────────┬─────────────┘  │                │
             │                │                │
┌────────────▼─────────────┐  │                │
│ L3 Backend baseline      │◄─┘                │
│ tests + coverage         │                   │
└──────┬───────────┬───────┘                   │
       │           │                           │
       │           ▼                           │
       │  ┌──────────────────────────┐         │
       │  │ L2c SonarQube            │         │
       │  │ coverage + quality gate  │         │
       │  └────────────┬─────────────┘         │
       │               │                       │
       ▼               │                       │
┌──────────────────────────┐                   │
│ L4 Playwright Evidence    │                   │
│ screenshots/traces/logs   │                   │
└────────────┬─────────────┘                   │
             ▼                                 │
┌──────────────────────────┐                   │
│ L5 AI UI Review           │                   │
│ optional provider chain   │                   │
└────────────┬─────────────┘                   │
             │                                 │
             ▼                                 ▼
      ┌─────────────────────────────────────────────┐
      │ L7 Evidence Layer                            │
      │ collect + verify artifact-backed claims      │
      └────────────────────┬────────────────────────┘
                           ▼
              ┌──────────────────────────┐
              │ L3 Promotion             │
              │ mutation/E2E blocking    │
              └──────────────────────────┘
```

### Parallelizable Layers

- **Can start immediately in parallel:** L1-T1/T2/T3, L2A-T1/T2, L2B-T1, L2C-T2, L4-T1, L6A-T1, L6B-T1, L3-T1.
- **Can proceed in parallel after producers exist:** L2A SARIF verification, L2B Security Tab verification, L6 runtime modules, L4 artifact enhancement.
- **Optional/manual in parallel:** CodeRabbit app installation, branch protection docs, local SonarQube startup, Sentry/OTEL manual verification.

### Sequential Layers

- L5 must follow L4 screenshots.
- L7 must follow artifact producers from L1-L6 and L3 baseline.
- L3 promotion must follow L7 evidence collection plus stability/fix verification.

## Critical Path

The longest dependency chain that determines total duration is:

```text
L3-T1 baseline verification
 → L4-T1 Playwright config
 → L4-T2 screenshot helper
 → L4-T3 console/network evidence
 → L4-T4 E2E screenshot updates
 → L4-T5 artifact upload
 → L5-T1 UI review spec
 → L5-T2 screenshot collector
 → L5-T3 provider architecture
 → L5-T8 GitHub AI review comment posting
 → L5-T9 post-E2E CI job
 → L7-T1 artifact contract/template
 → L7-T2/L7-T3 evidence parsers
 → L7-T4 evidence aggregator
 → L7-T5 artifact-backed claim validation
 → L7-T6 evidence comment posting
 → L7-T7 evidence-collect CI job
 → L3-T4 E2E stability tracking
 → L3-T6 promote E2E to blocking after ≥5 green runs
 → L3-T7 final backend verification docs
```

- **Critical path length:** 20 sequential task slots.
- **Blocking tasks:** L3-T1, L4-T5, L5-T9, L7-T4, L7-T5, L7-T7, L3-T4, L3-T6.
- **Calendar blocker:** L3-T6 requires ≥5 green main-branch E2E runs and cannot be completed purely by local implementation.

## Task Groups by Layer

### Layer 1 — CodeRabbit (config-only, no product code changes)

- L1-T1 Create `.coderabbit.yaml` with TypeScript/Node.js/React/Vite rules and ignores for `dist/`, `node_modules/`, `coverage/`, `playwright-report/`, `test-results/`.
- L1-T2 Create `.github/PULL_REQUEST_TEMPLATE.md` with evidence checklist.
- L1-T3 Document branch protection and CodeRabbit operations.
- L1-T4 Verify CodeRabbit GitHub App installation for `xxammaxx/Positron`.
- L1-T5 Verify branch protection requires ≥1 approving review, stale dismissal, and required checks.

### Layer 2a — Semgrep

- L2A-T1 Create `.semgrep.yaml`.
- L2A-T2 Create `.github/workflows/semgrep.yml`.
- L2A-T3 Verify SARIF upload and artifact retention.
- L2A-T4 Document baseline, suppressions, and false-positive policy.

### Layer 2b — CodeQL

- L2B-T1 Create `.github/workflows/codeql.yml`.
- L2B-T2 Verify Security Tab active and SARIF/code scanning upload works.
- L2B-T3 Document severity and branch protection policy.

### Layer 2c — SonarQube Phase 1 Local Docker

- L2C-T1 Create `sonar-project.properties`.
- L2C-T2 Create `docker-compose.sonarqube.yml`.
- L2C-T3 Add `scripts/sonarqube-quality-gate.mjs`.
- L2C-T4 Add coverage import script/path validation for Vitest LCOV → SonarQube.
- L2C-T5 Add opt-in CI job that skips when `SONAR_HOST_URL`/`SONAR_TOKEN` are missing.
- L2C-T6 Write manual QA runbook.

### Layer 4 — Playwright Evidence Enhancements

- L4-T1 Configure trace for all tests, video on failure, screenshot behavior.
- L4-T2 Add screenshot helper.
- L4-T3 Add console/network capture with redaction.
- L4-T4 Update specs to capture Dashboard, Run Detail, Evidence, Settings.
- L4-T5 Upload Playwright artifacts in CI.
- L4-T6 Add/verify `PW_HEADED` and `PWDEBUG` local scripts.
- L4-T7 Document browser evidence operations.

### Layer 6a — Sentry

- L6A-T1 Add `@sentry/node`.
- L6A-T2 Add optional `Sentry.init()` module.
- L6A-T3 Add run context breadcrumbs.
- L6A-T4 Wire initialization and error handling into server entry with graceful disable.
- L6A-T5 Document env vars and manual verification that an error appears in Sentry when configured.

### Layer 6b — OpenTelemetry

- L6B-T1 Add OTEL SDK and auto-instrumentation dependencies.
- L6B-T2 Add optional OTEL initialization.
- L6B-T3 Add run lifecycle spans with `run.id` and `run.phase`.
- L6B-T4 Add runtime instrumentation tests.
- L6B-T5 Add CI runtime verification smoke job.
- L6B-T6 Verify traces in Jaeger/Zipkin or console.

### Layer 5 — AI UI Review

- L5-T1 Define UI review spec.
- L5-T2 Add post-E2E screenshot collection script.
- L5-T3 Add adapter interface/provider chain: Local LLM → OpenAI-compatible → Anthropic → Gemini.
- L5-T4 Add Local LLM placeholder/basic provider.
- L5-T5 Add OpenAI-compatible provider.
- L5-T6 Add Anthropic provider.
- L5-T7 Add Gemini provider.
- L5-T8 Add GitHub comment posting.
- L5-T9 Add non-blocking post-E2E CI job.
- L5-T10 Document graceful skip when no provider is configured.

### Layer 7 — Evidence Layer

- L7-T1 Define artifact contract and evidence comment template.
- L7-T2 Implement parsers for Vitest/test reports, coverage, mutation, Playwright.
- L7-T3 Implement parsers for Semgrep, CodeQL, SonarQube, AI UI review, runtime smoke.
- L7-T4 Implement `scripts/collect-evidence.mjs`.
- L7-T5 Enforce no-claim-without-artifact validation.
- L7-T6 Implement GitHub evidence comment posting.
- L7-T7 Add `evidence-collect` CI job depending on producers.
- L7-T8 Default `POSITRON_EVIDENCE_ISSUE=165`.
- L7-T9 Add redaction, truncation, and graceful degradation.
- L7-T10 Document Layer 7 trust model and operations.

### Layer 3 — Backend Promotion

- L3-T1 Verify current build/test/coverage artifact baseline.
- L3-T2 Fix mutation-fast CI ENOENT.
- L3-T3 Fix observability-config-check/promtool Docker issue.
- L3-T4 Track E2E stability window.
- L3-T5 Promote mutation-fast to blocking after fix.
- L3-T6 Promote E2E to blocking after ≥5 green runs.
- L3-T7 Document backend verification and promotion policy.

## Implementation Sequence (Ordered)

1. L3-T1 — Verify current test commands and artifact paths.
2. L1-T1 — Create CodeRabbit repo configuration.
3. L1-T2 — Create PR evidence checklist template.
4. L1-T3 — Document CodeRabbit and branch protection setup.
5. L2A-T1 — Create Semgrep ruleset configuration.
6. L2A-T2 — Add Semgrep GitHub Actions workflow.
7. L2A-T3 — Enable Semgrep SARIF upload and artifact retention.
8. L2A-T4 — Document Semgrep baseline and suppression policy.
9. L2B-T1 — Add CodeQL workflow for JavaScript/TypeScript.
10. L2B-T2 — Verify CodeQL Security tab and SARIF/code scanning upload.
11. L2B-T3 — Document CodeQL severity and branch-protection policy.
12. L2C-T2 — Add local SonarQube Docker Compose service.
13. L2C-T1 — Create SonarQube project configuration.
14. L2C-T3 — Add SonarQube quality gate check script.
15. L2C-T4 — Add coverage import script from Vitest LCOV to SonarQube.
16. L2C-T5 — Add opt-in SonarQube CI job.
17. L2C-T6 — Write SonarQube manual QA runbook.
18. L4-T1 — Enable Playwright trace, failure video, and screenshots.
19. L4-T2 — Add named screenshot helper for key UI states.
20. L4-T3 — Add console and network evidence capture.
21. L4-T4 — Update E2E specs to capture required page screenshots.
22. L4-T5 — Upload Playwright report, screenshots, videos, traces, logs.
23. L4-T6 — Add and verify headed/debug local scripts.
24. L4-T7 — Document browser evidence operations.
25. L6A-T1 — Install Sentry server dependency.
26. L6A-T2 — Add optional Sentry initialization module.
27. L6A-T3 — Add run-context Sentry breadcrumbs.
28. L6A-T4 — Wire Sentry into server entry and error handling.
29. L6A-T5 — Document Sentry env config and verification.
30. L6B-T1 — Install OpenTelemetry dependencies.
31. L6B-T2 — Add optional OTEL SDK initialization module.
32. L6B-T3 — Add run lifecycle spans and attributes.
33. L6B-T4 — Add runtime instrumentation tests.
34. L6B-T5 — Add CI runtime verification smoke job.
35. L6B-T6 — Verify traces in Jaeger/Zipkin or console.
36. L5-T1 — Define AI UI review spec.
37. L5-T2 — Add screenshot collection script.
38. L5-T3 — Add provider adapter interface and provider chain.
39. L5-T4 — Implement local LLM placeholder provider.
40. L5-T5 — Implement OpenAI-compatible provider.
41. L5-T6 — Implement Anthropic provider.
42. L5-T7 — Implement Gemini provider.
43. L5-T8 — Add GitHub comment posting for AI UI review.
44. L5-T9 — Add non-blocking post-E2E CI job.
45. L5-T10 — Document AI UI Review setup and graceful skip.
46. L1-T4 — Verify CodeRabbit app installation.
47. L1-T5 — Verify branch protection enforcement.
48. L7-T1 — Define artifact contract and evidence template.
49. L7-T2 — Implement evidence parsers for tests, coverage, mutation, Playwright.
50. L7-T3 — Implement evidence parsers for Semgrep, CodeQL, SonarQube, AI UI, runtime.
51. L7-T4 — Implement `collect-evidence` artifact aggregator.
52. L7-T5 — Enforce “claim requires artifact” validation.
53. L7-T6 — Implement evidence GitHub comment posting.
54. L7-T7 — Add `evidence-collect` CI job with artifact downloads.
55. L7-T8 — Default evidence target to Issue 165.
56. L7-T9 — Add redaction, truncation, and graceful missing-artifact behavior.
57. L7-T10 — Document Layer 7 operations and trust model.
58. L3-T2 — Fix Stryker mutation-fast CI ENOENT.
59. L3-T3 — Fix observability-config-check promtool Docker issue.
60. L3-T4 — Track E2E stability window.
61. L3-T5 — Promote mutation-fast to blocking after fix.
62. L3-T6 — Promote E2E to blocking after ≥5 green runs.
63. L3-T7 — Document backend verification and promotion policy.

## Summary

- **Total task count:** 63
- **Critical path length:** 20 sequential task slots
- **Layers that can start in parallel:** Layer 1, Layer 2a, Layer 2b, Layer 2c local Docker prep, Layer 4 config prep, Layer 6 dependency/module prep, and Layer 3 baseline verification.
- **Remaining blockers:** CodeRabbit app installation and branch protection require repository owner/admin permissions; SonarQube CI enforcement requires a reachable instance plus `SONAR_HOST_URL`/`SONAR_TOKEN`; CodeQL/SARIF visibility may depend on repository plan/settings; E2E blocking promotion requires ≥5 consecutive green main runs; cloud AI review requires optional provider keys and must remain non-blocking.
