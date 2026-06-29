# Issue #308 Phase B — Next Prompt (Phase C Readiness Recheck)

**Generated:** 2026-06-29T09:00:00+02:00
**Mode:** FAKE/DRY-RUN GATE ASSEMBLY VALIDATION — NO Real Mode
**Decision:** `PASSED_FAKE_GATE_ASSEMBLY`

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

- 43 gate assembly tests exist and pass
- Full test suite: 1836/1836 PASStack
- Lokale Gates: GREEN
- Real Mode: BLOCKED_BY_DEFAULT (verified)
- Fake Gate Assembly: validated (all layers work together)

## Ziel dieses Runs

Phase C Readiness Recheck — prüfen, ob kontrollierter Real Mode sicher ist:

1. onAudit server wiring Status
2. pre_run/pre_push wiring Status
3. MERGE→DONE raw transition Status
4. Real-mode kill-switches aktiv?
5. External tool sandbox Status
6. Exact owner approval text vorhanden?
7. Rollback-Plan vorhanden?
8. No merge, no production repo usage

## Explizite Owner-Freigabe (VORAUSSETZUNG)

```
APPROVE ISSUE 308 PHASE C READINESS RECHECK ONLY
```

## Verboten

- Kein Full Real Mode
- Keine Real-Mode-Env setzen
- Keine echten externen Tools real ausführen
- Keine echten GitHub-Schreibaktionen durch Pipeline
- Kein echter PR durch Pipeline
- Keine Workflow-Änderungen
- Keine manuelle Remote-CI
- Kein Merge
- Kein CodeRabbit
- Keine Secrets
- Keine `.env`-Inhalte
```

---

## Owner Pre-Check

1. ✅ Phase B gate assembly validated
2. ✅ `ISSUE_308_PHASE_B_DECISION: PASSED_FAKE_GATE_ASSEMBLY`
3. ⬜ Owner reviews Phase B Draft PR
4. ⬜ Owner issues `APPROVE ISSUE 308 PHASE C READINESS RECHECK ONLY`
5. ⬜ Owner copies prompt above to new Positron run

## Known Limitations (from Phase 2/2b)

| Limitation | Blocks Phase C? | Block Phase D? |
|------------|----------------|----------------|
| `onAudit` not wired in server | NEEDS ASSESSMENT | YES |
| `pre_run`/`pre_push` not wired | NEEDS ASSESSMENT | YES |
| MERGE→DONE raw transition | NEEDS ASSESSMENT | YES |
| Working tree dist artifacts | NO | NO |

---

## Recommendation

**NO FULL REAL MODE.** Proceed only with Phase C Readiness Recheck (read-only audit). Phase C readiness must be explicitly confirmed before any controlled Real Mode probe.
