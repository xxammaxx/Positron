# POSITRON NEXT RUN — Issue #322: Wire ToolGateway onAudit into server/worker runtime

## Ausgangslage

Issue #308 Phase C2 hat bestätigt, dass `ToolGateway.onAudit` Callback existiert, aber NICHT in die Server/Worker-Runtime verdrahtet ist. Audit-Events werden generiert, haben aber keinen Runtime-Sink. Dies ist eine Sicherheitslücke für Phase D und Full Real Mode.

Issue #322 wurde als Follow-up zu Issue #308 erstellt und ist der kritischste Blocker vor Phase D.

## Ziel

`ToolGateway.onAudit` server-/worker-seitig verdrahten, sodass auditpflichtige Tools vor Ausführung einen Audit-Sink nutzen und bei Audit-Fehlern fail-closed blockieren.

## Scope

* Issue #322 lesen (`gh issue view 322 --repo xxammaxx/Positron`)
* bestehende #245 Audit Enforcement Implementierung lesen
* ToolGateway-Instantiation in Server/Worker suchen
* onAudit callback verdrahten
* Audit-Sink definieren:
  * bevorzugt lokaler strukturierter File-Sink oder bestehender Evidence/Run-State-Sink
  * keine Remote-Sinks
  * keine Secrets
* fail-closed Verhalten sicherstellen
* lokale Tests hinzufügen
* keine Full Real Mode-Ausführung
* keine GitHub Writes durch Pipeline
* keine Production-Repo-Probe

## Non-Scope

* kein Full Real Mode
* kein Supervised Real Run
* keine GitHub-Schreibaktionen durch Pipeline
* keine Workflow-Änderungen
* keine UI
* kein CodeRabbit
* keine Secrets
* keine `.env`-Inhalte
* keine Phase-D-Probe
* keine MERGE→DONE-Gating-Fixes (#321)
* keine pre_run/pre_push-Entscheidung (#323)
* keine Workspace-Lock-Hardening (#324)
* keine dist artifact cleanup (#325)
* keine CodeRabbit Owner Action (#326)
* keine PR #313-Aktion

## Acceptance Criteria

* `onAudit` wird vor auditpflichtigen Tool-Ausführungen aufgerufen
* Audit-Fail blockiert Tool-Ausführung
* Audit-Eintrag enthält keine Secrets
* Audit-Eintrag enthält Run-/Tool-/Decision-Kontext
* Existing Gate 9 Semantik aus #245 bleibt erhalten
* lokale Gates grün
* Evidence vorhanden
* kein Real Mode ausgeführt

## Required Local Gates

```bash
git diff --check
npm run build
npm run typecheck
npm test
```

## Required Evidence

```text
docs/evidence/issue-322/reality-refresh.md
docs/evidence/issue-322/discovery.md
docs/evidence/issue-322/design-plan.md
docs/evidence/issue-322/implementation-report.md
docs/evidence/issue-322/test-report.md
docs/evidence/issue-322/security-audit.md
docs/evidence/issue-322/scope-audit.md
docs/evidence/issue-322/gates.md
docs/evidence/issue-322/summary.json
docs/evidence/issue-322/report.md
docs/evidence/issue-322/reviewer-report.md
```

## Branch-Regel

```text
positron/issue-322-onaudit-server-wiring
```

## Commit-Regel

```text
feat(issue-322): wire ToolGateway onAudit into server/worker runtime
test(issue-322): add audit sink fail-closed tests
docs(issue-322): add onAudit wiring evidence
```

## Start Gate (vor Implementierung)

1. `git fetch --all --prune`
2. `gh issue view 322 --repo xxammaxx/Positron --comments`
3. Post structured Start Comment auf Issue #322

## End Gate (nach Implementierung)

1. Alle Tests ausgeführt und grün
2. `git diff --stat` reviewed
3. Post structured Completion Comment auf Issue #322

## Referenzen

* Issue #322: https://github.com/xxammaxx/Positron/issues/322
* Issue #308 Phase C3 Decision: `NOT_READY_EXISTING_BLOCKERS`, #322 als kritischer Blocker
* Issue #245: Audit Enforcement (core audit implementiert)
* Phase C2 probe: audit-log.jsonl und probe-result.json validated
* PR #327 (Phase C3 evidence): merged into main

## Speckit Workflow (empfohlen)

1. `/speckit.specify` — formale Spec für onAudit wiring
2. `/speckit.plan` — Implementation Plan
3. `/speckit.tasks` — Task Breakdown
4. `/speckit.taskstoissues` — GitHub Issues (optional, da #322 bereits existiert)
5. `/speckit.implement` — Implementation

## Owner Approval Required

```text
APPROVE ISSUE 322 ONAUDIT SERVER WIRING
```

## Absolut verboten

* kein Full Real Mode
* kein Supervised Real Run
* keine Real-Mode-Env setzen
* keine echten externen Tools ausführen
* keine GitHub-Schreibaktionen durch Pipeline
* keine Production-Repo-Nutzung als Probe
* keine Workflow-Änderungen
* keine manuelle CI
* keine CodeRabbit-Reaktivierung
* kein `@coderabbitai review`
* keine Secrets
* keine `.env`-Inhalte
* kein Auto-Merge
* kein Admin-Merge
* kein Squash-Merge
* kein Rebase-Merge
* kein Force Push
* keine Branch-Löschung
* keine Stashes anwenden/poppen/löschen

## Erfolgskriterium

Wenn #322 abgeschlossen ist, kann:
* Issue #308 Phase D Readiness re-evaluiert werden
* Phase D mit onAudit verdrahtetem Audit-Sink gestartet werden (nach Owner-Freigabe)

---

**Dieser Prompt soll noch NICHT ausgeführt werden. Nur als nächster Build-Prompt bereitliegen.**
