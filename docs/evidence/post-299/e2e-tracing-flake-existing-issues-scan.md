# Post-299: E2E Tracing Flake — Existing Issues Scan

**Date:** 2026-06-27
**Agent:** issue-orchestrator

---

## Search Methodology

Queried GitHub Issues API for open issues in `xxammaxx/Positron` with the following search terms:

| Search Term | Open Issues Found | Relevant? |
|------------|-------------------|-----------|
| `tracing.start` | 0 | N/A |
| `Tracing has been already started` | 0 | N/A |
| `Playwright tracing` | 0 | N/A |
| `e2e trace` | 2 | NO — #211 (repo polish), #229 (MCP bootstrap) |
| `trace lifecycle` | 0 | N/A |
| `browser context tracing` | 0 | N/A |
| `e2e-playwright` | 0 | N/A |
| `tracing` (all states) | 3 closed | NO — #171 (OpenTelemetry), #129 (Runtime Verification), #165 (Testing Framework) |

## Currently Open Issues (Top 12)

| Number | Title | Relevant? |
|--------|-------|-----------|
| #251 | Update api-overview.md | NO |
| #250 | Add CT-120 Browser Evidence Smoke Test | NO — different scope |
| #249 | Auto-Populate Infrastructure State Stores | NO |
| #248 | Display LivingEvidencePortfolio | NO |
| #247 | Add Trace and Eval Aggregation | NO — refers to pipeline traces, not Playwright |
| #246 | Enforce GateType Layers in Pipeline Loop | NO |
| #245 | Enforce requiresAuditLog in Tool Gateway | NO |
| #244 | Implement Runtime Workspace Cleanup | NO |
| #243 | Agentic/Vibe-Coding Baseline 2026 | NO |
| #229 | MCP/OpenCode Provider Bootstrap | NO |
| #224 | Tool Monitoring Dashboard | NO |
| #215 | Integrate Stop/Ask Policy | NO |
| #211 | docs: GitHub repo polish | NO |

## Conclusion

**No existing open issue covers the Playwright tracing lifecycle conflict.** All open issues address different concerns (architecture, documentation, feature enhancements). The three closed issues mentioning "tracing" relate to OpenTelemetry/observability, not Playwright E2E testing.

## Recommendation

Create a new, scoped issue for this specific finding. No merge with existing issues is appropriate.

## Classification

```
E2E_TRACING_ISSUE_PLAN: CREATE_NEW
  - No existing issue covers the `tracing.start: Tracing has been already started` error
  - No open issue addresses Playwright tracing lifecycle conflicts
  - Closed issues mentioning "tracing" are about OpenTelemetry, not E2E testing
```
