# Layer 2c: SonarQube Quality Gate — Discovery

## Status: PARTIAL / Discovery Only

No implementation has been started. This document captures the feasibility analysis.

---

## Discovery Questions — Answered

### 1. Gibt es bereits SonarQube/SonarScanner-Konfiguration?
**No.** The repository has zero SonarQube files: no `sonar-project.properties`, no Docker Compose, no scanner scripts, no CI job.

### 2. Gibt es bereits Docker Compose für SonarQube?
**No.** `docker-compose.sonarqube.yml` does not exist. However, Docker infrastructure is available (QA-004: `docker/Dockerfile.test`, `docker/Dockerfile.security`, `docker-compose.test.yml`).

### 3. Kann SonarQube lokal ohne Cloud laufen?
**Yes.** SonarQube Community Edition can run locally via Docker:

```bash
docker run -d --name sonarqube \
  -p 9000:9000 \
  -v sonarqube_data:/opt/sonarqube/data \
  -v sonarqube_logs:/opt/sonarqube/logs \
  -v sonarqube_extensions:/opt/sonarqube/extensions \
  sonarqube:community
```

This runs fully offline — no cloud account, no SonarCloud token needed.

### 4. Welche Ports/Volumes wären nötig?

| Resource | Value |
|----------|-------|
| Port | 9000 (SonarQube UI + API) |
| Volume: data | ~2 GB (database, plugins, quality profiles) |
| Volume: logs | ~200 MB |
| Volume: extensions | ~50 MB (optional plugins) |
| First startup time | 2–5 minutes (database init) |
| Memory requirement | ~1.5 GB RAM minimum |

### 5. Welche CI-Schritte wären non-blocking möglich?

```yaml
sonarqube-quality-gate:
  runs-on: ubuntu-latest
  timeout-minutes: 10
  continue-on-error: true    # Non-blocking
  env:
    SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL || 'http://localhost:9000' }}
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN || '' }}
  steps:
    - checkout
    - setup node 22
    - npm ci
    - npm run build
    - run: npx vitest run --coverage --reporter=lcov  # Generate LCOV
    - run: sonar-scanner         # Requires sonar-scanner CLI
    - run: node scripts/sonarqube-quality-gate.mjs  # Poll for gate status
    - upload artifact: sonarqube-report
```

### 6. Welche Reports/Artifacts können ohne externen Dienst erzeugt werden?

| Report | No External Service? |
|--------|---------------------|
| Vitest LCOV coverage | ✅ Yes — local vitest run |
| SonarScanner dry run | ✅ Yes — no server needed for analysis |
| SonarQube server (Quality Gate) | ❌ No — needs running SonarQube instance |
| Quality Gate status polling | ❌ No — needs SonarQube API |

**Key finding:** SonarScanner (the client) can analyze locally without a server. Only the Quality Gate check requires a live SonarQube instance.

### 7. Welche Sonar-Regeln sind für Positron relevant?

| Rule Category | Priority | Positron Relevance |
|---------------|----------|-------------------|
| Security hotspots | HIGH | Secret management, sandbox paths |
| Code smells: complexity | MEDIUM | `secret-manager.ts`, `state-machine.ts` |
| Duplications | LOW | Templates, policy files |
| TypeScript-specific | MEDIUM | Strict null checks (already enforced) |
| Test coverage gaps | MEDIUM | Already tracked via vitest + mutation |
| Security: injection | HIGH | Command execution in opencode/speckit adapters |

### 8. Wie wird verhindert, dass Secrets in Reports landen?

- SonarScanner does NOT store secrets — it analyzes source patterns
- LCOV reports contain only line counts, not secrets
- Quality gate result contains only pass/fail and metric numbers
- All Positron redaction rules remain active

### 9. Wie passt SonarQube zur bestehenden Coverage-/Mutation-Policy?

| Gate | Current | With SonarQube |
|------|---------|---------------|
| Linting (Biome) | Blocking | Blocking |
| TypeScript typecheck | Blocking | Blocking |
| Unit tests | Blocking | Blocking |
| Coverage (global) | 30/30/32/25 | Same — SonarQube tracks trends |
| Coverage (safety) | 100/100/100/100 | Same — hard gate |
| Mutation (safety) | Non-blocking | Non-blocking |
| **SonarQube** | **—** | **Non-blocking (planned)** |

SonarQube would be a **complementary, non-blocking layer** that provides code quality trends, security hotspot detection, and duplication tracking — metrics that the current toolchain doesn't cover.

### 10. Welche Metriken wären release-blockierend und welche nur informativ?

| Metric | Blocking? | Rationale |
|--------|-----------|-----------|
| Security hotspots: 0 critical | YES (future) | Must not ship with known vulnerabilities |
| Coverage safety: 100% | YES (now) | Already enforced |
| Mutation safety: 85% | YES (future) | QA-009 when stable |
| Code smells count | NO (inform) | Quality trend, not gate |
| Duplications % | NO (inform) | Trend only |
| Test coverage trend | NO (inform) | Already gated separately |
| Reliability rating | YES (future) | A-rating minimum |
| Security rating | YES (future) | A-rating minimum |

---

## Proposed Path

### Phase 1: Local Discovery (this document)
- [x] Assess feasibility
- [x] Identify requirements
- [ ] Document findings

### Phase 2: Local Docker Setup (if approved)
- Create `docker-compose.sonarqube.yml`
- Add `sonar-project.properties`
- Write `scripts/sonarqube-quality-gate.mjs`
- Document local runbook

### Phase 3: Non-blocking CI Integration (if Phase 2 successful)
- Add opt-in CI job (`continue-on-error: true`)
- Skip when `SONAR_TOKEN` not set
- Upload SonarQube report as artifact

### Phase 4: Blocking Gate (deferred to future)
- Requires maintained SonarQube instance
- Requires stability observation (same pattern as QA-008)
- Requires >= 3 stable CI runs

---

## Decision

**Do NOT implement now.** SonarQube requires a running server instance (local Docker or cloud). While local Docker is possible and documented in this discovery, the immediate value is limited compared to the existing toolchain:

| Existing | SonarQube adds |
|----------|---------------|
| Biome lint | Code smells |
| vitest coverage | Coverage trends (same data) |
| Stryker mutation | (mutation already stronger) |
| — | Security hotspots ⭐ |
| — | Duplication tracking |

The only unique value-add is **security hotspot detection**. This is valuable but doesn't justify blocking the other open epic layers (L5, L6, L7).

---

## Recommendation

**Defer SonarQube implementation** in favor of:
1. Complete L5 (AI UI Review), L6 (Runtime), L7 (Evidence) first
2. Return to SonarQube when a maintained instance is available
3. Consider SonarCloud as alternative (no self-hosting needed, but requires token + cloud dependency)

**Status: PARTIAL — Discovery complete, implementation deferred.**

Date: 2026-06-05 | Issue: #169 | Epic: #165
