# Issue #308 Phase C — Next Prompt

**Generated:** 2026-06-29T10:00:00+02:00
**Mode:** Phase C Readiness Recheck — NO Real Mode
**Decision:** `READY_FOR_CONTROLLED_REAL_PROBE_WITH_OWNER_APPROVAL`

---

## Next Phase Allowed

```text
NEXT_ALLOWED_PHASE: PHASE_C2_CONTROLLED_LOCAL_TEMP_WORKSPACE_PROBE
```

---

## Copyable Prompt

```
# POSITRON NEXT RUN — Issue #308 Phase C2: Controlled Local Temp Workspace Probe

Du bist die ausführende KI im Repository:

```
xxammaxx/Positron
https://github.com/xxammaxx/Positron
```

## Ausgangslage

- Issue #308 Phase B: PASSED_FAKE_GATE_ASSEMBLY
- Issue #308 Phase C: READY_FOR_CONTROLLED_REAL_PROBE_WITH_OWNER_APPROVAL
- PR #318 merged to main (9461fa1)
- Local gates: GREEN (1836/1836)
- Evidence: docs/evidence/issue-308/phase-c-*

## Freigabe (VORAUSSETZUNG)

Der Owner hat diesen Prompt ausdrücklich freigegeben:

```
APPROVE ISSUE 308 CONTROLLED LOCAL TEMP WORKSPACE PROBE ONLY
```

## Ziel dieses Runs

Führe einen minimalen Controlled Real Probe durch, der NUR einen lokalen temporären Workspace verwendet:

### Erlaubt
1. POSITRON_WORKSPACE_ROOT auf TEMP-Verzeichnis setzen (z.B. `.positron/temp-probe-<timestamp>`)
2. RealGitWorkspaceAdapter initialisieren
3. Workspace per PrepareWorkspace erzeugen (git clone/init in temp dir)
4. Test-Commit in temp workspace (kein Push)
5. Workspace cleanup (destroyWorkspace) ausführen
6. Ergebnisse als Evidence dokumentieren
7. Lokale Gates ausführen
8. Evidenz-Commit und Draft PR erstellen
9. Completion-Kommentar auf Issue #308 posten

### Verboten
- Kein Push (POSITRON_ENABLE_PUSH bleibt default/false)
- Kein PR erstellen (NICHT gh pr create)
- Kein Merge (KILL_SWITCH bleibt aktiv)
- Kein Production Repo verwenden
- Keine Real-Speckit-Ausführung (bleibt fake)
- Keine Real-OpenCode-Ausführung (bleibt fake)
- Keine GitHub-Schreibaktionen durch Pipeline
- Keine Workflow-Änderungen
- Keine manuelle CI
- Kein CodeRabbit
- Keine Secrets lesen
- Keine `.env`-Inhalte
- Kein Force Push
- Kein --yolo

## Prüfungen vor Probe-Start

1. `$env:POSITRON_ENABLE_PUSH` → muss LEER sein (nicht 'true')
2. `$env:POSITRON_ENABLE_MERGE` → muss LEER sein (nicht 'true')
3. `$env:POSITRON_MERGE_KILL_SWITCH` → muss LEER oder != 'false' sein
4. `$env:POSITRON_WORKSPACE_ROOT` → muss auf TEMP-Verzeichnis zeigen
5. `git status --porcelain` → dokumentieren (pre-existing OK)
6. Lokale Gates: `git diff --check; npm run build; npm test` → GREEN

## Probe-Ausführung

1. Temp dir: `$env:POSITRON_WORKSPACE_ROOT = ".positron\temp-probe-$(Get-Date -Format 'yyyyMMdd-HHmmss')"`
2. Adapter: RealGitWorkspaceAdapter (durch POSITRON_WORKSPACE_ROOT aktiviert)
3. Workspace erzeugen → Dokumentieren
4. Cleanup ausführen → Dokumentieren
5. Temp dir löschen → Dokumentieren

## Ergebnisformat

Am Ende klassifizieren:

```
ISSUE_308_PHASE_C2_DECISION: CONTROLLED_PROBE_PASSED | CONTROLLED_PROBE_FAILED | CONTROLLED_PROBE_BLOCKED
```

## Wichtig

- Issue #308 bleibt OPEN
- Kein Merge
- Kein Full Real Mode
- Der Probe validiert NUR lokale temp workspace operation
```

---

## Next Prompt Location

This prompt has been saved to: `docs/evidence/issue-308/phase-c-next-prompt.md`
