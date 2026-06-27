# Next Build Prompt — Issue #215: Merge GATE_APPROVE via PR #218

> Generated: 2026-06-27T21:40:00+02:00
> For: Issue Orchestrator — next Positron run
> Recommended Build: #215 (PR #218)

---

## Copyable Prompt (für nächsten Positron-Run)

```
# POSITRON NEXT RUN — Issue #215: GATE_APPROVE via PR #218

Du bist die bauende KI im Repository xxammaxx/Positron.

## Kontext

Issue #308 Readiness Audit hat ergeben: #308 ist BLOCKED. Alle vier Blocker sind offen. Der schnellste Weg, die Blockade zu lösen, ist #215 (GATE_APPROVE).

## Stand

- Branch: `main` (HEAD 35c4225)
- PR #218: OPEN, `positron/issue-215-gate-approve-stop-ask`, 12 Tage alt
- PR #218 hat 7 Dateien, 1847 Zeilen, 97 Tests (alle grün)
- CodeRabbit: 9 nicht-blockierende Kommentare
- review-agent: PASS (0 blockierende Findings)
- PR #218 wurde nie von einem Menschen reviewed

## Freigabe

Der Owner hat für #308 einen READINESS AUDIT freigegeben. Diese Teilaufgabe #215 muss vom Owner explizit für Merge freigegeben werden.

## Aufgaben

### 1. Reality Refresh
- `git fetch --all --prune`
- `gh issue view 215` und `gh pr view 218` lesen
- PR #218 Branch auschecken: `git checkout positron/issue-215-gate-approve-stop-ask`
- `git merge main` testen (DRY-RUN: `git merge --no-commit --no-ff main` dann `git merge --abort`)

### 2. CodeRabbit-Kommentare prüfen
- 9 Kommentare von CodeRabbit auf PR #218 lesen
- Bewerten, ob sie blocking sind (alle waren non-blocking)
- Wenn nicht-blocking: dokumentieren, dass sie post-merge adressiert werden können
- Wenn blocking: beheben oder dokumentieren

### 3. Lokale Gates auf Branch ausführen
```bash
git diff --check
npm run build
npm run typecheck
npm test
```
- Alle 97 neuen Tests müssen passen
- Keine neuen Failures einführen

### 4. PR #218 finalisieren
- Rebase auf main, falls nötig
- PR-Status prüfen (nicht draft, mergeable)
- Auf GitHub: CodeRabbit-Kommentare als "resolved" markieren (wenn non-blocking)

### 5. Evidence erstellen
```text
docs/evidence/issue-215/pr-218-merge-readiness.md
```
- Merge-Test-Ergebnis
- Lokale Gates
- CodeRabbit-Status
- Merge-Empfehlung

### 6. PR #218 Status kommentieren
- Issue #215: Merge-Readiness-Status posten
- Issue #308: Update, dass #215 bereit ist oder was fehlt

### ERLAUBT
- PR #218 Branch auschecken und lokal testen
- Lokale Gates ausführen
- Evidence erstellen
- GitHub-Kommentare posten
- CodeRabbit resolved markieren (wenn non-blocking)

### VERBOTEN
- PR #218 mergen (OHNE EXPLIZITE OWNER-FREIGABE)
- PR #218 Code ändern (nur rebase/main-merge erlaubt)
- Force-Push auf positron/issue-215-gate-approve-stop-ask
- Real Mode ausführen
- Manuelle CI triggern
- Workflow-Dateien ändern
- Auto-Merge aktivieren
- CodeRabbit reaktivieren

### Ziel dieses Runs
PR #218 merge-ready machen. Nicht mergen. Owner muss finales Go geben.

### Ergebnisformat
- Merge-Test: PASS / CONFLICT / UNKNOWN
- Lokale Gates: GREEN / YELLOW / RED
- CodeRabbit-Status: RESOLVED / NEEDS_FIX / NON_BLOCKING
- Merge-Empfehlung: READY / NEEDS_REVIEW / BLOCKED
```

---

## Owner Notes

Dieser Prompt ist als nächster ausführbarer Positron-Run gedacht.

**Was der Owner explizit freigeben muss:**
1. PR #218 reviewen (human approval)
2. PR #218 mergen (merge button drücken oder `@issue-orchestrator merge PR 218`)

Der Prompt selbst tut nur:
- Branch auschecken und testen
- Mergeability prüfen
- Lokale Gates laufen lassen
- Evidence schreiben
- Status kommentieren

**KEIN Merge. KEIN Real Mode. KEIN Auto-Merge.**

---

## Alternativer Prompt — wenn PR #218 nicht mergeable ist

Falls PR #218 Konflikte hat, die nicht trivial lösbar sind:

```
# POSITRON NEXT RUN — Issue #215: GATE_APPROVE (Neuimplementierung)

Implementiere GATE_APPROVE runtime hook auf main (HEAD 35c4225):

1. `packages/sandbox/src/stop-ask-policy.ts` von PR #218 Branch kopieren
2. `packages/sandbox/src/gate-approve.ts` von PR #218 Branch kopieren
3. Tests kopieren (2 Testdateien, 97 Tests)
4. Sandbox index.ts exports aktualisieren
5. An aktuellen main anpassen
6. Lokale Gates: build, typecheck, test (alle 97+1605 Tests müssen passen)
7. Evidence: docs/evidence/issue-215/
8. Neuen PR erstellen (DRAFT)
```

---

## Alternativer Prompt — wenn #248 parallel gebaut werden soll

```
# POSITRON NEXT RUN — Issue #248: LivingEvidencePortfolio UI

SAFE: GREEN_SAFE, approval:not-required, reines Frontend

1. UI-Komponente für LivingEvidencePortfolio bauen
2. API-Endpoint für Portfolio-Daten (read-only)
3. In Operator Dashboard integrieren
4. Tests: Unit + Integration (kein E2E)
5. Keine Pipeline-Änderungen
6. Kein Real Mode
7. Evidence: docs/evidence/issue-248/
```
