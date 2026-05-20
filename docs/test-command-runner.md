# Test Command Detection and Execution

## Purpose
Erkennt automatisch verfügbare Test-/Build-/Quality-Kommandos in einem vorbereiteten Workspace und führt sie sicher aus. Liefert einen reproduzierbaren TestReport als Qualitätsbeweis.

## Supported project types
- **Node/TypeScript** (MVP): package.json-basierte Scripts
- Weitere Ökosysteme: vorbereitet, nicht implementiert

## package.json detection

1. `package.json` parsen
2. Package Manager über Lockfiles erkennen (npm, pnpm, yarn, bun)
3. Scripts filtern: nur erlaubte Namen (test, build, lint, typecheck, etc.)
4. Blockierte Namen ausschließen (dev, start, deploy, publish, etc.)
5. Gefährliche Script-Inhalte erkennen und blockieren

## Command selection modes

| Mode | Auswahl |
|------|---------|
| `smoke` | Max 2: test + build |
| `standard` | Alle mit priority ≤ 5, max 5 |
| `full` | Alle sicheren Kommandos |

## Security policy

- ✅ Nur npm/npx/node/git als Command
- ❌ Kein Shell-String (args getrennt)
- ❌ Gefährliche Script-Inhalte blockiert (rm -rf, sudo, curl|bash)
- ❌ Deploy/Release/Publish blockiert
- ❌ Install-Scripts (preinstall/postinstall) blockiert
- ✅ stdout/stderr durch Secret-Redaction

## Timeout behavior

| Kind | Timeout |
|------|---------|
| test | 120s |
| build | 180s |
| lint/typecheck | 120s |
| e2e | 300s |

Timeout → BLOCKED, nicht FAIL.

## TestReport format

- Markdown: Übersicht + Command-Tabelle
- GitHub-Kommentar-Template
- Artefakte: test-report.md, stdout/stderr logs

## Orchestrator integration

Server `TEST`-Phase nutzt `TestCommandDetector` + `TestRunner`. Resultat wird als RunEvent persistiert.

## Known limitations

- Nur Node/TypeScript-Projekte (package.json)
- Keine Multi-Language-Detection
- Keine Coverage-Gates
- Kein Auto-Repair bei fehlgeschlagenen Tests
