# Layer 5: AI UI Review — Discovery & Specification

## Status: Discovery Complete — Implementation Deferred

No code changes, no LLM calls, no cloud providers, no secrets.

---

## 1. Review Artifacts (Input)

Artifacts consumed from L4 (Playwright Evidence):

| Artifact | Source | Privacy Risk | Use |
|----------|--------|-------------|-----|
| Screenshots (PNG) | `test-results/screenshots/*.png` | HIGH — may contain secrets/PII | Block by default, require redaction pass first |
| DOM snapshots | `test-results/*/dom.txt` | MEDIUM — text content | Accept if redacted for secrets |
| Trace replay | `test-results/*/trace.zip` | HIGH — full browser recording | NEVER send to external provider |
| Console logs | `test-results/evidence/evidence-log.json` | MEDIUM — redacted text | Accept (already redacted by L4) |
| Network logs | `test-results/evidence/evidence-log.json` | MEDIUM — URLs redacted | Accept (already redacted by L4) |
| Accessibility tree | Extracted from DOM | LOW — structural only | Accept |
| Error states | Screenshot on failure | MEDIUM — may show secrets | Block by default |

**Decision:** AI UI Review should use only **redacted console/network logs and accessibility indicators** by default. Screenshots require an explicit redaction pass before any external provider sees them.

---

## 2. No-Export Data (Blocked)

Same boundaries as L6 Runtime Observability:

| Data | Blocked |
|------|---------|
| Secrets / tokens | ✅ |
| Private file paths | ✅ |
| GitHub issue bodies | ✅ |
| Environment variables | ✅ |
| Run prompts | ✅ |
| PII (email, repo names) | ✅ |

---

## 3. Review Categories

| Category | Question | Weight |
|----------|----------|--------|
| **UI Present** | Is the expected UI visible? No blank screen? | HIGH |
| **Primary Action** | Is the main action recognizable (button, input, link)? | HIGH |
| **Error Handling** | Are error states visible and understandable? | MEDIUM |
| **Safety Controls** | Are kill-switch indicators, mode toggles visible? | HIGH |
| **Empty States** | Are empty/zero-data states explained? | LOW |
| **Accessibility** | Are key elements labeled? (aria, alt, title) | LOW |
| **Evidence** | Are evidence artifacts present and accessible? | MEDIUM |
| **Workflow** | Is the run lifecycle flow navigable? | MEDIUM |

---

## 4. Provider Strategy

### Default: Disabled (no provider)

```
POSITRON_AI_UI_REVIEW_ENABLED=false  (default)
```

No review runs. No LLM calls. No cloud access. Zero privacy risk.

### Tier 0: Mock/No-Op (always available, always safe)

```javascript
// scripts/ai-ui/providers/mock.mjs
export async function review(manifest) {
  return {
    provider: "mock",
    score: 1.0,
    findings: [],
    summary: "Mock provider — AI UI Review is disabled."
  };
}
```

Always returns empty findings. Used in CI when no real provider is configured.

### Tier 1: Local LLM (privacy-safe, requires setup)

```javascript
// scripts/ai-ui/providers/local.mjs
// Uses locally running LLM (ollama, llama.cpp, etc.)
// No data leaves the machine.
// Setup: user provides model name via env var.
```

### Tier 2: Cloud Provider (opt-in, requires explicit approval)

```
POSITRON_AI_UI_REVIEW_PROVIDER=openai|anthropic|gemini
POSITRON_AI_UI_PROVIDER_API_KEY=sk-...
```

⚠️ **BLOCKED:** No cloud provider implementation without explicit approval. Cloud providers receive screenshots/data — even redacted data may leak metadata. This must go through a security review.

---

## 5. Output Schema

```json
{
  "provider": "mock",
  "timestamp": "2026-06-05T12:00:00Z",
  "runId": "abc12345",
  "score": 0.88,
  "findings": [
    {
      "category": "UI Present",
      "severity": "HIGH",
      "page": "dashboard-loaded",
      "passed": true,
      "detail": "Dashboard rendered with 5 widgets"
    }
  ],
  "summary": "7/8 categories passed. 1 HIGH finding.",
  "artifacts": ["ai-ui-review-report.json", "ai-ui-review-summary.md"]
}
```

---

## 6. Integration with L4 + L7

```
L4: Playwright Evidence (screenshots, traces, console/network)
  ↓
L5: AI UI Review (consumes redacted L4 artifacts)
  ↓ (output)
L7: Evidence Aggregation (combines L3, L4, L5, L6, L7 artifacts)
```

---

## 7. CI Integration (non-blocking)

```yaml
ai-ui-review:
  runs-on: ubuntu-latest
  timeout-minutes: 5
  continue-on-error: true     # Non-blocking
  needs: e2e-playwright       # Requires L4 artifacts
  env:
    POSITRON_AI_UI_REVIEW_ENABLED: ${{ vars.POSITRON_AI_UI_REVIEW_ENABLED || 'false' }}
  steps:
    - download L4 artifacts
    - run node scripts/ai-ui-review.mjs
    - upload artifact: ai-ui-review-report
```

---

## 8. Implementation Phases

### Phase A (safe): Mock Provider + Script
- `scripts/ai-ui-review.mjs` — empty runner
- `scripts/ai-ui/providers/mock.mjs` — no-op provider
- Output: `ai-ui-review-report.json` with mock results
- CI: non-blocking, `continue-on-error: true`

### Phase B (deferred): Local Provider
- `scripts/ai-ui/providers/local.mjs` — local LLM adapter
- Requires user to set `POSITRON_AI_UI_REVIEW_PROVIDER=local`
- No data leaves machine

### Phase C (BLOCKED): Cloud Providers
- `scripts/ai-ui/providers/openai.mjs`, etc.
- Requires security review
- Requires explicit approval for cloud data sharing

---

## 9. Decision

**Defer implementation.** The only safe implementation in this phase would be the mock/no-op provider (Phase A), which adds no value beyond documentation.

**Recommendation:** Close #172 as discovery-complete. Create a separate issue for:
1. Phase A (mock provider + CI job) — safe, small, non-blocking
2. Phase B (local LLM) — when local model infrastructure is available
3. Phase C (cloud) — BLOCKED until security review

---

## 10. Privacy Policy (inline)

AI UI Review:
- Is **disabled by default**
- Never sends screenshots or traces to external services
- Never includes secrets, tokens, PII, or paths in review data
- Uses mock/no-op provider in CI by default
- Requires explicit opt-in for any non-mock provider
- All review artifacts are human-readable and go through the same redaction pipeline

Date: 2026-06-05 | Issue: #172 | Epic: #165
