# ADR-001: Seven-Layer Testing and Verification Framework

- **Status:** Proposed
- **Datum:** 2026-06-04
- **Autor:** Architecture Agent / Speckit Phase 3
- **Supersedes:** none
- **Superseded by:** none

---

## Kontext

Issue #165 requires Positron to prove autonomous quality assurance through a mandatory seven-layer testing and verification framework. The repository already has a strong local test base, Playwright E2E, mutation testing, and Prometheus/Grafana/Alertmanager observability. The missing architectural decision is how to add external review, SAST, code scanning, SonarQube, visual evidence, runtime telemetry, AI UI review, and evidence posting without breaking offline/local execution, fake-adapter test isolation, or env-var opt-in constraints.

## Entscheidung

Adopt a layered, artifact-first verification architecture:

1. Keep all existing unit, integration, contract, property, mutation, observability, and E2E checks intact.
2. Add external review and security scanning as separate CI jobs and repository configuration files.
3. Make cloud/SaaS-backed functionality opt-in and gracefully skipped when credentials or endpoints are absent.
4. Use self-hosted/OSS defaults where possible: Semgrep CE, CodeQL, SonarQube Community Build, Playwright artifacts, OpenTelemetry.
5. Treat each layer as an artifact producer; Layer 7 collects and reports artifacts from all other layers.
6. Promote E2E to blocking only after the documented stability window is satisfied.

## Alternativen

### Option A — Layered artifact-first framework (gewählt)

**Beschreibung:** Each layer has its own configuration, CI job, outputs, and rollback path. Optional external services are guarded by environment variables. Evidence collection is centralized after all producers finish.

**Vorteile:**
- Low coupling between layers; one failing optional integration does not break local development.
- High cohesion: each layer owns one verification concern.
- Scales by adding artifact producers without rewriting the core test runner.
- Maintains security boundaries: no real tokens in tests, fake adapters by default.
- Supports offline/local test mode.

**Nachteile:**
- More CI jobs and configuration files to maintain.
- Some cloud-backed validations are informational until endpoints/tokens are configured.

### Option B — Single monolithic quality workflow (abgelehnt)

**Beschreibung:** Put all checks into one large GitHub Actions job and fail the job on any missing service.

**Warum abgelehnt:** High coupling, poor debuggability, harder rollback, and violates env-var opt-in/offline constraints because missing external services would break unrelated checks.

### Option C — Status quo (abgelehnt)

**Beschreibung:** Keep existing tests and non-blocking E2E/mutation jobs without new verification layers.

**Warum abgelehnt:** Does not satisfy Issue #165 acceptance criteria; lacks automated PR review, SAST/code scanning, SonarQube quality gate, AI UI review, runtime telemetry, and centralized evidence reporting.

## Konsequenzen

### Positive
- Clear separation of code review, static analysis, browser evidence, runtime telemetry, AI UI review, and evidence reporting.
- Better merge confidence through independent quality signals.
- Evidence can be posted to GitHub without depending on model memory or local logs.

### Negative
- CI runtime and artifact volume increase.
- Self-hosted SonarQube and optional LLM review require operational setup outside code changes.

### Risiken
- False positives in Semgrep/CodeQL/SonarQube can block merges if enabled too aggressively.
- CodeRabbit and AI UI review are cloud-backed unless explicitly disabled; must remain non-blocking/opt-in.
- SonarQube availability can become a bottleneck if treated as hard-blocking before stable operations.

## Validierung

- [ ] `.specify/issue-165-testing-verification-framework/plan.md` produced.
- [ ] At least two alternatives evaluated.
- [ ] Each layer has files, CI changes, dependencies, configuration, steps, risks, rollback, and test verification.
- [ ] Security constraints documented: env-var opt-in, no real tokens in CI tests, fake adapters only in tests.
- [ ] E2E blocking promotion gated by stability window.

---

## Änderungshistorie

| Datum | Änderung | Autor |
|-------|----------|-------|
| 2026-06-04 | Initiale Version | Architecture Agent |
