# Quality-Gate-Matrix

Datum: 2026-06-09
Status: Draft
Diataxis: Reference

## Überblick

Quality Gates sind Prüfpunkte im Positron-Workflow, die vor jedem Phasenübergang
verifizieren, ob alle Voraussetzungen erfüllt sind. Sie verhindern fehlerhafte
Zustandsübergänge und stellen sicher, dass keine Phase ohne die erforderlichen
Artefakte verlassen wird.

## Quality-Gate-Konzept

Jeder Quality Gate ist ein **automatisierter Check**, der beim Übergang von einer
Phase zur nächsten ausgeführt wird. Gates können:

- **Blocking:** Der Übergang wird verhindert, bis der Check bestanden ist
- **Warning:** Der Übergang ist möglich, aber eine Warnung wird protokolliert

Ein Gate schlägt fehl, wenn die erforderlichen Artefakte fehlen, Tests nicht
bestanden sind oder Sicherheitsrichtlinien verletzt werden.

## Gate-Matrix

Die Tabelle zeigt alle validierten Phasenübergänge, die erforderlichen Checks
und ob ein Gate blockierend wirkt.

| Von | Nach | Checks | Blockierend? |
|---|---|---|---|
| `QUEUED` | `CLAIMED` | Issue-Kontext geladen? (Issue-Body, Labels, Repo-Info) | Ja |
| `CLAIMED` | `REPO_SYNC` | Branch-Name generiert? Workspace-Pfad validiert? | Ja |
| `REPO_SYNC` | `ISSUE_CONTEXT` | Git-Workspace bereit? Branch existiert auf Remote? | Ja |
| `ISSUE_CONTEXT` | `WEB_RESEARCH` | Issue-Kontext vollständig geladen? (Body, Comments, Labels) | Ja |
| `WEB_RESEARCH` | `SPECIFY` | Recherche-Ergebnisse dokumentiert? Quellen verlinkt? | Warn |
| `SPECIFY` | `PLAN` | `spec.md` existiert und ist valide? | Ja |
| `PLAN` | `TASKS` | `plan.md` existiert? Plan ist mit Spec konsistent? | Ja |
| `TASKS` | `ANALYZE` | `tasks.md` existiert? Tasks sind machbar und testbar? | Ja |
| `ANALYZE` | `REVIEW` | Analyse abgeschlossen? Risiken identifiziert? | Warn |
| `REVIEW` | `IMPLEMENT` | `spec.md` + `plan.md` + `tasks.md` existieren? | Ja |
| `IMPLEMENT` | `TEST` | Diff-Größe ≤ `MAX_DIFF_SIZE` (400 Zeilen)? | Warn |
| `TEST` | `VERIFY` | Tests bestanden? Keine neuen Failures? | Ja |
| `VERIFY` | `COMMIT` | Diff zusammengefasst? Commit-Message valide? | Ja |
| `COMMIT` | `PR_CREATE` | Testreport existiert? Evidence dokumentiert? | Ja |
| `PR_CREATE` | `MERGE` | PR erstellt? CI-Checks grün? Security-Gates passiert? | Ja |
| `MERGE` | `DONE` | Merge erfolgreich? Branch gelöscht? | Ja |

### Fehler-Transitionen

| Von | Nach | Checks | Blockierend? |
|---|---|---|---|
| Jede Phase | `FAILED_TRANSIENT` | Fehler ist transient (retry-fähig)? | Ja |
| Jede Phase | `FAILED_BLOCKED` | Menschliches Eingreifen erforderlich? | Ja |
| Jede Phase | `FAILED_UNSAFE` | Sicherheitsverletzung erkannt? | Ja |
| `FAILED_TRANSIENT` | ← Ursprungsphase | Max Fix Loops (`MAX_FIX_LOOPS` = 3) nicht überschritten? | Ja |
| `FAILED_BLOCKED` | `RESUME_PENDING` | Nutzer hat Freigabe erteilt? | Ja |

## Blocking vs. Warning Gates

### Blocking Gates

Ein **Blocking Gate** verhindert den Phasenübergang vollständig. Der Run bleibt in
der aktuellen Phase, bis der Check bestanden ist.

**Beispiele:**
- `REVIEW → IMPLEMENT`: Ohne spec, plan und tasks darf kein Code geschrieben werden
- `TEST → VERIFY`: Ohne bestandene Tests darf kein Commit erstellt werden
- `COMMIT → PR_CREATE`: Ohne Evidence-Dokumentation darf kein PR erstellt werden

**Verhalten bei Block:**
1. Gate-Fehler wird als `RunEvent` mit Level `GATE` protokolliert
2. Run bleibt in aktueller Phase
3. Automatischer Retry (bei transienten Fehlern)
4. Nach `MAX_FIX_LOOPS` → Wechsel zu `FAILED_BLOCKED`

### Warning Gates

Ein **Warning Gate** erlaubt den Phasenübergang, protokolliert aber eine Warnung.
Diese Gates sind für nicht-kritische, aber empfohlene Prüfungen.

**Beispiele:**
- `IMPLEMENT → TEST`: Große Diffs werden toleriert, aber signalisiert
- `WEB_RESEARCH → SPECIFY`: Fehlende Quellen sind ein Qualitätshinweis

**Verhalten bei Warn:**
1. Warnung wird als `RunEvent` mit Level `WARN` protokolliert
2. Übergang wird trotzdem ausgeführt
3. Warnung erscheint im Frontend und im Evidence Report

## Implementierung

Die Quality-Gate-Prüfung ist im `run-state` Package implementiert:

```typescript
// packages/run-state/src/gate-checker.ts (Beispiel-Struktur)
export interface GateCheck {
  from: Phase;
  to: Phase;
  check: () => Promise<GateResult>;
  blocking: boolean;
}

export interface GateResult {
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}
```

## Verwandte Dokumente

- [Fehlerbehandlung](../reference/fehlerbehandlung.md) — Error-Escalation bei Gate-Fehlern
- [Verification Contract](../reference/verification-contract.md) — Formale Spezifikationsprüfung
- [Orchestrierung](orchestrierung.md) — Vollständiger Issue-to-Merge-Workflow
- [Vibe Coding](../reference/vibe-coding.md) — Issue-Größenbeschränkung
