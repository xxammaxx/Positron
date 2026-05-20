# Positron v3.0 — Architektur

**Datum:** 2026-05-20
**Workflow-Zustand:** Analyse abgeschlossen

---

## Zielarchitektur (Blueprint §4)

```
┌─────────────────────────────────────────────┐
│                 Web UI                       │
│ React / Vite / Tailwind                      │
│ Dashboard, Run View, Logs, Diff, Gates       │
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

---

## Architekturprinzipien

1. **Deterministische State Machine** — Der Workflow ist strikt, Agenten dürfen kreativ sein, der Workflow nicht.
2. **Persistente Artefakte** — Jeder Run hinterlässt einen vollständigen, wiederherstellbaren Zustand.
3. **Kontrollierte Agentenaufrufe** — OpenCode bekommt nur das Nötigste: Issue-Kontext, Research, Spec, Plan, Tasks, Constitution.
4. **Harte Gates** — Kein Übergang ohne Erfüllung aller Checkpoints.
5. **GitHub-Kommentare** — Jeder Schritt ist extern sichtbar und nachvollziehbar.
6. **Tests als Beweis** — Nicht Behauptungen, sondern Testergebnisse zählen.

---

## Projektsstruktur (Blueprint §14)

```
positron/
├── apps/
│   ├── web/                  # React/Vite/Tailwind Frontend
│   └── server/               # Node.js/Express/TypeScript Backend
├── packages/
│   ├── github-adapter/       # GitHub API Wrapper
│   ├── speckit-adapter/      # Spec Kit CLI Adapter
│   ├── opencode-adapter/     # OpenCode CLI Adapter
│   ├── run-state/            # State Machine & Run-Management
│   ├── sandbox/              # Git Worktree / Docker-Isolation
│   └── shared/               # Gemeinsame Typen, Utilities
├── docs/
│   ├── architecture/         # Architektur-Dokumentation
│   ├── security/             # Sicherheitskonzepte
│   └── workflows/            # Workflow-Dokumentation
├── .positron/
│   └── runs/                 # Run-Artefakte (pro Issue)
├── .specify/
│   └── memory/
│       └── constitution.md   # Positron-Constitution
├── AGENTS.md                 # Agenten-Regelwerk
└── README.md
```

---

## Technologie-Stack

### MVP (TypeScript-first)
| Schicht | Technologie | Begründung |
|---------|-------------|------------|
| Frontend | React / Vite / Tailwind | Schnelle Entwicklung, Tailwind für UI-Konsistenz |
| Backend | Node.js / Express / TypeScript | TypeScript-Ökosystem, einfache CLI-Integration |
| Datenbank | SQLite (better-sqlite3) | Kein Server-Setup, dateibasiert, ausreichend für MVP |
| Tests | Vitest + Playwright | Schnell (Vitest), visuelles Testing (Playwright) |
| Sandbox | Git Worktrees (MVP), Docker (später) | Isolierung ohne Docker-Daemon-Abhängigkeit |
| CLI-Integration | child_process / execa | Kontrollierte Prozessaufrufe für Spec Kit + OpenCode |

### Warum nicht FastAPI?
FastAPI (Python) bleibt eine spätere Option, ist aber für den vorhandenen TypeScript-nahen Positron-Stand kein Muss (Blueprint §4.1).

---

## Modulabhängigkeiten

```
Web UI ────► Orchestrator (WebSocket/SSE)
                 │
     ┌───────────┼───────────┐
     ▼           ▼           ▼
GitHub      Spec Kit    OpenCode
Adapter     Adapter     Adapter
     │           │           │
     └───────────┼───────────┘
                 ▼
           Sandbox
                 │
                 ▼
           Persistenz (SQLite)
```

### Abhängigkeitsregeln
- `shared/` hat keine internen Abhängigkeiten (nur externe: TypeScript)
- Adapter (`github-adapter`, `speckit-adapter`, `opencode-adapter`) hängen nur von `shared/` ab
- `run-state/` hängt von `shared/` ab — NICHT von Adaptern (Dependency Inversion)
- `server/` orchestriert Adapter über `run-state/`
- `web/` hängt nur vom Server via WebSocket/SSE ab

---

## State Machine (Run Orchestrator)

```
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

Fehlerzustände:
  FAILED_TRANSIENT → Retry (max 3)
  FAILED_BLOCKED   → GitHub-Kommentar + Stop
  FAILED_UNSAFE    → Sofortiger Stop (kein Retry)
```

---

## Datenbank-Schema (SQLite)

```sql
-- Registrierte Repositories
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

-- Überwachte Issues
CREATE TABLE issues (
  id TEXT PRIMARY KEY,
  repo_id TEXT NOT NULL REFERENCES repositories(id),
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  state TEXT NOT NULL,
  labels_json TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

-- Runs (pro Issue)
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  repo_id TEXT NOT NULL REFERENCES repositories(id),
  issue_number INTEGER NOT NULL,
  branch TEXT,
  phase TEXT NOT NULL,
  status TEXT NOT NULL,
  autonomy_level INTEGER NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  finished_at TEXT
);

-- Ereignisprotokoll
CREATE TABLE run_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  phase TEXT NOT NULL,
  level TEXT NOT NULL,        -- INFO, WARN, ERROR, GATE, HUMAN
  message TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL
);

-- Artefakt-Metadaten
CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  kind TEXT NOT NULL,         -- spec, plan, tasks, review, test-report, ...
  path TEXT NOT NULL,
  sha256 TEXT,
  created_at TEXT NOT NULL
);

-- Kommando-Ergebnisse
CREATE TABLE command_results (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  command TEXT NOT NULL,
  exit_code INTEGER,
  stdout_path TEXT,
  stderr_path TEXT,
  duration_ms INTEGER,
  created_at TEXT NOT NULL
);
```

---

## Sicherheitsarchitektur

### Bedrohungsmodell
1. **Secret-Leakage**: Tokens und Keys an LLMs
2. **Unkontrollierte Code-Execution**: `sudo`, `rm -rf`, Systemmanipulation
3. **Main-Branch-Korruption**: Direktes Pushen auf geschützte Branches
4. **Unbemerkte Fehler**: Stille Fehler ohne Logging

### Schutzmaßnahmen
- **Secret Redaction**: Musterbasierte Maskierung von `ghp_*`, `sk-*`, `anthropic_*`, `gemini_*`
- **Bash-Allowlist**: Nur explizit erlaubte Befehle im Autonomous Mode
- **Branch-Schutz**: Nur `positron/issue-<n>-<slug>` Branches
- **GitHub Source of Truth**: Alle Entscheidungen sichtbar im Issue
- **Harte Gates**: Kein Fortschritt ohne bestandene Checks
