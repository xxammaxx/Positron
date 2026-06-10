# Agentenmetriken

Datum: 2026-06-09
Status: Draft
Diataxis: Reference

## Überblick

Agentenmetriken erfassen quantitative Daten über die Ausführung von KI-Agenten in
Positron. Sie messen Effizienz, Qualität und Risiken der agentischen Entwicklung.

## Metriken-Definitionen

### Tokens

Gemessene Token-Nutzung pro Agenten-Session.

| Metrik | Beschreibung | Einheit |
|---|---|---|
| `promptTokens` | Token im Prompt (Input) | Anzahl |
| `completionTokens` | Token in der Antwort (Output) | Anzahl |
| `totalTokens` | `promptTokens + completionTokens` | Anzahl |
| `estimatedTokens` | Geschätzte Token vor Ausführung | Anzahl |
| `actualTokens` | Tatsächliche Token nach Ausführung | Anzahl |

**Budget-Einhaltung:** `actualTokens / estimatedTokens < 1.2`

### Kosten

Geschätzte Kosten basierend auf Token-Nutzung und Modell-Preisen.

| Metrik | Beschreibung | Einheit |
|---|---|---|
| `inputCost` | Kosten für Input-Tokens | USD |
| `outputCost` | Kosten für Output-Tokens | USD |
| `totalCost` | `inputCost + outputCost` | USD |
| `costPerIssue` | Durchschnittskosten pro Issue | USD |

**Berechnung:**

```typescript
function calculateCost(model: string, prompt: number, completion: number): Cost {
  const rates = {
    'deepseek-v4-flash': { input: 0.0000005, output: 0.000002 },
    'gpt-4o': { input: 0.00001, output: 0.00003 },
  };
  const rate = rates[model] || rates['deepseek-v4-flash'];
  return {
    inputCost: prompt * rate.input,
    outputCost: completion * rate.output,
    totalCost: (prompt * rate.input) + (completion * rate.output),
  };
}
```

### Halluzinationen

Erkannte faktische Fehler in Agenten-Ausgaben.

| Metrik | Beschreibung | Einheit |
|---|---|---|
| `hallucinationsDetected` | Anzahl erkannter Halluzinationen | Anzahl |
| `hallucinationRate` | `hallucinationsDetected / totalClaims` | Prozent |
| `falsePositives` | Fälschlich als Halluzination markiert | Anzahl |
| `verificationFailures` | Claims, die Verification nicht bestanden | Anzahl |

**Erkennung:** Claims werden gegen Code, Spec und Dokumentation verifiziert.
Nicht verifizierbare Claims werden markiert.

### Scope Creep

Unerwartete Ausweitung des Aufgabenumfangs.

| Metrik | Beschreibung | Einheit |
|---|---|---|
| `filesChangedUnexpected` | Dateien außerhalb des definierten Scopes | Anzahl |
| `extraLinesAdded` | Zeilen über `MAX_ISSUE_LOC` hinaus | Anzahl |
| `extraModulesAffected` | Module außerhalb des geplanten Scopes | Anzahl |
| `scopeCreepScore` | Gewichteter Score (0–100) | Zahl |

**Bewertung:**

```typescript
function calculateScopeCreep(planned: string[], actual: string[]): number {
  const unexpected = actual.filter(f => !planned.some(p => f.startsWith(p)));
  return Math.min(100, (unexpected.length / actual.length) * 100);
}
```

### Tool-Calls

Anzahl und Typ der Werkzeugaufrufe während einer Session.

| Metrik | Beschreibung | Einheit |
|---|---|---|
| `totalToolCalls` | Alle Tool-Aufrufe | Anzahl |
| `readToolCalls` | Lese-Werkzeuge (read, grep, glob) | Anzahl |
| `writeToolCalls` | Schreib-Werkzeuge (write, edit) | Anzahl |
| `execToolCalls` | Ausführungs-Werkzeuge (bash) | Anzahl |
| `networkToolCalls` | Netzwerk-Werkzeuge (webfetch) | Anzahl |
| `failedToolCalls` | Fehlgeschlagene Aufrufe | Anzahl |
| `toolCallSuccessRate` | `1 - failed/total` | Prozent |

## Beispiel-Metriken-Report

```markdown
## Agent Metrics Report — Run #42

### Metadaten
- **Agent:** Issue Orchestrator
- **Modell:** deepseek-v4-flash
- **Session-Dauer:** 3h 42m
- **Phase:** IMPLEMENT → TEST

### Token-Nutzung
| Metrik | Wert |
|---|---|
| Prompt Tokens | 24,500 |
| Completion Tokens | 8,200 |
| Total Tokens | 32,700 |
| Geschätzt | 35,000 |
| Budget-Einhaltung | 93% |

### Kosten
| Metrik | Wert |
|---|---|
| Input Cost | $0.012 |
| Output Cost | $0.016 |
| **Total Cost** | **$0.028** |

### Qualität
| Metrik | Wert |
|---|---|
| Halluzinationen | 1 (von 47 Claims = 2.1%) |
| Verification Failures | 0 |
| Scope Creep Score | 5/100 (niedrig) |

### Tool-Nutzung
| Tool-Typ | Anzahl | Erfolgsrate |
|---|---|---|
| read | 24 | 100% |
| grep | 12 | 100% |
| glob | 5 | 100% |
| edit | 8 | 100% |
| write | 3 | 100% |
| bash | 6 | 83% (1 failed) |
| webfetch | 2 | 100% |
| **Total** | **60** | **98%** |

### Fazit
- **Budget:** Innerhalb der Schätzung
- **Qualität:** Niedrige Halluzinationsrate
- **Scope:** Kein signifikanter Scope Creep
- **Tools:** Hohe Erfolgsrate, ein transienter Bash-Fehler
```

## Integration in Run-Event-System

Metriken werden als `RunEvent` mit Level `INFO` im Run-Log persistiert:

```typescript
// interfaces.ts (Auszug)
export interface SafeLlmRunMetadata {
  provider?: string;
  model?: string;
  promptHash?: string;
  userPromptHash?: string;
  promptTokens?: number;
  completionTokens?: number;
  temperature?: number;
  agentRole?: string;
  timestamp?: string;
}
```

Events werden in SQLite gespeichert und sind über die REST-API abrufbar:

```
GET /api/runs/:id/events?level=INFO&kind=metrics
```

Die Metriken fließen in den [Evidence Log](../agent/EVIDENCE_LOG_TEMPLATE.md) ein
und werden im Frontend-Dashboard visualisiert.

## Verwandte Dokumente

- [Context Engineering](context-engineering.md) — Token-Budget pro Context-Tier
- [Verification Contract](verification-contract.md) — Qualitätssicherung
- [Fehlerbehandlung](fehlerbehandlung.md) — Fehlerraten und Retry-Zähler
- [Quality Gates](../workflows/qualitaetspruefung.md) — Gate-Checks
- [Evidence Log Template](../agent/EVIDENCE_LOG_TEMPLATE.md)
