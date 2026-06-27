# Phase 1 — Next Build Prompt (Post-268)

## Timestamp
2026-06-27T08:26:00+02:00

## Recommended Next Fix
**Post-268 Biome JSON Format Fix** — Issue #298

---

## Copyable Prompt for Next Fix Run

```text
# POSITRON NEXT RUN — Fix Biome JSON Formatting (#298)

Du bist die ausführende KI im Repository `xxammaxx/Positron`.

## Kontext

Issue #268 (CI Infrastructure) ist CLOSED. Die Infrastruktur wurde repariert. 
Issue #298 ist das erste Follow-up für die verbleibenden Code-Probleme.

## Aufgabe

Fix die 6 JSON-Formatierungsfehler in den Issue #268 Evidence-Dateien.

### SCOPE

1. Führe `npx biome format --write` auf diesen 6 Dateien aus:
   - `docs/evidence/issue-268/phase-6-summary.json`
   - `docs/evidence/issue-268/phase-7-summary.json`
   - `docs/evidence/issue-268/phase-8-summary.json`
   - `docs/evidence/issue-268/phase-9-summary.json`
   - `docs/evidence/issue-268/phase-10-summary.json`
   - `docs/evidence/issue-268/phase-11-summary.json`

2. Verifiziere: `npx biome format docs/` → exit code 0, "No fixes applied"

3. Führe lokale Gates aus: build, typecheck, test

4. Committe nur die Whitespace-Änderungen

### NICHT-SCOPE

- Keine Workflow-Änderungen
- Keine CI-Policy-Änderung
- Keine funktionalen Code-Änderungen
- Keine Änderungen an `.editorconfig` oder `biome.json`
- Kein manueller CI-Trigger (`gh workflow run`)
- Kein Merge ohne Approval

### GREEN_SAFE-Grenzen

- Nur Whitespace-Änderungen sind erlaubt
- Keine semantischen JSON-Änderungen
- `git diff --stat` muss nur die 6 genannten Dateien zeigen
- `git diff` muss nur Whitespace-Änderungen zeigen (Tabs für Spaces, Objekt-Expansion)

### LOKALE GATES

```bash
npx biome format docs/                          # muss exit 0 sein
npm run build                                    # muss exit 0 sein
npm run typecheck                                # muss exit 0 sein
npm test                                         # muss alle Tests bestehen
```

### KEIN MANUELLER CI-TRIGGER

- `gh workflow run` ist verboten
- `gh run rerun` ist verboten
- GitHub Actions bleibt advisory-only

### KEIN MERGE OHNE APPROVAL

- Commit auf `main` mit Formatierungs-Fix
- Push auf `main` mit `git push origin main`
- Kein Force Push

### EVIDENCE-ARTEFAKTE

Erstelle: `docs/evidence/post-268/issue-298-biome-fix.md`

Dokumentiere:
- `git diff --stat` Ausgabe
- `npx biome format docs/` Ergebnis
- Lokale Gate-Ergebnisse
- Commit SHA

### ERGEBNISFORMAT

```text
Status: GREEN / YELLOW / RED
Commit SHA: <sha>
Biome Exit Code: 0/1
Tests: <passed>/<total>
```

### REFERENZEN

- Issue: #298
- Parent: #268 (CLOSED)
- CI Run: #28280831642
```
