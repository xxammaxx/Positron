# POSITRON v3.0 — Hochoptimierter Blueprint

**Untertitel:** Evidence-Gated GitHub Issue Execution System  
**Stand:** 20. Mai 2026  
**Ziel:** Lokaler, sicherer und nachvollziehbarer Orchestrator, der GitHub-Issues in recherchierte, spezifizierte, getestete und dokumentierte Pull Requests überführt.

---

## 0. Executive Summary

Positron ist ein lokaler GitHub-Issue-Orchestrator für agentische Softwareentwicklung. Es überwacht ausgewählte GitHub-Repositories, erkennt neue oder markierte Issues, erstellt daraus eine strukturierte Spezifikation, führt eine Webrecherche zu aktuellen Best Practices durch, dokumentiert diese Erkenntnisse im Issue, generiert Plan und Tasks mit Spec Kit, lässt OpenCode die Umsetzung kontrolliert ausführen, validiert die Änderungen über Tests und Review-Schleifen und liefert am Ende einen Pull Request mit vollständigem Test- und Entscheidungsnachweis.

Der Kern ist **nicht maximale Autonomie**, sondern **beweisbare Autonomie**:

> Kein Code ohne Spec. Kein Fortschritt ohne GitHub-Kommentar. Kein Erfolg ohne Testbeweis. Keine Vollautonomie außerhalb einer Sandbox.

---

## 1. Strategische Positionierung

### 1.1 Ein-Satz-Definition

**Positron verwandelt GitHub-Issues in überprüfbare, dokumentierte, getestete Pull Requests — mit Spec Kit als Planungsschicht, OpenCode als Ausführungsschicht und GitHub als Source of Truth.**

### 1.2 Was Positron ist

Positron ist:

- ein lokaler Orchestrator für GitHub-Issue-Abarbeitung,
- ein Spec-Driven-Development-Runner,
- ein OpenCode-Execution-Controller,
- ein GitHub-Kommentar- und PR-Automat,
- ein Run-State- und Artefakt-System,
- ein UI-Cockpit für menschliche Gates,
- ein Sicherheitsrahmen für agentisches Coding.

### 1.3 Was Positron ausdrücklich nicht ist

Positron ist nicht:

- ein blinder Auto-Merge-Bot,
- ein unkontrollierter Shell-Agent,
- ein One-Shot-Codegenerator,
- ein Chatbot ohne persistente Zustände,
- ein Ersatz für Tests,
- ein Ersatz für menschliches Review bei kritischen Änderungen,
- ein Tool, das Issues ohne sichtbare GitHub-Spur bearbeitet.

---

## 2. Validierungsbasis und externe Erkenntnisse

Dieser Blueprint wurde gegen aktuelle Quellen validiert:

1. **GitHub Spec Kit**: Nach `specify init` stehen strukturierte Befehle wie Constitution, Specify, Plan, Tasks und Implement bereit. Spec Kit trennt explizit WAS/WARUM von WIE und unterstützt Spec-Driven Development.  
   Quelle: https://github.com/github/spec-kit und https://github.github.com/spec-kit/

2. **OpenCode**: OpenCode ist ein Open-Source-Coding-Agent mit Primary Agents, Subagents, Tool-Konfiguration und fein steuerbaren Permissions für u. a. `read`, `edit`, `grep`, `glob`, `bash`, `task`, `skill` und `lsp`.  
   Quelle: https://opencode.ai/docs/ und https://opencode.ai/docs/permissions/

3. **Model Context Protocol**: MCP ist ein offener Standard, um KI-Anwendungen mit externen Datenquellen, Tools und Workflows zu verbinden. Für Positron ist MCP eine standardisierte Tool- und Kontextbrücke, aber kein Ersatz für Sicherheitsgrenzen.  
   Quelle: https://modelcontextprotocol.io/docs/getting-started/intro und https://modelcontextprotocol.io/specification/draft

4. **SWE-bench**: SWE-bench bewertet, ob Sprachmodelle reale GitHub-Issues anhand einer Codebasis lösen können. Das bestätigt Positrons Fokus auf Issue → Patch → Tests.  
   Quelle: https://github.com/swe-bench/SWE-bench und https://www.swebench.com/

5. **SWE-bench Verified / Agentic SWE Benchmarks**: Reale Softwareaufgaben bleiben schwierig, insbesondere bei Multi-File-Änderungen, langen Kontexten, Tests und Tool-Nutzung. Daraus folgt: Positron braucht kleine Tasks, harte Gates, Testbeweise und Wiederaufnahmefähigkeit.  
   Quelle: https://www.swebench.com/ und https://epoch.ai/benchmarks/swe-bench-verified

---

## 3. Positron-Constitution

Diese Constitution ist die nicht verhandelbare Projektgrundlage.

### I. GitHub Source of Truth

Jeder Positron-Run beginnt mit genau einem GitHub-Issue und muss alle relevanten Zwischenschritte sichtbar in GitHub dokumentieren. Kein Fortschritt darf nur in lokalen Logs oder im Modellkontext existieren.

Pflichtkommentare:

1. Issue accepted
2. Repository context loaded
3. Web research completed
4. Specification generated
5. Plan generated
6. Tasks generated
7. Implementation started
8. Tests executed
9. Fix loop result
10. PR created, blocked or closed

### II. Spec Before Code

Positron darf OpenCode niemals direkt aus einem Issue heraus mit „fix this“ starten. Jedes Issue durchläuft vorher:

1. Issue-Ingestion
2. Repository-Analyse
3. Webrecherche
4. Spezifikation
5. Plan
6. Tasks
7. Review-Gate
8. Implementierung

### III. Positron Orchestrates, Agents Execute

Positron ist Workflow-Autorität. Spec Kit erstellt strukturierte Entwicklungsartefakte. OpenCode führt Codeänderungen aus. GitHub speichert sichtbaren Zustand. Docker/Git-Worktrees isolieren Ausführung.

### IV. Evidence-Gated Progression

Ein Task ist nicht fertig, weil ein Agent Erfolg meldet. Er ist erst fertig, wenn Beweise vorliegen:

- Tests wurden ausgeführt,
- Build/Lint/Typecheck sind bekannt,
- Akzeptanzkriterien wurden gemappt,
- Diff wurde zusammengefasst,
- Risiken wurden dokumentiert,
- GitHub wurde kommentiert.

### V. Controlled Autonomy

Autonomie ist stufenweise und konfigurierbar. Direkte Vollautonomie gegen `main` oder `master` ist verboten.

### VI. Small, Reversible Changes

Ein Run bearbeitet genau ein Issue, auf genau einem Branch, mit möglichst kleinen Commits. Große Issues werden in kleinere Tasks zerlegt.

### VII. No Silent Failure

Jeder Fehler, Testabbruch, Permission-Denial, Retry oder Blocker wird geloggt und in GitHub zusammengefasst.

### VIII. Resume by State, Not by Memory

Positron muss nach Neustart anhand persistenter State-Dateien oder Datenbankeinträge fortsetzen können. Kein Run darf vom Chatverlauf abhängig sein.

### IX. Security by Default

Secrets dürfen niemals an LLMs gesendet werden. Gefährliche Shell-Befehle benötigen Freigabe oder sind verboten. Vollautonomie ist nur in isolierten Workspaces erlaubt.

### X. Human Override Always Wins

Der Nutzer kann jeden Run pausieren, abbrechen, überarbeiten, zurückrollen oder zur manuellen Prüfung stoppen.

---

## 4. Zielarchitektur

```text
┌─────────────────────────────────────────────┐
│                 Web UI                      │
│ React / Vite / Tailwind                     │
│ Dashboard, Run View, Logs, Diff, Gates      │
└──────────────────────┬──────────────────────┘
                       │ WebSocket / SSE
┌──────────────────────▼──────────────────────┐
│             Positron Orchestrator            │
│ Node.js / Express / TypeScript               │
│ Run State Machine, GitHub Sync, Scheduler    │
└───────┬──────────────┬──────────────┬────────┘
        │              │              │
┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼───────┐
│ GitHub API   │ │ Spec Kit  │ │ OpenCode      │
│ Issues / PRs │ │ CLI       │ │ CLI / Agents  │
└───────┬──────┘ └─────┬─────┘ └──────┬───────┘
        │              │              │
┌───────▼──────────────▼──────────────▼───────┐
│              Sandbox Workspace              │
│ Git worktree / Docker / repo clone           │
└───────┬─────────────────────────────────────┘
        │
┌───────▼─────────────────────────────────────┐
│ Persistence                                  │
│ SQLite MVP → PostgreSQL optional             │
│ runs, events, artifacts, logs, metrics       │
└─────────────────────────────────────────────┘
```

### 4.1 Technologie-Entscheidung

Für den aktuellen Positron-Kontext ist der pragmatischste MVP:

- **Frontend:** React / Vite / Tailwind
- **Backend:** Node.js / Express / TypeScript
- **Datenbank:** SQLite lokal
- **Tests:** Vitest + Playwright
- **Sandbox:** Git Worktrees zuerst, Docker danach
- **CLI-Integration:** Spec Kit + OpenCode über kontrollierte Prozessaufrufe

FastAPI bleibt eine spätere Option, ist aber für den vorhandenen TypeScript-nahen Positron-Stand kein Muss.

---

## 5. Kernmodule

### 5.1 GitHub Watcher

Aufgaben:

- Repositories registrieren
- Issues abrufen
- Labels und Kommentare lesen
- neue relevante Issues erkennen
- laufende Issues claimen
- Status-Labels setzen
- Kommentare schreiben
- PRs erstellen

Empfohlene Labels:

```text
positron:ready
positron:running
positron:research
positron:planning
positron:implementing
positron:testing
positron:blocked
positron:pr-created
positron:done
```

MVP:

- Polling alle 60–180 Sekunden
- später GitHub Webhooks optional

### 5.2 Run Orchestrator

Der Orchestrator ist eine deterministische State Machine.

```text
QUEUED
→ CLAIMED
→ REPO_SYNC
→ ISSUE_CONTEXT
→ WEB_RESEARCH
→ SPECIFY
→ CLARIFY_OPTIONAL
→ PLAN
→ TASKS
→ ANALYZE
→ REVIEW
→ IMPLEMENT
→ TEST
→ VERIFY
→ PR_CREATE
→ DONE
```

Fehlerzustände:

```text
FAILED_TRANSIENT → Retry
FAILED_BLOCKED   → GitHub-Kommentar + Stop
FAILED_UNSAFE    → Sofortiger Stop
```

### 5.3 Artifact Manager

Jeder Run erzeugt einen eigenen Artefaktordner:

```text
.positron/runs/issue-123/
├── run.json
├── issue-context.md
├── research.md
├── spec.md
├── plan.md
├── tasks.md
├── review.md
├── test-report.md
├── verify-report.md
├── delivery-summary.md
├── opencode-session.log
├── commands.log
└── patches/
```

### 5.4 Spec Kit Adapter

Der Spec Kit Adapter kapselt alle Spec-Kit-Phasen:

```text
constitution
specify
clarify
plan
checklist
tasks
analyze
review
implement
verify
```

Positron sollte dabei nicht blind CLI-Ausgaben übernehmen, sondern Artefakte validieren:

- Existiert `spec.md`?
- Enthält `spec.md` testbare Anforderungen?
- Existiert `plan.md`?
- Enthält `tasks.md` konkrete Dateipfade?
- Gibt es offene `[NEEDS CLARIFICATION]`?
- Sind Tasks klein genug?
- Gibt es TDD- oder Testschritte?

### 5.5 OpenCode Adapter

OpenCode wird pro Run mit einer temporären Config gestartet. Die Config enthält:

- Modellwahl
- Agentenrolle
- Tool-Permissions
- relevante Instructions
- Run-Artefakte
- Safety Rules

Beispiel für supervised mode:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "read": "allow",
    "grep": "allow",
    "glob": "allow",
    "edit": "ask",
    "bash": "ask",
    "webfetch": "allow",
    "websearch": "allow"
  },
  "instructions": [
    ".specify/memory/constitution.md",
    "AGENTS.md",
    ".positron/runs/issue-123/issue-context.md",
    ".positron/runs/issue-123/research.md",
    ".positron/runs/issue-123/tasks.md"
  ]
}
```

Beispiel für autonomous sandbox mode:

```json
{
  "permission": {
    "read": "allow",
    "grep": "allow",
    "glob": "allow",
    "edit": "allow",
    "bash": {
      "npm test": "allow",
      "npm run test": "allow",
      "npm run build": "allow",
      "npm run lint": "allow",
      "git status": "allow",
      "git diff": "allow",
      "git push": "ask",
      "rm *": "ask",
      "sudo *": "deny",
      "docker system prune *": "deny"
    }
  }
}
```

---

## 6. MCP-Design

MCP sollte in Positron als Tool- und Kontextschicht genutzt werden.

### 6.1 Positron MCP Server

Empfohlene Tool-Gruppen:

```text
positron.github
- list_issues
- read_issue
- comment_issue
- create_branch
- create_pr

positron.repo
- inspect_tree
- detect_stack
- detect_test_commands
- read_artifact
- write_artifact

positron.run
- get_run_state
- update_run_state
- append_event
- request_gate

positron.qa
- run_tests
- run_lint
- run_typecheck
- parse_test_output
```

### 6.2 MCP-Regeln

- Jedes Tool bekommt eine sehr präzise Beschreibung.
- Jedes Tool hat enge Argument-Schemas.
- Mutierende Tools brauchen Safety Guards.
- Secrets werden nie als Tool-Ergebnis zurückgegeben.
- Alle Tool Calls werden in `run_events` protokolliert.

---

## 7. Autonomie-Level

### Level 0: Observer

- Repo lesen
- Issues lesen
- Analyse erstellen
- keine Codeänderungen

### Level 1: Research & Spec

- Webrecherche
- Issue-Kommentar
- Spec erzeugen
- Plan erzeugen
- Tasks erzeugen
- keine Codeänderungen

### Level 2: Supervised Build

- Codeänderungen erlaubt
- kritische Bash-Befehle `ask`
- Tests erlaubt
- Push und PR-Erstellung nach Freigabe

### Level 3: Autonomous Sandbox

- Codeänderungen erlaubt
- Test- und Build-Befehle erlaubt
- nur isolierter Branch / Worktree / Container
- kein direkter Main-Merge
- kein `sudo`
- keine gefährlichen Löschbefehle

### Level 4: CI Auto-PR

- PR automatisch erstellen
- Issue kommentieren
- Auto-Merge nur optional und nur bei grünen Checks

---

## 8. Git- und Sicherheitsmodell

### 8.1 Branch-Regel

```text
positron/issue-<number>-<slug>
```

Beispiel:

```text
positron/issue-12-add-e2e-screenshot-tool
```

### 8.2 Commit-Regel

```text
fix(issue-123): implement screenshot capture adapter
test(issue-123): add Playwright screenshot assertions
docs(issue-123): document multimodal review flow
```

### 8.3 Harte Verbote

Positron darf niemals:

- direkt auf `main` oder `master` schreiben,
- Issues ohne Testbericht schließen,
- Secrets an LLMs geben,
- Tokens in Logs schreiben,
- `sudo` ausführen,
- außerhalb des Workspace löschen,
- Auto-Merge ohne explizite Konfiguration durchführen.

### 8.4 Secret Handling

- GitHub Token im OS Secret Store oder `.env` außerhalb des Repo
- LLM Keys niemals in Prompt-Kontext
- Redaction für `ghp_*`, `sk-*`, `anthropic_*`, `gemini_*`
- Logs immer vor UI-Anzeige maskieren

---

## 9. Datenmodell MVP

```sql
CREATE TABLE repositories (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  local_path TEXT NOT NULL,
  default_branch TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE issues (
  id TEXT PRIMARY KEY,
  repo_id TEXT NOT NULL,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  state TEXT NOT NULL,
  labels_json TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY(repo_id) REFERENCES repositories(id)
);

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  repo_id TEXT NOT NULL,
  issue_number INTEGER NOT NULL,
  branch TEXT,
  phase TEXT NOT NULL,
  status TEXT NOT NULL,
  autonomy_level INTEGER NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  finished_at TEXT,
  FOREIGN KEY(repo_id) REFERENCES repositories(id)
);

CREATE TABLE run_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(run_id) REFERENCES runs(id)
);

CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  path TEXT NOT NULL,
  sha256 TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(run_id) REFERENCES runs(id)
);

CREATE TABLE command_results (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  command TEXT NOT NULL,
  exit_code INTEGER,
  stdout_path TEXT,
  stderr_path TEXT,
  duration_ms INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY(run_id) REFERENCES runs(id)
);
```

---

## 10. Der Positron-Loop im Detail

### Phase A: Claim Issue

Input:

- Repository
- Issue-Nummer
- Autonomie-Level

Output:

- `run.json`
- Branch-Name
- GitHub-Kommentar: Positron accepted this issue

Abbruchbedingungen:

- Issue bereits in Bearbeitung
- Repo nicht klonbar
- Token fehlt
- Arbeitsbaum dirty und kein Worktree möglich

### Phase B: Repository Context

Positron erkennt:

- Package Manager
- Testbefehle
- Buildbefehle
- Linter
- Framework
- vorhandene Agent-Regeln
- CI-Dateien
- relevante Architekturdateien

### Phase C: Web Research

Pflichtartefakt `research.md`:

```markdown
# Research Summary

## Search Questions
- Welche aktuellen Best Practices sind relevant?
- Welche Libraries/APIs haben sich geändert?
- Welche Security- oder Testing-Hinweise sind wichtig?

## Sources
- ...

## Findings
- ...

## Implementation Consequences
- ...

## Risks
- ...
```

Danach wird eine Kurzfassung ins GitHub-Issue kommentiert.

### Phase D: Specification

Output:

- `spec.md`
- User Stories
- Akzeptanzkriterien
- Nicht-Ziele
- Testbare Anforderungen

### Phase E: Plan

Output:

- `plan.md`
- Architekturentscheidung
- Datenmodell
- API-/CLI-Kontrakte
- Teststrategie
- Migrationshinweise

### Phase F: Tasks

Output:

- `tasks.md`
- kleine Tasks
- Dependencies
- `[P]` nur bei echten Parallel-Tasks
- Test-Tasks vor Implementierungs-Tasks
- konkrete Pfade

### Phase G: Review

Review-Dimensionen:

1. Spec-Plan Alignment
2. Plan-Tasks Completeness
3. Dependency Ordering
4. Parallelization Correctness
5. Feasibility & Risk
6. Standards Compliance
7. Implementation Readiness

Verdicts:

```text
PASS → weiter
WARN → weiter mit dokumentierter Warnung
FAIL → zurück zu Plan oder Tasks
```

### Phase H: Implement

OpenCode erhält nur:

- Issue-Kontext
- Research Summary
- Spec
- Plan
- Tasks
- Constitution
- AGENTS.md

OpenCode darf keine Scope-Erweiterung vornehmen.

### Phase I: QA Loop

```text
run tests
if fail:
  parse error
  reviewer analyzes
  builder fixes
  rerun tests
max 3 iterations
```

Nach drei erfolglosen Runden:

- Run stoppen
- GitHub-Kommentar schreiben
- Label `positron:blocked` setzen
- Artefakte speichern

### Phase J: Delivery

Output:

- Commit
- Branch Push
- Pull Request
- PR-Beschreibung
- Issue-Kommentar
- Testreport

---

## 11. Webinterface

### 11.1 Dashboard

Elemente:

- registrierte Repositories
- offene Issues
- laufende Runs
- letzte Fehler
- Erfolgsquote
- durchschnittliche Fix-Zeit
- Test-Pass-Rate
- Kosten/Tokens optional

### 11.2 Active Run View

Vier Hauptbereiche:

1. **Issue Queue**
   - Pending
   - Running
   - Testing
   - Blocked
   - Done

2. **Brain Panel**
   - Issue-Kontext
   - Research
   - Spec
   - Plan
   - Tasks
   - Review

3. **Hands Panel**
   - OpenCode Terminal Stream
   - laufende Commands
   - Command-History

4. **Quality Panel**
   - Live-Diff
   - Teststatus
   - Lint/Build
   - Risks
   - Gate Controls

### 11.3 Gate Controls

Buttons:

```text
Approve
Revise
Pause
Abort
Retry
Rollback
Create PR
```

---

## 12. Messgrößen und Evaluation

### 12.1 Run-Metriken

- issue_to_spec_time
- spec_to_tasks_time
- implementation_time
- test_fix_iterations
- first_pass_success_rate
- final_test_success_rate
- PR_created_rate
- human_intervention_count
- blocked_rate

### 12.2 Qualitätsmetriken

- Tests hinzugefügt: ja/nein
- Akzeptanzkriterien erfüllt: x/y
- Lint/Typecheck bestanden
- Build bestanden
- Diff-Größe
- Dateien geändert
- Risiko-Level

### 12.3 Agentenmetriken

- Modell
- Tokens
- Kosten
- Tool Calls
- fehlgeschlagene Commands
- Retry-Zahl
- hallucinated file references
- scope creep events

---

## 13. Roadmap

### MVP 1: Lokaler Issue Runner

- ein Repo registrieren
- Issues per Polling lesen
- ein Issue claimen
- Branch erstellen
- Repo-Kontext sammeln
- Research-Kommentar schreiben
- Spec/Plan/Tasks als Markdown erzeugen
- noch keine automatische Implementierung

### MVP 2: OpenCode Supervised Build

- OpenCode pro Run starten
- temporäre OpenCode-Konfiguration erzeugen
- `tasks.md` ausführen lassen
- Tests starten
- Logs streamen
- User-Gates im UI

### MVP 3: PR Delivery

- Commit erzeugen
- Branch pushen
- PR erstellen
- Issue kommentieren
- Testreport anhängen

### MVP 4: Autonomous Sandbox

- Docker/Worktree Isolation
- Bash-Allowlist
- maximal 3 Fix-Loops
- automatische Blockierung bei Failure

### MVP 5: Multi-Repo Scheduler

- mehrere Repos
- Priorisierung
- Labels
- Queue
- Run-History
- Projektmetriken

---

## 14. Projektstruktur

```text
positron/
├── apps/
│   ├── web/
│   └── server/
├── packages/
│   ├── github-adapter/
│   ├── speckit-adapter/
│   ├── opencode-adapter/
│   ├── run-state/
│   ├── sandbox/
│   └── shared/
├── docs/
│   ├── architecture/
│   ├── security/
│   └── workflows/
├── .positron/
│   └── runs/
├── .specify/
│   └── memory/
│       └── constitution.md
├── AGENTS.md
└── README.md
```

---

## 15. AGENTS.md-Kernregelwerk für Positron

```markdown
# AGENTS.md — Positron Rules

## Non-Negotiable Workflow

1. Read this file first.
2. Read `.specify/memory/constitution.md`.
3. Read the active issue context.
4. Do not implement before spec, plan and tasks exist.
5. Do not skip tests.
6. Do not push to main/master.
7. Do not expose secrets.
8. Document every phase in GitHub.
9. Stop after 3 failed remediation loops.
10. Ask for approval for dangerous commands.

## GitHub Source of Truth

Every relevant decision, failure, test result and delivery step must be summarized in the active GitHub issue or PR.

## Scope Control

Only solve the active issue. Do not perform opportunistic refactors unless explicitly required by the spec or necessary for tests.

## Evidence Requirement

A solution is complete only when tests, build status, diff summary and acceptance criteria mapping are documented.
```

---

## 16. Wichtigste technische Risiken

### Risiko 1: Agent läuft in Endlosschleife

Gegenmaßnahme:

- Max steps
- Max retries
- Max command duration
- Run timeout
- Stop nach 3 Fix-Loops

### Risiko 2: Agent ändert zu viel

Gegenmaßnahme:

- Diff-Größenlimit
- Scope-Check gegen Tasks
- Review-Gate
- PR statt Direkt-Merge

### Risiko 3: Tests fehlen oder sind unzuverlässig

Gegenmaßnahme:

- Test Command Detection
- Testreport Pflicht
- Wenn keine Tests vorhanden: explizite Begründung und Minimaltest erzeugen

### Risiko 4: Secrets im Kontext

Gegenmaßnahme:

- Secret Redaction
- `.env` nicht lesen
- bekannte Tokenmuster maskieren
- Prompt-Sanitizer

### Risiko 5: Falsche Webrecherche

Gegenmaßnahme:

- Quellenliste speichern
- offizielle Dokus priorisieren
- Datum dokumentieren
- Konsequenzen getrennt von Fakten darstellen

---

## 17. Definition of Done für einen Positron-Run

Ein Run ist nur Done, wenn:

- [ ] Issue wurde geclaimt
- [ ] Repo-Kontext wurde gelesen
- [ ] Webrecherche wurde durchgeführt
- [ ] Research wurde im Issue kommentiert
- [ ] Spec existiert
- [ ] Plan existiert
- [ ] Tasks existieren
- [ ] Review wurde durchgeführt
- [ ] Implementierung ist abgeschlossen
- [ ] Tests wurden ausgeführt
- [ ] Testreport existiert
- [ ] Diff wurde zusammengefasst
- [ ] PR wurde erstellt oder Blocker dokumentiert
- [ ] GitHub wurde final kommentiert

---

## 18. Finale Architekturentscheidung

Der größte Fehler wäre, Positron als lose Kette von Agentenprompts zu bauen.

Der richtige Kern ist:

```text
Deterministische State Machine
+ persistente Artefakte
+ kontrollierte Agentenaufrufe
+ harte Gates
+ GitHub-Kommentare
+ Tests als Beweis
```

Agenten dürfen kreativ sein.  
Der Workflow darf es nicht.

---

## 19. Kurzform für README

```markdown
# Positron

Positron is a local GitHub issue execution system for agentic software development.

It watches GitHub issues, turns each issue into researched and specified development artifacts, uses Spec Kit for planning, OpenCode for controlled implementation, runs tests and review loops, documents every step in GitHub, and delivers pull requests instead of invisible agent output.

Core principles:

1. No code without spec.
2. No progress without GitHub comments.
3. No success without test evidence.
4. No full autonomy outside a sandbox.
5. No new issue before the current one is completed or blocked.
```

---

## 20. Quellen

- GitHub Spec Kit Repository: https://github.com/github/spec-kit
- GitHub Spec Kit Documentation: https://github.github.com/spec-kit/
- OpenCode Documentation: https://opencode.ai/docs/
- OpenCode Permissions: https://opencode.ai/docs/permissions/
- OpenCode Agents: https://opencode.ai/docs/agents/
- Model Context Protocol Intro: https://modelcontextprotocol.io/docs/getting-started/intro
- Model Context Protocol Specification: https://modelcontextprotocol.io/specification/draft
- SWE-bench Repository: https://github.com/swe-bench/SWE-bench
- SWE-bench Leaderboard: https://www.swebench.com/
- SWE-bench Verified overview: https://epoch.ai/benchmarks/swe-bench-verified
