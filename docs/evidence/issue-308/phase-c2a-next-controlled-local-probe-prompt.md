# Phase C2a — Next Controlled Local Temp Workspace Probe Prompt

**Generated:** 2026-06-29T10:50:00Z (approximated)
**For:** Issue #308 Phase C2
**Decision Refined:** `READY_FOR_CONTROLLED_LOCAL_TEMP_WORKSPACE_PROBE_WITH_OWNER_APPROVAL`

---

## Copyable Prompt

```text
# POSITRON NEXT RUN — Issue #308 Phase C2: Controlled Local Temp Workspace Probe Only

Du bist die ausführende KI im Repository:

```
xxammaxx/Positron
https://github.com/xxammaxx/Positron
```

## Ausgangslage

- Issue #308 Phase B: PASSED_FAKE_GATE_ASSEMBLY
- Issue #308 Phase C: READINESS_RECHECK_COMPLETE
- Issue #308 Phase C2a: PR #319 MERGED to main (a9ef7c5)
- Local gates: GREEN (1836/1836)
- Evidence: docs/evidence/issue-308/phase-c-* and phase-c2a-*
- Phase C decision refined: READY_FOR_CONTROLLED_LOCAL_TEMP_WORKSPACE_PROBE_WITH_OWNER_APPROVAL

## Freigabe (VORAUSSETZUNG)

Der Owner muss diesen Prompt ausdrücklich freigeben:

```
APPROVE ISSUE 308 CONTROLLED LOCAL TEMP WORKSPACE PROBE ONLY
```

OHNE diese exakte Freigabe darf der Probe NICHT starten.

## Ziel dieses Runs

Führe einen MINIMALEN Controlled Probe durch, der AUSSCHLIESSLICH Option A verwendet:

```
Option A: Local Temp Workspace Only
```

### Erlaubte Operationen

1. POSITRON_WORKSPACE_ROOT auf TEMPORÄRES Verzeichnis setzen
   (z.B. `.positron/temp-probe-<timestamp>` oder `$env:TEMP/positron-probe-<timestamp>`)
2. RealGitWorkspaceAdapter initialisieren (durch POSITRON_WORKSPACE_ROOT aktiviert)
3. Workspace per PrepareWorkspace erzeugen (git init in temp dir — KEIN git clone von GitHub)
4. Test-Commit in temp workspace (kein Push)
5. Workspace cleanup (destroyWorkspace) ausführen
6. Temp-Verzeichnis manuell löschen und verifizieren
7. Ergebnisse als Evidence dokumentieren
8. Lokale Gates erneut ausführen
9. Evidenz-Commit auf main erstellen und pushen
10. Completion-Kommentar auf Issue #308 posten

### HARTE GRENZEN — Absolut Verboten

- KEIN Full Real Mode
- KEIN Supervised Real Run
- KEINE Real-Mode-Env setzen (außer POSITRON_WORKSPACE_ROOT für temp)
- KEINE echten externen Tools ausführen (außer lokalem git init/commit in temp dir)
- KEINE echten GitHub-Schreibaktionen (kein gh pr create, kein gh merge)
- KEINE produktive Repo-Nutzung
- KEIN Push (POSITRON_ENABLE_PUSH bleibt default/false)
- KEIN PR erstellen (NICHT gh pr create)
- KEIN Merge (KILL_SWITCH bleibt aktiv)
- KEIN git clone von GitHub (netzwerkpflichtiger Schritt vermeidbar — git init reicht)
- KEINE Speckit-Real-Ausführung (bleibt fake)
- KEINE OpenCode-Real-Ausführung (bleibt fake)
- KEINE Workflow-Änderungen
- KEINE manuelle CI
- KEIN CodeRabbit
- KEINE Secrets lesen/exponieren
- KEINE `.env`-Inhalte lesen
- KEIN Force Push
- KEIN --yolo
- KEIN Approval-Bypass
- KEIN Gate-Bypass
- KEIN Audit-Bypass
- KEIN Cleanup-Bypass

## Prüfungen VOR Probe-Start (Zwingend)

1. `$env:POSITRON_ENABLE_PUSH` → muss LEER sein (nicht 'true')
2. `$env:POSITRON_ENABLE_MERGE` → muss LEER sein (nicht 'true')
3. `$env:POSITRON_MERGE_KILL_SWITCH` → muss LEER oder != 'false' sein
4. `$env:POSITRON_SPECKIT_MODE` → muss LEER oder 'fake' sein
5. `$env:POSITRON_OPENCODE_MODE` → muss LEER oder 'fake' sein
6. `$env:POSITRON_WORKSPACE_ROOT` → muss auf TEMPORÄRES Verzeichnis zeigen
7. `git status --porcelain` → dokumentieren (pre-existing dist modifications OK)
8. Lokale Gates: `git diff --check; npm run build; npm run typecheck; npm test` → GREEN
9. Owner-Freigabe-Text exakt prüfen: muss lauten `APPROVE ISSUE 308 CONTROLLED LOCAL TEMP WORKSPACE PROBE ONLY`

## Probe-Ausführung (Schritt für Schritt)

1. Temp-Verzeichnis erstellen:
   ```
   $env:POSITRON_WORKSPACE_ROOT = ".positron\temp-probe-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
   New-Item -ItemType Directory -Path $env:POSITRON_WORKSPACE_ROOT -Force
   ```

2. Adapter initialisieren:
   - RealGitWorkspaceAdapter (durch POSITRON_WORKSPACE_ROOT aktiviert)
   - Speckit = Fake (default)
   - OpenCode = Fake (default)

3. Workspace erzeugen:
   - `git init` im temp-Verzeichnis
   - Test-Datei anlegen (z.B. README.md mit Timestamp)
   - `git add .` und `git commit -m "test: controlled local temp workspace probe"`
   - DOKUMENTIEREN: Workspace-Pfad, Commit-SHA, Dateien

4. Cleanup ausführen:
   - destroyWorkspace() aufrufen
   - Verzeichnis manuell mit `Remove-Item -Recurse -Force` löschen
   - Verifizieren dass Verzeichnis nicht mehr existiert
   - DOKUMENTIEREN: Cleanup-Ergebnis

5. Audit-Log erfassen:
   - File-basierte Evidence (kein ToolGateway, kein onAudit)
   - Alle Schritte als Markdown-Dateien dokumentieren
   - Keine Secrets, keine `.env`-Inhalte

## Ergebnisformat

Am Ende klassifizieren:

```
ISSUE_308_PHASE_C2_DECISION: CONTROLLED_LOCAL_TEMP_PROBE_PASSED | CONTROLLED_LOCAL_TEMP_PROBE_FAILED | BLOCKED_BY_<reason>
```

Erlaubte Ergebnis-Klassifikationen:
- `CONTROLLED_LOCAL_TEMP_PROBE_PASSED` — alle Schritte erfolgreich
- `CONTROLLED_LOCAL_TEMP_PROBE_FAILED` — Fehler während der Ausführung
- `BLOCKED_BY_<reason>` — Sicherheits-Check fehlgeschlagen, Probe nicht gestartet
  - `BLOCKED_BY_ENV` — Kill-Switch-Env nicht sauber
  - `BLOCKED_BY_GATES` — Lokale Gates nicht GREEN
  - `BLOCKED_BY_WORKSPACE` — Temp-Verzeichnis nicht erstellbar
  - `BLOCKED_BY_OWNER` — Owner-Freigabe fehlt oder inkorrekt
  - `BLOCKED_BY_CLEANUP` — Cleanup nach Fehler nicht möglich

## WICHTIG: Was dieser Run NICHT tut

- Dieser Run validiert NUR lokale temp workspace Operationen
- Er validiert NICHT Full Real Mode
- Er validiert NICHT GitHub Writes
- Er validiert NICHT Production Repo Nutzung
- Er validiert NICHT Netzwerk-basierte Operationen
- Er setzt KEINE dauerhaften Real-Mode-Env-Variablen

## Nach dem Probe

1. Alle Evidence-Dateien erstellen (docs/evidence/issue-308/phase-c2-*)
2. Auf main committen und pushen (KEIN Force Push)
3. Completion-Kommentar auf Issue #308 posten
4. Issue #308 bleibt OPEN
5. Nächsten Prompt für Owner erstellen: "Was soll als nächstes validiert werden?"
```

---

## Boundary Enforcement

This prompt explicitly enforces:

| Boundary | Enforcement |
|----------|-------------|
| No Full Real Mode | Phase C2 verdict must be one of `CONTROLLED_LOCAL_TEMP_PROBE_*` or `BLOCKED_BY_*` |
| No GitHub writes | Push/PR/Merge all blocked; `POSITRON_ENABLE_PUSH` must be empty |
| No production repo | Workspace limited to temp directory only |
| No network-dependent operations | `git init` instead of `git clone` |
| Owner approval gated | Exact phrase match required before probe |
| Audit via file log | No ToolGateway dependency |
| Cleanup mandatory | Verify temp dir deleted after probe |
| Workspace bounded | All file system writes within temp directory only |

---

## Classification

```
PHASE_C2A_NEXT_PROMPT_STATUS: READY_FOR_OWNER_APPROVAL
```

**Note**: This prompt must NOT be executed by this run. It is provided for the Owner to review and approve for the next Phase C2 run.
