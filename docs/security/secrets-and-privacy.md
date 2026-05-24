# Secrets and Privacy Handling

> Stand: 2026-05-24
> Version: v0.1.0-rc.1

## Grundsätze

1. **Keine Secrets im Klartext** — Weder in Logs, UI, SSE-Stream, GitHub-Kommentaren oder Event-Payloads
2. **Kleinste Privilegien** — GitHub Token nur mit benötigten Scopes
3. **Datenminimierung** — Nur Daten verarbeiten, die für den Run notwendig sind
4. **Kontrollierte Ausgabe** — Alle Ausgabekanäle werden auf Secrets geprüft
5. **Nachvollziehbarkeit** — Jeder Datenzugriff wird geloggt (ohne Secrets)

## Secret-Arten

| Secret | Quelle | Verwendung | Risiko bei Leak |
|--------|--------|------------|-----------------|
| `GITHUB_TOKEN` | Env-Variable | GitHub API Zugriff | Vollzugriff auf Repos |
| `OPENAI_API_KEY` | Env-Variable (optional) | OpenCode LLM-Zugriff | Kosten + Missbrauch |
| `ANTHROPIC_API_KEY` | Env-Variable (optional) | OpenCode LLM-Zugriff | Kosten + Missbrauch |
| SSH Keys | ~/.ssh/ | Git-Zugriff (optional) | Server-Zugriff |

## Automatische Redaktion

### Funktionsweise
Die Funktion `redactSecrets()` in `packages/shared/src/utils.ts` wird auf alle ausgehenden Daten angewendet:

```typescript
// Beispiel: Ein Event mit Token wird automatisch maskiert
"Run started with token ghp_xxxxxxxxxxxxx"
→ "Run started with token [REDACTED]"
```

### Maskierte Pattern
```
GitHub:    ghp_****, gho_****, ghu_****, ghs_****, ghr_****
OpenAI:    sk-****
Anthropic: anthropic-****
Google:    gemini-****
```

### Anwendungsbereiche
| Kanal | Redaktion Aktiv | Seit |
|-------|----------------|------|
| Event-Messages | ✅ Immer | Issue #2 |
| GitHub Comments | ✅ Immer | Issue #2 |
| SSE Stream | ✅ Immer | Issue #29 |
| Log-Dateien | ✅ Immer | Issue #2 |
| UI Display | ✅ Immer | Issue #9 |

## Env-Variablen (Sicherheitskritisch)

### Pflicht-Variablen
```bash
# GitHub Token — NIEMALS in Code, Logs oder UI
GITHUB_TOKEN=ghp_xxx
```

### Safety-Gates (schützen vor Fehlbedienung)
```bash
# Push und Merge sind standardmäßig AUS
POSITRON_ENABLE_PUSH=false
POSITRON_ENABLE_MERGE=false
POSITRON_MERGE_KILL_SWITCH=true  # Empfohlen für erste Runs
```

### Was im UI SICHTBAR ist
- Safety-Control-Namen (Enable Merge, Dry Run, Kill Switch...)
- Status (ON/OFF) — **nie die konkreten Werte der Secrets**
- Env-Variable-Namen — **nie die Werte**

### Was im UI NICHT sichtbar ist
- ❌ `GITHUB_TOKEN` Wert
- ❌ `OPENAI_API_KEY` Wert (falls gesetzt)
- ❌ `ANTHROPIC_API_KEY` Wert (falls gesetzt)
- ❌ SSH Private Keys
- ❌ Jegliche `.env`-Werte außer ON/OFF-Status

## Datenfluss und Privacy

```
GitHub API ──► Positron ──► Events (redacted) ──► SSE ──► UI
    │                        │
    │                        ├──► GitHub Comments (redacted)
    │                        │
    │                        └──► Log Files (redacted)
    │
    └──► OpenCode / SpecKit CLI (redacted prompts)
```

### Was passiert mit Issue-Daten?
- Issue-Titel und -Body werden für Spec/Plan/Tasks verwendet
- Werden **nie** an Dritte weitergegeben
- Werden in lokalen Artefakten gespeichert
- Können aus GitHub-Comments von Positron sichtbar sein

### Was passiert mit Run-Daten?
- Run-Events werden in Memory gehalten
- Events sind im Dashboard sichtbar
- Events werden an GitHub-Kommentare gesendet (optional)
- Nach Server-Neustart sind In-Memory-Events verloren

## Empfehlungen für den Betrieb

1. **GitHub Token** mit minimalen Rechten erstellen:
   - Nur `repo` Scope für Ziel-Repo
   - Separater Token pro Positron-Instanz
   - Token regelmäßig rotieren

2. **`.env` Datei** schützen:
   - `chmod 600 .env`
   - Nicht in Git committen (`.gitignore` bereits konfiguriert)
   - Backup verschlüsselt ablegen

3. **Server-Zugriff** kontrollieren:
   - Dashboard nur im lokalen Netzwerk
   - Reverse Proxy mit Basic Auth für Remote-Zugriff
   - HTTPS verwenden (Let's Encrypt)

4. **Logs** regelmäßig prüfen:
   - Auf unerwartete Secrets in Logs achten
   - Log-Rotation einrichten (max 30 Tage)

5. **MCP-Konfiguration** prüfen:
   - Secrets dürfen nie in MCP-Konfigurationsdateien landen
   - MCP-Server nur mit minimalen Rechten ausführen

## Notfall: Secret-Leak

Falls doch ein Secret in Logs/UI/GitHub-Kommentaren landet:

1. **Sofort:** Secret rotieren (neuen Token erstellen, alten löschen)
2. **Dokumentieren:** Issue aufmachen mit genauer Beschreibung des Leaks
3. **Fix:** Redaktion-Pattern erweitern, falls neues Format unerkannt blieb
4. **Prävention:** `redactSecrets()`-Test für das neue Pattern ergänzen
