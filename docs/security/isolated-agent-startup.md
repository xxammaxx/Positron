# Isolated Agent Startup — Runbook

> **Runbook für den Start isolierter Positron-Agent-Sessions.**
> Stand: 2026-05-26

## Voraussetzungen

- Positron installiert (`npm install` abgeschlossen)
- `.env` konfiguriert (mindestens `POSITRON_REPO_OWNER` und `POSITRON_REPO_NAME`)
- Keine externen Agent-Skills installiert (Paperclip, OpenClaw, etc.)

## Session Template

### Standard-Start (Fake-Mode — Kein GitHub-Token nötig)

```bash
# 1. Server starten (automatisch Fake-Mode)
npm run build
node apps/server/dist/index.js

# 2. Frontend starten (zweites Terminal)
cd apps/web && npm run dev

# 3. Browser öffnen
open http://localhost:5173
```

Der Server startet standardmäßig im **Fake-Mode**:
- Alle Adapter sind Fake (GitHub, SpecKit, OpenCode)
- Sandbox ist immer Fake
- Kein externer Netzwerkzugriff nötig
- Alle Daten sind in-memory oder in lokaler SQLite

### Real-Mode-Start (Mit GitHub-Integration)

```bash
# 1. .env konfigurieren
export POSITRON_GITHUB_MODE=real
export GITHUB_TOKEN=ghp_...
export POSITRON_REPO_OWNER=dein_username
export POSITRON_REPO_NAME=dein_repo

# 2. Server starten
npm run build
node apps/server/dist/index.js

# 3. Frontend (optional)
cd apps/web && npm run dev
```

**Sicherheitshinweise für Real-Mode:**
- `POSITRON_MERGE_KILL_SWITCH=false` muss explizit gesetzt werden (Default: blockiert)
- `POSITRON_ENABLE_PUSH=true` muss explizit gesetzt werden (Default: blockiert)
- `POSITRON_ENABLE_MERGE=true` muss explizit gesetzt werden (Default: blockiert)
- `POSITRON_ENABLE_FIX_LOOP=false` (Default: deaktiviert)

### Isolierte Test-Session (Für externe Skills)

```bash
# 1. Quarantined-Modus aktivieren
export POSITRON_OPENCODE_MODE=quarantine
export POSITRON_SPECKIT_MODE=quarantine

# 2. Server mit Isolation starten
npm run build
node apps/server/dist/index.js --sandbox

# 3. Nur erlaubte Kommandos testen
node scripts/test-orchestrator.mjs smoke
```

## Session-Checklist

- [ ] Branch ist NICHT `main` oder `master`
- [ ] `.env` enthält keine Production-Credentials
- [ ] `POSITRON_MERGE_KILL_SWITCH` ist NICHT auf `false` gesetzt (Default sicher)
- [ ] `POSITRON_ENABLE_PUSH` ist NICHT auf `true` gesetzt (Default sicher)
- [ ] Keine Paperclip/OpenClaw-Skills im `~/.opencode/skills/` Verzeichnis
- [ ] MCP-Tools auf Trust Tier 0-1 beschränkt
- [ ] Letzte Sicherheitsüberprüfung: `node scripts/verify-issues.mjs all`

## Fehlerbehandlung

### Problem: Agent versucht externen Skill zu laden
```bash
# Prüfen ob unerlaubte Skills installiert sind
ls ~/.opencode/skills/ | grep -E "paperclip|openclaw"

# Falls gefunden: Löschen
rm -rf ~/.opencode/skills/paperclip*
rm -rf ~/.opencode/skills/openclaw*
```

### Problem: Policy Gate blockiert Kommando
```text
Fehler: SpecKit is in fake mode — no real commands allowed
Lösung: Setze POSITRON_SPECKIT_MODE=real für echte SpecKit-Ausführung
```

### Problem: Merge wird blockiert
```text
Fehler: Merge is blocked by POSITRON_MERGE_KILL_SWITCH
Lösung: Setze POSITRON_MERGE_KILL_SWITCH=false nur wenn sicher
```

## Session-Template (Quick-Start)

```bash
#!/bin/bash
# ============================================
# Isolierte Positron-Session
# ============================================

# Sicherheits-Checks
if [ -d ~/.opencode/skills/paperclip* ]; then
  echo "❌ Paperclip-Skills gefunden — Session abgebrochen"
  exit 1
fi

if [ -d ~/.opencode/skills/openclaw* ]; then
  echo "❌ OpenClaw-Skills gefunden — Session abgebrochen"
  exit 1
fi

# Explizit sicherer Modus
export POSITRON_MERGE_KILL_SWITCH=true
export POSITRON_ENABLE_PUSH=false

# Start
echo "✅ Isolation OK — Starte Positron"
npm run build && node apps/server/dist/index.js
```
