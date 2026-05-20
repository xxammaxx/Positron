# Positron v3.0 — Abhängigkeitsgraph

**Datum:** 2026-05-20
**Workflow-Zustand:** Analyse abgeschlossen

---

## Abhängigkeitsmatrix

```
                    ┌─────────────────────────────────────────────┐
                    │                  Web UI                      │
                    │              (apps/web/)                     │
                    │         React / Vite / Tailwind              │
                    └──────────────────┬──────────────────────────┘
                                       │ WebSocket / SSE
                                       │ (keine Code-Abhängigkeit)
                    ┌──────────────────▼──────────────────────────┐
                    │               Server                         │
                    │           (apps/server/)                     │
                    │     Node.js / Express / TypeScript           │
                    │                                              │
                    │  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
                    │  │ GitHub   │ │ Spec Kit │ │ OpenCode │    │
                    │  │ Adapter  │ │ Adapter  │ │ Adapter  │    │
                    │  └────┬─────┘ └────┬─────┘ └────┬─────┘    │
                    └───────┼────────────┼────────────┼──────────┘
                            │            │            │
                    ┌───────▼────────────▼────────────▼──────────┐
                    │              Run State                      │
                    │          (packages/run-state/)              │
                    │     State Machine / Events / Artifacts      │
                    └──────────────────┬──────────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────────────┐
                    │               Sandbox                        │
                    │          (packages/sandbox/)                 │
                    │      Git Worktrees / Docker (später)         │
                    └──────────────────┬──────────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────────────┐
                    │               Shared                         │
                    │          (packages/shared/)                  │
                    │      Typen / Interfaces / Konstanten         │
                    └─────────────────────────────────────────────┘
```

---

## Package.json-Abhängigkeiten

### apps/web/
```json
{
  "dependencies": {
    "react": "^19",
    "react-dom": "^19",
    "vite": "^7",
    "tailwindcss": "^4",
    "lucide-react": "^0.500"
  },
  "devDependencies": {
    "@types/react": "^19",
    "vitest": "^3",
    "playwright": "^1.53",
    "@playwright/test": "^1.53"
  }
}
```

### apps/server/
```json
{
  "dependencies": {
    "express": "^5",
    "ws": "^8",
    "better-sqlite3": "^11",
    "@octokit/rest": "^22",
    "execa": "^9",
    "@positron/shared": "workspace:*",
    "@positron/github-adapter": "workspace:*",
    "@positron/speckit-adapter": "workspace:*",
    "@positron/opencode-adapter": "workspace:*",
    "@positron/run-state": "workspace:*",
    "@positron/sandbox": "workspace:*"
  },
  "devDependencies": {
    "@types/express": "^5",
    "@types/ws": "^8",
    "@types/better-sqlite3": "^7",
    "vitest": "^3"
  }
}
```

### packages/github-adapter/
```json
{
  "dependencies": {
    "@octokit/rest": "^22",
    "@positron/shared": "workspace:*"
  },
  "devDependencies": {
    "vitest": "^3"
  }
}
```

### packages/speckit-adapter/
```json
{
  "dependencies": {
    "execa": "^9",
    "@positron/shared": "workspace:*"
  },
  "devDependencies": {
    "vitest": "^3"
  }
}
```

### packages/opencode-adapter/
```json
{
  "dependencies": {
    "execa": "^9",
    "@positron/shared": "workspace:*"
  },
  "devDependencies": {
    "vitest": "^3"
  }
}
```

### packages/run-state/
```json
{
  "dependencies": {
    "better-sqlite3": "^11",
    "@positron/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7",
    "vitest": "^3"
  }
}
```

### packages/sandbox/
```json
{
  "dependencies": {
    "execa": "^9",
    "@positron/shared": "workspace:*"
  },
  "devDependencies": {
    "vitest": "^3"
  }
}
```

### packages/shared/
```json
{
  "dependencies": {},
  "devDependencies": {
    "vitest": "^3"
  }
}
```

---

## Externe Abhängigkeiten (System)

| Abhängigkeit | Version | Zweck | Prüfbar mit |
|-------------|---------|-------|-------------|
| Node.js | ≥ 22 LTS | Runtime | `node --version` |
| npm | ≥ 10 | Package Manager | `npm --version` |
| git | ≥ 2.45 | Version Control, Worktrees | `git --version` |
| gh (GitHub CLI) | ≥ 2.70 | GitHub API (fallback) | `gh --version` |
| Spec Kit CLI | latest | Spezifikation & Planung | `specify --version` (?) |
| OpenCode CLI | latest | Agenten-Ausführung | `opencode --version` (?) |

---

## Abhängigkeitsregeln (Architektur-Constraints)

### Regel 1: Keine zyklischen Abhängigkeiten
```
✅ shared → (nichts)
✅ github-adapter → shared
✅ speckit-adapter → shared
✅ opencode-adapter → shared
✅ run-state → shared
✅ sandbox → shared
✅ server → shared, github-adapter, speckit-adapter, opencode-adapter, run-state, sandbox
✅ web → (nur via WebSocket, keine Code-Importe)
```

### Regel 2: Dependency Inversion zwischen Server und Adaptern
- `server/` importiert Adapter-Interfaces aus `shared/`
- Adapter implementieren diese Interfaces
- Server kennt konkrete Adapter nur zur Laufzeit (Dependency Injection)

### Regel 3: Sandbox ist isoliert
- `sandbox/` hat KEINE Abhängigkeit zu `github-adapter`, `speckit-adapter`, `opencode-adapter`
- `sandbox/` kommuniziert nur über Dateisystem (Artefakte) und Exit-Codes

### Regel 4: Run-State ist reaktiv, nicht aktiv
- `run-state/` löst KEINE Aktionen aus
- `run-state/` validiert nur und speichert Zustände
- `server/` liest Zustände und entscheidet über Aktionen

---

## Datenfluss pro Run

```
1. GitHub Watcher (Polling)
   │  Issue erkannt
   ▼
2. Server: Run erstellen (run-state)
   │  run.json, Branch erstellt
   ▼
3. GitHub Adapter: Issue claimen, Label setzen
   │  positron:running
   ▼
4. Sandbox: Worktree erstellen
   │  Isolierter Workspace
   ▼
5. Spec Kit Adapter: Spec + Plan + Tasks
   │  spec.md, plan.md, tasks.md
   ▼
6. OpenCode Adapter: Agent starten
   │  Config + Instructions + Tasks
   ▼
7. Sandbox: Tests ausführen
   │  Test-Output, Diff
   ▼
8. GitHub Adapter: PR erstellen
   │  Branch pushen, PR öffnen
   ▼
9. Run-State: Run abschließen
   │  Metriken, Artefakte gespeichert
   ▼
10. GitHub Adapter: Issue kommentieren
    Delivery Summary, Testreport
```

---

## Build- und Ausführungsgraph

```
Repository klonen
  │
  ├─► npm install (alle Workspaces)
  │     │
  │     ├─► packages/shared bauen
  │     │
  │     ├─► packages/* (Adapter) bauen
  │     │     │
  │     │     └─► hängen von shared ab
  │     │
  │     ├─► apps/server bauen
  │     │     │
  │     │     └─► hängt von allen packages ab
  │     │
  │     └─► apps/web bauen
  │
  ├─► npm test (alle Workspaces)
  │     │
  │     ├─► shared Tests
  │     ├─► github-adapter Tests
  │     ├─► speckit-adapter Tests
  │     ├─► opencode-adapter Tests
  │     ├─► run-state Tests
  │     ├─► sandbox Tests
  │     ├─► server Tests
  │     └─► web Tests (Vitest + Playwright)
  │
  └─► npm start (apps/server + apps/web)
```

---

## Kritische Pfade

### Pfad 1: Issue → Spec (Research-gesteuert)
```
Issue erkennen → Repo klonen → Kontext sammeln → Recherche → Spec
```
**Kritisch weil:** Falsche Recherche führt zu falscher Spec

### Pfad 2: Spec → Tasks (Qualitäts-gesteuert)
```
Spec → Plan → Tasks → Analyze → Review
```
**Kritisch weil:** Rücksprung bei FAIL zu Plan oder Tasks möglich

### Pfad 3: Tasks → PR (Test-gesteuert)
```
Tasks → Implement → Test → Verify → PR
```
**Kritisch weil:** Max 3 Fix-Loops, dann Blockade

---

## Risiko-Mapping zu Modulen

| Risiko | Betroffene Module | Gegenmaßnahme |
|--------|------------------|--------------|
| Endlosschleife | run-state, opencode-adapter | Max Retries, Timeout, Step-Limit |
| Zu viele Änderungen | sandbox, run-state | Diff-Größenlimit, Scope-Check |
| Fehlende Tests | speckit-adapter, sandbox | Test Command Detection, Minimaltest |
| Secret-Leakage | Alle Adapter | Secret Redaction in shared/ |
| Falsche Recherche | speckit-adapter | Quellenliste, offizielle Dokus priorisieren |
