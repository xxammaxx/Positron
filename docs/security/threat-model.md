# Positron Security Threat Model

> Stand: 2026-05-24 (aktualisiert für v0.1.0-rc.1)
> Version: 2.0

## Bedrohungsübersicht

| # | Bedrohung | Schwere | Status | Schutz |
|---|-----------|---------|--------|--------|
| T1 | Secret-Leakage: Tokens/Keys an LLMs | 🔴 Kritisch | ✅ Mitigated | Redact-Secrets, keine Tokens in Prompts |
| T2 | Unkontrollierte Code-Execution (`sudo`, `rm -rf`) | 🔴 Kritisch | ✅ Mitigated | Bash-Allowlist, Command-Policy |
| T3 | Main-Branch-Korruption | 🔴 Kritisch | ✅ Mitigated | Branch-Guard, Push-Gate |
| T4 | Unbemerkte Fehler (Silent Failure) | 🟠 Hoch | ✅ Mitigated | GitHub Status Sync, Event-Logging |
| T5 | Auto-Merge ohne Prüfung | 🟠 Hoch | ✅ Mitigated | 6 Merge-Gates, Kill-Switch |
| T6 | Unautorisierter UI-Zugriff | 🟡 Mittel | ⚠️ Akzeptiert | Keine Auth (MVP) |
| T7 | Fix-Loop Endlosschleife | 🟡 Mittel | ✅ Mitigated | MAX_FIX_LOOPS=3, Exponential Backoff |
| T8 | Datenverlust bei Server-Neustart | 🟡 Mittel | ⚠️ Teilweise | In-Memory (MVP), SQLite geplant |
| T9 | Supply-Chain-Angriff (npm) | 🟡 Mittel | ⚠️ Akzeptiert | npm audit empfohlen |
| T10 | DSGVO-Verstoß (personenbezogene Daten) | 🟡 Mittel | ✅ Mitigated | Keine PII in Standard-Konfiguration |

## Detaillierte Bedrohungen

### T1: Secret-Leakage
**Beschreibung:** GitHub Tokens, API Keys oder andere Secrets könnten durch Positron an LLMs (OpenCode/Claude) gesendet werden.

**Schutzmassnahmen:**
- `redactSecrets()` in `shared/src/utils.ts` maskiert bekannte Pattern
- Standard-Pattern: `ghp_*`, `gho_*`, `ghu_*`, `ghs_*`, `ghr_*`
- `sk-*` (OpenAI), `anthropic-*` (Anthropic), `gemini-*` (Google)
- Prompts enthalten keine unverarbeiteten Secrets
- Evidence-Dokumente werden vor Versand an GitHub geprüft

**Verbleibendes Risiko:** Niedrig. Neue Secret-Formate könnten unerkannt bleiben.

### T2: Unkontrollierte Code-Execution
**Beschreibung:** Ein kompromittierter Run könnte versuchen, schädliche Befehle auf dem Host auszuführen.

**Schutzmassnahmen:**
- Command-Policy in `sandbox/` prüft alle ausgeführten Befehle
- Nur explizit erlaubte Git-Befehle (clone, branch, add, commit, push)
- `sudo` ist verboten (hart codiert)
- Kein `--force` bei Git-Pushes
- Workspace ist auf `/tmp/positron-*` oder konfigurierten Pfad beschränkt

**Verbleibendes Risiko:** Niedrig. Bei `POSITRON_OPENCODE_MODE=real` führt OpenCode eigene Befehle aus.

### T3: Main-Branch-Korruption
**Beschreibung:** Ein Fehler im Workflow könnte zu direktem Push auf `main` oder `master` führen.

**Schutzmassnahmen:**
- Branch-Guard: Nur `positron/issue-*-*` Branches sind erlaubt
- `generateBranchName()` in `shared/` stellt Prefix sicher
- Kein Push auf `main`, `master`, `develop`, `staging`, `production`
- Push nur mit `POSITRON_ENABLE_PUSH=true`
- Merge nur mit `POSITRON_ENABLE_MERGE=true`

**Verbleibendes Risiko:** Niedrig. GitHub Branch Protection Rules bieten zusätzlichen Schutz.

### T4: Silent Failure
**Beschreibung:** Ein Run könnte fehlschlagen, ohne dass der Operator benachrichtigt wird.

**Schutzmassnahmen:**
- Jeder Run-Event wird als RunEventData gespeichert
- GitHub Status Sync schreibt Kommentare bei FAILED/BLOCKED/DONE
- Dashboard zeigt alle Runs mit Status und Phase
- SSE Live-Updates informieren in Echtzeit
- EventLog zeigt ERROR/WARN-Events

**Verbleibendes Risiko:** Mittel. Ohne Dashboard-Überwachung können Fehler unbemerkt bleiben.

### T5: Auto-Merge ohne Prüfung
**Beschreibung:** Ein PR könnte automatisch gemerged werden, ohne dass alle Sicherheitsgates geprüft wurden.

**Schutzmassnahmen:**
- 6 Merge-Gates (Enabled, Dry-Run, Kill-Switch, Run-Status, Test-Evidence, Branch)
- Kill-Switch blockiert sofort ALLE Merges
- Dry-Run simuliert Merge ohne echten API-Call
- Alle Gates sind im Dashboard sichtbar
- Merge-Blockade wird mit Begründung angezeigt

**Verbleibendes Risiko:** Niedrig. Bei Kill-Switch=false und Enable-Merge=true könnte ein ungetesteter PR gemerged werden.

### T6: Unautorisierter UI-Zugriff
**Beschreibung:** Das Operator Dashboard hat keine Authentifizierung.

**Aktueller Status:** Akzeptiert für MVP. Das Dashboard ist nur im lokalen Netzwerk erreichbar.

**Empfehlung für Production:** Reverse Proxy mit Basic Auth (z.B. nginx + htpasswd) vorschalten.

### T7: Fix-Loop Endlosschleife
**Beschreibung:** Ein immer wieder fehlschlagender Run könnte unbegrenzt neu gestartet werden.

**Schutzmassnahmen:**
- `MAX_FIX_LOOPS = 3` (konfigurierbar via `POSITRON_MAX_FIX_LOOPS`)
- Exponential Backoff (1s → 2s → 4s → max 30s)
- Fix-Loop nur bei `FAILED_TRANSIENT` (nicht bei `FAILED_BLOCKED`)
- Event-Log dokumentiert jeden Retry-Versuch

**Verbleibendes Risiko:** Sehr niedrig.

## Secret Handling

### Automatische Redaktion
```typescript
// Folgende Pattern werden automatisch maskiert (DEFAULT_REDACTION_RULES):
const patterns = [
  /gh[pousr]_[A-Za-z0-9]{5,}/g,   // GitHub Tokens
  /sk-[A-Za-z0-9]{20,}/g,          // OpenAI Keys
  /anthropic-[A-Za-z0-9]{20,}/g,   // Anthropic Keys
  /gemini-[A-Za-z0-9]{20,}/g,      // Google Gemini Keys
];
```

### Was NICHT geloggt wird
- `GITHUB_TOKEN` wird nie in Logs geschrieben
- API-Responses werden vor dem Logging durch `redactSecrets()` gefiltert
- Event-Messages werden auf Secret-Pattern geprüft
- SSE-Stream enthält keine Secrets

### Was im UI sichtbar ist
- Safety-Control-Status (ON/OFF — nie die konkreten Werte)
- Env-Variable-Namen (nicht die Werte)
- Run-Status, Phase, Events — keine Secrets

## DSGVO-Hinweise

### Personenbezogene Daten
Positron verarbeitet in der Standard-Konfiguration keine personenbezogenen Daten (PII).

**Mögliche PII (bei entsprechender Konfiguration):**
- GitHub Usernames (in PR-Reviewer-Zuweisung)
- Issue-Titel und -Body (könnten Namen enthalten)
- Commit-Messages (könnten Namen enthalten)

**Empfehlungen:**
- Keine personenbezogenen Daten in Issue-Titeln oder Commit-Messages
- GitHub Usernames in `POSITRON_PR_REVIEWERS` auf das Nötigste beschränken
- Logs nach 30 Tagen löschen (automatisiert via Backup-Rotation)
- Audit-Logs nach DSGVO-Vorgaben aufbewahren (10 Jahre)

## Empfehlungen für Production

1. **Authentifizierung** für das Web UI einrichten (Reverse Proxy + Basic Auth)
2. **HTTPS** verwenden (Let's Encrypt + nginx)
3. **GitHub Token** mit minimalen Rechten (nur benötigte Repos)
4. **Regelmäßige** npm audit + Sicherheitsupdates
5. **Monitoring** des Server-Logs auf unerwartete Fehler
6. **Branch Protection Rules** im Ziel-Repo aktivieren
7. **Read-only Token** für Observe-Mode verwenden
