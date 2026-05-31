# Issue #61: Fix Pipeline Command — Use `spec-driven-development` statt `speckit.specify`

**Scope:** Pipeline-Fix (kein Feature-Code, kein Release, kein Dogfood-Run)  
**Priority:** P0 (Blocker für nützlichen Pipeline-Run)  
**Status:** Draft

---

## Kontext

Issue #58 fixierte die CLI-Argumente für `opencode run`. Danach zeigte sich:

- `opencode run --command speckit.specify ...` → **"Command not found"**
- `opencode run --command spec-driven-development "specify"` → ✅ **Funktioniert**

Die `spec-driven-development` ist ein **opencode Skill** (kein CLI-Subcommand). Bei Aufruf lädt opencode die Skills `spec-driven-development`, `github-source-of-truth`, `audit-trail-enforcer`, `read-before-sketch` und startet eine AI-Session, die die Speckit-Phasen orchestriert.

## Problem

Die Pipeline-Pipeline ruft in `executePhase` (SPECIFY/PLAN/TASKS) `opencode.runSlashCommand('speckit.specify', ...)` auf. Dieser Command existiert nicht in opencode.

Der richtige Command heisst `spec-driven-development` und die Phase wird als **message positional argument** übergeben: `"specify"`, `"plan"`, `"tasks"`.

## Tasks

### Task 1: `runSlashCommand` in `real-adapter.ts` korrigieren

**Aktuell:**
```typescript
const args = [
  'run',
  '--command', 'speckit.specify',  // Falscher Command-Name
  '--format', 'json',
  'Issue Title',                    // message = Issue-Titel
];
```

**Neu:**
```typescript
const args = [
  'run',
  '--command', 'spec-driven-development',  // Korrekter Command-Name
  '--format', 'json',
  phaseName,                                // message = Phase-Name ("specify"/"plan"/"tasks")
];
```

**To-do**
- [ ] `runSlashCommand` nimmt `phaseName` als Parameter (statt `slashCommand` im Speckit-Stil)
- [ ] Der erste message-Parameter ist der Phase-Name (nicht der Issue-Titel)
- [ ] Issue-Titel/Beschreibung wird als zusätzlicher Context mitgegeben (entweder als zweites message-Argument oder via `--file`)

**Frage:** Wie gibt man Issue-Kontext mit? OpenCode's `--file` flag erlaubt das Anhängen von Dateien. Alternativ kann der Issue-Body als Teil der message mitgegeben werden.

**Acceptance**
- [ ] `opencode run --command spec-driven-development "specify" --format json --dir <workspace>` wird korrekt aufgerufen
- [ ] Issue-Kontext wird übergeben (via message oder `--file`)

---

### Task 2: `executePhase` in `apps/server/src/index.ts` korrigieren

Die drei Phasen SPECIFY, PLAN, TASKS rufen alle `opencode.runSlashCommand()` auf. Sie müssen angepasst werden:

**Aktuell (SPECIFY, Zeile 486-491):**
```typescript
const specResult = await opencode.runSlashCommand('speckit.specify', {
  runId: current.id, workspacePath: wsPath,
  issueTitle: `Issue #${current.issueNumber}`, issueNumber: current.issueNumber,
  mode: 'safe-cli',
});
```

**Neu:**
```typescript
const specResult = await opencode.runSlashCommand('spec-driven-development', 'specify', {
  runId: current.id, workspacePath: wsPath,
  issueTitle: `Issue #${current.issueNumber}`, issueNumber: current.issueNumber,
  issueBody: current.issueBody,  // Wichtig: Issue-Body für AI-Kontext
});
```

**To-do**
- [ ] `runSlashCommand` Interface erweitern: `(commandName, phaseName, input)` statt `(slashCommand, input)`
- [ ] Phase-Namen: `"specify"` → `"plan"` → `"tasks"` → `"analyze"`
- [ ] `OpenCodeRunInput` um `issueBody` ergänzen (bereits im Interface, prüfen ob gesetzt)

**Acceptance**
- [ ] Pipeline ruft `spec-driven-development` mit korrektem Phase-Namen auf
- [ ] Issue-Body wird übergeben (AI braucht Kontext)
- [ ] Fallback bei Fehlern: `runSpecify` (artifact-only) bleibt erhalten

---

### Task 3: `OpenCodeRunInput` prüfen und Issue-Body sicherstellen

Der Skill `spec-driven-development` braucht:
1. Git-Repository im Workspace (existiert ✅ — REPO_SYNC erzeugt es)
2. Issue-Nummer + Issue-Body (für AI-Kontext)
3. Phasen-Name als task

**To-do**
- [ ] Prüfen: Wird `issueBody` im `OpenCodeRunInput` gesetzt? (aktuell nur `issueTitle`)
- [ ] Issue-Body aus dem GitHub-Adapter abrufen und in den Run-State übernehmen
- [ ] `OpenCodeRunInput` um `phaseName`-Feld erweitern

**Acceptance**
- [ ] `issueBody` ist gesetzt wenn `runSlashCommand` aufgerufen wird
- [ ] Der Skill bekommt genug Kontext (Issue # + Body + Workspace)

---

### Task 4: JSON-Output parsen für Artefakt-Extraktion

Wenn `spec-driven-development` läuft, produziert es JSON-Lines mit `text`-Events (AI-Output). Daraus müssen Artefakte extrahiert werden.

**JSON-Output-Struktur:**
```json
{"type":"step_start",...}
{"type":"tool_use",...}
{"type":"text","part":{"text":"## Specification\n\n..."}}
{"type":"step_finish",...}
```

**To-do**
- [ ] Parse JSON-Lines für `type":"text"` Events
- [ ] Extrahiere Artefakt-Inhalt aus `part.text`
- [ ] Speichere als spec.md / plan.md / tasks.md im Workspace
- [ ] Registriere in der Evidenz-Datenbank

**Acceptance**
- [ ] Text-Output wird als Artefakt gespeichert
- [ ] Artefakt ist im Evidence-Endpoint sichtbar
- [ ] REVIEW-Phase erkennt die Artefakte und passiert

---

### Task 5: Tests aktualisieren

**To-do**
- [ ] Mock in `real-adapter.test.ts` an neue Signatur anpassen
- [ ] Tests für `spec-driven-development` Command-Namen
- [ ] Test für JSON-Output-Parsing
- [ ] `npm test` grün

**Acceptance**
- [ ] Alle 164+ Tests passieren
- [ ] Neue Tests decken Command-Namen und Phase-Namen ab

---

## Nicht-Ziele

- Keine Feature-Änderungen an der Pipeline-Logik
- Kein Release-Tag
- Kein Dogfood-Run
- Keine Installation neuer opencode Plugins
- Kein Ändern der GitHub-Adapter-Konfiguration

## Abhängigkeiten

- **Issue #58** muss gemerged sein (CLI-Argument-Fix, stdin close, JSON error detection) — ✅ Erledigt
- **REPO_SYNC** muss einen Workspace mit git-Repo erstellen — ✅ Funktioniert
- **GitHub-Adpater** muss `issueBody` liefern — ⚠️ Prüfen

## Definition of Done

- [ ] `npm test` grün (164+ Tests)
- [ ] `npm run build` grün
- [ ] Pipeline ruft `opencode run --command spec-driven-development "specify"` auf
- [ ] spec-driven-development antwortet mit Artefakt-Output (auch wenn initial blocked)
- [ ] Artefakt wird im Workspace gespeichert
- [ ] REVIEW-Phase erkennt Artefakt
- [ ] Keine Regression in bestehenden Phasen
- [ ] Kein echter Push, kein Merge, kein Release

## Operative Guardrails

- Push bleibt deaktiviert (`POSITRON_ENABLE_PUSH=false`)
- Merge bleibt deaktiviert (`POSITRON_ENABLE_MERGE=false`)
- Kill-Switch bleibt aktiv (`POSITRON_MERGE_KILL_SWITCH=true`)
