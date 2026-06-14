---
title: Agentenmetriken — Referenz (US-9)
date: 2026-06-14
author: Positron Team
status: draft
---

# Agentenmetriken — Referenz

Diese Dokumentation beschreibt das Metrik-System für Positron-Agenten.
Es erfasst Token-Verbrauch, Kosten, Halluzinationen und Scope-Creep-Ereignisse
pro Agenten-Aufruf und aggregiert sie über komplette Runs.

## Typen-Übersicht

### `AgentMetrics`

Metriken für einen **einzelnen Agenten-Aufruf**.

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `agentId` | `string` | Name/ID des Agenten |
| `tokens` | `number` | Verbrauchte Tokens (Input + Output des LLM-Aufrufs) |
| `cost` | `number` | Geschätzte Kosten in USD |
| `hallucinatedRefs` | `number` | Anzahl halluzinierter Referenzen |
| `scopeCreepEvents` | `number` | Anzahl Scope-Creep-Ereignisse |
| `toolCalls` | `number` | Anzahl Tool-Aufrufe |
| `durationMs` | `number` | Dauer des Agenten-Aufrufs in Millisekunden |

### `RunMetrics`

Aggregierte Metriken für einen **kompletten Run**.

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `runId` | `string` | Eindeutige Run-ID |
| `agentMetrics` | `AgentMetrics[]` | Array aller Einzelmetriken |
| `totalTokens` | `number` | Summe aller Tokens |
| `totalCost` | `number` | Summe aller Kosten in USD |
| `totalHallucinatedRefs` | `number` | Summe aller halluzinierten Referenzen |
| `totalScopeCreepEvents` | `number` | Summe aller Scope-Creep-Ereignisse |
| `totalToolCalls` | `number` | Summe aller Tool-Aufrufe |
| `totalDurationMs` | `number` | Summe aller Agenten-Laufzeiten in ms |
| `startedAt` | `string` | ISO 8601 Zeitstempel des Run-Starts |
| `completedAt` | `string` (optional) | ISO 8601 Zeitstempel des Run-Endes |

### `MetricStatus`

```typescript
type MetricStatus = 'pending' | 'running' | 'completed' | 'failed';
```

### `MetricEvent`

Ein Event für Echtzeit-Metrik-Updates (SSE/Dashboard).

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `runId` | `string` | Zugehörige Run-ID |
| `agentId` | `string` | Zugehörige Agenten-ID |
| `timestamp` | `string` | ISO 8601 Zeitstempel |
| `eventType` | `'token_usage' \| 'tool_call' \| 'hallucination' \| 'scope_creep' \| 'completion'` | Art des Ereignisses |
| `payload` | `Record<string, unknown>` | Ereignis-spezifische Daten |

## Factory-Funktionen

### `createEmptyMetrics(agentId: string): AgentMetrics`
Erzeugt ein initiales `AgentMetrics`-Objekt mit allen numerischen Feldern auf `0`.

### `createEmptyRunMetrics(runId: string): RunMetrics`
Erzeugt ein initiales `RunMetrics`-Objekt mit leerem Array und allen Aggregaten auf `0`.

### `addAgentMetrics(run: RunMetrics, agent: AgentMetrics): RunMetrics`
Fügt einen Agenten-Metrik-Eintrag hinzu (immutable). Aggregate werden automatisch neu berechnet.

## Beispiel: Metrik-Report

```
Run: run-205-abc123
Dauer: 12m 34s (754s)
──────────────────────────────────────
Agent               Tokens   Kosten    Tools  Halluz.  Dauer
──────────────────────────────────────
specify-agent        1,500   $0.0075     3       1     45.0s
plan-agent           2,500   $0.0125     5       0     62.0s
implement-agent     12,000   $0.0600    28       3    320.0s
test-agent           3,500   $0.0175     8       0     95.0s
──────────────────────────────────────
Gesamt              19,500   $0.0975    44       4    522.0s
```

## Halluzinationserkennung

1. **Referenz-Prüfung:** Verweist ein Agent auf nicht-existente Dateien
2. **API-Response-Validierung:** 404/not-found auf agent-generierte Referenzen
3. **Plausibilitäts-Check:** Nicht-existente Commit-Hashes, Issue-Nummern, Branch-Namen
4. **Kontext-Konsistenz:** Widersprüchliche Aussagen innerhalb einer Agenten-Antwort

## Scope-Creep-Erkennung

1. Jeder Task hat eine formale Spec mit `scope`-Feld
2. Dateien außerhalb des Scope-Bereichs → `scopeCreepEvents++`
3. Tool-Aufrufe außerhalb der Task-Spezifikation → `scopeCreepEvents++`

## Integration

```
Agent Runtime → MetricsCollector → RunMetricsStore → Dashboard/API/Logging
```

## Referenzen

- `packages/shared/src/metrics-types.ts` — Implementierung
- `packages/run-state/src/metrics-store.ts` — Speicherung (geplant)
- [Context Engineering](context-engineering.md) — Context-Tier-System
