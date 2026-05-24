# Isolated Agent Startup Runbook

> Stand: 2026-05-24 · Positron Issue #47
> Ziel: Positron-Session ohne externe Agent-Einflüsse starten

## Quick Start — Isolierte Session

```bash
# 1. Positron-Verzeichnis betreten
cd ~/Schreibtisch/Positron

# 2. Prüfen: nur Positron-eigene Regeln sind aktiv
cat AGENTS.md | grep -c "Isolation Rule\|External Operator"

# 3. Sicherheitsgates setzen
export POSITRON_MERGE_KILL_SWITCH=true
export POSITRON_ENABLE_MERGE=false
export POSITRON_ENABLE_PUSH=false

# 4. Tests ausführen (vor erstem Run)
npm test
npm run build

# 5. Server starten (nur mit Positron-Adaptern)
cd apps/server
GITHUB_TOKEN=$(gh auth token) \
POSITRON_REPO_OWNER=xxammaxx \
POSITRON_REPO_NAME=positron-external-test \
GITHUB_MODE=real \
npx tsx src/index.ts
```

## Vor jedem Run prüfen

### Agent-Kontext
- [ ] `pwd` = `/home/xxammaxx/Schreibtisch/Positron`
- [ ] Positron `AGENTS.md` ist die einzige geladene Projektregel
- [ ] Keine Paperclip-Skills im System-Prompt
- [ ] Keine OpenClaw-Skills im System-Prompt
- [ ] Researcher nur bei expliziten Research-Issues

### Sicherheit
- [ ] Kill-Switch aktiv (`POSITRON_MERGE_KILL_SWITCH=true`)
- [ ] Merge deaktiviert (`POSITRON_ENABLE_MERGE=false`)
- [ ] Push deaktiviert (`POSITRON_ENABLE_PUSH=false`)
- [ ] Keine Secrets in Umgebungsvariablen

### Adapter
- [ ] Nur Positron-Adapter verwendet
- [ ] GitHub Token mit minimalen Scopes
- [ ] Keine externen MCP-Server konfiguriert

## Externe Skills deaktivieren

### Empfohlene Konfiguration (opencode.jsonc)

```jsonc
{
  "disabledSkills": [
    "paperclip",
    "paperclip-create-agent", 
    "paperclip-create-plugin"
  ],
  "rules": {
    "project": "./AGENTS.md",
    "ignoreParentAgentsMd": true
  }
}
```

### Alternativ: Manuell prüfen

```bash
# Prüfen welche Skills geladen werden
ls ~/.config/opencode/skills/   # Positron-erlaubt
ls ~/.claude/skills/            # Prüfen ob paperclip/ vorhanden

# Wenn paperclip/ existiert: diese Skills NIE in Positron-Sessions nutzen
# Positron AGENTS.md Isolation Rule blockiert sie
```

## Troubleshooting

### Symptom: KI versucht Researcher zu starten
**Ursache:** Globale AGENTS.md erwähnt Researcher.
**Fix:** Positron AGENTS.md → Researcher Guardrail blockiert. Issue-Context prüfen: ist es ein Research-Issue? Wenn nein → blockieren.

### Symptom: KI erwähnt Paperclip
**Ursache:** Paperclip-Skills sind in ~/.claude/skills/ installiert und werden geladen.
**Fix:** Positron AGENTS.md → External Operator Guardrail blockiert. Bei Erwähnung: sofort stoppen.

### Symptom: KI will openclaw-local-operator nutzen
**Ursache:** OpenClaw-Installation existiert auf dem System.
**Fix:** Positron AGENTS.md → External Operator Guardrail → verboten.

## Session-Template

```bash
#!/bin/bash
# positron-isolated-session.sh
# Startet Positron-Server in isolierter Umgebung

set -euo pipefail

# Sicherheitsgates
export POSITRON_MERGE_KILL_SWITCH=true
export POSITRON_ENABLE_MERGE=false
export POSITRON_ENABLE_PUSH=false
export POSITRON_ENABLE_FIX_LOOP=false
export POSITRON_MERGE_DRY_RUN=true
export POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE=false

# Adapter
export GITHUB_MODE=real
export POSITRON_SPECKIT_MODE=fake
export POSITRON_OPENCODE_MODE=fake

# Repo (anpassen)
export POSITRON_REPO_OWNER=xxammaxx
export POSITRON_REPO_NAME=positron-external-test

# Start
cd ~/Schreibtisch/Positron
echo "🛡️ Positron Isolated Session"
echo "   Kill-Switch: $POSITRON_MERGE_KILL_SWITCH"
echo "   Merge: $POSITRON_ENABLE_MERGE"
echo "   Push: $POSITRON_ENABLE_PUSH"
echo "   Repo: $POSITRON_REPO_OWNER/$POSITRON_REPO_NAME"

npm run build && cd apps/server && npx tsx dogfood-runner.ts
```
