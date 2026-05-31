# Issue #60 — Security Hardening after Token Leak

**Scope:** Security/Hardening (kein Feature-Code, kein Release, kein Dogfood-Run)  
**Priority:** P0 (Blocker für "Production readiness")  
**Status:** Draft (lokal, nicht pushen bis Token rotiert ist)

## Kontext / Motivation
Im Rahmen von Issue #59 gab es einen **GitHub Token Leak** (lokal). Der konkrete Leak wurde lokal bereinigt; final geschlossen ist der Incident erst nach **GitHub Revocation + Rotation**.

Dieses Issue adressiert die **architektur-level Ursachen & Präventionsmaßnahmen**, damit:
- Secrets nicht mehr durch fragile Parsing-/Logging-Pfade "durchrutschen"
- Logs/Artifacts/SSE-Events keine Secrets enthalten
- Secret Scans in Dev + CI eine harte Leitplanke bilden

## Nicht-Ziele (Explizit Out of Scope)
- Keine Änderungen an der Pipeline-Logik / Orchestrator-Features
- Kein Release-Tag, keine Version-Bumps außerhalb der notwendigen deps
- Kein "Real workspace run" / Dogfooding
- Kein Multi-repo, keine Queue/Worker-Arbeit (separat)

---

## Tasks

### 1) .env Parsing konsolidieren (Custom Parser entfernen)
**Ziel:** `.env` Verarbeitung ist dotenv-konform, robust (Quotes + inline `#` Kommentare), einheitlich über Server/Worker/Tools.

**To-do**
- [ ] Alle Stellen identifizieren, wo `.env` aktuell manuell/gecustom parsed wird
- [ ] Auf `dotenv` umstellen (single source of truth)
- [ ] Inline comments korrekt behandeln (`KEY=value # comment`)
- [ ] Quotes korrekt behandeln (`KEY="value#not_a_comment"`)
- [ ] Sicherstellen: `.env`, `.env.local` bleiben gitignored (keine Änderung am Ignoring)

**Acceptance**
- [ ] `npm test` grün
- [ ] Neue Tests decken ab:
  - [ ] Inline-`#` Kommentar wird gestript
  - [ ] Gequotete Werte mit `#` bleiben intakt
  - [ ] Leading/trailing whitespace stabil
- [ ] Keine Secrets in Fehlermeldungen beim Parsen (keine Ausgabe des vollständigen Lines/Values)

---

### 2) Redaction zentralisieren (Logging + SSE + Artifacts)
**Ziel:** Es gibt **einen** zentralen Redaction-Layer, der in *allen* Ausgabewegen greift:
- structured logs (pino)
- SSE events (falls payloads geloggt/gespeichert werden)
- evidence artifacts / diagnostic dumps

**To-do**
- [ ] Pino zentral konfigurieren (`redact` paths + censor/remove)
- [ ] Error-Serializer / request logging so anpassen, dass:
  - [ ] keine raw headers mit `Authorization`/Tokens geloggt werden
  - [ ] keine Env-Dumps geloggt werden
  - [ ] keine CLI command-lines mit secret-bearing envs geloggt werden
- [ ] Redaction-Patterns vereinheitlichen (kein Regex-Wildwuchs in mehreren Modulen)
- [ ] SSE/Artifact Pipeline: vor persist/logging stets `redactSecrets(payload)` anwenden

**Baseline Secret Patterns (minimum)**
- `ghp_...` (classic PAT)
- `github_pat_...` (fine-grained PAT)
- `sk-...` (OpenAI style)
- `GITHUB_TOKEN=...` (value redaction)

**Acceptance**
- [ ] Es existiert **eine** Redaction-Utility, die überall genutzt wird
- [ ] Unit-Tests: "Keine Secret-Muster in Loglines / SSE payloads / artifacts"
- [ ] Ein absichtlich-injizierter Fake-Token wird in Logs/Artifacts zuverlässig zu `***REDACTED***`

---

### 3) real-mode-check: Token-Länge-Log entfernen
**Ziel:** Kein unnötiges "Secret presence signal" in stdout/logs.

**To-do**
- [ ] `real-mode-check.ts` so ändern, dass *nicht* geloggt wird:
  - Token-Länge
  - ob Token "gesetzt" ist (falls nicht zwingend nötig)
- [ ] Wenn ein Check notwendig ist: nur generisches "Real mode enabled" loggen

**Acceptance**
- [ ] Keine Ausgabe, die Rückschlüsse auf Secret-Präsenz/Länge zulässt
- [ ] Tests/Build unverändert grün

---

### 4) Secret Scanning in Dev & CI (Gitleaks)
**Ziel:** Leaks werden **vor** Push/Merge erkannt.

**To-do**
- [ ] Gitleaks integrieren:
  - [ ] pre-commit hook (z.B. husky/lint-staged oder pre-commit framework)
  - [ ] CI Schritt (fail build bei findings)
- [ ] Optional: `.gitleaks.toml` erstellen/konfigurieren (allowlist nur für eindeutig harmlose placeholders)
- [ ] Dokumentation: "Wie scannt man lokal?" (`npm run secret-scan`)

**Acceptance**
- [ ] pre-commit verhindert commits mit Secrets
- [ ] CI verhindert merges mit Secrets
- [ ] Placeholder Strings in docs/tests verursachen keine False Positives (saubere allowlist)

---

### 5) "No secrets in exceptions" (API Responses / Logging Meta)
**Ziel:** Unhandled exceptions und error payloads können keine Secrets leaken.

**To-do**
- [ ] Global error handler prüfen:
  - [ ] Response body darf keine env/config dumps enthalten
  - [ ] Logging darf keine raw exception objects mit secret-bearing meta enthalten
- [ ] Mindestens ein Testfall: simulated exception enthält "fake token" im error.cause/meta → muss redacted sein

**Acceptance**
- [ ] Negative Tests bestätigen: Secrets erscheinen nicht in API response oder logs
- [ ] Keine Regression in bestehenden Integrationstests

---

## Definition of Done (DoD)
- [ ] `npm test` grün
- [ ] `npm run build` grün
- [ ] Neue Unit-Tests für dotenv parsing + log redaction + exception redaction vorhanden
- [ ] Keine Feature-/Pipeline-Änderungen
- [ ] Keine neuen Secrets / keine Token-Rotation im Code (Rotation ist User-Aktion)

## Hinweise / Operative Guardrails
- Push bleibt deaktiviert, bis:
  1) Token revoked
  2) neuer Token erstellt
  3) neuer Token lokal gesetzt (gitignored)
- Bei Unsicherheit: lieber "zu aggressiv redigieren" als zu wenig.

## Referenzen
- [dotenv](https://www.npmjs.com/package/dotenv)
- [pino redact](https://github.com/pinojs/pino/blob/main/docs/api.md)
- [gitleaks](https://github.com/gitleaks/gitleaks)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning)
- [GitHub Push Protection](https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection)
