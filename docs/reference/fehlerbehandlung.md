# Fehlerbehandlung — 5-Schritte-Eskalation

Datum: 2026-06-09
Status: Draft
Diataxis: Reference

## Überblick

Die Fehlerbehandlung in Positron folgt einer strikten 5-Schritte-Eskalationsprozedur,
die sicherstellt, dass Fehler kontrolliert, diagnostiziert und dokumentiert werden.
Das System unterscheidet drei Fehlertypen mit unterschiedlichen Behandlungspfaden.

## 5-Schritte-Eskalationsprozedur

### Schritt 1: Fehler erkennen + sofort stoppen

Sobald ein Fehler erkannt wird (z.B. unerwarteter Exit-Code, fehlgeschlagener Test,
Netzwerk-Timeout), wird die aktuelle Ausführung **sofort gestoppt**.

**Aktion:**
- Aktuelle Operation abbrechen
- Run in Fehlerphase versetzen
- Fehler als `RunEvent` mit Level `ERROR` protokollieren

### Schritt 2: Nutzer benachrichtigen mit klarer Diagnose

Der Fehler wird mit einer strukturierten Diagnose an den Nutzer gemeldet.

**Diagnoseformat:**

```markdown
## Fehler in Phase: <PHASE>

### Fehlertyp
<TRANSIENT | BLOCKED | UNSAFE>

### Fehlermeldung
<Original-Fehlermeldung>

### Mögliche Ursache
- <Ursache 1>
- <Ursache 2>

### Betroffene Artefakte
- <Datei/System>, <Datei/System>

### Zeitstempel
<ISO8601>
```

### Schritt 3: Lösungsoptionen anbieten

Dem Nutzer werden mindestens zwei Lösungsoptionen angeboten:

| Option | Beschreibung | Geeignet für |
|---|---|---|
| **Erneut versuchen (Retry)** | Automatischer Wiederholungsversuch | Transiente Fehler (Netzwerk, Timeout) |
| **Manuell eingreifen** | Nutzer korrigiert das Problem selbst | Blocked-Fehler (fehlende Konfiguration) |
| **Überspringen (Skip)** | Phase wird als nicht-kritisch übersprungen | Nicht-essentielle Prüfungen |
| **Abbrechen (Abort)** | Run wird abgebrochen | Unsafe-Fehler, Security-Verletzungen |

### Schritt 4: In Zustand BLOCKIERT wechseln

Der Run wechselt in einen der drei Fehlerzustände:

| Fehlertyp | Ziel-Zustand | Automatischer Retry? |
|---|---|---|
| Transient | `FAILED_TRANSIENT` | Ja (bis `MAX_FIX_LOOPS` = 3) |
| Blocked | `FAILED_BLOCKED` | Nein (wartet auf Nutzer) |
| Unsafe | `FAILED_UNSAFE` | Nein (sofortiger Stop) |

### Schritt 5: Erst nach expliziter Nutzerfreigabe fortsetzen

Der Run setzt nur fort, wenn der Nutzer explizit eine der angebotenen Optionen
wählt. Die Freigabe wird als `RunEvent` mit Level `HUMAN` protokolliert.

**Fortsetzungs-Optionen:**
- `RESUME` — Run wird in der Ursprungsphase neu gestartet
- `SKIP` — Phase wird übersprungen, Run geht zur nächsten Phase
- `ABORT` — Run wird endgültig abgebrochen (Phase `CLEANUP`)

## Fehlertypen

### Transient (FAILED_TRANSIENT)

Vorübergehende Fehler, die durch erneuten Versuch behoben werden können.

**Merkmale:**
- Automatischer Retry möglich
- Maximal `MAX_FIX_LOOPS` (3) Wiederholungsversuche
- Nach Erschöpfung: Wechsel zu `FAILED_BLOCKED`

**Beispiele:**

| Fehler | Beschreibung | Retry-Strategie |
|---|---|---|
| Netzwerk-Timeout | GitHub API nicht erreichbar | Exponentielles Backoff (1s, 2s, 4s) |
| Rate-Limit | GitHub API Rate-Limit erreicht | Warten bis Reset |
| CI-Warteschlange | CI läuft noch, keine Ergebnisse | Polling mit 10s Intervall |
| Temporärer Lock | SQLite-Datenbank gesperrt | 500ms warten, erneut versuchen |

### Blocked (FAILED_BLOCKED)

Fehler, die menschliches Eingreifen erfordern.

**Merkmale:**
- Kein automatischer Retry
- Wartet auf Nutzer-Entscheidung
- Nach Freigabe: Wechsel zu `RESUME_PENDING`

**Beispiele:**

| Fehler | Ursache | Lösung |
|---|---|---|
| Fehlender Token | `GITHUB_TOKEN` nicht gesetzt | Token in `.env` eintragen |
| Merge-Konflikt | Branch kann nicht gemerged werden | Manuell lösen |
| Konfigurationsfehler | Ungültige Umgebungsvariablen | `.env` korrigieren |
| Unerwarteter Diff | Diff enthält unerwartete Änderungen | Manuell prüfen |

### Unsafe (FAILED_UNSAFE)

Sicherheitskritische Fehler, die sofortigen Stopp erfordern.

**Merkmale:**
- Kein Retry, kein Überspringen
- Run wird sofort gestoppt
- Security-Team wird benachrichtigt (in CI-Umgebung)

**Beispiele:**

| Fehler | Beschreibung | Konsequenz |
|---|---|---|
| Secret-Leak | Token/Passwort im Code entdeckt | Branch bereinigen, Token rotieren |
| Policy-Verletzung | Verbotener Befehl ausgeführt | Audit-Log prüfen |
| Unsicherer Befehl | `sudo` ohne Genehmigung | Agent-Trust-Level prüfen |
| Datenverlust | `DELETE` ohne Backup | Sofortiger Stop |

## State Machine Integration

Die Fehlerphasen sind in der Positron-State-Machine integriert:

```typescript
// packages/shared/src/types.ts (Auszug)
export type FailurePhase =
  | 'FAILED_TRANSIENT'
  | 'FAILED_BLOCKED'
  | 'FAILED_UNSAFE'
  | 'FAILED';
```

Der Phasenübergang wird durch den `gate-checker` (siehe [Quality Gates](../workflows/qualitaetspruefung.md))
validiert, bevor ein Fehlerzustand eingenommen wird.

## Verwandte Dokumente

- [Quality Gates](../workflows/qualitaetspruefung.md) — Gate-Checks bei Phasenübergängen
- [Orchestrierung](../workflows/orchestrierung.md) — Vollständiger Issue-to-Merge-Workflow
- [Verification Contract](verification-contract.md) — Spezifikations-Prüfung
- [Agentenmetriken](agentenmetriken.md) — Fehlerraten und Retry-Zähler
