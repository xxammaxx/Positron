# Positron v3.0 — Blueprint-Analyse

**Datum:** 2026-05-20
**Quelle:** Blueprint.md (1066 Zeilen)
**Workflow-Zustand:** Blueprint erhalten → Analyse abgeschlossen

---

## 1. Systemübersicht

Positron ist ein **lokaler GitHub-Issue-Orchestrator** für agentische Softwareentwicklung. Es verwandelt GitHub-Issues in überprüfbare, dokumentierte, getestete Pull Requests — mit Spec Kit als Planungsschicht, OpenCode als Ausführungsschicht und GitHub als Source of Truth.

Seit v0.2.0 besitzt die Produktionsarchitektur zusätzlich einen Worker/Queue-Layer: Der Browser startet Runs über den Server, der Server queued Pipeline-Jobs via BullMQ in Redis 7, ein separater Worker verarbeitet die Pipeline und persistiert Fortschritt in derselben SQLite-Datenbank. Wenn Redis oder ein Worker nicht verfügbar sind, fällt der Server kontrolliert auf Inline-Ausführung zurück.

### Kernprinzipien

| Prinzip | Bedeutung |
|---------|-----------|
| **Kein Code ohne Spec** | Jedes Issue durchläuft Spec/Plan/Tasks vor Implementierung |
| **Kein Fortschritt ohne GitHub-Kommentar** | Jeder Schritt wird im Issue dokumentiert |
| **Kein Erfolg ohne Testbeweis** | Tests, Build, Lint als Pflichtnachweise |
| **Keine Vollautonomie außerhalb einer Sandbox** | Autonomie ist gestuft und konfigurierbar |
| **Kein neues Issue vor Abschluss/Blockade des aktuellen** | Strikte Issue-Reihenfolge |

### Ein-Satz-Definition (Blueprint §1.1)

> Positron verwandelt GitHub-Issues in überprüfbare, dokumentierte, getestete Pull Requests — mit Spec Kit als Planungsschicht, OpenCode als Ausführungsschicht und GitHub als Source of Truth.

---

## 2. Funktionale Einheiten (Kernmodule)

### 2.1 GitHub Watcher (§5.1)
- Repositories registrieren
- Issues per Polling abrufen (60–180 Sek.)
- Labels und Kommentare lesen/schreiben
- PRs erstellen
- Status-Labels: `positron:ready`, `positron:running`, `positron:research`, `positron:planning`, `positron:implementing`, `positron:testing`, `positron:blocked`, `positron:pr-created`, `positron:done`

### 2.2 Run Orchestrator (§5.2)
- Deterministische State Machine mit 17+ Phasen
- Hauptpfad: QUEUED → CLAIMED → REPO_SYNC → ISSUE_CONTEXT → WEB_RESEARCH → SPECIFY → CLARIFY_OPTIONAL → PLAN → TASKS → ANALYZE → REVIEW → IMPLEMENT → TEST → VERIFY → PR_CREATE → DONE
- Fehlerzustände: FAILED_TRANSIENT (Retry), FAILED_BLOCKED (GitHub-Kommentar + Stop), FAILED_UNSAFE (Sofortiger Stop)
- v0.2.0: Der HTTP-Orchestrator ist im Produktionspfad primär Queue-Producer; die eigentliche Pipeline-Ausführung läuft bevorzugt im Worker.

### 2.2a Worker/Queue Layer (v0.2.0)
- **Producer:** `apps/server/src/index.ts` erzeugt Runs, persistiert sie und versucht, BullMQ-Jobs zu enqueuen.
- **Broker:** Redis 7 hält die BullMQ-Queue `positron-pipeline`.
- **Consumer:** `apps/worker/src/index.ts` verarbeitet `pipeline`-Jobs mit einer BullMQ-Worker-Instanz.
- **Pipeline:** `apps/worker/src/pipeline-runner.ts` enthält eine worker-seitige Pipeline-Ausführung mit denselben Adapter-Abstraktionen wie der Server.
- **Queue-Typen:** `packages/shared/src/queue/types.ts` definiert `PipelineJobData`, `PipelineJobResult`, `PIPELINE_QUEUE` und `POSITRON_REDIS_URL`-Auflösung.
- **Fallback:** Vor dem Enqueue prüft der Server `queue.getWorkers()`. Ohne Redis oder ohne registrierten Worker wird inline über `runFullPipeline(...)` verarbeitet.
- **Job-Idempotenz:** BullMQ-Jobs verwenden `run.id` als deterministische `jobId`.

### 2.3 Artifact Manager (§5.3)
- Pro Run eigener Artefaktordner unter `.positron/runs/issue-<id>/`
- Enthält: `run.json`, `issue-context.md`, `research.md`, `spec.md`, `plan.md`, `tasks.md`, `review.md`, `test-report.md`, `verify-report.md`, `delivery-summary.md`, Logs und Patches

### 2.4 Spec Kit Adapter (§5.4)
- Kapselt Spec-Kit-CLI-Phasen: constitution → specify → clarify → plan → checklist → tasks → analyze → review → implement → verify
- Validiert Artefakte (existiert spec.md? testbare Anforderungen? plan.md? tasks.md mit Dateipfaden?)

### 2.5 OpenCode Adapter (§5.5)
- Startet OpenCode pro Run mit temporärer Config
- Zwei Modi: Supervised (read/webfetch allow, edit/bash ask) und Autonomous Sandbox (edit allow, bash mit Allowlist)

---

## 3. Datenmodell (§9)

### Tabellen (SQLite MVP)

| Tabelle | Zweck | Schlüsselfelder |
|---------|-------|----------------|
| `repositories` | Registrierte Repos | id, owner, name, url, local_path |
| `issues` | Überwachte Issues | id, repo_id, number, state, labels_json |
| `runs` | Aktive/abgeschlossene Runs | id, repo_id, issue_number, branch, phase, status, autonomy_level |
| `run_events` | Ereignisprotokoll pro Run | id, run_id, phase, level, message |
| `artifacts` | Artefakt-Metadaten | id, run_id, kind, path, sha256 |
| `command_results` | Kommando-Ergebnisse | id, run_id, command, exit_code, duration_ms |

---

## 4. Schnittstellen

### Extern
- **GitHub API**: Issues lesen/schreiben, PRs erstellen, Labels setzen
- **Spec Kit CLI**: `/speckit.*` Befehle ausführen
- **OpenCode CLI**: Agenten starten und überwachen

### Intern
- **Web UI ↔ Orchestrator**: WebSocket / SSE
- **Web UI ↔ Server bei Worker-Runs**: Polling über `GET /api/runs/:id`, da Worker keine SSE-Clients im Serverprozess besitzt
- **Orchestrator ↔ Adapter**: Prozessaufrufe mit kontrollierten Configs
- **Orchestrator ↔ Persistenz**: SQLite (MVP)
- **Server ↔ Redis ↔ Worker**: BullMQ-Queueing für Produktionsläufe
- **Server/Worker ↔ Persistenz**: gemeinsame SQLite-Datei auf `positron-data` Docker-Volume
- **Nginx ↔ Server/Web**: `/api/*` wird an den Server geleitet, alle übrigen Pfade an das Web-Frontend

### MCP-Design (§6)
- Positron MCP Server mit Tool-Gruppen: `positron.github`, `positron.repo`, `positron.run`, `positron.qa`
- Enge Argument-Schemas, Safety Guards, Secret-Ausschluss

---

## 5. Abhängigkeiten

### Technologie-Stack
- **Frontend**: React / Vite / Tailwind
- **Backend**: Node.js / Express / TypeScript
- **Worker**: Node.js / TypeScript / BullMQ
- **Queue/Broker**: Redis 7 (`redis:7-alpine`) + BullMQ
- **Reverse Proxy**: Nginx Alpine
- **Datenbank**: SQLite (MVP) → PostgreSQL (optional)
- **Tests**: Vitest + Playwright
- **Sandbox**: Git Worktrees (zuerst), Docker (später)

### Externe Abhängigkeiten
- GitHub API (Token erforderlich)
- Spec Kit CLI (installiert im System)
- OpenCode CLI (installiert im System)
- NPM/npx für TypeScript-Projekt
- Redis 7 für produktionsfähiges Queueing; ohne Redis greift Inline-Fallback

### Deployment-Erweiterung v0.2.0
- Docker Compose definiert `nginx`, `redis`, `server`, `worker` und `web`.
- `server` und `worker` teilen das Volume `positron-data` für `/app/.positron/runs/positron.db`.
- `redis` nutzt `redis-data`.
- Server und Worker basieren auf Debian-slim (`node:22-slim`) für glibc-Kompatibilität nativer Module und CLI-Tools; der Web-Container nutzt Alpine (`node:22-alpine`), da er keine nativen Abhängigkeiten benötigt.
- Nginx deaktiviert Proxy-Buffering für `/api/*`, damit SSE im Inline-Fallback funktioniert.

---

## 6. Sicherheitsanforderungen (§8)

### Harte Verbote
- ❌ Direkt auf `main`/`master` schreiben
- ❌ Issues ohne Testbericht schließen
- ❌ Secrets an LLMs geben
- ❌ Tokens in Logs schreiben
- ❌ `sudo` ausführen
- ❌ Außerhalb des Workspace löschen
- ❌ Auto-Merge ohne explizite Konfiguration

### Secret Handling
- GitHub Token im OS Secret Store oder `.env` außerhalb des Repo
- LLM Keys niemals im Prompt-Kontext
- Redaction für bekannte Tokenmuster (`ghp_*`, `sk-*`, `anthropic_*`, `gemini_*`)

### Branch-Regel
```
positron/issue-<number>-<slug>
```

---

## 7. Testing

- **Framework**: Vitest (Unit/Integration) + Playwright (E2E/Visuell)
- **Evidence-Gated**: Tests müssen ausgeführt und bestanden sein
- **QA Loop**: Maximal 3 Fix-Iterationen, dann Blockade
- **Test Command Detection**: Automatische Erkennung der Testbefehle im Repo
- **Worker-Runs**: Fortschritt wird über DB-Persistenz und API-Polling validiert; SSE-Livetests gelten nur für Inline-Fallback-Runs.

---

## 8. Autonomie-Level (§7)

| Level | Name | Code | Tests | Push | Merge |
|-------|------|------|-------|------|-------|
| 0 | Observer | ❌ | ❌ | ❌ | ❌ |
| 1 | Research & Spec | ❌ | ❌ | ❌ | ❌ |
| 2 | Supervised Build | ✅ (ask) | ✅ | ✅ (ask) | ❌ |
| 3 | Autonomous Sandbox | ✅ | ✅ (allowlist) | ✅ (isolated) | ❌ |
| 4 | CI Auto-PR | ✅ | ✅ | ✅ | ✅ (opt., green) |

---

## 9. MVP-Roadmap

| MVP | Name | Kernfunktion |
|-----|------|-------------|
| MVP 1 | Lokaler Issue Runner | Research + Spec (keine Implementierung) |
| MVP 2 | OpenCode Supervised Build | OpenCode-Integration mit User-Gates |
| MVP 3 | PR Delivery | Commit, Push, PR-Erstellung |
| MVP 4 | Autonomous Sandbox | Docker/Worktree-Isolation |
| MVP 5 | Multi-Repo Scheduler | Mehrere Repos, Queue, Metriken |

### v0.2.0 Architekturstand

Der Queue/Worker-Anteil aus der Roadmap ist für den Produktionspfad vorgezogen umgesetzt: BullMQ + Redis entkoppeln API-Annahme von Pipeline-Ausführung. Die Architektur bleibt rückwärtskompatibel, weil lokale und degradierte Umgebungen über Inline-Fallback weiter funktionieren.

---

## 10. Wichtigste Risiken (§16)

| Risiko | Gegenmaßnahme |
|--------|--------------|
| Agent in Endlosschleife | Max Steps, Retries, Duration, Timeout; Stop nach 3 Fix-Loops |
| Agent ändert zu viel | Diff-Größenlimit, Scope-Check, Review-Gate, PR statt Direkt-Merge |
| Tests fehlen/unzuverlässig | Test Command Detection, Testreport Pflicht, Minimaltest erzwingen |
| Secrets im Kontext | Secret Redaction, `.env` nicht lesen, Tokenmuster maskieren |
| Worker nicht verfügbar | Server prüft `queue.getWorkers()` und nutzt Inline-Fallback statt verlorener Queue-Jobs |
| Redis-Ausfall | Queue-Verbindung hat kurze Timeouts; Fallback verarbeitet Runs direkt im Server |
| Divergenter Run-Zustand zwischen Server und Worker | Gemeinsame SQLite-Datei auf `positron-data`; Worker persistiert nach Phasenübergängen |
| SSE-Erwartung bei Worker-Runs | Architektur trennt klar: SSE nur Inline-Fallback, Worker-Runs via Polling |
| Falsche Webrecherche | Quellenliste, offizielle Dokus priorisieren, Datum dokumentieren |

---

## 11. Definition of Done (§17)

Ein Positron-Run ist abgeschlossen, wenn:
- [ ] Issue geclaimt
- [ ] Repo-Kontext gelesen
- [ ] Webrecherche durchgeführt
- [ ] Research im Issue kommentiert
- [ ] Spec existiert
- [ ] Plan existiert
- [ ] Tasks existieren
- [ ] Review durchgeführt
- [ ] Implementierung abgeschlossen
- [ ] Tests ausgeführt
- [ ] Testreport existiert
- [ ] Diff zusammengefasst
- [ ] PR erstellt oder Blocker dokumentiert
- [ ] GitHub final kommentiert

---

## 12. Constraints aus der Constitution

1. **GitHub Source of Truth**: 10 Pflichtkommentare pro Run
2. **Spec Before Code**: 8-Phasen-Pipeline vor Implementierung
3. **Positron Orchestrates, Agents Execute**: Trennung von Steuerung und Ausführung
4. **Evidence-Gated Progression**: Beweise, nicht Behauptungen
5. **Controlled Autonomy**: Stufenweise, konfigurierbar
6. **Small, Reversible Changes**: Ein Issue pro Run, kleine Commits
7. **No Silent Failure**: Alle Fehler geloggt und in GitHub sichtbar
8. **Resume by State, Not by Memory**: Persistente Zustände, kein Chat-Verlauf nötig
9. **Security by Default**: Secrets-Schutz, Bash-Allowlists
10. **Human Override Always Wins**: Nutzer kann jederzeit eingreifen
