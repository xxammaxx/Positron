# ADR-002: Evidence-Backed Validation

- **Status:** Proposed
- **Datum:** 2026-06-04
- **Autor:** Architecture Agent / Speckit Phase 4
- **Supersedes:** none
- **Superseded by:** none

---

## Kontext

Issue #165 requires a seven-layer autonomous quality system. The user-approved additional architecture decision states that Layer 7 must never trust a plain “test success” claim. Positron's Constitution also requires evidence-gated progression: tests, build status, acceptance criteria mapping, diff summary, risks, and GitHub documentation must be backed by artifacts rather than model memory or local-only claims.

## Entscheidung

Adopt an evidence-backed validation rule for Layer 7: every validation claim must reference at least one evidence artifact, such as a Screenshot, Trace, Report, Log, Review, or Runtime Event. Layer 7 may report partial or degraded status, but only when the missing artifact is itself backed by a skip/degradation report. No evidence means no validation.

## Alternativen

### Option A — Evidence-backed validation (gewählt)

**Beschreibung:** Layer 7 parses and reports only claims that can be tied to artifacts. Missing optional services produce explicit skip artifacts or missing-artifact warnings.

**Vorteile:**
- Lowers trust in agent self-reporting and increases auditability.
- Keeps Layer 7 cohesive as an evidence aggregator rather than another test runner.
- Scales as new artifact producers are added.
- Improves security by requiring redacted logs/reports instead of raw secret-bearing output.

**Nachteile:**
- Requires artifact contracts and parsers for every producer.
- May mark real successes as unvalidated if artifacts are missing or malformed.

### Option B — Trust CI job success status (abgelehnt)

**Beschreibung:** Treat green CI jobs as sufficient proof and summarize status checks without collecting underlying artifacts.

**Warum abgelehnt:** A green status can hide skipped steps, missing credentials, or partial execution. It does not satisfy the Issue #165 evidence requirement or Constitution evidence-gated progression.

### Option C — Status Quo (abgelehnt)

**Beschreibung:** Keep existing tests and human/manual summaries without strict artifact backing.

**Warum abgelehnt:** Does not prove autonomous quality assurance and depends on local logs/model memory rather than durable GitHub evidence.

## Konsequenzen

### Positive
- Evidence reports become auditable and reproducible.
- Optional services can degrade gracefully without being misrepresented as validated.
- GitHub Issue #165 can serve as the durable source of truth for all layers.

### Negative
- CI artifact volume and parser maintenance increase.
- Implementation must standardize artifact names before Layer 7 can be reliable.

### Risiken
- Overly strict artifact validation can block promotion despite successful underlying tests.
- Sensitive logs/screenshots must be redacted before upload or posting.

## Validierung

- [ ] `scripts/collect-evidence.mjs` maps every claim to an artifact reference.
- [ ] Missing artifacts are reported as missing/degraded, not as success.
- [ ] Evidence report includes links or paths to screenshots, traces, reports, logs, reviews, or runtime events.
- [ ] Redaction tests cover token-like fixture values.
- [ ] GitHub evidence comment is posted to `POSITRON_EVIDENCE_ISSUE=165` when configured.

---

## Änderungshistorie

| Datum | Änderung | Autor |
|-------|----------|-------|
| 2026-06-04 | Initiale Version | Architecture Agent |
