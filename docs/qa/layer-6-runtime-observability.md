# Layer 6: Runtime Observability — Discovery & Architecture

## Status: Discovery Complete — Implementation Deferred

No code changes. This document captures the feasibility analysis and architecture plan.

---

## 1. Runtime Events — Observability-Relevant

Events are classified into three tiers:

### Tier A: Always Observable (local console only, no export)

| Event | Trigger | Data |
|-------|---------|------|
| Run started | `POST /api/runs` | runId, blueprint, mode |
| Phase transition | `runState.transition()` | runId, from, to, duration |
| Adapter failure | GitHub/OpenCode/SpecKit error | runId, adapter, errorType, message (redacted) |
| Blocked (policy) | Command blocked by policy | runId, command (preview only), policy name |
| Blocked (kill-switch) | Merge/Push kill-switch active | runId, switch name |

### Tier B: Export-Ready (redacted, sampled)

| Event | Trigger | Data |
|-------|---------|------|
| Unhandled error | Server crash / uncaught exception | stack trace (path-redacted), runId |
| API error (5xx) | Express error handler | route, status, errorType, runId |
| SSE disconnect | Client SSE stream closed | event count, duration |
| Run failed | Run reaches FAILED terminal state | runId, failedPhase, errorType |

### Tier C: Never Observable

| Data | Reason |
|------|--------|
| Full prompts | Contain project code, secrets, user data |
| GitHub issue bodies | May contain PII, secrets, repo metadata |
| Private file paths | `/home/user/.ssh/...`, `/etc/shadow`, config paths |
| Environment variables | May contain tokens, DSNs, secrets |
| Tokens / API keys | `GITHUB_TOKEN`, `OPENAI_API_KEY`, etc. |
| User email / repo names | PII, DSGVO-relevant |

---

## 2. No-Export Data — Hard Boundaries

The redaction pipeline from `apps/web/src/voice/redact-for-speech.ts` (22 rules) provides the foundation. Additional runtime-specific rules:

| Redaction | Pattern | Replacement |
|-----------|---------|-------------|
| File paths | `/home/*`, `/Users/*`, `/root/*` | `[PATH]` |
| Tokens | `ghp_*`, `sk-*`, `xox*`, etc. | `[TOKEN]` |
| Stack traces (paths only) | `/app/node_modules/...` | preserve function names, redact paths |
| Environment values | `KEY=VALUE` where VALUE ≥ 4 chars | `KEY=[ENV]` |
| Repo metadata | owner/repo names in error messages | `[REPO]` |

---

## 3. Provider Strategy

### Default: No-Op (always safe)

```
POSITRON_OBSERVABILITY_ENABLED=false  (default)
```

No-op provider logs nothing, exports nothing. Zero dependency on external services.

### Level 1: Console/JSON (local only)

```
POSITRON_OBSERVABILITY_ENABLED=true
POSITRON_OBSERVABILITY_PROVIDER=console
```

Writes structured JSON events to stdout. Useful for local debugging and log aggregation.

### Level 2: OpenTelemetry (opt-in)

```
POSITRON_OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

Sends spans and metrics to an OTLP-compatible collector (Jaeger, Grafana, Honeycomb). No vendor lock-in.

### Level 3: Sentry (opt-in, requires DSN)

```
POSITRON_SENTRY_ENABLED=true
SENTRY_DSN=https://xxx@sentry.io/xxx
```

Captures unhandled errors with breadcrumbs. Run context (runId, phase, mode) attached as tags.

---

## 4. Environment Flags (ALL default OFF)

| Flag | Default | Purpose |
|------|---------|---------|
| `POSITRON_OBSERVABILITY_ENABLED` | `false` | Master switch |
| `POSITRON_OBSERVABILITY_PROVIDER` | `console` | `console` \| `otel` \| `sentry` |
| `POSITRON_OTEL_ENABLED` | `false` | OpenTelemetry SDK init |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | Collector endpoint |
| `POSITRON_SENTRY_ENABLED` | `false` | Sentry SDK init |
| `SENTRY_DSN` | — | Sentry DSN (never committed) |
| `POSITRON_OBSERVABILITY_SAMPLING` | `1.0` | Sampling rate (0.0–1.0) |
| `POSITRON_OBSERVABILITY_REDACT` | `true` | Enable redaction pipeline |

---

## 5. Redaction Pipeline — Reuse & Extend

Existing redaction infrastructure:

| Module | Location | Reuse |
|--------|----------|-------|
| Voice redaction (22 rules) | `apps/web/src/voice/redact-for-speech.ts` | ✅ Adapt for runtime context |
| Voice settings/localStorage | `apps/web/src/voice/voice-settings.ts` | ❌ Frontend only — not reusable for server |

Plan:
1. Extract redaction rules into a shared package (`packages/shared/src/redact.ts`)
2. Voice module imports from shared
3. Runtime observability imports from shared
4. Redaction pipeline is consistent across frontend and backend

---

## 6. Implementation Phases

### Phase A: Shared Redaction (prerequisite for all)

```
packages/shared/src/redact.ts — extract 22 redaction rules
```

- Move redaction from `apps/web/src/voice/redact-for-speech.ts` to shared package
- Add runtime-specific path/stack/ENV redaction rules
- Export: `redact(text: string): string`, `truncate(text: string, max: number): string`
- Both frontend voice and backend observability import from shared

### Phase B: No-Op + Console Provider (safe default)

```
apps/server/src/observability/provider.ts   — Provider interface
apps/server/src/observability/console.ts    — Console JSON logger
apps/server/src/observability/noop.ts       — No-op provider (default)
```

- Provider interface: `logEvent(event: RuntimeEvent): void`
- Select provider based on `POSITRON_OBSERVABILITY_PROVIDER`
- Unit tests: noop does nothing, console writes to stdout

### Phase C: Run Context Hooks

```
apps/server/src/observability/run-context.ts
```

- `runStarted(runId, blueprint) → span/event`
- `phaseTransition(runId, from, to, duration) → span/event`  
- `runFailed(runId, phase, error) → event with redacted error`
- `adapterError(runId, adapter, error) → event`
- Wire into existing `runState.transition()` and adapter calls

### Phase D: OpenTelemetry (opt-in)

```
apps/server/src/observability/otel.ts
```

- `@opentelemetry/sdk-node` installation
- Graceful skip when `POSITRON_OTEL_ENABLED !== 'true'`
- Spans: run lifecycle, phase transitions
- Redacted span attributes (no secrets in traces)

### Phase E: Sentry (opt-in)

```
apps/server/src/observability/sentry.ts
```

- `@sentry/node` installation
- Graceful skip when no `SENTRY_DSN` set
- Breadcrumbs: run events, phase transitions
- Tags: runId, phase, mode

### Phase F: CI Smoke Test

```
.github/workflows/quality-gates.yml → runtime-smoke job
```

- Non-blocking, `continue-on-error: true`
- Verifies server starts without observability providers
- Verifies noop/console providers work
- Verifies OTEL/Sentry gracefully skip without config

---

## 7. Test Strategy

| Test | Provider | Assertion |
|------|----------|-----------|
| Noop does nothing | all | No stdout, no HTTP calls |
| Console writes JSON | console | stdout contains `runId`, `phase` |
| Redaction applied | console | `ghp_xxx` → `[TOKEN]` in output |
| OTEL skip without endpoint | otel | No crash, no spans sent |
| Sentry skip without DSN | sentry | No crash, no events sent |
| Sampling 0% | all | No events exported |
| Run context hooks | all | Events contain `runId`, `phase` |

---

## 8. Recommendation

### Now (Discovery): ✅ Done
- Architecture defined
- Provider strategy: noop → console → OTEL → Sentry
- Default: OFF, zero dependencies
- Redaction: extract to shared package

### Next (Phase A — Shared Redaction):
- Extract redaction to `packages/shared/src/redact.ts`
- This is a prerequisite for both voice and observability
- Small, safe, pure TypeScript — no external dependencies

### Later (Phase B-F):
- Only after L5 and L7 are addressed
- Requires `@sentry/node` and OTEL dependencies (npm install)
- Requires approval for any cloud provider tokens (DSN)

**Status: Discovery complete. Implementation deferred to future phases.**

Date: 2026-06-05 | Issue: #171 | Epic: #165
