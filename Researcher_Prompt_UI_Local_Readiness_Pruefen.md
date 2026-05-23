# Researcher — Prompt: Lokale UI-/Frontend-Readiness prüfen und benutzbar machen

## Rolle

Du bist ein Senior Frontend QA Engineer, Playwright E2E Engineer, Local Runtime Engineer und Product-Readiness Agent.

Du arbeitest im Repository `xxammaxx/Researcher`.

Dein Ziel ist NICHT, neue Produktfeatures zu bauen.

Dein Ziel ist, ehrlich zu prüfen und nachzuweisen, ob Researcher bereits ein benutzbares lokales Frontend/User Interface besitzt, wie es gestartet wird, ob es im Browser funktioniert und ob ein Nutzer darüber den minimalen Research-Flow testen kann.

---

# Ausgangsfrage

Der Nutzer fragt:

> Haben wir schon das Frontend / User Interface getestet? Ich habe noch nichts in dieser Richtung gesehen.

Aktuelle ehrliche Einschätzung:

```text
Backend / Runtime / Research Pipeline: stark validiert
Report Evaluation: stark validiert
Security / Unicode / Search Keys: stark validiert
Frontend / User Interface: nicht ausreichend nachgewiesen
```

Dieses Issue muss diese Lücke schließen.

---

# Wichtig: Online-CI ist egal

Dieses Issue ist lokal-first.

Online-CI, GitHub Actions, Release-Tag und GitHub Release sind NICHT Teil dieses Issues.

---

# Validierte externe Grundlagen

Berücksichtige:

- Playwright ist für Browser-/End-to-End-Tests geeignet und kann Chromium, Firefox und WebKit automatisieren.
- Playwright kann Screenshots erzeugen und Browserseiten lokal testen.
- Wenn Vite/React vorhanden ist, ist typischerweise ein lokaler Dev-Server beteiligt.
- Wenn FastAPI/Flask/ähnliches vorhanden ist, kann das UI auch backend-seitig oder als Dashboard ausgeliefert werden.
- Wichtig ist die Unterscheidung zwischen:
  - UI-Code vorhanden
  - UI startbar
  - UI im Browser erreichbar
  - UI bedienbar
  - Research-Flow über UI möglich

---

# Harte Nicht-Ziele

Dieses Issue darf NICHT:

- ein komplett neues UI bauen, bevor bewiesen ist, dass kein UI existiert
- Online-CI reparieren
- Release-Tag erstellen
- GitHub Release veröffentlichen
- Cloud-Fallbacks aktivieren
- neue Research-Features bauen
- bestehende Tests löschen
- Playwright-Tests pauschal skippen
- Coverage-Schwelle senken
- Quality Gates lockern
- externe Live-Crawls ausführen
- Darknet- oder Security-Recherchen starten

---

# Zielzustände

Am Ende muss eine klare Entscheidung stehen:

```text
UI READY
```

oder:

```text
UI PARTIAL
```

oder:

```text
UI MISSING
```

## UI READY bedeutet

- UI-/Frontend-Code wurde gefunden.
- Startbefehl ist dokumentiert.
- UI ist lokal im Browser erreichbar.
- Screenshot wurde erzeugt.
- Playwright-Smoke-Test läuft lokal.
- Keine kritischen Console-Errors.
- Nutzer sieht mindestens:
  - Runtime-/Systemstatus oder Dashboard
  - Research-/Query-Einstieg oder klaren Link
  - Report-/Ergebnisbereich oder klar dokumentierte Einschränkung
- README/Runbook erklärt den UI-Start.

## UI PARTIAL bedeutet

- UI-Code existiert, aber nur teilweise benutzbar.
- Start funktioniert, aber Research-Flow ist nicht vollständig über UI möglich.
- Oder UI lädt, aber wichtige Elemente fehlen.
- Oder Playwright/Screenshot funktioniert, aber manuelle Bedienbarkeit ist eingeschränkt.

## UI MISSING bedeutet

- Kein relevantes UI gefunden.
- Oder nur Backend/API/CLI vorhanden.
- Oder UI startet nicht und es gibt keinen belastbaren lokalen Nutzerpfad.
- Dann muss ein Folge-Issue vorgeschlagen werden:
  - Minimal Local Dashboard
  - oder CLI-first UX statt UI

---

# Phase 0 — Repo-Zustand prüfen

Führe aus:

```bash
git branch --show-current
git rev-parse --short HEAD
git status --short
git log --oneline -5
```

Dokumentiere:

- Branch
- Commit
- uncommitted Änderungen
- untracked Dateien

Wenn uncommitted Änderungen existieren:

- kategorisieren
- keine Caches/Reports/Secrets committen
- keine `.env` committen
- keine großen Screenshots unkontrolliert committen
- Screenshots nur in `qa/ui/` oder `reports/ui/` speichern und per `.gitignore` absichern, falls nicht versioniert

---

# Phase 1 — UI-/Frontend-Code finden

Suche nach Frontend-/Dashboard-/UI-Code:

```bash
find . -maxdepth 4 -type f | grep -Ei "package.json|vite|react|vue|svelte|next|nuxt|frontend|client|dashboard|ui|web|playwright|index.html|app.tsx|app.jsx|main.tsx|main.jsx"

find . -maxdepth 3 -type d | grep -Ei "dashboard|frontend|client|web|ui|app|static|templates|public"

grep -RIn "React\\|Vite\\|Vue\\|Svelte\\|Next\\|FastAPI\\|Flask\\|Jinja\\|StaticFiles\\|dashboard\\|localhost\\|port\\|playwright" . \
  --exclude-dir=.git \
  --exclude-dir=.venv \
  --exclude-dir=node_modules \
  --exclude-dir=__pycache__ \
  | head -300
```

Dokumentiere:

| Fund | Pfad | Bedeutung |
|---|---|---|
| package.json | | Frontend wahrscheinlich |
| dashboard/server.py | | Python Dashboard möglich |
| tests/playwright | | UI-/Browser-Tests möglich |
| static/templates | | Server-rendered UI möglich |

---

# Phase 2 — Startbefehle identifizieren

Prüfe vorhandene Makefile-/Script-Targets:

```bash
make help | grep -Ei "dashboard|ui|frontend|web|client|playwright|browser|dev|serve" || true
grep -n "dashboard\\|ui\\|frontend\\|web\\|client\\|playwright\\|serve\\|dev" Makefile pyproject.toml README.md docs -R || true
```

Wenn `package.json` existiert:

```bash
find . -maxdepth 4 -name package.json -print -exec sh -c 'echo "--- {}"; cat "{}" | sed -n "1,160p"' \;
```

Dokumentiere:

- UI-Startbefehl
- API-/Backend-Startbefehl
- Port
- benötigte ENV-Variablen
- benötigte lokale Dienste

---

# Phase 3 — Dependencies für UI prüfen

Wenn Node/Vite/React vorhanden:

```bash
node --version || true
npm --version || true
```

Dann im passenden Verzeichnis:

```bash
npm install
npm run build || true
npm run dev -- --host 127.0.0.1
```

Wenn Python-Dashboard vorhanden:

```bash
python3 -m pip show fastapi flask streamlit gradio dash panel nicegui || true
```

Prüfe mögliche Starts:

```bash
python3 -m dashboard.server || true
uvicorn dashboard.server:app --host 127.0.0.1 --port 8000 || true
streamlit run dashboard/app.py || true
```

Wichtig:

- Nicht wahllos Prozesse im Hintergrund offen lassen.
- Startbefehl dokumentieren.
- Port dokumentieren.
- Logs speichern.
- Prozess nach Test sauber stoppen.

---

# Phase 4 — Lokale Dienste vorbereiten

UI-Test soll nicht an fehlenden lokalen Diensten scheitern, ohne dass das dokumentiert wird.

Führe aus:

```bash
SEARXNG_TIMEOUT_SECONDS=30 make runtime-smoke
```

Oder getrennt:

```bash
ollama list || true
curl -s http://localhost:11434/api/tags | python3 -m json.tool || true
make searxng-smoke || true
nc -zv 127.0.0.1 9050 || true
```

Dokumentiere:

- Ollama vorhanden?
- Chatmodell vorhanden?
- Embeddingmodell vorhanden?
- SearXNG vorhanden?
- Tor optional?
- Cloud-Blocker OK?

Wenn Dienste fehlen:

- UI trotzdem starten, wenn möglich
- fehlenden Dienst als Runtime-Abhängigkeit dokumentieren
- nicht sofort UI als fehlend klassifizieren

---

# Phase 5 — UI lokal starten

Starte den identifizierten UI-/Dashboard-Prozess.

Beispiele:

## Python Dashboard

```bash
make dashboard
```

oder:

```bash
python3 -m dashboard.server
```

oder:

```bash
uvicorn dashboard.server:app --host 127.0.0.1 --port 8000
```

## Frontend/Vite

```bash
cd <frontend-dir>
npm run dev -- --host 127.0.0.1
```

Dokumentiere:

- Befehl
- Port
- URL
- Startzeit
- Logs
- Fehler

Prüfe erreichbar:

```bash
curl -I http://127.0.0.1:<port> || true
curl -s http://127.0.0.1:<port> | head -80 || true
```

---

# Phase 6 — Browser-/Screenshot-Smoke mit Playwright

Prüfe Playwright:

```bash
python3 - <<'PY'
from playwright.sync_api import sync_playwright
print("Playwright import OK:", sync_playwright)
PY
```

Falls Browser fehlen:

```bash
python3 -m playwright install chromium
```

Nur nach lokaler Zustimmung ausführen, wenn Browser noch nicht installiert sind.

Erstelle oder nutze ein Script:

```text
scripts/ui_smoke.py
```

Minimaler Inhalt:

```python
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:<port>"
OUT = Path("qa/ui")
OUT.mkdir(parents=True, exist_ok=True)

console_errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    response = page.goto(URL, wait_until="networkidle", timeout=15000)
    page.screenshot(path=str(OUT / "ui-smoke.png"), full_page=True)
    title = page.title()
    body_text = page.locator("body").inner_text(timeout=5000)
    browser.close()

print("URL:", URL)
print("HTTP:", response.status if response else "no response")
print("Title:", title)
print("Body length:", len(body_text))
print("Console errors:", console_errors)

if response is None or response.status >= 400:
    raise SystemExit(1)
if len(body_text.strip()) < 20:
    raise SystemExit("UI body appears empty")
if console_errors:
    raise SystemExit("Console errors detected")
```

Wichtig:

- Screenshot nach `qa/ui/ui-smoke.png`
- `qa/` muss ignoriert sein oder bewusst nicht committed werden
- keine externen Seiten öffnen
- nur lokale URL

---

# Phase 7 — UI-Funktionsprüfung

Prüfe manuell oder mit Playwright:

## Basis

- Seite lädt
- Titel sinnvoll
- Body nicht leer
- Navigation sichtbar
- keine kritischen Console-Errors
- keine 404/500 im Hauptscreen

## Runtime Status

Sichtbar oder dokumentiert:

- Ollama
- SearXNG
- Tor optional
- Cloud-Blocker

## Research Flow

Prüfe, ob UI kann:

- Query eingeben
- Research starten
- Fortschritt anzeigen
- Report anzeigen oder verlinken
- Fehler anzeigen

Wenn UI das nicht kann:

```text
UI PARTIAL
```

und Folge-Issue:

```text
[UI/MVP] Minimal Research Dashboard: Query → Run → Report List
```

## Report Flow

Prüfe:

- vorhandene Reports sichtbar?
- Report öffnen möglich?
- Evaluation sichtbar?
- Pfad zu `reports/research/` oder `reports/evaluation/` dokumentiert?

---

# Phase 8 — Playwright-Teststatus klären

Führe aus:

```bash
RUN_PLAYWRIGHT_TESTS=true python3 -m pytest tests/playwright/ -v --tb=long -rs
```

Dokumentiere:

- wie viele Tests laufen
- wie viele skippen
- exakter Skip-Grund
- ob „Playwright Python package is not installed“ weiterhin fälschlich erscheint
- ob Browser fehlt
- ob UI-Service fehlt

Wichtig:

Dieses Issue muss nicht die ganze Playwright-Strategie finalisieren, aber es muss ehrlich sagen, ob UI-Tests real laufen oder nur skippen.

---

# Phase 9 — Lokale Doku aktualisieren

Erstelle oder aktualisiere:

```text
docs/development/ui-local-readiness.md
docs/development/local-runbook.md
README.md
```

Pflichtinhalt für `ui-local-readiness.md`:

```markdown
# UI Local Readiness

## Entscheidung

UI READY / UI PARTIAL / UI MISSING

## Gefundene UI-Komponenten

| Komponente | Pfad | Status |
|---|---|---|

## Startbefehle

```bash
# exakte Befehle
```

## Lokale URL

## Screenshot

Pfad: `qa/ui/ui-smoke.png`

## Playwright Smoke

| Prüfung | Ergebnis |
|---|---|
| Seite lädt | |
| HTTP Status | |
| Body nicht leer | |
| Console Errors | |
| Screenshot erzeugt | |

## UI-Funktionsumfang

| Funktion | Status |
|---|---|
| Runtime-Status sichtbar | |
| Query-Eingabe | |
| Research starten | |
| Report anzeigen | |
| Evaluation anzeigen | |
| Fehleranzeige | |

## Bekannte Grenzen

## Nächste UI-Issues
```

README soll mindestens verlinken:

```markdown
## Local UI

See `docs/development/ui-local-readiness.md`.
```

---

# Phase 10 — Entscheidung treffen

Am Ende klar entscheiden:

## UI READY

Nur wenn:

- UI startet lokal
- Browser lädt UI
- Screenshot vorhanden
- keine kritischen Console-Errors
- ein Nutzer kann mindestens den minimalen lokalen Flow sinnvoll testen
- Doku beschreibt Start und Grenzen

## UI PARTIAL

Wenn:

- UI startet, aber Research-Flow fehlt oder ist unvollständig
- nur Dashboard/Status vorhanden
- Reports nicht über UI erreichbar
- Playwright nur Smoke kann
- Doku beschreibt Einschränkungen

## UI MISSING

Wenn:

- kein UI-Code vorhanden
- kein UI startbar
- nur CLI/API existiert
- Tests nicht sinnvoll ausführbar

---

# Phase 11 — Abschlussbericht

Schreibe Abschlussbericht:

```markdown
# Researcher UI Local Readiness Abschlussbericht

## Entscheidung

`UI READY` / `UI PARTIAL` / `UI MISSING`

## Ergebnis

| Bereich | Status |
|---|---|
| UI-Code gesucht | |
| UI-Komponenten gefunden | |
| Startbefehl identifiziert | |
| UI lokal gestartet | |
| Lokale URL erreichbar | |
| Screenshot erzeugt | |
| Playwright-Smoke ausgeführt | |
| Keine kritischen Console-Errors | |
| Runtime-Status sichtbar | |
| Query-Eingabe möglich | |
| Research über UI startbar | |
| Report über UI sichtbar | |
| Evaluation über UI sichtbar | |
| Playwright-Tests geprüft | |
| Doku aktualisiert | |
| README verlinkt | |
| Keine Cloud-Fallbacks | |
| Keine neuen Research-Features | |
| Kein Release-Tag | |

## Gefundene UI-Komponenten

| Pfad | Typ | Bedeutung |
|---|---|---|

## Startbefehle

```bash
# exakte Befehle
```

## Validierte Befehle

```bash
SEARXNG_TIMEOUT_SECONDS=30 make runtime-smoke
RUN_PLAYWRIGHT_TESTS=true python3 -m pytest tests/playwright/ -v --tb=long -rs
python3 scripts/ui_smoke.py
```

## Screenshot

`qa/ui/ui-smoke.png`

## Bekannte Grenzen

## Nächste empfohlene Issues

Wenn `UI PARTIAL`:

1. `[UI/MVP] Query → Run → Report List`
2. `[UI] Runtime Status Panel`
3. `[UI] Report Viewer + Evaluation Summary`
4. `[TEST] Playwright UI Smoke in local make target`

Wenn `UI MISSING`:

1. `[UI/MVP] Minimal Local Dashboard`
2. `[CLI] Improve CLI-first user flow`

Wenn `UI READY`:

1. `[UX] Polish local dashboard`
2. `[TEST] Add stable Playwright smoke target`
```

---

# Validierung

Pflicht:

```bash
make quality
make coverage
SEARXNG_TIMEOUT_SECONDS=30 make runtime-smoke
RUN_PLAYWRIGHT_TESTS=true python3 -m pytest tests/playwright/ -v --tb=long -rs
```

Optional:

```bash
ALLOW_OLLAMA_MODEL_FALLBACK=true make research-happy-path
make research-evaluate
```

Nicht ausführen:

```text
keine Online-CI
kein Release-Tag
kein GitHub Release
keine externen Live-Crawls
```

---

# Akzeptanzkriterien

Dieses Issue ist abgeschlossen, wenn:

- UI-Existenz eindeutig geklärt ist
- UI-Start dokumentiert ist
- Browser-Smoke durchgeführt oder begründet unmöglich ist
- Screenshot erzeugt oder begründet unmöglich ist
- Playwright-Status ehrlich dokumentiert ist
- Entscheidung `UI READY`, `UI PARTIAL` oder `UI MISSING` getroffen wurde
- lokale Doku aktualisiert ist
- keine neuen Produktfeatures gebaut wurden
- kein Release veröffentlicht wurde
