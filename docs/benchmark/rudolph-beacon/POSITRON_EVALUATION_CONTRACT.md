# Positron Evaluation Contract — Rudolph Beacon

## Machine-Readable Evidence Schema

The `RudolphBenchmarkRunSummary` type defines the contract:

```typescript
interface RudolphBenchmarkRunSummary {
  runId: string;                    // Unique run identifier
  timestampUtc: string;             // ISO 8601
  executionMode: ExecutionMode;      // 'fixture' | 'dry-run' | 'real'
  benchmarkName: 'rudolph-beacon';
  repo: {
    branch: string;
    commitSha: string;
    status: 'clean' | 'dirty' | 'unknown';
  };
  issues: BenchmarkIssueResult[];   // One per benchmark issue
  commands: BenchmarkCommandResult[]; // Commands executed
  tests: {                          // Test summary
    passed: number;
    failed: number;
    skipped: number;
    redTestsCovered: string[];
  };
  safety: {
    secretsRedacted: boolean;
    blockedActions: Array<{ operation: string; reason: string }>;
    warnings: string[];
  };
  conclusion: BenchmarkConclusion;
  capabilityDelta: CapabilityDelta;
}
```

## Issue Status Rules

| Status | Meaning | Evidence Required |
|--------|---------|-------------------|
| DONE | All acceptance criteria met | YES — at least one evidence path |
| PARTIAL | Some criteria met, some not | YES — documents what's missing |
| BLOCKED | Cannot proceed (external blocker) | YES — documents the blocker |
| UNKNOWN_EVIDENCE | No evidence collected yet | NO — this is the default |

## Conclusion Rules

| Status | Condition |
|--------|-----------|
| RED | Any issue BLOCKED, or DONE with confidence < 0.3 |
| YELLOW | Any issue UNKNOWN_EVIDENCE or PARTIAL |
| GREEN | All issues DONE with confidence >= 0.7 |
| UNKNOWN | No issues evaluated |

## Secret Redaction
All evidence must be scanned for:
- GitHub tokens: `ghp_*`, `gho_*`, `ghu_*`, `ghs_*`, `ghr_*`
- OpenAI keys: `sk-*`
- Slack tokens: `xox[baprs]-*`
- Auth headers: `Bearer *`, `Authorization: *`

Secrets must be replaced with `***REDACTED***`.

## Hardened Conclusion Rules (Anschlusslauf 2026-06-24)

Positron darf `GREEN` nur vergeben, wenn:
- [ ] Alle relevanten Tests bestanden sind (`determineConclusionStatus` returns GREEN)
- [ ] Evidence-Schema-Validierung bestanden ist (`validateRunSummary` returns 0 errors)
- [ ] Traceability Map gültig ist (`validateTraceabilityMap` returns 0 errors)
- [ ] Keine Secrets in Evidence stehen (`containsSecrets` returns false for all serialized evidence)
- [ ] Dry-Run-Blockaden korrekt funktionieren (risky ops all in `blockedActions`)
- [ ] Fehlende Evidence nicht als DONE gewertet wird (DONE requires `evidencePaths.length > 0`)
- [ ] Coverage entweder gemessen ODER begründet als `UNKNOWN_COVERAGE` dokumentiert ist

Positron muss `YELLOW` oder `UNKNOWN` vergeben, wenn:
- [ ] Coverage nicht gemessen wurde und nicht als `UNKNOWN_COVERAGE` dokumentiert ist
- [ ] Evidence unvollständig ist (issues mit `UNKNOWN_EVIDENCE`)
- [ ] Traceability unvollständig ist (map enthält Lücken)
- [ ] Lokale Gates nicht vollständig liefen (nicht alle geplanten Gates hatten exit code 0)
- [ ] Schlussfolgerung nur aus Behauptung, aber nicht aus Evidence folgt

## Confidence Scoring
- 0.95: All tests pass + verified against existing agents + fixture evidence + schema validated + coverage measured
- 0.85-0.90: Tests pass, fixture evidence present, schema validated, no real-mode verification, coverage UNKNOWN_COVERAGE
- 0.70-0.84: Tests pass, partial schema validation, some evidence gaps
- 0.3-0.50: Partial evidence, some tests may be missing, schema validation fails
- 0: No evidence whatsoever

## Evidence Schema Validation (New)

Jede `RudolphBenchmarkRunSummary` MUSS durch `validateRunSummary()` validiert werden, bevor sie als Evidence akzeptiert wird. Der Validator prüft:
- Pflichtfelder (`runId`, `timestampUtc`, `executionMode`, `benchmarkName`, `repo`, `issues`, `commands`, `tests`, `safety`, `conclusion`, `capabilityDelta`)
- Enum-Werte (`executionMode`, `conclusion.status`, `issue.status`, `repo.status`)
- Wertebereiche (`confidence` zwischen 0 und 1)
- Logische Konsistenz (GREEN → alle issues DONE mit confidence >= 0.7)
- Secret-Freiheit (kein `containsSecrets` true)
