# Plan: Testing & Verification Framework — 7-Layer Autonomous Quality System

## Metadata

- **Issue:** #165
- **Phase:** Speckit Phase 3 — Plan
- **Date:** 2026-06-04
- **Repository:** `/home/xxammaxx/Schreibtisch/Positron`
- **Package manager:** npm workspaces
- **Test runners:** Vitest, Playwright, Stryker
- **Existing CI:** `.github/workflows/quality-gates.yml`
- **ADR:** `docs/architecture/adr-001-7-layer-testing-verification-framework.md`

## Read-Before-Sketch Summary

### Project files read

- `AGENTS.md`
- `.specify/memory/constitution.md`
- `.specify/issue-165-testing-verification-framework/spec.md`
- `.github/workflows/quality-gates.yml`
- `package.json`
- `docs/qa-tooling.md`
- `apps/server/src/index.ts`
- `.opencode/templates/adr-template.md`

### External documentation validated

- CodeRabbit YAML configuration and GitHub integration docs.
- Semgrep CE GitHub Actions sample CI docs.
- GitHub CodeQL code scanning docs.
- SonarQube Community Build SonarScanner CLI docs.
- Sentry Express SDK docs.
- OpenTelemetry JavaScript Node.js docs.
- GitHub Actions `GITHUB_TOKEN` least-privilege docs.

### Key constraints carried into this plan

- All mandatory local/test-mode paths must work offline.
- Cloud-backed integrations must be env-var opt-in or repository-app opt-in.
- No real tokens in CI test/E2E environment.
- Fake adapters only in tests: `POSITRON_GITHUB_MODE=fake`, `POSITRON_OPENCODE_MODE=fake`, `POSITRON_SPECKIT_MODE=fake`.
- Existing tests must remain non-breaking.
- E2E promotion to blocking happens only after the documented ≥5 green-run stability window.

## Architecture Decision

Use an **artifact-first, loosely coupled CI architecture**. Each layer produces artifacts or a status signal. Layer 7 consumes those outputs and creates a single evidence report. Optional external services are represented as successful no-op/skipped jobs when credentials/endpoints are absent, preserving offline and fork-safe behavior.

### Alternatives considered

1. **Layered artifact-first framework — chosen.** Low coupling, high cohesion, graceful degradation, clear rollback per layer.
2. **Single monolithic quality workflow — rejected.** Too coupled; one missing cloud service or Docker limitation can break unrelated validation.
3. **Status quo — rejected.** Existing tests are strong but do not satisfy Issue #165's seven-layer verification requirements.

## Implementation Order

Follow the spec dependency graph exactly:

1. L1 CodeRabbit + L2 Semgrep/CodeQL — external/static, no product-code changes.
2. L2 SonarQube — Docker/self-hosted quality gate.
3. L4 Playwright enhancements — browser evidence artifacts.
4. L6 Sentry/OpenTelemetry — server runtime instrumentation.
5. L5 AI UI Review — depends on L4 screenshots.
6. L7 Evidence — depends on all producers.
7. L3 Backend — promote E2E to blocking only after stability window.

## CI Workflow Target Shape

Keep `.github/workflows/quality-gates.yml` as the primary existing quality workflow and add focused workflows for scanning where that improves separation.

```text
.github/workflows/quality-gates.yml
├── build-and-test                  blocking
├── observability-config-check       blocking after Docker/promtool fix or local binary fallback
├── mutation-fast                    non-blocking until CI ENOENT fixed, then blocking
├── e2e-playwright                   non-blocking until ≥5 green main runs
├── sonarqube                        opt-in; blocking when SONAR_* configured
├── ai-ui-review                     non-blocking; depends on e2e-playwright
├── evidence-collect                 always; depends on all artifact producers
└── runtime-verify                   non-blocking config smoke test

.github/workflows/semgrep.yml       blocking on ERROR findings
.github/workflows/codeql.yml         blocking via branch protection on high alerts/status
```

## Layer 1 — Code Review Layer

### Scope

Automated PR review through CodeRabbit plus GitHub review enforcement and PR evidence checklist.

### Files to create

- `.coderabbit.yaml`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `docs/qa/layer-1-code-review.md`

### Files to modify

- `docs/qa-tooling.md` — add Layer 1 operating instructions and branch protection checklist.
- Repository settings outside git — install CodeRabbit GitHub App for `xxammaxx/Positron`; configure branch protection for `main`.

### CI workflow changes

- No product CI job required for CodeRabbit; it is a GitHub App integration.
- Branch protection should require:
  - ≥1 approving review.
  - Dismiss stale reviews.
  - Required status checks: `build-and-test`, `semgrep-oss/scan`, `CodeQL`, eventually `sonarqube`, `e2e-playwright`, `mutation-fast` after stabilization.

### Package dependencies

- None.
- Optional local validation: no install needed if using CodeRabbit YAML validator web UI.

### Configuration required

`.coderabbit.yaml` should include:

```yaml
# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
language: en-US
early_access: false
reviews:
  profile: assertive
  request_changes_workflow: false
  high_level_summary: true
  review_status: true
  review_details: true
  path_filters:
    - "!dist/**"
    - "!node_modules/**"
    - "!coverage/**"
    - "!playwright-report/**"
    - "!test-results/**"
  auto_review:
    enabled: true
    drafts: false
  tools:
    eslint:
      enabled: true
    semgrep:
      enabled: true
      config_file: .semgrep.yaml
    actionlint:
      enabled: true
    gitleaks:
      enabled: true
chat:
  auto_reply: true
```

Branch protection is configured in GitHub UI/API, not as a repository file unless a later task introduces Infrastructure-as-Code for repository settings.

### Implementation steps

1. Add `.coderabbit.yaml` with TypeScript/React/Vite path guidance and ignore patterns.
2. Add PR template with evidence checklist: tests, coverage, security scans, E2E artifacts, fake-adapter confirmation, acceptance criteria mapping.
3. Install/authorize CodeRabbit GitHub App for the repository.
4. Enable auto review for PRs targeting `main`.
5. Configure branch protection for `main`.
6. Document operational setup in `docs/qa/layer-1-code-review.md` and `docs/qa-tooling.md`.

### Integration points

- CodeRabbit reads `.semgrep.yaml`, GitHub Checks, PR description, linked issues, and repository guidance.
- PR template feeds Layer 7 evidence expectations.

### Risk assessment

- **Coupling:** Low; GitHub App independent from product code.
- **Cohesion:** High; PR-review-only concerns.
- **Scalability:** Good; app scales externally.
- **Maintainability:** YAML config must track CodeRabbit schema changes.
- **Security:** Requires CodeRabbit GitHub App permissions; repository owner approval required.

### Rollback strategy

- Disable CodeRabbit auto-review in app settings.
- Remove `.coderabbit.yaml` or set `reviews.auto_review.enabled: false`.
- Temporarily remove CodeRabbit status from required checks if it blocks incorrectly.

### Testing the tests

- Open a test PR and verify CodeRabbit posts a walkthrough and inline review comments.
- Intentionally add a harmless style issue in a draft PR and verify draft PRs are skipped.
- Validate `.coderabbit.yaml` with CodeRabbit YAML validator.

### Estimated effort

- **S** for repo files; **M** including GitHub App and branch protection setup.

## Layer 2 — Quality Layer

Layer 2 has three sublayers: Semgrep, CodeQL, and SonarQube.

### L2A — Semgrep CE

#### Files to create

- `.semgrep.yaml`
- `.github/workflows/semgrep.yml`
- `docs/qa/layer-2-semgrep.md`

#### Files to modify

- `docs/qa-tooling.md` — add Semgrep command, rulesets, SARIF artifact behavior.
- `.coderabbit.yaml` — point CodeRabbit Semgrep tool at `.semgrep.yaml`.

#### CI workflow changes

Create `.github/workflows/semgrep.yml`:

- Triggers: `pull_request`, `push` to `main/master/develop`, `workflow_dispatch`, weekly schedule.
- Permissions: `contents: read`, `security-events: write` for SARIF upload.
- Container/image: `semgrep/semgrep`.
- Run: `semgrep scan --config .semgrep.yaml --sarif --output semgrep.sarif --error --severity ERROR`.
- Upload SARIF with `github/codeql-action/upload-sarif@v3` using `if: always()`.
- Upload `semgrep.sarif` as artifact.

#### Package dependencies

- No npm dependency.
- Local optional install:
  - `pipx install semgrep`
  - or Docker: `docker run --rm -v "$PWD:/src" semgrep/semgrep semgrep scan --config .semgrep.yaml /src`

#### Configuration required

`.semgrep.yaml`:

```yaml
rules:
  - p/typescript
  - p/react
  - p/secrets
  - p/sql-injection
  - p/xss
paths:
  exclude:
    - dist/**
    - node_modules/**
    - coverage/**
    - playwright-report/**
    - test-results/**
    - reports/**
```

No secrets required for Semgrep CE. GitHub SARIF upload uses ephemeral `GITHUB_TOKEN` with least privileges.

#### Implementation steps

1. Add `.semgrep.yaml` with required rulesets and excludes.
2. Add `semgrep.yml` workflow.
3. Add SARIF artifact upload and code scanning upload.
4. Run Semgrep locally once and triage baseline findings.
5. Document false-positive suppression policy: inline `nosemgrep` only with explanation.

#### Integration points

- Layer 1 CodeRabbit can read Semgrep config.
- Layer 7 parses `semgrep.sarif` for finding counts.
- Branch protection can require the Semgrep workflow.

#### Risk assessment

- **Coupling:** Low.
- **Cohesion:** High; security static analysis only.
- **Scalability:** Good with excludes; large monorepo scans may need timeouts.
- **Maintainability:** Ruleset updates can introduce new findings.
- **Security:** Secret scanning may detect fake tokens; test fixtures need clear fake naming.

#### Rollback strategy

- Temporarily remove Semgrep from required branch protection.
- Change blocking severity from `ERROR` to explicit baseline allowlist while triaging.
- Keep SARIF upload even if blocking is disabled.

#### Testing the tests

- Add a temporary local-only fixture with an obvious XSS or SQL interpolation pattern and confirm Semgrep fails.
- Confirm `semgrep.sarif` uploads even on failure.
- Confirm excluded directories are not scanned.

#### Estimated effort

- **M** because baseline triage may be needed.

### L2B — CodeQL

#### Files to create

- `.github/workflows/codeql.yml`
- `docs/qa/layer-2-codeql.md`

#### Files to modify

- `docs/qa-tooling.md` — add CodeQL workflow and branch protection instructions.

#### CI workflow changes

Create `.github/workflows/codeql.yml`:

- Triggers: `pull_request`, `push` to `main/master/develop`, weekly cron, `workflow_dispatch`.
- Permissions: `security-events: write`, `packages: read`, `actions: read`, `contents: read`.
- Use `github/codeql-action/init@v3` with `languages: javascript-typescript`.
- Use `github/codeql-action/analyze@v3`.
- Build mode: `none` initially for JS/TS unless CodeQL asks for build; if build is needed, run `npm ci && npm run build`.

#### Package dependencies

- None.

#### Configuration required

- GitHub code scanning must be enabled for the repository.
- Branch protection should require the CodeQL status check once stable.

#### Implementation steps

1. Add CodeQL workflow.
2. Run on PR and main.
3. Review Security tab for initial findings.
4. Add required status check after first stable run.
5. Document severity policy: high/critical alerts block merge.

#### Integration points

- Layer 7 reports CodeQL status and links to Security tab; direct alert count may require GitHub API permissions.
- Branch protection consumes CodeQL status.

#### Risk assessment

- **Coupling:** Low.
- **Cohesion:** High.
- **Scalability:** CodeQL DB generation can increase CI time.
- **Maintainability:** Query packs update over time.
- **Security:** Requires `security-events: write`, least privilege applies.

#### Rollback strategy

- Remove CodeQL from required checks while keeping scheduled scans.
- Disable high-severity enforcement temporarily during baseline triage.

#### Testing the tests

- Verify workflow uploads code scanning results.
- Confirm PR annotations appear for a controlled test branch if CodeQL detects a known unsafe pattern.
- Confirm CodeQL job fails if analysis action fails.

#### Estimated effort

- **S-M** depending on initial alerts.

### L2C — SonarQube Community Build

#### Files to create

- `sonar-project.properties`
- `docker-compose.sonarqube.yml`
- `scripts/sonarqube-quality-gate.mjs`
- `docs/qa/layer-2-sonarqube.md`

#### Files to modify

- `.github/workflows/quality-gates.yml` — add `sonarqube` job.
- `package.json` — add scripts:
  - `sonar:scan`
  - `sonar:quality-gate`
- `docs/qa-tooling.md` — add local SonarQube operations.

#### CI workflow changes

Add `sonarqube` job to `quality-gates.yml`:

- Needs: `build-and-test` so coverage exists.
- If `SONAR_HOST_URL` and `SONAR_TOKEN` are absent: print skip message and succeed.
- If configured: run scanner and quality gate check; fail if gate is not `OK`.
- Upload scanner logs and `.scannerwork/report-task.txt` as artifacts.

#### Package dependencies

- Prefer Docker scanner or GitHub Action; no npm dependency required.
- If using an npm wrapper is desired:
  - `npm install -D sonarqube-scanner`
- Recommended no-new-dependency path:
  - `docker run --rm -e SONAR_HOST_URL -e SONAR_TOKEN -v "$PWD:/usr/src" sonarsource/sonar-scanner-cli`

#### Configuration required

`docker-compose.sonarqube.yml`:

```yaml
services:
  sonarqube:
    image: sonarqube:community
    ports:
      - "9000:9000"
    environment:
      SONAR_ES_BOOTSTRAP_CHECKS_DISABLE: "true"
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_extensions:/opt/sonarqube/extensions
      - sonarqube_logs:/opt/sonarqube/logs
volumes:
  sonarqube_data:
  sonarqube_extensions:
  sonarqube_logs:
```

`sonar-project.properties` core properties:

```properties
sonar.projectKey=positron
sonar.projectName=Positron
sonar.sourceEncoding=UTF-8
sonar.sources=apps,packages
sonar.tests=apps,packages,e2e
sonar.exclusions=**/dist/**,**/node_modules/**,coverage/**,playwright-report/**,test-results/**,reports/**
sonar.javascript.lcov.reportPaths=coverage/lcov.info,apps/web/coverage/lcov.info
```

Environment variables:

- `SONAR_HOST_URL=http://localhost:9000` for local/self-hosted.
- `SONAR_TOKEN` from self-hosted SonarQube; never committed.
- `SONAR_PROJECT_KEY=positron` optional override.

#### Implementation steps

1. Add Docker Compose file for local SonarQube.
2. Add `sonar-project.properties` for monorepo source/test/coverage paths.
3. Ensure `npm run coverage` emits LCOV at expected paths; adjust coverage scripts if needed.
4. Add quality gate script that reads `SONAR_HOST_URL`, `SONAR_TOKEN`, and `.scannerwork/report-task.txt`.
5. Add opt-in CI job that skips safely without Sonar env vars.
6. Once self-hosted SonarQube is stable, mark job as required in branch protection.

#### Integration points

- Uses coverage from Layer 3 tests.
- Layer 7 queries SonarQube API when configured and reports gate/metrics.
- Branch protection uses Sonar job status when configured.

#### Risk assessment

- **Coupling:** Medium; depends on coverage output and external/self-hosted service.
- **Cohesion:** High; quality metrics only.
- **Scalability:** SonarQube needs persistent storage and memory.
- **Maintainability:** Quality profile/gate drift must be documented.
- **Security:** Token is required; env-var only; never print token.

#### Rollback strategy

- Remove `sonarqube` from required checks.
- Leave `sonar-project.properties` in repo for local use.
- Disable CI enforcement by unsetting `SONAR_HOST_URL`/`SONAR_TOKEN`.

#### Testing the tests

- Run local SonarQube with Docker Compose.
- Generate coverage with `npm run coverage`.
- Run scanner and verify project appears in SonarQube.
- Force a gate failure by temporarily lowering threshold, confirm `scripts/sonarqube-quality-gate.mjs` exits non-zero.

#### Estimated effort

- **L** due to self-hosted setup, coverage paths, and quality gate operationalization.

## Layer 4 — Visible Browser Verification

### Scope

Enhance Playwright to capture screenshots, videos on failure, traces for all tests, console/network evidence, and CI artifacts.

### Files to create

- `e2e/support/artifacts.ts`
- `e2e/support/console-network.ts`
- `docs/qa/layer-4-browser-verification.md`

### Files to modify

- `playwright.config.ts`
- Existing E2E specs under `e2e/*.spec.ts` for key-state screenshot capture.
- `.github/workflows/quality-gates.yml` — enhance `e2e-playwright` artifact upload and env vars.
- `package.json` — scripts if needed for artifact verification.
- `docs/qa-tooling.md`

### CI workflow changes

Modify `e2e-playwright` job:

- Keep `continue-on-error: true` until L3 promotion.
- Set `PW_TRACE_MODE=on` or configure `trace: "on"` in Playwright config.
- Upload:
  - `playwright-report/**`
  - `test-results/**`
  - `e2e-artifacts/**`
- Add artifact retention, e.g. `retention-days: 14`.

### Package dependencies

- Existing `@playwright/test` is present.
- No new dependency required.

### Configuration required

Playwright config target:

```ts
use: {
  trace: "on",
  video: "retain-on-failure",
  screenshot: "only-on-failure",
}
```

For required key-state screenshots, use explicit `page.screenshot({ path })` in tests for:

- Dashboard
- Run detail
- Evidence
- Settings

Local env vars:

- `PW_HEADED=1` for headed browser.
- `PWDEBUG=1` for Playwright Inspector.
- `PW_SLOWMO=1000` for slow visible demo mode.

CI safety env remains:

- `VITEST=true`
- `NODE_ENV=test`
- `POSITRON_DISABLE_QUEUE=true`
- fake adapter modes
- `GITHUB_TOKEN=''`

### Implementation steps

1. Update Playwright config for trace/video/screenshot behavior.
2. Add reusable helper to save named screenshots to `test-results/screenshots/` or `e2e-artifacts/screenshots/`.
3. Add console/network capture helper that fails or flags browser console errors.
4. Update existing E2E tests to capture key UI states.
5. Update CI artifact upload paths.
6. Verify local headed/debug scripts still work.

### Integration points

- Layer 5 consumes screenshots.
- Layer 7 consumes screenshots, videos, traces, network logs, console logs.
- Layer 3 later promotes this job to blocking.

### Risk assessment

- **Coupling:** Medium; tests depend on UI selectors and artifact paths.
- **Cohesion:** High; browser evidence only.
- **Scalability:** Artifact storage can grow; retention and naming conventions needed.
- **Maintainability:** Screenshot expectations may require updates with UI redesign.
- **Security:** Network logs must redact tokens; E2E env already clears `GITHUB_TOKEN`.

### Rollback strategy

- Revert Playwright config to previous trace/video behavior.
- Keep artifact upload but remove key-state screenshots if flaky.
- Leave E2E non-blocking until stabilized.

### Testing the tests

- Run `npm run test:e2e` and confirm screenshots/traces are present.
- Run `npm run test:e2e:headed` and `npm run test:e2e:debug` locally.
- Intentionally fail a local E2E assertion and verify video retention.
- Confirm network/console logs contain no secrets.

### Estimated effort

- **M**.

## Layer 6 — Runtime Verification

### Scope

Add optional Sentry and OpenTelemetry server instrumentation while preserving app startup with no env vars.

### Files to create

- `apps/server/src/instrumentation/sentry.ts`
- `apps/server/src/instrumentation/otel.ts`
- `apps/server/src/instrumentation/run-context.ts`
- `apps/server/src/__tests__/runtime-instrumentation.test.ts`
- `docs/qa/layer-6-runtime-verification.md`

### Files to modify

- `apps/server/src/index.ts` — initialize optional Sentry/OTEL early and add error handler after routes.
- `apps/server/package.json` — add runtime dependencies.
- `package.json` — optionally add `runtime:verify` script.
- `observability/prometheus/prometheus.yml` — optional OTEL collector/scrape target if local collector is added.
- `observability/grafana/**` — dashboard panel additions if existing dashboard JSON is present.
- `.github/workflows/quality-gates.yml` — add `runtime-verify` job or step.
- `docs/observability.md`

### CI workflow changes

Add `runtime-verify` job to `quality-gates.yml`:

- Non-blocking initially.
- Run unit tests for instrumentation with no env vars.
- Run a smoke command with `SENTRY_DSN=''` and `OTEL_EXPORTER_OTLP_ENDPOINT=''` proving graceful disable.
- Never set real DSNs/tokens in CI.

### Package dependencies

Install in server workspace:

```bash
npm install -w apps/server @sentry/node @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/sdk-metrics @opentelemetry/sdk-trace-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/exporter-metrics-otlp-http
```

### Configuration required

Environment variables:

- `SENTRY_DSN` — optional; if absent, Sentry disabled.
- `SENTRY_TRACES_SAMPLE_RATE` — optional; default `0.1` in production, `0` in tests.
- `OTEL_EXPORTER_OTLP_ENDPOINT` — optional; if absent, OTEL exporter disabled or console-only in explicit local debug.
- `OTEL_SERVICE_NAME=positron-server`.
- `OTEL_TRACES_EXPORTER=otlp` when endpoint is set.
- `OTEL_METRICS_EXPORTER=otlp` when endpoint is set.

Optional local collector compose snippet if needed later:

```yaml
otel-collector:
  image: otel/opentelemetry-collector-contrib:latest
  ports:
    - "4318:4318"
  volumes:
    - ./observability/otel/collector-config.yml:/etc/otelcol-contrib/config.yaml:ro
```

### Implementation steps

1. Add Sentry module that checks `SENTRY_DSN` before `Sentry.init()`.
2. Add OTEL module that checks `OTEL_EXPORTER_OTLP_ENDPOINT` before creating OTLP exporters.
3. Add run-context helpers to attach `run.id`, `run.phase`, and `adapter.mode` to Sentry scope/breadcrumbs and OTEL spans.
4. Initialize instrumentation as early as feasible in `apps/server/src/index.ts` without breaking `.env` skip semantics for tests.
5. Wrap run lifecycle phases with manual spans where automatic Express instrumentation is insufficient.
6. Add tests verifying disabled-by-default behavior and context attribute construction.
7. Add docs for local/prod configuration.

### Integration points

- Existing Prometheus metrics remain the primary offline observability path.
- OTEL augments HTTP, DB, and adapter latency.
- Sentry captures runtime exceptions with run context.
- Layer 7 reports runtime verification smoke status, not real Sentry events.

### Risk assessment

- **Coupling:** Medium; instrumentation touches server startup and run lifecycle.
- **Cohesion:** Good if isolated under `instrumentation/`.
- **Scalability:** Sampling prevents high event volume.
- **Maintainability:** SDK version changes can affect initialization order.
- **Security:** PII/secrets must not be sent; disable `sendDefaultPii`, redact context.

### Rollback strategy

- Unset `SENTRY_DSN` and `OTEL_EXPORTER_OTLP_ENDPOINT` to disable at runtime.
- Revert imports from `index.ts` if startup breaks.
- Keep instrumentation modules isolated for easy removal.

### Testing the tests

- Unit test that missing env vars do not call exporters or throw.
- Unit test that fake run context maps to safe attributes.
- Local smoke with console/OTLP debug endpoint and `/api/health` request.
- Confirm test/E2E mode never emits external telemetry.

### Estimated effort

- **L** due to startup-order and telemetry context concerns.

## Layer 5 — AI UI Review

### Scope

Collect Playwright screenshots and produce a structured visual review. It must be non-blocking and skip gracefully without LLM credentials.

### Files to create

- `scripts/collect-ui-screenshots.mjs`
- `scripts/ai-ui-review.mjs`
- `scripts/post-ai-ui-review.mjs`
- `docs/qa/layer-5-ai-ui-review.md`
- `docs/ui-review-spec.md` or update existing UI docs with expected visual criteria.

### Files to modify

- `.github/workflows/quality-gates.yml` — add `ai-ui-review` job after `e2e-playwright`.
- `package.json` — add scripts:
  - `ui:screenshots:collect`
  - `ui:review`
- `docs/qa-tooling.md`

### CI workflow changes

Add `ai-ui-review` job:

- `needs: e2e-playwright`.
- `if: always()` so it can report missing screenshots.
- Download Playwright artifacts.
- Run screenshot collection.
- If no provider env vars are set, create `ai-ui-review.md` with skipped status and exit 0.
- If provider is configured, call provider and post report.
- Upload `ai-ui-review.md` as artifact.

### Package dependencies

- Prefer no SDK dependency; Node 22 built-in `fetch` can call provider APIs.
- If SDKs are later required, keep provider-specific installs out of the default path.
- No mandatory npm install.

### Configuration required

Environment variables:

- `AI_UI_REVIEW_PROVIDER=none|openai|anthropic|gemini|local`
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` — optional and never set in default CI.
- `AI_UI_REVIEW_MODEL` — optional provider model.
- `AI_UI_REVIEW_SPEC=docs/ui-review-spec.md`
- `POSITRON_EVIDENCE_ISSUE` — optional target issue for comments.

Offline behavior:

- `AI_UI_REVIEW_PROVIDER=none` or missing keys produces deterministic skipped report.
- `AI_UI_REVIEW_PROVIDER=local` can run basic file-presence and dimensions checks without cloud calls.

### Implementation steps

1. Define UI review spec with expected pages and visual criteria.
2. Add screenshot collector that normalizes artifact paths and writes a manifest JSON.
3. Add provider abstraction with `none`, `local`, and cloud providers.
4. Add structured Markdown report output.
5. Add optional GitHub comment posting using `GITHUB_TOKEN` only when available.
6. Add CI job after Playwright.
7. Keep non-blocking status regardless of provider result for this epic.

### Integration points

- Consumes Layer 4 screenshots.
- Produces report consumed by Layer 7.
- Can post its own comment or let Layer 7 include the summary.

### Risk assessment

- **Coupling:** Medium to Layer 4 screenshot naming.
- **Cohesion:** High if scripts only review UI screenshots.
- **Scalability:** Image payload size and API rate limits must be controlled.
- **Maintainability:** UI spec must evolve with product UI.
- **Security:** Screenshots may contain sensitive data; tests use fake adapters and fake data only.

### Rollback strategy

- Remove/disable `ai-ui-review` job; Layer 4 and Layer 7 still work.
- Set `AI_UI_REVIEW_PROVIDER=none`.
- Keep screenshot collection for evidence without LLM review.

### Testing the tests

- Run collector against sample `test-results/` and verify manifest.
- Run with no API keys and assert skipped report exits 0.
- Run local mode and intentionally remove a screenshot to verify missing artifact is reported.
- In a secured manual environment, run one provider smoke test with fake screenshots and no secrets in logs.

### Estimated effort

- **M-L** depending on provider support depth.

## Layer 7 — Evidence Layer

### Scope

Collect test, coverage, quality, E2E, mutation, AI UI, and runtime verification artifacts and post a structured GitHub Issue/PR comment.

### Files to create

- `scripts/collect-evidence.mjs`
- `scripts/post-evidence-comment.mjs`
- `scripts/evidence/parsers/vitest.mjs`
- `scripts/evidence/parsers/coverage.mjs`
- `scripts/evidence/parsers/semgrep-sarif.mjs`
- `scripts/evidence/parsers/mutation.mjs`
- `scripts/evidence/parsers/playwright.mjs`
- `scripts/evidence/parsers/sonarqube.mjs`
- `scripts/evidence/templates/evidence-report.md`
- `docs/qa/layer-7-evidence.md`

### Files to modify

- `.github/workflows/quality-gates.yml` — add `evidence-collect` job and artifact downloads.
- `package.json` — add scripts:
  - `evidence:collect`
  - `evidence:post`
- Existing test scripts may be extended to emit JSON reports:
  - `vitest --reporter=json --outputFile=test-results/vitest.json`
- `docs/qa-tooling.md`

### CI workflow changes

Add `evidence-collect` job:

- `if: always()`.
- Needs all available producer jobs: `build-and-test`, `mutation-fast`, `e2e-playwright`, `sonarqube`, `ai-ui-review`, `runtime-verify`.
- Download all artifacts.
- Run `node scripts/collect-evidence.mjs`.
- Upload generated `evidence-report.md` and `evidence-summary.json`.
- If `GITHUB_TOKEN` is available and event is PR/issue-capable, post comment.
- If `POSITRON_EVIDENCE_ISSUE` is set, post there; otherwise post to PR or skip with a clear message.

### Package dependencies

- No new dependency required; use Node.js filesystem and built-in `fetch`.
- Optional later dependency for SARIF parsing is not necessary because SARIF is JSON.

### Configuration required

Environment variables:

- `POSITRON_EVIDENCE_ISSUE` — optional explicit issue number.
- `GITHUB_TOKEN` — GitHub Actions token for comments; not used in E2E app env.
- `GITHUB_REPOSITORY`, `GITHUB_RUN_ID`, `GITHUB_SERVER_URL` from Actions.

GitHub token permissions for evidence job:

```yaml
permissions:
  contents: read
  issues: write
  pull-requests: write
  actions: read
```

### Implementation steps

1. Standardize artifact names in all producer jobs.
2. Add parsers for each artifact class with missing-file tolerant behavior.
3. Generate `evidence-summary.json` and Markdown report.
4. Implement comment target resolution: explicit issue > PR number > skip.
5. Add truncation/linking when Markdown exceeds GitHub limits.
6. Add CI job with `if: always()`.
7. Document artifact contract for future layers.

### Integration points

- Consumes artifacts/status from Layers 1-6 and existing tests.
- Publishes GitHub evidence required by the Constitution and `AGENTS.md`.
- Feeds branch/PR review decisions with a single auditable report.

### Risk assessment

- **Coupling:** Medium; depends on artifact names and paths.
- **Cohesion:** High; evidence aggregation only.
- **Scalability:** Large reports need truncation and links.
- **Maintainability:** Parsers need updates when tools change output format.
- **Security:** Must redact secrets and avoid uploading sensitive logs.

### Rollback strategy

- Keep artifact upload but disable comment posting.
- Set evidence job to generate local report only.
- Remove `issues: write`/`pull-requests: write` permission if comment posting misbehaves.

### Testing the tests

- Run collector against a fixture directory with all artifact types.
- Run collector against missing/partial artifacts and verify report marks missing without failing.
- Use a dry-run env to print target comment request without posting.
- Confirm fake tokens are redacted from generated Markdown.

### Estimated effort

- **L** because it coordinates all layers and CI artifact contracts.

## Layer 3 — Backend Verification and Blocking Promotion

### Scope

Maintain existing backend/frontend tests and promote E2E/mutation/observability gates to blocking only after fixes and stability criteria.

### Files to create

- `docs/qa/layer-3-backend-verification.md`
- Optional: `scripts/check-e2e-stability-window.mjs`
- Optional: `scripts/stryker-ci-sanitize.mjs` if needed for Stryker ENOENT.

### Files to modify

- `.github/workflows/quality-gates.yml`
  - remove `continue-on-error: true` from `e2e-playwright` only after ≥5 green main runs.
  - remove `continue-on-error: true` from `mutation-fast` only after CI ENOENT fix.
  - improve `observability-config-check` Docker/promtool fallback.
- `stryker.fast.config.json` — exclude volatile `test-results/**` and Playwright `.last-run.json` from sandbox copy.
- `.gitignore` if artifact ignore patterns need tightening.
- `docs/qa-tooling.md` — update stability table.

### CI workflow changes

Phased changes:

1. Fix mutation CI ENOENT by excluding volatile generated files and ensuring reports directory exists.
2. Fix observability validation by using either Docker availability checks or downloading promtool/amtool binaries; if Docker unavailable, use documented fallback.
3. Keep E2E non-blocking until stability window passes.
4. After ≥5 consecutive green main runs with 0 flakes, remove `continue-on-error` from `e2e-playwright`.

### Package dependencies

- Existing dependencies cover Vitest, Playwright, Stryker.
- No new dependency expected.

### Configuration required

Existing CI fake/safety env must remain unchanged for tests:

```yaml
VITEST: "true"
NODE_ENV: test
POSITRON_DISABLE_QUEUE: "true"
POSITRON_GITHUB_MODE: fake
POSITRON_OPENCODE_MODE: fake
POSITRON_SPECKIT_MODE: fake
GITHUB_TOKEN: ""
POSITRON_REPO_OWNER: test-owner
POSITRON_REPO_NAME: test-repo
POSITRON_REPO_DEFAULT_BRANCH: main
POSITRON_ADMIN_TOKEN: positron-admin-dev
```

### Implementation steps

1. Verify current test commands and artifact paths.
2. Fix Stryker sandbox ENOENT by excluding generated Playwright files and precreating report dirs.
3. Fix observability validation fallback.
4. Run full local validation: build, typecheck, unit, integration, contracts, mutation-fast, observability, E2E.
5. Track stability window in docs for main-branch CI.
6. Promote `e2e-playwright` to blocking only after criteria are met.
7. Add required branch protection status after promotion.

### Integration points

- Layer 2 Sonar consumes coverage.
- Layer 4 E2E produces browser artifacts.
- Layer 7 consumes all test artifacts.
- Branch protection uses blocking status checks.

### Risk assessment

- **Coupling:** Medium-high; core tests affect all CI confidence.
- **Cohesion:** High; backend/frontend verification only.
- **Scalability:** Test counts are already high but fast; E2E runtime remains watch item.
- **Maintainability:** Stability docs must be updated after each main run.
- **Security:** Test env must never use real adapters or tokens.

### Rollback strategy

- Restore `continue-on-error: true` for E2E/mutation if flakes reappear.
- Remove newly required branch protection checks temporarily.
- Keep evidence reporting so failures remain visible.

### Testing the tests

- Run `npm run build`.
- Run `npm run typecheck`.
- Run `npm test`.
- Run `npm run test:contracts`.
- Run `npm run test:integration`.
- Run `npm run test:mutation:fast`.
- Run `npm run observability:validate`.
- Run `npm run test:e2e`.
- Confirm Layer 7 reports exact pass/fail and artifact presence.

### Estimated effort

- **M-L** because CI-only Stryker/observability issues can require iteration.

## Cross-Layer Integration Points

| Producer | Consumer | Contract |
|---|---|---|
| L1 CodeRabbit | PR reviewers, branch protection | PR review comments/status |
| L2 Semgrep | GitHub code scanning, L7 | `semgrep.sarif` |
| L2 CodeQL | GitHub Security tab, L7 | code scanning status/alerts |
| L2 SonarQube | Branch protection, L7 | quality gate API + scanner report |
| L3 Vitest/Stryker | SonarQube, L7 | coverage JSON/LCOV, mutation reports |
| L4 Playwright | L5, L7 | screenshots, videos, traces, reports |
| L5 AI UI Review | L7, GitHub comments | `ai-ui-review.md/json` |
| L6 Sentry/OTEL | L7, operators | runtime smoke status, optional dashboards |
| L7 Evidence | GitHub Issue/PR | evidence Markdown comment |

## Security Boundaries

- CI tests and E2E must keep real adapter tokens empty.
- `GITHUB_TOKEN` may be used only by workflow automation jobs, not injected into the application-under-test.
- Sentry, OTEL, SonarQube, and LLM providers are disabled when env vars are missing.
- Evidence scripts must redact token-like values before writing Markdown or JSON.
- Screenshot review uses fake test data only.
- CodeRabbit app permissions require owner approval and should be documented.

## Rollback Overview

| Layer | Fast rollback |
|---|---|
| L1 | Disable CodeRabbit auto-review or remove required status. |
| L2 Semgrep | Remove required check or lower blocking severity while preserving SARIF. |
| L2 CodeQL | Remove required CodeQL check; keep scheduled scan. |
| L2 SonarQube | Unset `SONAR_*`; job skips successfully. |
| L4 | Revert Playwright trace/video config; keep E2E non-blocking. |
| L6 | Unset `SENTRY_DSN` and `OTEL_EXPORTER_OTLP_ENDPOINT`. |
| L5 | Set `AI_UI_REVIEW_PROVIDER=none` or remove job. |
| L7 | Disable comment posting; keep report artifact generation. |
| L3 | Restore `continue-on-error: true` for flaky jobs. |

## Testing Strategy for the Framework Itself

1. **Static config validation:** YAML syntax for workflows, `.coderabbit.yaml`, `.semgrep.yaml`, Docker Compose.
2. **Artifact contract tests:** Fixture-based tests for evidence parsers.
3. **Failure injection:** Temporary local branches with known Semgrep issue, failed Playwright test, missing screenshots, failed Sonar gate.
4. **Offline mode:** Run all local tests without external tokens/endpoints and verify graceful skips.
5. **Security redaction:** Fixture reports containing fake token patterns must be redacted in evidence output.
6. **Branch protection dry run:** Enable checks as non-required first, then require only after stable green runs.

## Phase 4 Task Generation Guidance

Recommended task batches:

1. L1 repository review configuration.
2. L2 Semgrep + CodeQL workflows.
3. L2 SonarQube local compose + opt-in CI.
4. L4 Playwright artifact enhancements.
5. L6 runtime instrumentation modules and tests.
6. L5 AI UI review scripts.
7. L7 evidence collector and comment poster.
8. L3 CI stabilization and blocking promotion.

## Open Questions / Blockers Before Phase 4

1. Who will install/authorize the CodeRabbit GitHub App and configure branch protection? This requires repository/organization owner permissions.
2. Where will self-hosted SonarQube run for CI enforcement, and how will `SONAR_HOST_URL`/`SONAR_TOKEN` be provisioned?
3. Should AI UI Review support only skip/local mode initially, or should one cloud provider be implemented in Phase 4 behind optional secrets?
4. Should Evidence comments target Issue #165 by default via `POSITRON_EVIDENCE_ISSUE=165`, or only PR comments unless explicitly set?
5. Is GitHub Advanced Security/code scanning available for this repository visibility/plan, or should CodeQL be treated as workflow status only if SARIF upload is limited?
