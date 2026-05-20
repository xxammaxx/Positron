# Positron v3.0 — Modul-Karte

**Datum:** 2026-05-20
**Workflow-Zustand:** Analyse abgeschlossen

---

## Modulübersicht

| Modul | Pfad | Verantwortlichkeit | Typ |
|-------|------|-------------------|-----|
| **Web UI** | `apps/web/` | Dashboard, Run View, Logs, Diff, Gates | Frontend |
| **Server** | `apps/server/` | Orchestrator-Backend, API, State Machine | Backend |
| **GitHub Adapter** | `packages/github-adapter/` | GitHub API: Issues, PRs, Labels, Comments | Package |
| **Spec Kit Adapter** | `packages/speckit-adapter/` | Spec Kit CLI: Spezifikation, Plan, Tasks | Package |
| **OpenCode Adapter** | `packages/opencode-adapter/` | OpenCode CLI: Agenten-Start, Konfiguration | Package |
| **Run State** | `packages/run-state/` | State Machine, Run-Management, Events | Package |
| **Sandbox** | `packages/sandbox/` | Git Worktree / Docker-Isolation | Package |
| **Shared** | `packages/shared/` | Gemeinsame Typen, Utilities, Konstanten | Package |

---

## Detaillierte Modulbeschreibungen

### 1. Web UI (`apps/web/`)
**Technologie:** React, Vite, Tailwind CSS
**Verantwortlichkeit:** Benutzeroberfläche für die Positron-Steuerung

#### Kernkomponenten
- **Dashboard**: Registrierte Repos, offene Issues, laufende Runs, Fehler, Erfolgsquote
- **Active Run View**: Vier-Panel-Layout (Issue Queue, Brain Panel, Hands Panel, Quality Panel)
- **Gate Controls**: Approve, Revise, Pause, Abort, Retry, Rollback, Create PR
- **Log Viewer**: Echtzeit-Log-Stream via WebSocket
- **Diff Viewer**: Live-Diff der aktuellen Code-Änderungen

#### Schnittstellen
- **Eingehend**: WebSocket/SSE vom Server (Run-Updates, Logs, Diffs)
- **Ausgehend**: REST/WebSocket zum Server (Gate-Befehle, Konfiguration)

#### Zuständigkeiten im Detail
1. Repositories registrieren und verwalten
2. Issue-Queue anzeigen (Pending, Running, Testing, Blocked, Done)
3. Brain Panel: Issue-Kontext, Research, Spec, Plan, Tasks, Review
4. Hands Panel: OpenCode Terminal Stream, laufende Commands, History
5. Quality Panel: Live-Diff, Teststatus, Lint/Build, Risks, Gates
6. Metriken: Erfolgsquote, Fix-Zeit, Test-Pass-Rate, Kosten/Tokens

---

### 2. Server (`apps/server/`)
**Technologie:** Node.js, Express, TypeScript
**Verantwortlichkeit:** Zentraler Orchestrator — steuert den gesamten Positron-Workflow

#### Kernfunktionen
- **Run-Dispatcher**: Startet neue Runs aus der Issue-Queue
- **State Machine Engine**: Zustandsübergänge validieren und ausführen
- **Scheduler**: Polling-Loop für Issue-Erkennung
- **WebSocket Manager**: Echtzeit-Updates an das UI

#### API-Endpunkte (geplant)
```
POST   /api/repos              — Repository registrieren
GET    /api/repos              — Alle Repos auflisten
GET    /api/repos/:id/issues   — Issues eines Repos abrufen
POST   /api/repos/:id/runs     — Run für Issue starten
GET    /api/runs               — Alle Runs auflisten
GET    /api/runs/:id           — Run-Details mit Events
POST   /api/runs/:id/gate     — Gate-Befehl (approve, revise, pause, abort)
GET    /api/runs/:id/artifacts/:kind — Artefakt abrufen
GET    /api/metrics            — Globale Metriken
```

#### Zuständigkeiten im Detail
1. Repository-Registrierung und -Verwaltung
2. Issue-Polling (GitHub Watcher Integration)
3. Run-State-Machine (Zustandsvalidierung, Übergänge)
4. Artefakt-Management (Speichern, Lesen, Versionieren)
5. WebSocket/SSE Broadcast an UI
6. Fehlerbehandlung und Retry-Logik
7. Metriken-Aggregation

---

### 3. GitHub Adapter (`packages/github-adapter/`)
**Technologie:** TypeScript, `@octokit/rest` oder `gh` CLI
**Verantwortlichkeit:** Alle GitHub-API-Interaktionen kapseln

#### Kernfunktionen
- `listIssues(repo, filters)` → Issues abrufen
- `getIssue(repo, number)` → Einzelnes Issue lesen
- `commentIssue(repo, number, body)` → Kommentar schreiben
- `setLabel(repo, number, label)` → Label setzen/entfernen
- `createBranch(repo, name, base)` → Branch erstellen
- `createPR(repo, head, base, title, body)` → Pull Request erstellen
- `getPRStatus(repo, number)` → PR-Check-Status

#### Positron-Labels
```
positron:ready        — Issue ist für Positron freigegeben
positron:running      — Run aktiv
positron:research     — Recherche-Phase
positron:planning     — Planungs-Phase
positron:implementing — Implementierung läuft
positron:testing      — Test-Phase
positron:blocked      — Run blockiert
positron:pr-created   — PR wurde erstellt
positron:done         — Erfolgreich abgeschlossen
```

---

### 4. Spec Kit Adapter (`packages/speckit-adapter/`)
**Technologie:** TypeScript, child_process
**Verantwortlichkeit:** Spec-Kit-CLI-Aufrufe kapseln und Artefakte validieren

#### Kernfunktionen
- `runConstitution(repoPath)` → Constitution-Datei validieren/erstellen
- `runSpecify(issueContext, researchOutput)` → `spec.md` erzeugen
- `runClarify(spec)` → Offene Fragen klären (optional)
- `runPlan(spec)` → `plan.md` erzeugen
- `runChecklist(plan)` → Checkliste prüfen
- `runTasks(plan)` → `tasks.md` erzeugen
- `runAnalyze(tasks)` → Analyse durchführen
- `runReview(tasks)` → Review durchführen

#### Validierungsregeln
- Existiert `spec.md` mit testbaren Anforderungen? ✅/❌
- Existiert `plan.md`? ✅/❌
- Enthält `tasks.md` konkrete Dateipfade? ✅/❌
- Gibt es offene `[NEEDS CLARIFICATION]`? ✅/❌
- Sind Tasks klein genug (≤ 400 Zeilen)? ✅/❌
- Gibt es TDD- oder Testschritte? ✅/❌

---

### 5. OpenCode Adapter (`packages/opencode-adapter/`)
**Technologie:** TypeScript, child_process
**Verantwortlichkeit:** OpenCode-Agenten mit kontrollierter Konfiguration starten

#### Kernfunktionen
- `generateConfig(runContext, autonomyLevel)` → Temporäre `opencode.json` erstellen
- `launchAgent(config, taskFile)` → OpenCode mit Tasks starten
- `monitorSession(process)` → Logs streamen, Exit-Code überwachen
- `parseOutput(stdout)` → Ergebnisse extrahieren (geänderte Dateien, Test-Output)

#### Autonomie-Level und Configs

**Level 0 (Observer):**
```json
{ "permission": { "read": "allow", "grep": "allow", "glob": "allow" } }
```

**Level 1 (Research & Spec):**
```json
{ "permission": { "read": "allow", "grep": "allow", "glob": "allow", "webfetch": "allow", "websearch": "allow" } }
```

**Level 2 (Supervised Build):**
```json
{ "permission": { "read": "allow", "grep": "allow", "glob": "allow", "edit": "ask", "bash": "ask", "webfetch": "allow" } }
```

**Level 3 (Autonomous Sandbox):**
```json
{
  "permission": {
    "read": "allow", "grep": "allow", "glob": "allow",
    "edit": "allow",
    "bash": {
      "npm test": "allow", "npm run test": "allow",
      "npm run build": "allow", "npm run lint": "allow",
      "git status": "allow", "git diff": "allow",
      "git push": "ask", "rm *": "ask",
      "sudo *": "deny", "docker system prune *": "deny"
    }
  }
}
```

---

### 6. Run State (`packages/run-state/`)
**Technologie:** TypeScript, SQLite
**Verantwortlichkeit:** Zustandsverwaltung für alle Runs

#### Kernfunktionen
- `createRun(repoId, issueNumber, autonomyLevel)` → Neuen Run anlegen
- `transition(runId, newPhase)` → Zustandsübergang validieren und ausführen
- `appendEvent(runId, phase, level, message, payload?)` → Ereignis protokollieren
- `getRun(runId)` → Vollständigen Run-Zustand laden
- `getActiveRuns()` → Alle aktiven Runs
- `storeArtifact(runId, kind, content)` → Artefakt speichern
- `getArtifact(runId, kind)` → Artefakt lesen

#### State Machine Definition
```typescript
const VALID_TRANSITIONS: Record<Phase, Phase[]> = {
  QUEUED:           ['CLAIMED'],
  CLAIMED:          ['REPO_SYNC', 'FAILED_BLOCKED'],
  REPO_SYNC:        ['ISSUE_CONTEXT', 'FAILED_TRANSIENT'],
  ISSUE_CONTEXT:    ['WEB_RESEARCH'],
  WEB_RESEARCH:     ['SPECIFY', 'FAILED_TRANSIENT'],
  SPECIFY:          ['CLARIFY_OPTIONAL', 'PLAN'],
  CLARIFY_OPTIONAL: ['PLAN'],
  PLAN:             ['TASKS'],
  TASKS:            ['ANALYZE'],
  ANALYZE:          ['REVIEW'],
  REVIEW:           ['IMPLEMENT', 'PLAN', 'TASKS'],  // Rücksprung bei FAIL
  IMPLEMENT:        ['TEST', 'FAILED_BLOCKED'],
  TEST:             ['VERIFY', 'IMPLEMENT', 'FAILED_BLOCKED'],  // max 3x IMPLEMENT→TEST
  VERIFY:           ['PR_CREATE', 'FAILED_BLOCKED'],
  PR_CREATE:        ['DONE', 'FAILED_BLOCKED'],
  DONE:             [],
  FAILED_TRANSIENT: ['REPO_SYNC', 'WEB_RESEARCH'],  // Retry
  FAILED_BLOCKED:   [],
  FAILED_UNSAFE:    []
};
```

---

### 7. Sandbox (`packages/sandbox/`)
**Technologie:** TypeScript, Git Worktrees, Docker (später)
**Verantwortlichkeit:** Isolierte Ausführungsumgebung für OpenCode

#### Kernfunktionen
- `createWorktree(repoPath, branch)` → Git Worktree erstellen
- `removeWorktree(worktreePath)` → Worktree aufräumen
- `executeInSandbox(command, worktreePath)` → Befehl im Worktree ausführen
- `validateSafety(command)` → Befehl gegen Allowlist prüfen
- `collectOutput(worktreePath)` → Logs, Diffs, Testergebnisse einsammeln

#### Sicherheitsregeln
- Keine Ausführung auf dem Original-Repository
- Allowlist für alle Bash-Befehle im Autonomous Mode
- Keine Netzwerkzugriffe außer npm registry (Docker)
- Timeout für jeden Befehl

---

### 8. Shared (`packages/shared/`)
**Technologie:** TypeScript
**Verantwortlichkeit:** Gemeinsame Typen, Interfaces, Konstanten

#### Kerninhalte
```typescript
// Typen
export type Phase = 'QUEUED' | 'CLAIMED' | ... | 'DONE';
export type RunStatus = 'active' | 'blocked' | 'done' | 'failed';
export type AutonomyLevel = 0 | 1 | 2 | 3 | 4;
export type EventLevel = 'INFO' | 'WARN' | 'ERROR' | 'GATE' | 'HUMAN';

// Interfaces
export interface Repository { ... }
export interface Issue { ... }
export interface Run { ... }
export interface RunEvent { ... }
export interface Artifact { ... }
export interface CommandResult { ... }

// Konstanten
export const POSITRON_LABELS = [ ... ];
export const MAX_FIX_LOOPS = 3;
export const MAX_DIFF_SIZE = 400; // Zeilen
export const POLLING_INTERVAL_MS = 60_000; // 60 Sek.

// Utilities
export function generateBranchName(issueNumber: number, title: string): string;
export function redactSecrets(text: string): string;
export function generateRunId(): string;
```
