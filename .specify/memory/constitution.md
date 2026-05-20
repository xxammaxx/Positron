# Positron-Constitution

Dies ist die nicht verhandelbare Projektgrundlage für Positron.
Sie gilt für alle Runs, alle Agenten und alle Code-Änderungen.

---

## I. GitHub Source of Truth

Jeder Positron-Run beginnt mit genau einem GitHub-Issue und muss alle relevanten Zwischenschritte sichtbar in GitHub dokumentieren. Kein Fortschritt darf nur in lokalen Logs oder im Modellkontext existieren.

**Pflichtkommentare pro Run:**
1. Issue accepted
2. Repository context loaded
3. Web research completed
4. Specification generated
5. Plan generated
6. Tasks generated
7. Implementation started
8. Tests executed
9. Fix loop result
10. PR created, blocked or closed

---

## II. Spec Before Code

Positron darf OpenCode niemals direkt aus einem Issue heraus mit „fix this" starten. Jedes Issue durchläuft vorher:

1. Issue-Ingestion
2. Repository-Analyse
3. Webrecherche
4. Spezifikation
5. Plan
6. Tasks
7. Review-Gate
8. Implementierung

---

## III. Positron Orchestrates, Agents Execute

Positron ist Workflow-Autorität. Spec Kit erstellt strukturierte Entwicklungsartefakte. OpenCode führt Codeänderungen aus. GitHub speichert sichtbaren Zustand. Docker/Git-Worktrees isolieren Ausführung.

---

## IV. Evidence-Gated Progression

Ein Task ist nicht fertig, weil ein Agent Erfolg meldet. Er ist erst fertig, wenn Beweise vorliegen:

- Tests wurden ausgeführt,
- Build/Lint/Typecheck sind bekannt,
- Akzeptanzkriterien wurden gemappt,
- Diff wurde zusammengefasst,
- Risiken wurden dokumentiert,
- GitHub wurde kommentiert.

---

## V. Controlled Autonomy

Autonomie ist stufenweise und konfigurierbar. Direkte Vollautonomie gegen `main` oder `master` ist verboten.

Autonomiestufen:
- **Level 0 (Observer):** Nur lesen, analysieren — keine Codeänderungen
- **Level 1 (Research & Spec):** Recherche + Spezifikation — keine Codeänderungen
- **Level 2 (Supervised Build):** Codeänderungen mit `ask`-Gates, Push nach Freigabe
- **Level 3 (Autonomous Sandbox):** Autonom im isolierten Workspace, kein Main-Merge
- **Level 4 (CI Auto-PR):** Automatische PR-Erstellung, Merge nur bei grünen Checks

---

## VI. Small, Reversible Changes

Ein Run bearbeitet genau ein Issue, auf genau einem Branch, mit möglichst kleinen Commits. Große Issues werden in kleinere Tasks zerlegt.

---

## VII. No Silent Failure

Jeder Fehler, Testabbruch, Permission-Denial, Retry oder Blocker wird geloggt und in GitHub zusammengefasst.

---

## VIII. Resume by State, Not by Memory

Positron muss nach Neustart anhand persistenter State-Dateien oder Datenbankeinträge fortsetzen können. Kein Run darf vom Chatverlauf abhängig sein.

---

## IX. Security by Default

Secrets dürfen niemals an LLMs gesendet werden. Gefährliche Shell-Befehle benötigen Freigabe oder sind verboten. Vollautonomie ist nur in isolierten Workspaces erlaubt.

**Harte Verbote:**
- ❌ Direkt auf `main`/`master` schreiben
- ❌ Issues ohne Testbericht schließen
- ❌ Secrets an LLMs geben
- ❌ Tokens in Logs schreiben
- ❌ `sudo` ausführen
- ❌ Außerhalb des Workspace löschen
- ❌ Auto-Merge ohne explizite Konfiguration

---

## X. Human Override Always Wins

Der Nutzer kann jeden Run pausieren, abbrechen, überarbeiten, zurückrollen oder zur manuellen Prüfung stoppen. Menschliche Entscheidungen haben immer Vorrang vor automatisierten.
