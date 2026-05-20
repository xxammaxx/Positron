# Test Command Validation

**Datum:** 2026-05-20

## Sources
- npm docs: https://docs.npmjs.com/cli/v10/using-npm/scripts
- Vitest: https://vitest.dev/guide/cli.html
- Node.js child_process: https://nodejs.org/api/child_process.html

## npm/package.json findings

- Scripts in `package.json` sind die Standard-Testausführung
- `npm test` = `npm run test` = führt `scripts.test` aus
- `npm run <name>` für benannte Scripts
- Fehlende Scripts geben Exit-Code 1
- npm lifecycle scripts (pre/post) werden automatisch ausgeführt

## Vitest findings

- `vitest run` für CI/Agenten (nicht Watch)
- `vitest --reporter=json` für parsebares Output
- `vitest --run` ist explizit für Einzellauf
- `vitest` ohne `run` startet Watch-Mode (verboten)

## Node child_process findings

- `spawn(command, args, { shell: false })` — korrekt
- Exit-Code 0 = Erfolg
- `timeout` in ms, SIGTERM bei Überschreitung
- stdout/stderr Capture mit `{ encoding: 'utf-8' }` oder Buffer.toString()

## Security implications

- Kein `shell: true` (Shell-Injection-Schutz)
- Kein `npm install` automatisch (abhängig von Policy, für MVP blockiert)
- npm lifecycle scripts können gefährlich sein (postinstall/preinstall)
- Secret-Redaction für stdout/stderr Pflicht
- package.json kann bösartige Scripts enthalten → nur bekannte Namen erlauben

## Consequences for implementation

- Detector liest package.json und filtert nach erlaubten Script-Namen
- Selection priorisiert test, build, lint, typecheck
- Runner verwendet bestehenden CommandRunner
- `npm` als command, `['run', scriptName]` als args
