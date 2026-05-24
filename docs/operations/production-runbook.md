# Positron Production Runbook

> Stand: 2026-05-24
> Version: v0.1.0-rc.1
> Ziel: Betriebssicherer Einsatz von Positron im Supervised Mode

## Systemvoraussetzungen

### Hardware (getestet)
| Komponente | Minimum | Empfohlen |
|------------|---------|-----------|
| CPU | 2 Kerne | 4 Kerne |
| RAM | 2 GB | 4 GB |
| Festplatte | 5 GB frei | 20 GB SSD |
| Netzwerk | Internetzugang (GitHub API) | 50 Mbit/s |

### Software
| Abhängigkeit | Version | Prüfung |
|-------------|---------|---------|
| Node.js | >= 22 LTS | `node --version` |
| npm | >= 10 | `npm --version` |
| Git | >= 2.45 | `git --version` |
| GitHub Token | `repo` Scope | In `GITHUB_TOKEN` |

## Installation (Linux Mint / Heimserver)

```bash
# 1. Repository klonen
git clone https://github.com/xxammaxx/Positron.git
cd Positron

# 2. Auf stable Branch wechseln
git checkout positron/issue-33-release-hardening

# 3. Abhängigkeiten installieren
npm install

# 4. Build
npm run build

# 5. Tests ausführen
npm test

# 6. .env konfigurieren
cp .env.example .env
# → .env editieren mit eigenem GitHub Token und Repo

# 7. Server starten
cd apps/server
npx tsx src/index.ts

# 8. Web UI öffnen
# → http://localhost:3000
```

## Safety-Profile

### Profile im Vergleich

| Eigenschaft | Observe | Supervised | Autonomous-Safe |
|------------|---------|------------|-----------------|
| GitHub Read | ✅ | ✅ | ✅ |
| GitHub Write (Labels/Comments) | ❌ | ✅ | ✅ |
| Lokale Commits | ❌ | ✅ | ✅ |
| Git Push | ❌ | ⛔ Gate | ✅ Gate |
| PR Creation | ❌ | ✅ | ✅ |
| Auto-Merge | ❌ | ⛔ Gate | ✅ Gate |
| Fix-Loop | ❌ | ❌ | ✅ Gate |
| SpecKit CLI | ❌ | ⛔ Gate | ⛔ Gate |
| OpenCode CLI | ❌ | ⛔ Gate | ⛔ Gate |
| SSE Live Updates | ✅ | ✅ | ✅ |
| Run-Control | ✅ | ✅ | ✅ |
| Reviewer-Zuweisung | ❌ | ✅ | ✅ |

**Gates:** ⛔ = durch Env-Variable geschützt, muss explizit aktiviert werden

### Supervised — Env-Konfiguration (empfohlen für Dogfood)

```bash
GITHUB_MODE=real
POSITRON_ENABLE_PUSH=false
POSITRON_ENABLE_MERGE=false
POSITRON_MERGE_DRY_RUN=true
POSITRON_MERGE_KILL_SWITCH=false
POSITRON_ENABLE_FIX_LOOP=false
POSITRON_SPECKIT_MODE=fake
POSITRON_OPENCODE_MODE=fake
```

## Sicherheitsgates (Übersicht)

### Merge Gates (6 Stufen)
| Gate | Env Var | Wirkung bei Fail |
|------|---------|------------------|
| Auto-Merge Enabled | `POSITRON_ENABLE_MERGE` | Merge wird übersprungen |
| Dry-Run | `POSITRON_MERGE_DRY_RUN` | Merge wird simuliert |
| Kill-Switch | `POSITRON_MERGE_KILL_SWITCH` | ALLE Merges sofort blockiert |
| Run Status | `run.status === active` | Nur aktive Runs können mergen |
| Test Evidence | TEST phase events vorhanden | Merge ohne Tests blockiert |
| Branch Exists | `run.branch !== null` | Merge ohne Branch blockiert |

### Safety Controls (5 Flags)
| Flag | Env Var | Wirkung |
|------|---------|---------|
| Enable Merge | `POSITRON_ENABLE_MERGE` | Auto-Merge Freigabe |
| Dry Run | `POSITRON_MERGE_DRY_RUN` | Merge simulieren |
| Enable Push | `POSITRON_ENABLE_PUSH` | Git Push Freigabe |
| Kill Switch | `POSITRON_MERGE_KILL_SWITCH` | Alle Merges sofort stoppen |
| Fix Loop | `POSITRON_ENABLE_FIX_LOOP` | Automatischer Retry |

### Live-Sichtbarkeit
Alle Sicherheitsgates und Safety-Controls sind im Operator Dashboard live sichtbar:
- **Dashboard-Ansicht:** Safety Controls Panel (5 Flags mit ON/OFF)
- **Run-Detail:** Merge Gates (6 Stufen mit Tooltip-Erklärung)
- **SSE Live-Updates:** Statusänderungen in Echtzeit

## Branch Protection

### Empfohlene GitHub Branch Protection Rules (für das Ziel-Repo)

```
Branch: main (oder default branch)
☑ Require pull request reviews before merging
   ☑ Dismiss stale reviews
☑ Require status checks to pass before merging
   ☑ Require branches to be up to date
☑ Require conversation resolution
☑ Include administrators
```

### Positron-eigene Branch-Regeln
- Nur Branches mit Prefix `positron/issue-<N>-<slug>` verwenden
- Kein Force-Push (`--force`, `--force-with-lease`)
- Kein Push auf `main`/`master`
- Push nur mit `POSITRON_ENABLE_PUSH=true`
- Commit-Messages: `feat|fix|test|docs(issue-N): ...`

## API-Endpoints

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| POST | `/api/repos` | Repository registrieren |
| GET | `/api/repos/:id/issues` | Issues abrufen |
| POST | `/api/repos/:repoId/runs` | Run starten |
| GET | `/api/runs` | Alle Runs auflisten |
| GET | `/api/runs/:id` | Run-Details |
| GET | `/api/runs/:id/events/stream` | SSE Event-Stream (Live-Updates) |
| POST | `/api/runs/:id/control` | Run Control (pause/abort/resume/retry) |
| GET | `/api/runs/:id/merge-status` | Merge-Gates-Status |
| GET | `/api/adapters/health` | Adapter-Health |
| GET | `/api/safety` | Safety-State |
| GET | `/api/health` | Health-Check |

## Troubleshooting

### Run startet nicht
1. Prüfe `POSITRON_REPO_OWNER` und `POSITRON_REPO_NAME`
2. Prüfe `GITHUB_TOKEN` (muss `repo` Scope haben)
3. Dashboard zeigt Fehlermeldung im Issue Queue

### Merge wird blockiert
1. Öffne Run-Detail → Merge Gates prüfen
2. Welches Gate schlägt fehl? (Tooltip zeigt Begründung)
3. Entweder Gate-fix (Env Var setzen) oder manuell mergen

### SSE-Verbindung bricht ab
1. Dashboard zeigt gelben/grauen Connection-Status
2. Automatischer Reconnect mit Backoff (1s-30s)
3. Bei dauerhaftem Fehler: Server neustarten

### Run-Control reagiert nicht
1. Prüfe ob Run noch aktiv (nicht DONE/FAILED)
2. Prüfe ob Control-Endpoint erreichbar (`POST /api/runs/:id/control`)
3. Bei 409: Run-Status erlaubt diese Aktion nicht

## Monitoring

### Was im Dashboard beobachten
- **Safety Controls:** Alle Flags korrekt gesetzt?
- **Adapter Health:** Alle Adapter verfügbar?
- **Run Pipeline:** In welcher Phase hängt der Run?
- **Merge Gates:** Warum ist Merge blockiert?
- **Connection Status:** SSE verbunden?
- **Event Log:** Gibt es WARN/ERROR-Events?

### Was im Server-Log beobachten
```bash
# Server stdout zeigt Run-Phasen und Events
cd apps/server && npx tsx src/index.ts 2>&1 | tee positron.log
```

### Was in GitHub beobachten
- Issue-Kommentare (Positron schreibt Status-Updates)
- Labels (positron:running, positron:blocked, positron:done)
- PR-Status (Auto-Merge-Dry-Run, Auto-Merge-Result)

## Notfall-Prozeduren

### Kill-Switch auslösen
```bash
export POSITRON_MERGE_KILL_SWITCH=true
# Server neustarten
# → Alle laufenden Merges werden beim nächsten Phasenübergang blockiert
```

### Notfall-Stopp
```bash
# 1. Server beenden (Ctrl+C)
# 2. Falls nötig: Git Branch manuell löschen
git branch -D positron/issue-<N>-<slug>
# 3. GitHub PR schließen (manuell)
# 4. Issue-Label zurücksetzen (manuell)
```

### Rollback eines Merges
```bash
# GitHub UI: PR revert
# Oder via Git:
git revert <merge-commit-sha>
git push origin main
```
