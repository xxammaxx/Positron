# Spec: Testing & Verification Framework — 7-Layer Autonomous Quality System

## Metadata
- **Issue:** #165
- **Spec created:** 2026-06-04
- **Constitution:** `.specify/memory/constitution.md`
- **Reality Gate:** `POSITRON_REALITY_GATE_V2.md`
- **QA Tooling:** `docs/qa-tooling.md`

## Mission
Nachweisen, dass Positron tatsächlich autonom Software entwickeln kann — durch ein vollständiges,
automatisiertes Testing & Verification Framework mit 7 verpflichtenden Layern.

Nicht nachweisen, dass Tests grün sind — sondern dass das System autonom Qualität sichert.

---

## Layer 1: Code Review Layer (PRIO 1)

### 1.1 CodeRabbit Integration

**Goal:** Jeder Pull Request wird automatisch von CodeRabbit geprüft.

| Requirement | Details |
|-------------|---------|
| Integration | CodeRabbit GitHub App installieren für `xxammaxx/Positron` |
| Scope | Alle PRs gegen `main` |
| Review Depth | Style, Bugs, Security, Performance |
| Blocking | Non-blocking initially; informational comments only |
| Config File | `.coderabbit.yaml` im Repo-Root mit Positron-spezifischen Regeln |
| Language Config | TypeScript/Node.js, React, Vite |
| Ignore Patterns | `dist/`, `node_modules/`, `coverage/`, `playwright-report/`, `test-results/` |

### 1.2 GitHub Code Review Enforcement

| Requirement | Details |
|-------------|---------|
| Branch Protection | Require ≥1 approving review before merge |
| PR Template | `.github/PULL_REQUEST_TEMPLATE.md` mit Checkliste |
| Status Checks | Alle CI Jobs müssen grün sein vor Merge |
| Dismiss Stale | `dismiss_stale_reviews: true` |

### Acceptance Criteria: Layer 1
- [ ] `.coderabbit.yaml` exists and is valid
- [ ] CodeRabbit posts review comments on PRs
- [ ] Branch protection requires ≥1 review
- [ ] PR template exists with evidence checklist

---

## Layer 2: Quality Layer (PRIO 2)

### 2.1 Semgrep — Static Analysis Security Testing

**Goal:** Block Merge bei Security Findings (0 allowed).

| Requirement | Details |
|-------------|---------|
| Runner | `semgrep` CLI (OSS) |
| Rules | `p/typescript`, `p/react`, `p/secrets`, `p/sql-injection`, `p/xss` |
| CI Integration | GitHub Actions Workflow `semgrep.yml` |
| Config | `.semgrep.yaml` im Repo-Root |
| Severity Block | ERROR findings → block merge |
| Artifact | SARIF report uploaded to GitHub Code Scanning |

### 2.2 CodeQL — GitHub Code Scanning

**Goal:** Security vulnerability detection integriert in GitHub.

| Requirement | Details |
|-------------|---------|
| Integration | GitHub CodeQL Action (`github/codeql-action`) |
| Languages | `javascript-typescript` |
| CI Workflow | `.github/workflows/codeql.yml` |
| Schedule | On push to main, on PR, weekly cron |
| Blocking | CodeQL alerts with severity ≥ `high` block merge |
| Artifact | SARIF results in GitHub Security tab |

### 2.3 SonarQube Community — Code Quality Gate

**Goal:** Quality Gate als Merge-Blocker.

| Requirement | Details |
|-------------|---------|
| Deployment | Self-hosted SonarQube Community via Docker Compose |
| Config | `sonar-project.properties` im Repo-Root |
| CI Integration | `sonarqube-scan-action` in GitHub Actions |
| Quality Gate | Default "Sonar way" + custom rules |
| Metrics | Bugs, Vulnerabilities, Code Smells, Coverage, Duplications |
| Coverage Import | Vitest V8 coverage LCOV → SonarQube |
| Blocking | Quality Gate PASS required for merge |

### Acceptance Criteria: Layer 2
- [ ] `.semgrep.yaml` exists, CI workflow runs, SARIF uploaded
- [ ] `.github/workflows/codeql.yml` exists, runs on PR/main
- [ ] `sonar-project.properties` exists
- [ ] `docker-compose.sonarqube.yml` for self-hosted instance
- [ ] SonarQube CI job pushes analysis and enforces Quality Gate
- [ ] 0 ERROR findings from Semgrep on main
- [ ] 0 HIGH CodeQL alerts on main

---

## Layer 3: Backend Verification (PRIO 3 — ✅ Mostly Exists)

### Current State
- 452 Unit Tests (100% coverage target)
- 60 Frontend Tests (React Testing Library)
- 8 Integration Tests
- 140 Contract Tests (4 packages)
- 37 Property-Based Tests (~18,000 runs)
- Mutation Testing (Stryker): 85.25% score

### Required Enhancements

| Enhancement | Rationale |
|-------------|-----------|
| Stability Window: E2E promoted to blocking | Currently `continue-on-error: true` |
| mutation-fast CI fix | Stryker sandbox ENOENT on CI |
| observability-config-check fix | Docker/promtool unavailable on CI |

### Acceptance Criteria: Layer 3
- [ ] All existing tests green (452+60+8+140+37 props)
- [ ] 100% coverage maintained (lines, functions, branches, statements)
- [ ] E2E promoted to blocking gate (after ≥5 green CI runs)
- [ ] mutation-fast works in CI

---

## Layer 4: Visible Browser Verification (PRIO 4)

### 4.1 Playwright Headed CI Artifacts

| Requirement | Details |
|-------------|---------|
| Screenshot | Every E2E run produces screenshots of key UI states |
| Video | `trace: "retain-on-failure"` → video recording on failure |
| Trace | `trace: "on"` for every test (Playwright Trace Viewer) |
| Artifact Upload | All screenshots, videos, traces uploaded as CI artifacts |
| GitHub Comment | Key screenshots auto-posted to GitHub Issue |
| Headless CI | CI runs headless (required); local `PW_HEADED=1` for debugging |

### 4.2 E2E Test Requirements

| Test | Assertion |
|------|-----------|
| Dashboard loads | Heading visible, nav present |
| New Run creation | Modal → URL input → Start → Navigate to run |
| Run lifecycle | QUEUED → DONE via `expect.poll()` |
| Pipeline phases | All phases visible, badge updates |
| Error handling | Error banner on failure, fallback paths |
| All pages reachable | Dashboard, Runs, Evidence, Settings |
| Network evidence | Network log captured, API calls traced |
| Console evidence | No errors in browser console |

### Acceptance Criteria: Layer 4
- [ ] E2E suite produces screenshots (Dashboard, Run Detail, Evidence, Settings)
- [ ] Video recording on failure enabled
- [ ] Trace enabled for all tests
- [ ] Artifacts uploaded to GitHub Actions
- [ ] `PW_HEADED=1` and `PWDEBUG=1` work locally

---

## Layer 5: AI UI Review (PRIO 5)

### 5.1 Multimodal LLM Screenshot Comparison

**Goal:** Nach jedem E2E-Lauf Screenshots sammeln und durch ein multimodales LLM gegen die Spezifikation vergleichen lassen.

| Requirement | Details |
|-------------|---------|
| Screenshot Collection | Alle E2E-Screenshots aus `test-results/` |
| LLM Provider | OpenAI GPT-4V / Anthropic Claude Vision / Google Gemini Vision |
| Comparison Base | UI-Spezifikation aus `docs/` oder Issue-Beschreibung |
| Review Output | Strukturierter Report: Element-Position, Farbe, Text, Abweichungen |
| CI Integration | Post-E2E-Job: Screenshots sammeln → LLM-Review → GitHub Comment |
| Fallback | Wenn kein LLM-Key konfiguriert → skip (non-blocking) |

### 5.2 Review Criteria

| Criterion | Check |
|-----------|-------|
| Element Presence | Alle erwarteten UI-Elemente sichtbar |
| Text Content | Labels, Headings, Status-Texte korrekt |
| Layout & Positioning | Keine überlappenden Elemente, korrekte Reihenfolge |
| Color & Contrast | Keine unsichtbaren Texte, konsistente Farben |
| Responsive | Dashboard auf 1280x720 (Standard-Laptop) |
| Error States | Fehler-Banner erscheint nur bei tatsächlichen Fehlern |
| Loading States | Spinner/Loader erscheint während API-Calls |

### Acceptance Criteria: Layer 5
- [ ] Post-E2E screenshot collection script exists
- [ ] LLM review script exists (configurable: run locally or via API)
- [ ] Review output posted as GitHub comment
- [ ] Non-blocking — graceful skip if no LLM configured

---

## Layer 6: Runtime Verification (PRIO 6)

### 6.1 Sentry — Real Error Tracking

**Goal:** Echte Laufzeitfehler in Produktion erfassen.

| Requirement | Details |
|-------------|---------|
| SDK | `@sentry/node` |
| Integration | `Sentry.init()` in `apps/server/src/index.ts` |
| Config | `SENTRY_DSN` env var (optional — disabled if not set) |
| Context | Run-ID, Phase, Adapter-Mode in Sentry Breadcrumbs |
| Scope | Server-side only (backend errors) |
| Sampling | `tracesSampleRate: 0.1` (10% in production) |
| Environment | `NODE_ENV` → Sentry `environment` tag |

### 6.2 OpenTelemetry — Distributed Tracing

**Goal:** Echte Performance-Probleme identifizieren.

| Requirement | Details |
|-------------|---------|
| SDK | `@opentelemetry/sdk-node` |
| Instrumentation | `@opentelemetry/auto-instrumentations-node` |
| Export | OTLP → Prometheus (existing) + optional Jaeger/Zipkin |
| Config | `OTEL_EXPORTER_OTLP_ENDPOINT` env var (optional) |
| Metrics | HTTP request duration, DB query time, adapter call latency |
| Traces | Full run lifecycle tracing (INGEST → DONE) |
| Span Attributes | `run.id`, `run.phase`, `adapter.mode` |

### 6.3 Existing Observability (Enhancement)

The existing Prometheus/Grafana/Alertmanager stack (QA-013, QA-014) should integrate:
- Sentry alerts → Prometheus Alertmanager webhook
- OpenTelemetry metrics → Prometheus scrape endpoint
- Grafana dashboard: Sentry error rate panel + OTEL trace panel

### Acceptance Criteria: Layer 6
- [ ] `@sentry/node` installed and configured
- [ ] `SENTRY_DSN` env var support (graceful disable if not set)
- [ ] Run context in Sentry breadcrumbs
- [ ] `@opentelemetry/sdk-node` installed and configured
- [ ] HTTP/database/adapter instrumentation active
- [ ] OTEL spans include `run.id` and `run.phase`
- [ ] Sentry/OTEL optional — app works without them

---

## Layer 7: Evidence Layer (PRIO 7)

### 7.1 Automated Artifact Posting

**Goal:** Alle Test-Artefakte automatisch im GitHub Issue kommentieren.

| Artefact | Source | Format |
|----------|--------|--------|
| Test Report | `vitest --reporter=json` | Pass/Fail summary + per-file breakdown |
| Coverage Report | `coverage/coverage-summary.json` | Lines/Functions/Branches/Statements % |
| Sonar Report | SonarQube API | Quality Gate status + key metrics |
| Semgrep SARIF | `semgrep --sarif` | Finding count by severity |
| E2E Screenshots | `test-results/` | PNG attachments |
| Playwright Trace | `test-results/` | Trace zip attachment |
| Mutation Report | `reports/mutation/` | Score + killed/survived counts |

### 7.2 Evidence Comment Template

```markdown
## Evidence Report — Run #<run-id>

### Backend Tests
- Unit: 452/452 ✅
- Integration: 8/8 ✅
- Contract: 140/140 ✅
- Property: 37 props / ~18k runs ✅

### Quality Gates
- SonarQube: ✅ PASS (0 bugs, 0 vulnerabilities)
- Semgrep: ✅ 0 findings
- CodeQL: ✅ 0 alerts

### E2E Tests
- Playwright: 25/25 ✅
- Runtime: 50.5s
- Screenshots: [attached]

### Artifacts
- [Coverage Report](link)
- [Mutation Report](link)
- [Playwright Trace](link)
```

### 7.3 CI Workflow Integration

| Step | Action |
|------|--------|
| 1 | Run all tests |
| 2 | Collect all artifacts |
| 3 | Generate Evidence Report Markdown |
| 4 | Upload artifacts as CI artifacts |
| 5 | Post Evidence Report as Issue comment |
| 6 | If `POSITRON_EVIDENCE_ISSUE` set → post to that specific issue |
| 7 | Otherwise → post to current PR/Issue |

### Acceptance Criteria: Layer 7
- [ ] Evidence collection script exists: `scripts/collect-evidence.mjs`
- [ ] Evidence comment generated in CI for every run
- [ ] Evidence posted to GitHub Issue
- [ ] All 7 artifact types present
- [ ] Fallback: graceful skip if GitHub token not available
- [ ] `POSITRON_EVIDENCE_ISSUE` env var support

---

## Cross-Cutting Requirements

### CI Workflow Architecture

```
quality-gates.yml
├── build-and-test (blocking)
│   ├── npm ci → npm run build → npm test
│   └── Upload: coverage, test-results
├── semgrep (blocking)
│   └── Upload: SARIF
├── codeql (blocking)
│   └── Upload: SARIF
├── sonarqube (blocking)
│   └── Quality Gate check
├── mutation-fast (non-blocking → blocking after fix)
│   └── Upload: mutation report
├── e2e-playwright (non-blocking → blocking after stability)
│   ├── Screenshot/Video/Trace
│   └── Upload: playwright artifacts
├── ai-ui-review (non-blocking, optional)
│   └── Post: LLM review comment
├── evidence-collect (always)
│   ├── Collect all artifacts
│   └── Post: Evidence comment on Issue
└── runtime-verify (always)
    └── Validate Sentry/OTEL reachable (non-blocking)
```

### Security & Secrets

| Constraint | Enforcement |
|------------|-------------|
| No real GitHub tokens in CI | `GITHUB_TOKEN: ""` in E2E env |
| Fake adapters only in tests | `POSITRON_*_MODE: fake` |
| No `.env` loading in CI | `VITEST: "true"` |
| No real API calls | All adapters in fake mode |
| No secrets in logs | `redactValue()` before logging |
| Sentry DSN via env var only | Never hardcoded |
| OTEL endpoint via env var only | Never hardcoded |

### Non-Negotiable Constraints

| Constraint | Rationale |
|------------|-----------|
| All tools must be free tier or OSS | No SaaS lockin |
| Everything must work offline/local | No mandatory cloud dependency |
| All configs must be env-var opt-in | No forced configuration |
| No breaking existing tests | Backward compatibility |
| Docs updated for every layer | Knowledge preservation |

### Out of Scope (for this Epic)

- Real-adapter E2E tests (needs controlled test repos — separate issue)
- Load/stress testing (separate issue)
- Fuzz testing (separate issue)
- Production deployment (separate issue)
- Paid SaaS accounts (Sentry Business, SonarQube Enterprise)

---

## Edge Cases & Error States

### Semgrep / CodeQL
- No findings → pass, continue
- Findings found → fail, SARIF uploaded
- Runner unavailable → skip with warning (non-blocking for optional jobs)
- SARIF upload fails → warn, continue

### SonarQube
- Instance unreachable → skip with warning
- Quality Gate FAIL → block merge
- Coverage import fails → warn, skip coverage gate

### AI UI Review
- LLM API key not configured → skip with info
- LLM API rate limited → retry 1x, then skip
- Screenshot missing → skip that comparison
- LLM returns ambiguous result → post as "review with caution"

### Evidence Posting
- GitHub token not available → skip evidence posting
- Comment too large → truncate, link to CI artifacts
- Multiple artifacts missing → post partial report with "missing" flags

---

## User Stories

### US-1: Developer opens PR — gets automated review
As a Positron developer, when I open a PR, CodeRabbit automatically reviews my code
and posts inline comments with suggestions, bugs, and security findings.

### US-2: Developer merges — only if all gates pass
As a Positron developer, I can only merge if all Quality Gates are green:
SonarQube, Semgrep, CodeQL, tests, and E2E.

### US-3: Developer sees test evidence without leaving GitHub
As a Positron developer, after every CI run, I see a structured evidence report
in the GitHub Issue with test results, coverage, screenshots, and quality metrics.

### US-4: Developer debugs E2E failure via trace
As a Positron developer, when an E2E test fails, I can download the Playwright trace
from CI artifacts and replay the exact browser session.

### US-5: Developer sees AI UI review after E2E
As a Positron developer, after E2E tests run, an AI reviews the screenshots against
the specification and posts a visual comparison report.

### US-6: Operator monitors runtime errors via Sentry
As a Positron operator, I see real runtime errors in Sentry with full context
(run ID, phase, adapter mode), enabling fast incident response.

### US-7: Operator traces performance via OpenTelemetry
As a Positron operator, I can trace the latency of every run lifecycle phase
and identify bottlenecks via OpenTelemetry spans.

---

## Dependencies Between Layers

```
Layer 1 (Code Review) — independent, can be done first
Layer 2 (Quality)     — independent, can parallel with L1
Layer 3 (Backend)     — mostly done; L7 depends on L3 artifacts
Layer 4 (Browser)     — depends on L3 (needs backend tests to pass)
Layer 5 (AI UI)       — depends on L4 (needs screenshots from E2E)
Layer 6 (Runtime)     — independent, can parallel with L1/L2
Layer 7 (Evidence)    — depends on L1-L6 (collects all artifacts)
```

### Recommended Implementation Order
1. L1 (CodeRabbit) + L2 (Semgrep/CodeQL) — external SAST, no code changes
2. L2 (SonarQube) — self-hosted, Docker-based
3. L4 (Playwright enhancements) — screenshot/video/trace config changes
4. L6 (Sentry/OTEL) — instrumentation in server code
5. L5 (AI UI Review) — depends on L4 screenshots
6. L7 (Evidence) — depends on all layers producing artifacts
7. L3 (Backend) — promote E2E to blocking after stability window
