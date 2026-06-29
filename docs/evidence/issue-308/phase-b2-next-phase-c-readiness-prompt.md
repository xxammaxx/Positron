# Issue #308 Phase B2 — Next Prompt: Phase C Readiness Recheck

**Generated:** 2026-06-29T09:22:00+02:00
**Mode:** FINAL — Prompt Generation for Next Phase
**Decision:** `PASSED_FAKE_GATE_ASSEMBLY` → `PHASE_C_READINESS_RECHECK_ONLY`

---

## Next Phase Allowed

```text
NEXT_ALLOWED_PHASE: PHASE_C_READINESS_RECHECK_ONLY
```

## Copyable Prompt

```
# POSITRON NEXT RUN — Issue #308 Phase C Readiness Recheck Only

Du bist die prüfende KI im Repository:

```
xxammaxx/Positron
https://github.com/xxammaxx/Positron
```

## Ausgangslage

Issue #308 Phase B: PASSED_FAKE_GATE_ASSEMBLY
PR #318 merged to main (9461fa1)

- 43 gate assembly tests exist and pass on main
- Full test suite: 1836/1836 PASS
- Lokale Gates: GREEN
- Real Mode: BLOCKED_BY_DEFAULT (verified)
- Fake Gate Assembly: validated (all safety layers work together)
- Evidence: docs/evidence/issue-308/phase-b-* and phase-b2-*

## Ziel dieses Runs

Phase C Readiness Recheck — prüfen, ob kontrollierter Real Mode vorbereitet ist:

1. **onAudit server wiring Status** — Ist der Server-Audit-Sink verdrahtet? Blockiert fehlender Sink korrekt?
2. **pre_run/pre_push wiring Status** — Sind diese GateTypes in der Pipeline-Routing-Logik verdrahtet? Wo greifen sie?
3. **MERGE→DONE raw transition** — Ist der direkte Übergang dokumentiert? Wird er getestet? Blockiert er bei fehlenden Gates?
4. **Real-mode kill switches** — Sind alle Kill-Switches aktiv? Blockieren sie zuverlässig?
5. **External tool sandbox Status** — Welche Sandbox-Mechanismen existieren? Sind sie für Controlled Real Mode ausreichend?
6. **Exact Owner approval text** — Welcher Owner-Freigabetext wird für den späteren Controlled Real Run benötigt?
7. **Rollback plan** — Existiert ein dokumentierter Rollback-Plan für den Controlled Real Run?
8. **Workspace cleanup under failure** — Was passiert nach einem Fehlschlag? Wird der Workspace sicher bereinigt?
9. **Audit persistence** — Wo landen Audit-Logs? Sind sie für den Controlled Real Run ausreichend?

## Explizite Owner-Freigabe (VORAUSSETZUNG)

```
APPROVE ISSUE 308 PHASE C READINESS RECHECK ONLY
```

## Verboten

- Kein Full Real Mode
- Keine Real-Mode-Env setzen (HUMAN_APPROVED_REAL, POSITRON_ENABLE_REAL)
- Keine echten externen Tools real ausführen
- Keine echten GitHub-Schreibaktionen durch Pipeline
- Kein echter PR durch Pipeline
- Kein Merge (kein Produktions-Repo)
- Keine Phase-C-Implementierung (nur Readiness-Check)
- Keine Controlled-Real-Ausführung
- Keine Workflow-Änderungen
- Keine manuelle CI
- Kein CodeRabbit
- Keine Secrets
- Keine `.env`-Inhalte
- Kein `--yolo`
- Kein Approval-Bypass

## Aufgaben

### A1: onAudit Server Wiring Audit
- Prüfe `packages/tool-gateway/src/gateway.ts` auf `onAudit`-Callback-Interface
- Prüfe `apps/server/` auf Audit-Endpunkte
- Klassifiziere: WIRED | PARTIAL | NOT_WIRED

### A2: pre_run/pre_push GateType Wiring Audit
- Prüfe `packages/run-state/src/gate-evaluator.ts` auf GateType-Registrierung
- Prüfe `PHASE_GATE_REQUIREMENTS` auf pre_run/pre_push-Einträge
- Klassifiziere: WIRED | PARTIAL | NOT_WIRED

### A3: MERGE→DONE Raw Transition Audit
- Prüfe `packages/run-state/src/state-machine.ts` auf VALID_TRANSITIONS
- Prüfe Gate-Bedarf für MERGE→DONE
- Klassifiziere: GATED | RAW | NOT_ROUTED

### A4: Kill-Switch Verification
- Prüfe alle Kill-Switches auf Aktivität
- POSITRON_MERGE_KILL_SWITCH, POSITRON_ENABLE_PUSH, etc.
- Klassifiziere: ALL_ACTIVE | PARTIAL | MISSING

### A5: External Tool Sandbox Status
- Prüfe `packages/sandbox/` auf Isolation-Mechanismen
- Prüfe Worktree-Isolation
- Klassifiziere: ADEQUATE | PARTIAL | NOT_ADEQUATE

### A6: Owner Approval Text Draft
- Erstelle den exakten Freigabetext für den späteren Controlled Real Run
- Format: `APPROVE ISSUE 308 CONTROLLED REAL PROBE WITH [Bedingungen]`

### A7: Rollback Plan
- Dokumentiere Rollback-Schritte
- Was wird gesichert? Wie wird zurückgerollt?

### A8: Workspace Cleanup under Failure
- Prüfe Cleanup-Handler auf Fehlerresistenz
- Was passiert bei Abbruch?

### A9: Audit Persistence Check
- Prüfe Log-Ziele
- Sind sie ausreichend für Controlled Real Run?

## Ergebnisformat

Am Ende exakt klassifizieren:

```
ISSUE_308_PHASE_C_READINESS: READY_FOR_CONTROLLED_REAL_PROBE_WITH_OWNER_APPROVAL
```
oder:
```
ISSUE_308_PHASE_C_READINESS: BLOCKED_BY_<reason>
```

## Ergebnis

Phase C Readiness Recheck ergibt maximal:
- `READY_FOR_CONTROLLED_REAL_PROBE_WITH_OWNER_APPROVAL`
- oder `BLOCKED_BY_<reason>`

Kein Controlled Real Run in dieser Phase. Kein Merge. Kein Produktions-Repo.
```

---

## Next Prompt Location

This prompt has been saved to: `docs/evidence/issue-308/phase-b2-next-phase-c-readiness-prompt.md`

It is ready for the next session to consume.
