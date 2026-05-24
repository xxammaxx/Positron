# Low-Risk Repository Onboarding Report (Template)

> Stand: 2026-05-24 · Positron v0.1.0-rc.1
> Policy: Repository Onboarding Policy (Issue #45)
> Reference Repo: `positron-external-test` (bereits validiert in Issues #40-#43)

## Repository-Basisdaten

| Feld | Wert |
|------|------|
| Repository | `xxammaxx/positron-external-test` |
| Risikoklasse | 🟡 **Level 2 — Low-Risk Personal** |
| Datum | 2026-05-24 |
| Operator | Positron Issue Orchestrator |

## Schritt 1 — Risikoklassifizierung

| Kriterium | Bewertung |
|-----------|-----------|
| Inhalt | Test-Fixtures + README — keine echten Daten |
| Nutzer | Nur Positron-Operator |
| Daten | Keine PII, keine Secrets |
| Abhängigkeiten | Keine externen Abhängigkeiten |
| Ausfallrisiko | Gering — manuell behebbar |

**Entscheidung: Level 2 (Low-Risk)** — Push erlaubt, Merge nur nach Validierung.

## Schritt 2 — Sicherheitsprüfung

| Prüfung | Status |
|---------|--------|
| Repo-Eigentümer (xxammaxx) informiert | ✅ |
| Branch Protection aktiv | ⚠️ Nicht anwendbar (privates Repo ohne GitHub Pro) |
| Required Status Checks | ⚠️ CI vorhanden (ci.yml), Status-Checks implizit |
| CODEOWNERS definiert | ❌ N/A — Single-Owner-Repo |
| GitHub Token Scopes | ✅ `repo` Scope (minimal) |
| Secrets-Check | ✅ Keine Secrets in Umgebung |

## Schritt 3 — Positron-Konfiguration

```bash
# Supervised Mode (gemäß Issue #40-#43)
POSITRON_REPO_OWNER=xxammaxx
POSITRON_REPO_NAME=positron-external-test
GITHUB_MODE=real

# Safety Profile
POSITRON_ENABLE_PUSH=true           # Push erlaubt (positron/issue-* only)
POSITRON_ENABLE_MERGE=false         # Merge deaktiviert
POSITRON_MERGE_DRY_RUN=true         # Dry-Run vor jedem Merge
POSITRON_MERGE_KILL_SWITCH=true     # Sicherheitsnetz
POSITRON_ENABLE_FIX_LOOP=false      # Auto-Retry deaktiviert
POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE=false  # Produktion: keine Fixtures

# Adapter
POSITRON_SPECKIT_MODE=fake
POSITRON_OPENCODE_MODE=fake
```

## Schritt 4 — Test-Run Ergebnisse

Die folgenden Runs wurden bereits in Issues #40-#43 validiert:

| Run | Issue | Ergebnis | PR |
|-----|-------|----------|-----|
| #5 | [#1](https://github.com/xxammaxx/positron-external-test/issues/1) | DONE | [#3](https://github.com/xxammaxx/positron-external-test/pull/3) |
| #6 | [#5](https://github.com/xxammaxx/positron-external-test/issues/5) | MERGE | [#6](https://github.com/xxammaxx/positron-external-test/pull/6) |

**Checklist:**
- [x] Positron kann Issues lesen
- [x] Positron kann Labels setzen
- [x] Positron kann Kommentare schreiben
- [x] Workspace wird korrekt erstellt
- [x] Dry-Run zeigt erwartetes Ergebnis (WOULD_BLOCK / WOULD_MERGE)
- [x] Kill-Switch funktioniert
- [x] Echter Merge erfolgreich validiert (PR #6)

## Schritt 5 — Erlaubte Positron-Features

| Feature | Erlaubt | Bedingung |
|---------|---------|-----------|
| Issue lesen | ✅ | |
| Labels setzen | ✅ | |
| Kommentare | ✅ | |
| Workspace klonen | ✅ | |
| Commit lokal | ✅ | |
| Push | ✅ | Nur `positron/issue-*` |
| PR erstellen | ✅ | |
| Merge (Dry-Run) | ✅ | Vor jedem echten Merge |
| Merge (echt) | ⚠️ | Nur nach WOULD_MERGE + Operator-Review |
| Fix-Loop | ❌ | Deaktiviert |
| Fixture Change | ❌ | Nur für Dogfood-Tests |

## Entscheidung

**Bereit für weitere Low-Risk-Repos: JA** ✅

Dieses Dokument dient als Template für zukünftige Low-Risk-Repo-Onboardings.
Für jedes neue Repo muss eine eigene Instanz mit den spezifischen Daten ausgefüllt werden.

## Nächster Schritt

Für ein echtes persönliches Low-Risk-Repo:
1. Repo-Eigentümer (xxammaxx) informieren
2. Branch Protection prüfen
3. Positron-Konfiguration anpassen
4. Dry-Run validieren
5. Merge nur nach WOULD_MERGE + Operator-Review
