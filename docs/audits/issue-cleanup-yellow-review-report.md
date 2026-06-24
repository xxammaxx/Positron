# Issue Cleanup — YELLOW Review Decision Gate

## Mode: REVIEW_YELLOW_FIRST
## Date: 2026-06-23
## HEAD: 7af0945 (matches origin/main)
## Working Tree: CLEAN (only untracked audit files)

---

## 1. Kurzfazit

| Field | Value |
|-------|-------|
| **Status** | YELLOW |
| **Decision** | NO automatic actions possible. All 15 open issues need human decisions. |
| **GREEN_SAFE** | 5 issues (all correctly open, no write actions needed) |
| **YELLOW_REVIEW** | 6 issues (need your decision) |
| **RED_HOLD** | 4 issues (need your approval) |

---

## 2. Decision Package A — PR #218 / Issue #215

### Was ist das Problem?

PR #218 enthaelt den fertigen Code fuer die Stop/Ask-Policy-Integration. Der PR ist **MERGEABLE** (keine Konflikte), aber seit 8 Tagen nicht gemerged.

### Worum geht es?

- **Issue #215:** Die Stop/Ask-Policy soll im Runtime-Pipeline-Hook `GATE_APPROVE` eingebaut werden
- **PR #218:** 7 Dateien geaendert — neue Policy-Module, 984 Zeilen Tests, 189 Zeilen Gate-Implementierung
- **Status:** MERGEABLE, kein Draft, 1 Commit

### Wichtige Risikohinweise

CodeRabbit (KI-Code-Review) hat **9 Findings** gemeldet, davon sicherheitsrelevant:

1. **Sicherheitsluecke:** `command`-Feld wird unbereinigt in Audit-Logs geschrieben — koennte Secrets/Tokens leaken
2. **Policy-Bypass:** Die Policy prueft nur `action`, nicht `command` — ein Angreifer koennte mit harmlosem `action`-Text und gefaehrlichem `command` die Policy umgehen
3. **Falsche Phase:** `ALLOW`-Entscheidungen leiten immer zu `MERGE` weiter, auch wenn die Aktion nichts mit Merge zu tun hat
4. **Fehlende Felder:** Event-Payloads sind inkonsistent (manche haben `requiredEvidence`, andere nicht)

### Was muesste vor einem Merge passieren?

- Die 4 sicherheitsrelevanten Findings sollten behoben werden
- Owner-Review durch dich (kein human approval im PR sichtbar)
- Lokale Tests mit dem PR-Code ausfuehren

### Deine Optionen

| Option | Befehl | Folge |
|--------|--------|-------|
| **PR mergen** | `APPROVE MERGE PR 218` | Code wird Teil von main → Issue #215 kann geschlossen werden |
| **PR schliessen** | `APPROVE CLOSE PR 218 WITHOUT MERGE` | PR wird ohne Merge geschlossen → Issue #215 bleibt offen, braucht neuen Ansatz |
| **Nichts tun** | (keine Aktion) | PR bleibt offen, Issue bleibt offen |

### Empfehlung

```
Empfehlung: KEEP OPEN (nicht mergen, nicht schliessen)
Risiko: YELLOW_REVIEW
Confidence: 0.72
Grund: 9 ungeloeste CodeRabbit-Findings, kein human review. 
Die Policy-Idee ist gut, aber der PR braucht vor einem Merge:
  - Fix der sicherheitsrelevanten Findings
  - Deinen human review
  - Lokale Tests
```

---

## 3. Decision Package B — PR #228 + PRs #230-#242 / Issue #229

### Was ist das Problem?

Issue #229 hat eine **14-PR-Kette** produziert (PR #228 + PRs #230-#242). Diese Kette ist:

- **PR #228 (Basis):** CONFLICTING — das Fundament der Kette ist kaputt
- **PRs #230-#242 (13 Stueck):** Alle MERGEABLE, aber aufeinander aufbauend. Keiner kann gemerged werden, solange #228 kaputt ist.
- **Alter:** Alle PRs sind 8 Tage alt. Seitdem wurden **7+ PRs auf main gemerged** (siehe git log)
- **Issue #279** existiert explizit als Ersatz ("rebuild on current main")

### Warum ist die Kette kaputt?

```
PR #228 (CONFLICTING)          <-- Basis, kaputt
  └── PR #230 (MERGEABLE)      <-- baut auf kaputter Basis auf
       └── PR #231 (MERGEABLE) <-- baut auf #230 auf
            └── ... (11 weitere)
```

Selbst wenn PR #228 repariert wuerde: main hat sich in 8 Tagen stark veraendert. Die Kette ist **veraltet (stale)**.

### Was geht verloren, wenn die PRs geschlossen werden?

**NICHTS.** Die Branches bleiben erhalten. Kein Code wird geloescht. Die Arbeit ist im Git-History archiviert. Issue #279 wurde explizit erstellt, um die wertvollen Konzepte auf dem aktuellen main neu zu bauen.

### Deine Optionen

| Option | Befehl | Folge |
|--------|--------|-------|
| **Nur PRs schliessen** | `APPROVE CLOSE SUPERSEDED ISSUE 229 PR CHAIN` | PR #228 + PRs #230-#242 werden geschlossen. Issue #229 bleibt offen. |
| **PRs + Issue schliessen** | `APPROVE CLOSE SUPERSEDED ISSUE 229 PR CHAIN AND ISSUE 229` | Alle PRs + Issue #229 werden geschlossen. Issue #279 uebernimmt. |
| **Nichts tun** | (keine Aktion) | 14 PRs bleiben offen, Issue #229 bleibt offen |

### Empfehlung

```
Empfehlung: CLOSE PR CHAIN (aber Issue #229 noch offen lassen)
Risiko: YELLOW_REVIEW (wenn geschlossen) / GREEN_SAFE (wenn nichts getan)
Confidence: 0.92 (dass die Kette stale und ersetzt ist)
Grund: 
  - PR #228 ist CONFLICTING und kann nicht gemerged werden
  - 7+ PRs auf main gemerged seit Erstellung der Kette
  - Issue #279 existiert als expliziter Ersatz
  - Kein Datenverlust: Branches bleiben in Git-History
  
ABER: Issue #229 sollte erst geschlossen werden, wenn #279 Fortschritt zeigt.
Die PRs koennen jetzt schon geschlossen werden (sie sind totes Holz).
```

---

## 4. Decision Package C — Issues #244-#247 (RED_HOLD)

### Was sind das fuer Issues?

Das sind **4 Sub-Issues vom Epic #243** (Agentic/Vibe-Coding Baseline 2026):

| Issue | Titel | Warum RED_HOLD |
|-------|-------|----------------|
| #244 | Runtime Workspace Cleanup | Risiko: Workspace-Datenverlust, Race Conditions |
| #245 | Enforce requiresAuditLog | Risiko: Falsche Erzwingung koennte Gateway brechen |
| #246 | Enforce GateType Layers | Risiko: Koennte legitime Pipelines blockieren |
| #247 | Trace and Eval Aggregation | Risiko: Performance-Auswirkungen unklar |

### Warum sind sie auf RED_HOLD?

Jedes dieser Issues enthaelt im Body den Satz:

> "Dieses Issue darf nicht umgesetzt werden, bevor der Repository Owner ausdruecklich zugestimmt hat."

Es geht um **Runtime-Enforcement** — also Code, der laufende Prozesse blockieren oder Daten loeschen kann. Fehler hier sind nicht "Bug im UI", sondern "Produktion kaputt".

### Was ist sicher?

Die **Interfaces/Typdefinitionen** fuer diese Issues existieren bereits im Code. Das ist der "Bauplan". Die Frage ist nur: willst du, dass diese Plaene jetzt **in echten Code umgesetzt werden**?

### Deine Optionen

| Option | Befehl | Folge |
|--------|--------|-------|
| **Genehmigen** | Kommentar auf jedem Issue: "Approved: Go ahead" | Agent darf implementieren |
| **Ablehnen** | Kommentar: "Not now" | Issues bleiben offen oder werden geschlossen |
| **Nichts tun** | (keine Aktion) | Issues bleiben RED_HOLD |

### Empfehlung

```
Empfehlung: RED_HOLD (nicht anfassen)
Risiko: RED_HOLD
Confidence: 0.90-0.95
Grund: 
  - Alle 4 Issues haben reales Datenverlust-/Runtime-Risiko
  - Keines ist dringend fuer den aktuellen Projektzustand
  - Epic #243 ist mehrphasig — diese Issues sind nicht der erste Schritt
  - Empfehlung: erst #279 (Architektur-Rebuild) abschliessen, dann #243-Phasen angehen
```

---

## 5. Decision Package D — Issue #249

### Worum geht es?

> "Sollen Infrastructure State Stores beim Server-Start automatisch befuellt werden?"

Das ist eine **Architekturentscheidung**: Soll der Server beim Hochfahren automatisch Daten aus der Umgebung sammeln (welche Provider sind verfuegbar? welche Modelle? welche MCP-Server?), oder soll das manuell/getriggert passieren?

### Warum ist das schwierig?

- Automatisches Befuellen koennte den Server-Start verzoegern
- Welche Datenquellen sind beim Start verfuegbar?
- Was passiert, wenn eine Quelle nicht erreichbar ist?
- Haengt mit #279 zusammen: die State Stores muessen erstmal definiert werden

### Deine Optionen

| Option | Befehl | Folge |
|--------|--------|-------|
| **Defer to #279** | (empfohlen) | Issue #249 wartet auf #279 Phase 0 |
| **Jetzt entscheiden** | Kommentar mit Entscheidung | Auto-Population ja/nein |
| **Issue schliessen** | Als NOT_PLANNED | Auto-Population wird nicht gemacht |

### Empfehlung

```
Empfehlung: DEFER_TO_279
Risiko: YELLOW_REVIEW
Confidence: 0.55
Grund: 
  - Die State Stores muessen erst in #279 definiert werden
  - Die Frage "Auto-Population: ja oder nein?" haengt von der Store-Struktur ab
  - Voreilige Entscheidung ohne Store-Definition ist Spekulation
  - Besser: #279 Phase 0 abwarten, dann diese Frage im Kontext beantworten
```

---

## 6. Decision Package E — Issue #251

### Worum geht es?

> "Dokumentiere alle 18 neuen API-Endpoints aus Issue #229 in api-overview.md"

### Warum ist das deferred?

Die Endpoints existieren nur im **ungemergeten PR-Chain #230-#242**. Sie sind NICHT auf main. Issue #279 wird diese Endpoints moeglicherweise anders bauen. Dokumentation jetzt zu schreiben waere:

1. Arbeit fuer etwas, das nicht auf main existiert
2. Arbeit, die bei #279-Aenderungen veraltet

### Deine Optionen

| Option | Befehl | Folge |
|--------|--------|-------|
| **Defer to #279** | (empfohlen) | Issue wartet bis #279 API definiert |
| **Trotzdem machen** | Issue umsetzen | Dokumentiert hypothetische Endpoints |
| **Issue schliessen** | Als NOT_PLANNED | api-overview.md wird spaeter separat aktualisiert |

### Empfehlung

```
Empfehlung: DEFER_TO_279
Risiko: YELLOW_REVIEW
Confidence: 0.50 (niedrig, weil viel von #279 abhaengt)
Grund: 
  - Endpoints existieren nur in ungemergeten PRs
  - #279 wird die API neu definieren
  - Dokumentation jetzt = doppelte Arbeit spaeter
  - Besser: Issue #251 als "Reminder" offen lassen, nach #279 umsetzen
```

---

## 7. Zusammenfassung: Deine Entscheidungen

### Was du JETZT entscheiden kannst (einfach):

| Nr. | Entscheidung | Approval-Phrase |
|-----|-------------|-----------------|
| **B1** | PR-Kette #228/#230-#242 schliessen | `APPROVE CLOSE SUPERSEDED ISSUE 229 PR CHAIN` |
| **B2** | PR-Kette + Issue #229 schliessen | `APPROVE CLOSE SUPERSEDED ISSUE 229 PR CHAIN AND ISSUE 229` |

### Was du SPAETER entscheiden kannst:

| Nr. | Entscheidung | Approval-Phrase |
|-----|-------------|-----------------|
| **A1** | PR #218 mergen | `APPROVE MERGE PR 218` |
| **A2** | PR #218 schliessen | `APPROVE CLOSE PR 218 WITHOUT MERGE` |
| **C** | Issues #244-#247 genehmigen | Kommentar auf jedem Issue |
| **D** | Issue #249 entscheiden | Nach #279 Phase 0 |

### Was automatisch passiert (ohne deine Entscheidung):

| Aktion | Grund |
|--------|-------|
| NICHTS | Alle 15 Issues sind korrekt offen. Keine automatische Aktion ist sicher. |
| Issue #268 bleibt offen | Aktiver CI-Tracker |
| Issue #279 bleibt offen | Aktiver Architektur-Rebuild |
| Stashes bleiben erhalten | Nicht anfassen ohne explizite Anweisung |

---

## 8. Agentenempfehlung in Risikopaketen

```
=== GREEN_SAFE (keine Aktion moeglich) ===
#243, #248, #250, #268, #279 → Richtig offen, nichts zu tun

=== YELLOW_REVIEW (braucht Human Decision) ===
PR #218         → MERGE oder CLOSE (9 Findings offen)
PRs #228-#242   → CLOSE as superseded (Kette ist stale)
Issue #229      → CLOSE nach PR-Ketten-Schliessung
Issue #211      → Mit #252 konsolidieren
Issue #249      → Auf #279 warten
Issue #251      → Auf #279 warten

=== RED_HOLD (nicht anfassen) ===
#244, #245, #246, #247 → Erst nach Owner-Approval

=== DEFER_TO_279 ===
#249, #251 → Warten auf #279 Architektur-Phase
```

---

## 9. Recommended Owner Choice (Plain Language)

Wenn du nur EINE Sache tun willst:

**Schliesse die alte PR-Kette.** 
Sag einfach: `APPROVE CLOSE SUPERSEDED ISSUE 229 PR CHAIN`

Das raeumt 14 PRs aus der offenen Liste, die seit 8 Tagen nur Staub sammeln. Kein Code geht verloren. Issue #279 uebernimmt die Arbeit. Das ist der groesste "Aufraeum-Effekt" mit dem geringsten Risiko.

Alles andere (#218 mergen, #244-#247 genehmigen) kann warten.
