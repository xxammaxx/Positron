# Dogfood Fixture Change Provider

> Stand: 2026-05-24
> Issue: #38 — Deterministic Safe File Change for PR Validation
> Provider: `packages/sandbox/src/dogfood-fixture.ts`

## Zweck

Für Dogfood-Runs einen expliziten, sicheren Fixture-Change-Provider bereitstellen.
Der Provider erzeugt eine deterministische Dateiänderung, damit Commit → Push →
PR_CREATE real validiert werden kann — ohne Produktionslogik zu verändern.

## Design-Entscheidung

**Kein allgemeiner Fake-Adapter-Missbrauch.** Der Provider ist ein eigener,
klar benannter Mechanismus, der nur mit explizitem Env-Flag aktiv wird.
Produktionsläufe (ohne Flag) sind nicht betroffen.

## Verwendung

```bash
# Nur für Dogfood-Runs aktivieren:
export POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE=true

# Standardmäßig deaktiviert (kein Einfluss auf Produktion)
```

## Wirkung

Der Provider erzeugt/erweitert die Datei `.positron-dogfood.md` im Workspace mit:

```markdown
# Positron Dogfood Run Artifacts

## Dogfood Run Entry: abc12345

- **Run ID:** abc12345-...
- **Issue:** #42
- **Timestamp:** 2026-05-24T...
- **Fixture Change Provider:** v0.1.0

This file is created by the Positron Dogfood Fixture Change Provider.
```

- Mehrere Aufrufe hängen Einträge an (append, nicht überschreiben)
- Deterministisch: gleicher Input → gleicher Output
- Enthält keine Secrets

## Pipeline-Integration

```
IMPLEMENT
  → applyDogfoodFixtureChange({ workspacePath, runId, issueNumber })
  → Store Event: "Fixture change applied to .positron-dogfood.md"

COMMIT
  → workspace.getDiff(commitWsPath)
  → if (filesChanged === 0):
      → markFailed(current, 'FAILED_BLOCKED', 'NO_CHANGES_TO_COMMIT')
  → else:
      → workspace.commit(commitWsPath, ...)
      → workspace.push(...)

PR_CREATE
  → GitHub API prüft selbst ob Branch Commits ahead of Base
  → Bei 0 Diff: "No commits between main and branch"
  → Mit Fixture: echter PR
```

## API

```typescript
interface FixtureChangeInput {
  workspacePath: string;
  runId: string;
  issueNumber: number;
}

interface FixtureChangeResult {
  applied: boolean;    // true wenn Fixture erstellt wurde
  filePath: string;    // Pfad zur Fixture-Datei
  summary: string;     // Menschlesbare Zusammenfassung
}

function applyDogfoodFixtureChange(input: FixtureChangeInput): FixtureChangeResult;
function hasFixtureChanges(input: FixtureChangeInput): boolean;
```

## Tests

5 Tests in `packages/sandbox/src/__tests__/dogfood-fixture.test.ts`:

| Test | Erwartung |
|------|-----------|
| ohne Flag keine Änderung | applied=false, keine Datei |
| mit Flag wird Datei erstellt | .positron-dogfood.md existiert mit Inhalt |
| mehrere Aufrufe hängen an | Datei enthält beide Einträge |
| hasFixtureChanges erkennt Datei | true nach apply |
| hasFixtureChanges ohne Flag | false trotz existierender Datei |
