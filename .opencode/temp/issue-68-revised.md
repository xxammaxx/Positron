## Problem

Das aktuelle Positron-Frontend ist sichtbar, aber noch nicht ausreichend bedienbar.

**Aktueller Zustand:**
- UI öffnet unter `localhost:4173`
- Safety Controls sind sichtbar
- Issues/Runs-Bereiche sind sichtbar
- aber Issues = 0, Runs = 0
- Adapter Health ist leer oder unklar
- keine klare Startaktion
- keine echte Bedienführung
- keine transparente Erklärung für Demo Mode / Real Mode
- kein vollständiger Video-/Trace-Beweis für Backend -> Frontend -> Workflow

**Damit gilt aktuell:**

| Check | Status |
|-------|--------|
| User can open UI | YES |
| Operator can use UI productively | NO |
| Workflow video proof | NO |
| Ready for release tag | NO |

## Ziel

Das Positron Operator Dashboard soll ein echtes Bedienzentrum werden. Ein Nutzer soll ohne Codekenntnisse:

1. Backend-Status sehen
2. Modus erkennen: Demo / Real / Misconfigured
3. Issues sehen oder verstehen, warum keine geladen sind
4. Demo-Blueprint eingeben oder laden
5. Demo-Run starten
6. Run in der Run-Liste sehen
7. Run-Detail öffnen
8. Pipeline mit **28 Phasen** sehen (`packages/shared/src/types.ts` `ALL_PHASES`)
9. EventLog, TestReport und Evidence sehen
10. Safety Gates und Merge-Gates verstehen
11. finalen Status sehen: DONE / BLOCKED / FAILED
12. Video/Trace/Network-Beweis reproduzierbar erzeugen

---

## Design System Integration (Frontend-Design Skill — Pflichtvorgabe)

> **Dieser gesamte Abschnitt ist bindend für ALLE UI-Arbeiten in diesem Issue.**
> Er implementiert die Vorgaben des Frontend-Design Skills (`.claude/skills/frontend-design/SKILL.md`).

### A. Design-Richtung: "Brutalist Operator Terminal"

Die visuelle Identität des Operator Cockpits folgt einer **Brutalist-Operator-Terminal**-Ästhetik:

- **Anti-AI-Slop-Haltung:** Keine generischen lila-blauen Verläufe. Keine austauschbaren Card-Layouts. Keine sterilen Dashboard-Raster ohne Hierarchie. Stattdessen: rohe, ehrliche, funktionalistische Oberfläche mit hohem Informationsgehalt und niedriger visueller Ablenkung.
- **Jeder der 10 Sub-Panels** der Run-Detail-Seite muss eine **eigenständige visuelle Identität** haben — kein generisches "Card mit Titel + Inhalt". Die Panels unterscheiden sich durch Layout, Informationsdichte, Farbschema und Interaktionsmodell.
- **Leerraum ist funktional**, nicht dekorativ. Er trennt logische Bereiche, nicht ästhetische.
- **Informationshierarchie durch Typografie und Position**, nicht durch Farbverläufe oder Schatten.

### B. Design Tokens (Strikte Einhaltung)

#### B1. Farbpalette — verbindliche Zuordnung

| Token | Tailwind-Klasse | Hex-Wert | Verwendung |
|-------|----------------|----------|------------|
| **Primary Background** | `bg-slate-900` | `#0f172a` | Gesamter Seitenhintergrund, Sidebar-Hintergrund |
| **Secondary Background** | `bg-gray-900` | `#111827` | Panel-Hintergründe, Card-Hintergründe |
| **Accent** | `text-sky-400` / `bg-sky-400` | `#38bdf8` | Aktive Elemente, Links, Current-Phase-Indikator, Focus-Ringe, Mode-Badge (REAL) |
| **Surface Elevated** | `bg-slate-800` | `#1e293b` | Hover-Zustände, aktive Navigation, Eingabefelder |
| **Border Default** | `border-slate-700` | `#334155` | Panel-Borders, Trennlinien, Card-Borders |
| **Border Active** | `border-sky-400` | `#38bdf8` | Aktive Panel-Border, Current-Phase-Border, Focus-Border |
| **Text Primary** | `text-slate-100` | `#f1f5f9` | Haupttext, Überschriften |
| **Text Secondary** | `text-slate-400` | `#94a3b8` | Sekundärtext, Labels, Metadaten |
| **Text Muted** | `text-slate-500` | `#64748b` | Deaktivierte Elemente, Placeholder |
| **Status: Pass** | `text-green-400` / `bg-green-500/10` | `#4ade80` | Completed-Phasen, bestandene Tests, passed Gates |
| **Status: Fail** | `text-red-400` / `bg-red-500/10` | `#f87171` | Failed-Phasen, fehlgeschlagene Tests, failed Gates |
| **Status: Warn** | `text-amber-400` / `bg-amber-500/10` | `#fbbf24` | Warning/Skipped-Phasen, partielle Ergebnisse |
| **Status: Blocked** | `text-orange-400` / `bg-orange-500/10` | `#fb923c` | Blocked-Phasen, blockierte Merge-Gates |
| **Status: Human** | `text-purple-400` / `bg-purple-500/10` | `#c084fc` | Human-Action-Needed-Phasen, GATE_APPROVE, GATE_REVISE |
| **Status: Info** | `text-sky-400` / `bg-sky-500/10` | `#38bdf8` | Aktive/Current-Phasen, Info-Level Events |
| **Status: Pending** | `text-slate-600` | `#475569` | Noch nicht gestartete Phasen |

#### B2. Abstände & Grid — striktes 8px-Raster

| Token | Tailwind-Klasse | Pixel | Verwendung |
|-------|----------------|-------|------------|
| `p-2` / `m-2` | `p-2` / `m-2` | 8px | Kompakte innere Abstände, Badge-Padding |
| `p-4` / `m-4` / `gap-4` | `p-4` / `m-4` / `gap-4` | 16px | Standard-Innenabstand, Flex/Grid-Gap |
| `p-6` / `m-6` / `gap-6` | `p-6` / `m-6` / `gap-6` | 24px | Content-Bereich-Padding, Section-Abstand |
| `p-8` / `m-8` / `gap-8` | `p-8` / `m-8` / `gap-8` | 32px | Große Section-Trennung, Dashboard-Raster |
| `rounded-lg` | `rounded-lg` | 8px | Cards, Buttons, Inputs, Panels |
| `rounded-xl` | `rounded-xl` | 12px | Haupt-Cards, Dashboard-Panels |

**Regel:** Keine zufälligen `padding`- oder `margin`-Werte. Alles in Vielfachen von 4px/8px (via Tailwind-Skala: `p-1`=4px, `p-2`=8px, `p-3`=12px, `p-4`=16px, `p-5`=20px, `p-6`=24px, `p-8`=32px).

### C. Typografie

#### C1. Font-Pairing (Pflicht)

| Rolle | Font-Family | Tailwind-Klasse | Google Fonts URL |
|-------|-------------|-----------------|------------------|
| **Headings (h1-h4)** | `Space Grotesk` | `font-['Space_Grotesk']` | `Space+Grotesk:wght@400;500;600;700` |
| **Body / UI-Text** | `IBM Plex Sans` | `font-['IBM_Plex_Sans']` | `IBM+Plex+Sans:wght@400;500;600` |
| **Code / Monospace** | `IBM Plex Mono` | `font-mono` (override) | `IBM+Plex+Mono:wght@400;500;600` |

> **Achtung:** `index.html` verwendet aktuell `Inter` und `JetBrains Mono`. Diese MÜSSEN im Rahmen dieses Issues auf die oben genannten Fonts migriert werden. Kein Fallback auf Arial oder Standard-Inter.

#### C2. Typografische Skala

| Element | Font | Weight | Size (Tailwind) | Line-Height | Verwendung |
|---------|------|--------|-----------------|-------------|------------|
| `h1` | Space Grotesk | `font-bold` (700) | `text-3xl` (30px) | `leading-tight` | Seiten-Titel, Run-Detail-Header |
| `h2` | Space Grotesk | `font-semibold` (600) | `text-xl` (20px) | `leading-snug` | Panel-Überschriften, Section-Titel |
| `h3` | Space Grotesk | `font-medium` (500) | `text-base` (16px) | `leading-snug` | Sub-Panel-Titel, Card-Titel |
| `h4` | Space Grotesk | `font-medium` (500) | `text-sm` (14px) | `leading-normal` | Kleine Labels, Status-Bezeichner |
| **Status Numbers** | IBM Plex Sans | `font-bold` (700) | `text-2xl` (24px) | `leading-tight` | Run-Count, Phase-Count, Metrik-Zahlen |
| **Phase Labels** | IBM Plex Sans | `font-medium` (500) | `text-xs` (12px) | `leading-none` | Pipeline-Phasen-Namen (28 Stück) |
| **Event Log Text** | IBM Plex Mono | `font-normal` (400) | `text-xs` (12px) | `leading-relaxed` | Log-Einträge, Code-Snippets, Timestamps |
| **Body Text** | IBM Plex Sans | `font-normal` (400) | `text-sm` (14px) | `leading-relaxed` | Beschreibungen, Empty-State-Texte, Tooltips |
| **Small Metadata** | IBM Plex Sans | `font-normal` (400) | `text-xs` (12px) | `leading-normal` | Absolute Zeitstempel, ID-Referenzen, Adapter-Namen |

### D. Motion & Interaktion

#### D1. Staggered Panel Load-In

Alle 10 Sub-Panels der Run-Detail-Seite laden mit gestaffelter Animation:

```css
@keyframes panel-enter {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.panel-stagger {
  animation: panel-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.panel-stagger:nth-child(1) { animation-delay: 0.00s; }
.panel-stagger:nth-child(2) { animation-delay: 0.05s; }
.panel-stagger:nth-child(3) { animation-delay: 0.10s; }
/* ... bis nth-child(10) mit 0.05s increments */
```

#### D2. Phase-Status-Transitions (Pipeline)

Jede der 28 Phasen hat vier Hauptzustände mit definierten Übergängen:

| Transition | Dauer | Easing | Effekt |
|------------|-------|--------|--------|
| `pending → active` | 300ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Farbe von `slate-600` → `sky-400`, leichter Scale-Up (1.0 → 1.02), dann zurück |
| `active → completed` | 400ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Farbe von `sky-400` → `green-400`, Check-Icon fade-in (opacity 0→1, 200ms delay) |
| `active → failed` | 300ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Farbe von `sky-400` → `red-400`, kurzer Shake (2x 4px horizontal, 300ms) |
| `pending → skipped` | 200ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Farbe von `slate-600` → `amber-400`, Opacity-Reduktion auf 0.6 |

**Wichtig:** Phase-Status-Änderungen werden NIE nur durch Farbe kommuniziert (WCAG 1.4.1). Jeder Zustand hat zusätzlich ein Icon und einen Text-Label.

#### D3. SSE Live Event Appearance

Events, die via SSE (`GET /api/runs/:id/events/stream`) eintreffen:

```css
@keyframes event-enter {
  from { opacity: 0; transform: translateX(-16px); max-height: 0; }
  to   { opacity: 1; transform: translateX(0); max-height: 100px; }
}

.event-live {
  animation: event-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
  border-left: 3px solid #38bdf8; /* sky-400 */
}
```

- Neue Events sliden von links ein mit einer `sky-400` linken Border, die nach 2 Sekunden auf `border-transparent` verblasst.
- Live-Indikator: pulsierender grüner Punkt (`animate-pulse`) mit Label "LIVE" in `text-green-400`.

#### D4. Hover-Effekte

Alle interaktiven Elemente verwenden die Easing-Kurve `cubic-bezier(0.16, 1, 0.3, 1)` (entspricht Tailwind `ease-out` mit präziserem Bounce-freiem Decay):

| Element | Hover-Effekt | Dauer |
|---------|-------------|-------|
| **Buttons (primary)** | Background-Wechsel `slate-800` → `sky-500/20`, Text `slate-200` → `sky-400` | 150ms |
| **Buttons (secondary)** | Background `slate-800` → `slate-700` | 150ms |
| **Phase-Knoten (Pipeline)** | Scale 1.0 → 1.05, Border `transparent` → `sky-400`, Tooltip erscheint | 200ms |
| **Run-Liste Zeilen** | Background `transparent` → `slate-800/50` | 150ms |
| **Event-Log Zeilen** | Background `transparent` → `slate-800/30` | 100ms |
| **Tab/Section-Navigation** | Text `slate-400` → `sky-400`, Border-bottom erscheint (2px `sky-400`) | 200ms |

#### D5. Run Control Button Feedback

| Aktion | Visuelles Feedback |
|--------|-------------------|
| **Start Run** | Button kurz grün aufleuchten (`bg-green-500` → normal, 600ms), dann Spinner ersetzen durch Check |
| **Pause** | Button wird amber, Icon wechselt von ⏸ zu ⏵ (Resume), Border pulsiert sanft |
| **Abort** | Button wird rot, kurzer Shake, Bestätigungs-Dialog erscheint mit Fokus-Falle |
| **Retry** | Button zeigt Spinner, dann Navigation zum neuen Run |
| **Export** | Button kurz grün aufleuchten, Download startet |

#### D6. Mode Badge (REAL-Mode-Warnung)

Der `REAL`-Mode-Badge hat eine permanente subtile Glow-Animation, um die Gefahr echter GitHub-Operationen zu signalisieren:

```css
.mode-badge-real {
  @apply bg-red-500/20 text-red-400 border border-red-800;
  animation: mode-pulse 2s ease-in-out infinite;
}
@keyframes mode-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
  50%      { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0); }
}
```

### E. Accessibility (Pflicht — kein optionaler Zusatz)

#### E1. ARIA-Attribute für alle interaktiven Elemente

| Element | Erforderliche ARIA-Attribute |
|---------|------------------------------|
| **Top Bar Navigation** | `<nav aria-label="Main navigation">`, Links mit `aria-current="page"` |
| **Mode Badge** | `role="status" aria-live="polite" aria-label="Mode: Demo"` |
| **Backend Status** | `role="status" aria-live="polite" aria-label="Backend: Connected"` |
| **Kill-Switch** | `role="switch" aria-checked="true/false" aria-label="Kill-Switch: ON"` |
| **28-Phase Pipeline** | `role="list"`, jedes Phase-Item: `role="listitem" aria-label="Phase QUEUED: pending"` |
| **Event Log Filter** | `role="search" aria-label="Filter events"` |
| **SSE Live Indicator** | `role="status" aria-live="polite" aria-label="Live events active"` |
| **Run Controls (Buttons)** | `aria-label="Pause run"`, `aria-disabled="true"` wenn deaktiviert |
| **Empty States** | `role="status"` für Erklärungen, aktionierbare Buttons mit klaren Labels |
| **Tabs (Run-Detail)** | `role="tablist"`, `role="tab"`, `aria-selected="true/false"`, `aria-controls="panel-id"` |
| **Merge Gates** | Jedes Gate: `role="status" aria-label="Gate Auto-Merge: passed"` |
| **Modal (New Run)** | `role="dialog" aria-modal="true" aria-labelledby="modal-title"` |

#### E2. Keyboard Navigation

**Vollständiger Keyboard-Navigationspfad:**

```
Tab-Reihenfolge (logisch, nicht DOM-Reihenfolge):

1. Skip-to-Content Link (nur sichtbar bei Fokus)
2. Sidebar Toggle Button
3. Navigation Links (Dashboard → Runs → Evidence → Repos → Settings)
4. Mode Badge (nur Info, nicht fokussierbar)
5. [MAIN CONTENT]
   5a. Top-Level-Aktionen (Load Mini Blueprint, Start Demo Run, Refresh)
   5b. Status Cards (Tab durch Cards, Enter für Details)
   5c. Issue Queue (Tab durch Issue-Zeilen, Enter öffnet Run-Dialog)
   5d. Run List (Tab durch Run-Zeilen, Enter öffnet Run-Detail)
   5e. Adapter Health (Tab durch Adapter-Zeilen für Tooltip)
   5f. Safety Controls (Tab durch Toggles — Space zum Umschalten)
6. [RUN DETAIL PAGE]
   6a. Run Header Info
   6b. Pipeline (Tab durch 28 Phasen, Enter für Details)
   6c. Event Log Filter (Eingabefeld)
   6d. Event Log Einträge (Tab durch, Enter kopiert Event)
   6e. Tab-Navigation (Test Report, Evidence, GitHub Sync, PR & Merge, Merge Gates, Safety)
   6f. Run Controls (Pause, Abort, Resume, Retry, Export)
7. Footer / Settings
```

**Zusätzliche Shortcuts:**
- `Ctrl+K` / `Cmd+K`: Command Palette / Suche
- `Escape`: Modal schließen, Filter zurücksetzen
- `R`: Run-Detail aktualisieren (wenn auf Run-Detail-Seite)
- `?`: Keyboard-Shortcuts-Overlay anzeigen

#### E3. Focus Management

- **Nach SSE-Update:** Fokus bleibt auf dem aktuellen Element. Neue Events werden NICHT den Fokus stehlen.
- **Nach Modal-Öffnen:** Fokus springt in die Fokus-Falle des Modals (erstes fokussierbares Element).
- **Nach Modal-Schließen:** Fokus kehrt zum auslösenden Button zurück.
- **Nach Navigation:** Fokus springt zum `#main-content` Container (via `Skip to content` oder programmatisch).
- **Phase-Transition:** Wenn eine Phase von `pending` → `active` wechselt, wird ein `aria-live="polite"`-Container aktualisiert, aber der Fokus nicht bewegt.

#### E4. Screen Reader Announcements

Live-Regionen (unsichtbar, nur für Screenreader):

```html
<!-- Status-Änderungen -->
<div aria-live="polite" aria-atomic="true" class="sr-only" id="sr-announcements">
  Phase CLAIMED completed. Phase REPO_SYNC started.
</div>

<!-- Kritische Änderungen (assertive = unterbricht) -->
<div aria-live="assertive" aria-atomic="true" class="sr-only" id="sr-alerts">
  Run failed at phase TEST. 3 tests failed, 12 passed.
</div>
```

**Regeln für Announcements:**
- `polite`: Status-Updates, Phase-Wechsel, Event-Eingang
- `assertive`: Run-Fehler, Merge-Blocker, Kill-Switch-Änderung, Disconnect

#### E5. Color Contrast & WCAG 2.1 AA

| Kombination | Kontrastverhältnis | WCAG AA? |
|-------------|-------------------|----------|
| `#f1f5f9` (Text Primary) auf `#0f172a` (Primary BG) | 13.5:1 | ✅ AAA |
| `#94a3b8` (Text Secondary) auf `#0f172a` (Primary BG) | 5.9:1 | ✅ AA |
| `#38bdf8` (Accent) auf `#0f172a` (Primary BG) | 5.2:1 | ✅ AA |
| `#4ade80` (Pass) auf `#0f172a` (Primary BG) | 7.5:1 | ✅ AAA |
| `#f87171` (Fail) auf `#0f172a` (Primary BG) | 4.6:1 | ✅ AA |
| `#475569` (Pending) auf `#0f172a` (Primary BG) | 3.5:1 | ⚠️ Nur für dekorative/deaktivierte Elemente |

> **Kritische Regel:** Pending-Phasen-Farbe (`#475569`) darf NUR für dekorative/nicht-interaktive Elemente verwendet werden. Diese Phasen MÜSSEN zusätzlich ein Icon haben.

#### E6. `prefers-reduced-motion`

ALLE Animationen respektieren die System-Einstellung:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- Staggered Panel Load: alle Panels erscheinen sofort (kein Delay).
- Phase-Transition: sofortiger Farbwechsel ohne Animation.
- SSE Event-Enter: Event erscheint ohne Slide.
- Mode-Badge-Pulse: deaktiviert, stattdessen statischer Border-Glow.

### F. Component Architecture (React 18 + TypeScript + Tailwind)

#### F1. Component Tree (vollständig)

```
AppShell
├── TopBar
│   ├── ModeBadge          (Props: mode: 'demo' | 'real' | 'misconfigured')
│   ├── BackendStatus      (Props: status: 'connected' | 'reconnecting' | 'offline')
│   ├── RepoIndicator      (Props: owner: string, repo: string | null)
│   └── KillSwitchBadge    (Props: active: boolean)
├── Sidebar
│   └── NavLink[]          (Props: to: string, icon: ReactNode, label: string)
└── MainContent

DashboardPage
├── SystemStatusPanel      (Props: metrics: Metrics | null, isLoading: boolean)
│   ├── StatusCard         (Props: title, value, icon, variant, tooltip)
│   │   ├── BackendCard
│   │   ├── GitHubCard
│   │   ├── AdapterCard
│   │   └── SafetyCard
├── BlueprintPanel         (Props: onStartRun: () => void, isLoading: boolean)
│   └── Textarea + ActionButtons
├── IssueQueuePanel        (Props: issues: Issue[], isLoading: boolean)
│   ├── IssueRow           (Props: issue: Issue, onStartRun: (id) => void)
│   └── EmptyState         (Props: title, description, actions: Action[])
├── RunListPanel           (Props: runs: Run[], isLoading: boolean)
│   ├── RunRow             (Props: run: Run, onClick: () => void)
│   └── EmptyState
└── RunDetail              (Route: /runs/:id)
    ├── RunHeader          (Props: run: Run)
    ├── PhasePipeline      (Props: phases: PhaseState[], currentPhase: Phase)
    │   └── PhaseNode      (Props: phase: PhaseState, isCurrent: boolean, onClick)
    ├── EventLog           (Props: events: RunEvent[], isLive: boolean, filters)
    │   ├── EventFilter    (Props: onFilterChange, activeFilters)
    │   └── EventRow       (Props: event: RunEvent, onCopy)
    ├── TestReportPanel    (Props: report: TestReport | null, isLoading)
    │   ├── TestSummary    (Props: passed, failed, skipped, duration)
    │   └── FailedTestList (Props: failures: TestFailure[])
    ├── EvidencePanel      (Props: items: Evidence[], isLoading)
    │   └── EvidenceItem   (Props: item: Evidence, onDownload)
    ├── GitHubSyncPanel    (Props: syncState: GitHubSyncState)
    ├── PRMergePanel       (Props: prState: PRState | null)
    ├── MergeGatesPanel    (Props: gates: MergeGate[])
    │   └── MergeGateRow   (Props: gate: MergeGate)
    ├── SafetyControls     (Props: controls: SafetyControl[], readOnly: boolean)
    │   └── SafetyToggle   (Props: control: SafetyControl, onToggle)
    └── RunControls        (Props: onPause, onAbort, onResume, onRetry, onExport, disabled: ActionMask)
```

#### F2. Komponenten-Regeln (DRY)

**Wiederverwendbare Shared Components:**

| Component | Verwendung | Pfad |
|-----------|-----------|------|
| `StatusCard` | Backend, GitHub, Adapter, Safety — alle Statuskarten | `components/shared/StatusCard.tsx` |
| `EmptyState` | Issue Queue, Run List, Evidence, Test Report — alle Leerzustände | `components/shared/EmptyState.tsx` |
| `PhaseNode` | Einzelne Phase im Pipeline-Diagramm (28× verwendet) | `components/shared/PhaseNode.tsx` |
| `Badge` | Mode-Badge, Status-Badge, Count-Badge, Label-Badge | `components/shared/Badge.tsx` |
| `Tooltip` | Phase-Info, Gate-Erklärung, Button-Begründung | `components/shared/Tooltip.tsx` |
| `Skeleton` | Loading-Zustand für Panels und Cards | `components/shared/Skeleton.tsx` |
| `ErrorBanner` | Fehler-Banner für API-Fehler, Connection-Loss | `components/shared/ErrorBanner.tsx` |
| `ConfirmDialog` | Bestätigungsdialog für Abort, Mode-Wechsel | `components/shared/ConfirmDialog.tsx` |

> **Bestehende Komponenten prüfen:** `components/shared/` enthält bereits `EmptyState.tsx` und `ErrorBanner.tsx`. Diese müssen auf die neuen Design Tokens migriert werden.

#### F3. Semantic HTML (Pflicht pro Komponente)

| Bereich | Semantic Tag |
|---------|-------------|
| Top Bar | `<header>` |
| Sidebar | `<aside>` mit `<nav>` |
| Main Content | `<main id="main-content">` |
| Jeder Sub-Panel | `<section aria-labelledby="panel-title">` |
| Phase Pipeline | `<ol>` (ordered list — Phasen haben Reihenfolge) |
| Event Log | `<ul>` mit `<li>` pro Event, Filter als `<search>` |
| Run Controls | `<menu>` (Toolbar-Semantik) |
| Merge Gates | `<dl>` (Description List — Gate + Status) |
| Safety Toggles | `<form>` oder individuelle `<button role="switch">` |

---

## Design-Prinzipien

### 1. Visibility of System Status
Der Nutzer muss jederzeit sehen: Backend verbunden/offline, Demo/Real Mode, API Base URL, GitHub Token status, Repo konfiguriert, Anzahl Issues/Runs, aktiver Run-Status, aktuelle Phase, letzter Fehler/Blocker.

**Design-Umsetzung:** Top Bar als permanente Status-Leiste (`bg-slate-900`, `border-b border-slate-800`, `p-4`). Jeder Status-Indikator mit `role="status"` und `aria-live="polite"`.

### 2. User Control and Freedom
Sichere Aktionen: Demo-Daten laden, Demo-Blueprint laden, Demo-Run starten, Run-Detail öffnen, Run abbrechen/pausieren/fortsetzen/retry. Bei nicht möglicher Aktion: **Button disabled mit Begründung** - nicht einfach grau ohne Erklärung.

**Design-Umsetzung:** Disabled-Buttons mit `aria-disabled="true"`, Tooltip mit Begründung (z.B. "Backend endpoint missing: POST /api/demo-runs"), `cursor-not-allowed`.

### 3. Error Prevention
- Merge OFF by default
- Push OFF by default
- Fix Loop OFF by default
- Kill-Switch ON by default
- Auto-Merge nie aus UI ohne klare Gates
- Real GitHub Mode klar markiert

**Design-Umsetzung:** Gefährliche Aktionen mit `ConfirmDialog`-Gate (Fokus-Falle, `role="alertdialog"`). Kill-Switch immer oben rechts sichtbar.

### 4. Explainability
Jeder leere/blockierte Zustand braucht Erklärung:
- Warum Issues = 0?
- Warum Runs = 0?
- Warum Adapter Health leer?
- Warum Merge blocked?
- Warum Run failed/blocked?
- Warum Start Run disabled?

**Design-Umsetzung:** `EmptyState`-Komponente mit `role="status"`, klaren Erklärungen (`text-sm text-slate-400` in `IBM Plex Sans`), und aktionierbaren Vorschlägen.

---

## Dashboard-Struktur

### A. Top Bar

```
┌──────────────────────────────────────────────────────────────────┐
│ ☰ POSITRON · Operator Cockpit               [DEMO] 🟢 Connected │
│               demo-owner/demo-repo          Kill-Switch: ON ⬤   │
└──────────────────────────────────────────────────────────────────┘
```

**Design-Spec:**
- Hintergrund: `bg-slate-900 border-b border-slate-700`
- Höhe: `h-14` (56px)
- Padding: `px-4 py-2`
- Font: `IBM Plex Sans`, Titel in `Space Grotesk font-bold text-sm tracking-wider`
- Layout: `flex items-center justify-between`
- Mode Badge (DEMO): `bg-sky-500/10 text-sky-400 border border-sky-800 rounded-md px-2 py-0.5 text-xs font-medium font-['IBM_Plex_Sans']`
- Mode Badge (REAL): Mit permanenter Pulse-Glow-Animation (siehe D6)
- Mode Badge (MISCONFIGURED): `bg-amber-500/10 text-amber-400 border border-amber-800`
- Backend Status: Grüner Punkt (`w-2 h-2 rounded-full bg-green-400 animate-pulse`) + Text "Connected"
- Kill-Switch: `bg-red-500/20 text-red-400 border border-red-800 rounded-md px-2 py-0.5 text-xs font-medium`

| Element | Mögliche Werte |
|---------|---------------|
| Mode Badge | `DEMO` / `REAL` / `MISCONFIGURED` |
| Backend Status | `Connected` / `Reconnecting` / `Offline` |
| API Base URL | z.B. `http://localhost:3000` |
| Repository | `owner/repo` |
| Safety Profile | `observe` / `supervised` / `autonomous-safe` |
| Kill-Switch | ON/OFF |

### B. System Status Panel

**Design-Spec:**
- 4 Statuskarten in einer Zeile: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`
- Jede Card: `bg-gray-900 border border-slate-700 rounded-xl p-4 transition-colors duration-150 hover:border-slate-600`
- Card-Titel: `text-xs font-medium text-slate-400 uppercase tracking-wider font-['IBM_Plex_Sans']`
- Card-Wert: `text-2xl font-bold text-slate-100 font-['IBM_Plex_Sans']`
- Card-Status-Indikator: Linker Border-Streifen via `border-l-4` (siehe Status-Farben in B1)
- ARIA: `role="status" aria-live="polite"` pro Card

**4 Statuskarten:**

1. **Backend** — `/api/health`, status ok/error, runs count, uptime
   - `border-l-sky-400` wenn connected, `border-l-red-400` wenn offline
2. **GitHub** — token present yes/no, repo configured yes/no, mode fake/real, last sync
   - `border-l-green-400` wenn vollständig, `border-l-amber-400` wenn teilweise
3. **Adapter Health** — GitHub, GitWorkspace, SpecKit, OpenCode, TestRunner, StatusSync
   - `border-l-sky-400` wenn alle ok, `border-l-amber-400` wenn teilweise
   - **Darf niemals leer sein!** Fallback: `EmptyState` mit "Adapter health not loaded yet. Click Refresh Health or check backend connection."
4. **Safety State** — Push enabled, Merge enabled, Fix Loop enabled, Dry Run enabled, Kill-Switch enabled
   - `border-l-red-400` wenn Kill-Switch ON (Warnfarbe für Sicherheitszustand)

### C. Demo / Blueprint Panel

**Design-Spec:**
- Hintergrund: `bg-gray-900 border border-slate-700 rounded-xl p-6`
- Titel: `h2` in `Space Grotesk font-semibold text-xl text-slate-100`
- Untertitel: `text-sm text-slate-400 font-['IBM_Plex_Sans']`
- Textarea: `bg-slate-800 border border-slate-700 rounded-lg p-4 text-sm text-slate-100 font-['IBM_Plex_Mono'] leading-relaxed focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 min-h-[160px]`
- Button-Reihe: `flex items-center gap-3 mt-4`
- Primary Action ("Start Demo Run"): `btn-primary` (migriert auf `bg-sky-500 hover:bg-sky-400 text-slate-900 font-semibold`)
- Secondary Action ("Load Mini Blueprint"): `bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150`
- Disabled-Zustand: Tooltip mit Begründung via `aria-describedby`

**Hinweis:** "Demo runs do not push, merge, or call external tools unless explicitly enabled."
- Angezeigt als: `bg-amber-500/10 border border-amber-800 rounded-lg p-3 text-xs text-amber-400` mit Warn-Icon.

**Standard Mini Blueprint:**
```markdown
# Mini Blueprint

## Goal
Create a harmless demo change for Positron UI acceptance.

## Task
Append one line to `.positron-dogfood.md`:

"UI workflow video proof completed for run <RUN_ID>."

## Constraints
- No merge
- No auto-fix
- No external operator tools
- No Paperclip / OpenClaw / Researcher
- Use demo/supervised mode only
```

**Verhalten:**
- "Load Mini Blueprint" fullt Textarea (mit `animation: panel-enter 0.3s` auf der Textarea)
- "Start Demo Run" ruft `POST /api/demo-runs` auf
- Backend erzeugt echten Run im Demo-Modus
- UI navigiert/verlinkt zum Run-Detail
- Falls Backend keinen Start-Endpoint hat: Button disabled mit `aria-disabled="true"` und Tooltip "Backend endpoint missing: POST /api/demo-runs"

### D. Issue Queue Panel

**Design-Spec:**
- Panel: `bg-gray-900 border border-slate-700 rounded-xl p-6`
- Issue-Zeile: `flex items-center justify-between p-3 hover:bg-slate-800/50 rounded-lg transition-colors duration-150 cursor-pointer`
- Issue-Nummer: `text-xs font-mono text-sky-400 font-['IBM_Plex_Mono']` (z.B. `#42`)
- Issue-Titel: `text-sm font-medium text-slate-200 truncate font-['IBM_Plex_Sans']`
- Labels: `Badge`-Komponente mit `text-xs`
- Ready/Blocked Status: Pfeil-Icon + Text
- Button "Start Run": `text-xs bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-800 rounded-md px-3 py-1 transition-colors duration-150`

**Empty State (nicht nur "Issues (0)"):**
```
┌──────────────────────────────────────────────┐
│  📋 No issues loaded.                        │
│                                              │
│  Possible reasons:                           │
│  • Demo mode has no seeded issues.           │
│  • GITHUB_TOKEN is missing.                  │
│  • Repository is not configured.             │
│  • No issue has the label positron:ready.    │
│                                              │
│  [Load Demo Issue] [Refresh Issues]          │
│  [Open Configuration Help]                   │
└──────────────────────────────────────────────┘
```

**Design-Spec Empty State:** `text-center py-8`, Titel in `text-base font-medium text-slate-300 font-['IBM_Plex_Sans']`, Erklärung in `text-sm text-slate-400`, Buttons `mt-4 flex justify-center gap-3`.

### E. Run List Panel

**Design-Spec:**
- Panel: `bg-gray-900 border border-slate-700 rounded-xl p-6`
- Run-Zeile: `grid grid-cols-12 gap-4 items-center p-3 hover:bg-slate-800/50 rounded-lg transition-colors duration-150`
- Run ID: `text-xs font-mono text-sky-400 font-['IBM_Plex_Mono']` (Spalte 1)
- Issue: `text-sm text-slate-300 font-['IBM_Plex_Sans']` (Spalte 1-2)
- Branch: `text-xs font-mono text-slate-400 font-['IBM_Plex_Mono']` (Spalte 1)
- Status: `Badge`-Komponente (Spalte 1)
- Phase: `PhaseBadge`-Komponente (Spalte 1)
- Zeit: `text-xs text-slate-500 font-['IBM_Plex_Sans']` (Spalte 2)
- Action "Open Run": `text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors duration-150`

**Empty State:**
```
┌──────────────────────────────────────────────┐
│  🚀 No runs yet.                             │
│                                              │
│  Start a demo run or load issues from GitHub.│
│                                              │
│  [Load Mini Blueprint] [Start Demo Run]      │
└──────────────────────────────────────────────┘
```

---

## F. Run Detail Page (10 Sub-Panels)

**Design-Spec — Run-Detail-Layout:**
- Container: `max-w-7xl mx-auto space-y-6`
- Tab-Navigation für die 10 Panels: `flex items-center gap-1 border-b border-slate-700 pb-0 mb-6 overflow-x-auto`
- Tab: `px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 border-b-2 border-transparent hover:border-slate-600 transition-colors duration-200 font-['IBM_Plex_Sans']`
- Tab active: `text-sky-400 border-b-2 border-sky-400`
- Tab ARIA: `role="tablist"`, jedes Tab `role="tab" aria-selected="true/false" aria-controls="panel-<id>"`

### F1. Run Header

**Design-Spec:**
- Layout: `flex flex-wrap items-center gap-4 p-6 bg-gray-900 border border-slate-700 rounded-xl`
- Run ID: `text-3xl font-bold text-slate-100 font-['Space_Grotesk'] tracking-tight`
- Status-Badge: Inline mit Run-Titel
- Metadata-Grid: `grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4`
- Metadata-Label: `text-xs font-medium text-slate-500 uppercase tracking-wider font-['IBM_Plex_Sans']`
- Metadata-Wert: `text-sm text-slate-200 font-['IBM_Plex_Sans']`
- PR/Merge Links: `text-sky-400 hover:text-sky-300 text-sm font-medium`

**Inhalte:** Run ID / Issue / Branch / Mode / Autonomy Level / Phase / Status / Attempt / Started / Finished / PR/Merge Links

### F2. 28-Phase Pipeline

> **Hinweis:** PUSH ist keine separate Phase, sondern eine Sub-Operation der COMMIT-Phase, kontrolliert via `POSITRON_ENABLE_PUSH`.

**Die 28 Phasen aus `packages/shared/src/types.ts` `ALL_PHASES`:**

```
QUEUED → CLAIMED → REPO_SYNC → ISSUE_CONTEXT → WEB_RESEARCH → SPECIFY →
CLARIFY_OPTIONAL → PLAN → TASKS → ANALYZE → REVIEW → IMPLEMENT → TEST →
VERIFY → COMMIT → PR_CREATE → MERGE → DONE

Fehler-/Blockade-Phasen:
FAILED | FAILED_TRANSIENT | FAILED_BLOCKED | FAILED_UNSAFE |
BLOCKED_PUSH | BLOCKED_MERGE | GATE_APPROVE | GATE_REVISE |
RESUME_PENDING | CLEANUP
```

**Design-Spec — Brutalist Pipeline Visual:**
- **Kein Standard-Flowchart!** Stattdessen: Eine horizontale "Terminal-Timeline" oder vertikale "Server-Rack"-Darstellung.
- Layout: `overflow-x-auto pb-4` (horizontal scrollbar mit `scrollbar-thin`)
- Pipeline-Container: `flex items-start gap-1 min-w-max`
- Pro Phase: Ein **PhaseNode**-Component
  - Größe: `w-24 h-16` (kompakt, informativ)
  - Hintergrund: `bg-gray-900 border border-slate-700 rounded-lg`
  - Status-Farben: Siehe Motion D2
  - Phase-Label: `text-[10px] font-medium text-slate-400 leading-tight font-['IBM_Plex_Sans']` (zwei Zeilen)
  - Current-Phase-Indikator: `border-sky-400 ring-1 ring-sky-400/50`
  - Hover: Scale 1.05, Border → `border-sky-400`, Tooltip mit Details erscheint
  - Connector-Linie zwischen Phasen: `w-2 h-px bg-slate-700` (pending) / `bg-green-400` (completed)
  - ARIA: `role="listitem" aria-label="Phase SPECIFY: completed" aria-current="step"` (wenn current)

**Farbcodierung (mapped auf Design Tokens B1):**

| Farbe | Tailwind | Bedeutung | Icon |
|-------|----------|-----------|------|
| `text-slate-600` / `bg-slate-800` | `slate-600/slate-800` | pending | ○ (leerer Kreis) |
| `text-sky-400` / `bg-sky-500/10` / `border-sky-400` | `sky-400/sky-500/10` | current | ◉ (gefüllt mit Ring) |
| `text-green-400` / `bg-green-500/10` | `green-400/green-500/10` | completed | ✓ (Check) |
| `text-amber-400` / `bg-amber-500/10` | `amber-400/amber-500/10` | warning / skipped | ⚠ (Warning) |
| `text-red-400` / `bg-red-500/10` | `red-400/red-500/10` | failed / blocked | ✗ (Cross) |
| `text-purple-400` / `bg-purple-500/10` | `purple-400/purple-500/10` | human action needed | 👤 (Person) |

### F3. Event Log

**Design-Spec:**
- Panel: `bg-gray-900 border border-slate-700 rounded-xl p-6`
- Header: `flex items-center justify-between mb-4`
- Titel: `h2` in `Space Grotesk font-semibold text-xl text-slate-100`
- Live Indikator: `flex items-center gap-2`
  - Punkt: `w-2 h-2 rounded-full bg-green-400 animate-pulse`
  - Text: `text-xs font-medium text-green-400 font-['IBM_Plex_Mono']` "LIVE"
  - SSE Status: `text-xs text-slate-500` — "connected" / "reconnecting (attempt 3)" / "disconnected"
  - ARIA: `role="status" aria-live="polite"`

**Filter-Bar:**
- Layout: `flex items-center gap-3 mb-4 flex-wrap`
- Level-Filter: `select` mit Optionen (ALL, INFO, WARN, ERROR, GATE, HUMAN)
  - `bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300`
- Phase-Filter: Multi-Select oder Autocomplete (28 Phasen)
- Suchfeld: `input`-Klasse mit `w-64`
  - `placeholder="Search events..."`
  - `font-['IBM_Plex_Mono']`
- Auto-Scroll Toggle: `flex items-center gap-2 text-xs text-slate-400`
- ARIA: Filter-Bar als `role="search" aria-label="Filter events"`

**Event-Liste:**
- Container: `max-h-[500px] overflow-y-auto space-y-1` (scrollbar `scrollbar-thin`)
- Einzelnes Event (EventRow):
  - Layout: `flex items-start gap-3 p-2 rounded-lg transition-colors duration-100 hover:bg-slate-800/30`
  - Live-Event: `border-l-3 border-l-sky-400` (verblasst nach 2s)
  - Timestamp: `text-[11px] font-mono text-slate-500 shrink-0 w-20 font-['IBM_Plex_Mono']`
  - Level-Badge: `text-[10px] font-medium px-1.5 py-0.5 rounded` — pro Level:
    - INFO: `bg-sky-500/10 text-sky-400`
    - WARN: `bg-amber-500/10 text-amber-400`
    - ERROR: `bg-red-500/10 text-red-400`
    - GATE: `bg-purple-500/10 text-purple-400`
    - HUMAN: `bg-orange-500/10 text-orange-400`
  - Phase: `text-[11px] font-mono text-slate-500 font-['IBM_Plex_Mono']`
  - Message: `text-xs text-slate-200 flex-1 leading-relaxed font-['IBM_Plex_Mono']`
  - Source: `text-[10px] text-slate-600 font-['IBM_Plex_Mono']`
  - Copy-Button: `opacity-0 group-hover:opacity-100 transition-opacity` (erscheint bei Hover auf Zeile)
  - Artifact-Link: `text-sky-400 hover:underline text-[11px]`

- **SSE-Verhalten:** Neue Events sliden von links ein (siehe D3). Auto-Scroll wenn Toggle aktiv. Bei 1000+ Events: Virtualisierung für Performance.

### F4. Test Report

**Design-Spec:**
- Panel: `bg-gray-900 border border-slate-700 rounded-xl p-6`
- Summary-Cards: `grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6`
  - Passed: `bg-green-500/10 border border-green-800 rounded-lg p-4 text-center`
    - Zahl: `text-3xl font-bold text-green-400 font-['IBM_Plex_Sans']`
    - Label: `text-xs text-green-500/70 font-['IBM_Plex_Sans']` "PASSED"
  - Failed: `bg-red-500/10 border border-red-800 rounded-lg p-4 text-center`
  - Skipped: `bg-amber-500/10 border border-amber-800 rounded-lg p-4 text-center`
  - Duration: `bg-slate-800 border border-slate-700 rounded-lg p-4 text-center`
- Commands-Liste: `space-y-2`
- Exit Codes: `font-['IBM_Plex_Mono']` in Badge
- stdout/stderr: Collapsible Sections mit `bg-slate-800 rounded-lg p-3 font-['IBM_Plex_Mono'] text-xs`
- Failed Tests: `space-y-3` mit rotem Border-Left wie Status-Fail

> **Backend-Gap:** `GET /api/runs/:id/test-report` existiert noch nicht. Muss als Aggregator-Endpoint aus `run_events` (phase=TEST) implementiert werden.

### F5. Evidence Panel

**Design-Spec:**
- Panel: `bg-gray-900 border border-slate-700 rounded-xl p-6`
- Grid: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Evidence-Karte:
  - Layout: `p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-sky-700 transition-colors duration-150`
  - Artifact-Type-Icon: Großes Icon oben links
  - Path: `text-xs font-mono text-sky-400 truncate font-['IBM_Plex_Mono']`
  - Hash: `text-[10px] font-mono text-slate-500 truncate font-['IBM_Plex_Mono']`
  - Phase & Source: `flex gap-2 mt-2`
  - Download-Button: `text-xs text-sky-400 hover:text-sky-300`

**Evidence Items mit:** Artifact type, Phase, Path, Hash, Link/Download, Source (GitHub/Workspace/SpecKit/OpenCode/TestRunner/StatusSync)

### F6. GitHub Sync Panel

**Design-Spec:**
- Panel: `bg-gray-900 border border-slate-700 rounded-xl p-6`
- Sync-Status: `flex items-center gap-2 mb-4`
- Timeline: Vertikale Timeline mit Sync-Events (`border-l-2 border-slate-700 pl-4 space-y-4`)
- Jedes Event: `text-sm`, Kommentar-Text in `text-slate-300`, Timestamp in `text-xs text-slate-500`
- Labels: `Badge`-Komponenten inline
- Deduplication-Info: `text-xs text-slate-500 italic`

**Inhalte:** Kommentare geschrieben, Labels gesetzt/entfernt, letzter Sync, Sync Status, Deduplication, GitHub Issue/PR/Merge Links

### F7. PR & Merge Panel

**Design-Spec:**
- Panel: `bg-gray-900 border border-slate-700 rounded-xl p-6`
- PR-Status-Badge: Prominent oben
  - Not Created: `bg-slate-800 text-slate-400`
  - Open: `bg-green-500/10 text-green-400 border-green-800`
  - Closed: `bg-red-500/10 text-red-400 border-red-800`
  - Merged: `bg-purple-500/10 text-purple-400 border-purple-800`
- Info-Grid: `grid grid-cols-2 gap-4 mt-4`
- Mergeability-Indikator:
  - Clean: `text-green-400`
  - Checking: `text-amber-400` mit Spinner-Animation
  - Dirty: `text-red-400`
  - Unknown: `text-slate-500`
- Status Checks: Liste mit `✓`/`✗` Icons
- Review Status: Reviewer-Avatare + Status

### F8. Merge Gates Panel

**Design-Spec:**
- Panel: `bg-gray-900 border border-slate-700 rounded-xl p-6`
- Gate-Liste: `<dl>` (Description List) — `<dt>` = Gate-Name, `<dd>` = Status + Erklärung
- Jedes Gate: `flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700`
- Gate-Name: `text-sm font-medium text-slate-200 font-['IBM_Plex_Sans']`
- Gate-Status:
  - PASS: `text-green-400` + Check-Icon
  - FAIL: `text-red-400` + Cross-Icon
  - CHECKING: `text-amber-400` + Spinner-Icon
  - N/A: `text-slate-500` + Dash
- Erklärung: `text-xs text-slate-400 mt-1`
- Quelle: `text-[10px] text-slate-600 font-mono`
- ARIA: `role="status"` pro Gate

**Alle 10 Gates einzeln:**
1. Auto-Merge Enabled
2. Dry-Run
3. Kill-Switch
4. Run Status Active
5. Test Evidence
6. Branch Exists
7. PR Open
8. Mergeable
9. Required Checks
10. Reviews (falls aktiviert)

**Wenn blocked:**
```
┌──────────────────────────────────────────────┐
│ ⛔ Merge blocked because:                     │
│                                              │
│ • POSITRON_ENABLE_MERGE not set              │
│ • Kill-Switch active                         │
│ • mergeable is checking                      │
└──────────────────────────────────────────────┘
```
- Darstellung: `bg-red-500/10 border border-red-800 rounded-lg p-4 text-red-400`

### F9. Safety Controls

**Design-Spec:**
- Panel: `bg-gray-900 border border-slate-700 rounded-xl p-6`
- Read-Only vs. Steuerbar — **klar visuell unterschieden:**
  - **Steuerbar:** Toggle-Switch mit `role="switch" aria-checked="true/false"`, Label `text-sm`, Beschreibung `text-xs text-slate-400`
  - **Read-Only:** Anzeige des Werts, daneben `🔒`-Icon, Tooltip: "Configured via environment variables. Cannot be changed from UI."
- Toggle-Komponente (wenn steuerbar):
  - Track: `w-10 h-5 rounded-full transition-colors duration-200` (`bg-slate-700` off, `bg-sky-500` on)
  - Thumb: `w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200` (`translate-x-0.5` off, `translate-x-5` on)
- Bestätigungsdialog: `ConfirmDialog`-Komponente mit `role="alertdialog"` bei sicherheitskritischen Änderungen
- Audit-Event: Nach Änderung Event-Log-Eintrag

### F10. Run Controls

**Design-Spec:**
- Panel: `bg-gray-900 border border-slate-700 rounded-xl p-6`
- Layout: `flex items-center gap-3 flex-wrap`
- Buttons als `<menu>`-Container:

| Button | Styling | Zustand |
|--------|---------|---------|
| **Pause** | `bg-amber-500/10 text-amber-400 border border-amber-800 hover:bg-amber-500/20` | Aktiv wenn Run läuft |
| **Abort** | `bg-red-500/10 text-red-400 border border-red-800 hover:bg-red-500/20` | Aktiv wenn Run läuft |
| **Resume** | `bg-green-500/10 text-green-400 border border-green-800 hover:bg-green-500/20` | Aktiv wenn pausiert |
| **Retry** | `bg-sky-500/10 text-sky-400 border border-sky-800 hover:bg-sky-500/20` | Aktiv wenn fehlgeschlagen |
| **Start Demo Run** | `bg-sky-500 text-slate-900 font-semibold hover:bg-sky-400` | Primär-CTA |
| **Refresh Run** | `bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700` | Immer aktiv |
| **Export Report** | `bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700` | Aktiv wenn Run terminiert |

- **Disabled:** Alle Buttons mit `opacity-50 cursor-not-allowed`, `aria-disabled="true"`, und Tooltip mit Begründung (nicht einfach grau).
- **Button Feedback:** Siehe Motion D5.

---

## G. Real-Time Updates

- **SSE**: `GET /api/runs/:id/events/stream` (bereits implementiert: rate limiting 20 events/s, W3C Last-Event-ID, Heartbeat 15s, Secret Redaction)
- **UI-Status**: connected / reconnecting / disconnected / last event received / reconnect attempt count
- **Polling Fallback**: 3-5 Sekunden, markiert als "Polling fallback"

**Design-Spec — SSE Status-Leiste:**
- Position: Unter der Top Bar, nur sichtbar wenn auf Run-Detail-Seite
- `flex items-center justify-between px-4 py-1 bg-slate-800/50 border-b border-slate-700 text-xs`
- Links: Live-Indikator + Event-Count
- Rechts: Connection-Status + Reconnect-Count
- ARIA: `role="status" aria-live="polite"`

---

## H. Backend API Requirements

| Endpoint | Status |
|----------|--------|
| `GET /api/health` | Existiert |
| `GET /api/safety` | Existiert |
| `GET /api/adapters/health` | Existiert |
| `GET /api/issues` | Nur `/api/repos/:id/issues` - globaler Endpoint fehlt |
| `GET /api/runs` | Existiert (mit Pagination) |
| `GET /api/runs/:id` | Existiert |
| `GET /api/runs/:id/events` | Events in Run-Detail enthalten |
| `GET /api/runs/:id/evidence` | Via `/api/evidence?runId=` |
| `GET /api/runs/:id/test-report` | **FEHLT** - muss erstellt werden |
| `POST /api/demo-runs` | Via `/api/demo/blueprint` + `/api/demo/live-run` |
| `POST /api/runs/:id/pause/abort/resume/retry` | Via `/api/runs/:id/control` |
| `GET /api/runs/:id/events/stream` | Vollständige SSE-Implementierung |

Wenn ein Endpoint fehlt: UI muss ihn als missing anzeigen, Acceptance bleibt PARTIAL.

---

## I. Demo Mode Requirements

**Pflicht-Demo-Daten:**
- Demo Issue
- Demo Blueprint
- Demo Run
- Demo Pipeline
- Demo Test Report
- Demo Evidence
- Demo GitHub Sync (als simuliert markiert)

**Harte Regeln:**
- Keine echten GitHub Writes
- Keine externen Tools
- Kein Push / Merge

**Design-Spec — Demo-Markierung:** Alle Demo-Daten erhalten einen `DEMO DATA`-Badge:
- `bg-sky-500/10 text-sky-400 border border-sky-800 rounded-md px-2 py-0.5 text-[10px] font-medium font-['IBM_Plex_Mono']`
- Tooltip: "DEMO DATA - no GitHub writes, no external tools."

---

## J. Real Mode Requirements

Anzeigen: GitHub Token vorhanden, Repo konfiguriert, Repo-Kategorie (Test/Low-Risk/Production/Critical), erlaubte Aktionen laut Policy, Push/Merge/Fix-Loop/Kill-Switch Status

**Design-Spec — Real Mode:**
- Mode-Badge: Permanente Pulse-Glow-Animation (siehe D6)
- Hintergrund-Farbton: Subtiler `bg-red-500/5` Farbstich auf dem gesamten Dashboard (via CSS-Variable `--mode-tint`), um Demo/Real unterscheidbar zu machen
- Warn-Banner vor gefährlichen Aktionen: `bg-red-500/10 border border-red-800 rounded-lg p-3 text-sm text-red-400`

**Fehlkonfiguration:**
```
┌──────────────────────────────────────────────┐
│ ⚠ Real mode misconfigured:                   │
│                                              │
│ • Missing GITHUB_TOKEN                       │
│ • Missing POSITRON_REPO_OWNER                 │
│ • Missing POSITRON_REPO_NAME                  │
└──────────────────────────────────────────────┘
```
- Design: `bg-amber-500/10 border border-amber-800 rounded-lg p-4 text-amber-400`

---

## K. UI Acceptance Test: Video + Trace (16 Steps)

### Playwright Flow
1. Backend starten (`npm start`)
2. Frontend starten (`npm run build && npx vite preview --port 4173`)
3. UI öffnen
4. Backend Connected prüfen (visuell: grüner Punkt + "Connected" in Top Bar)
5. Demo Mode sichtbar prüfen (Badge "DEMO" in Top Bar)
6. "Load Mini Blueprint" klicken
7. "Start Demo Run" klicken
8. Run erscheint in Run-Liste
9. "Open Run" klicken
10. Run-Detail öffnet (URL: `/runs/<id>`)
11. Pipeline sichtbar (28 Phasen als PhaseNodes mit korrekten Farben)
12. Events sichtbar (EventLog mit SSE Live-Indikator)
13. TestReport sichtbar (Summary Cards + Commands)
14. Evidence sichtbar (Evidence-Grid mit Download-Buttons)
15. Finalstatus sichtbar (DONE / BLOCKED / FAILED Badge)
16. Export/Manifest prüfen

### Playwright Accessibility Checks (Zusätzlich zu visuellen Checks)
- [ ] Skip-to-Content Link funktioniert
- [ ] Alle interaktiven Elemente haben sichtbare Focus-Indikatoren
- [ ] ARIA-Labels an kritischen Elementen (`role="status"`, `role="switch"`, `role="tablist"`)
- [ ] Keyboard-Navigation durch gesamten Flow (Tab, Enter, Escape)
- [ ] `prefers-reduced-motion` respektiert (keine Animationen bei Einstellung)

### Pflicht-Artefakte
```
docs/release/ui-workflow-proof/video.webm
docs/release/ui-workflow-proof/trace.zip
docs/release/ui-workflow-proof/final-dashboard.png
docs/release/ui-workflow-proof/final-run-detail.png
docs/release/ui-workflow-proof/network-log.json
docs/release/ui-workflow-proof/manifest.json
docs/release/ui-workflow-proof-report.md
```

### Manifest (Beispiel)
```json
{
  "timestamp": "",
  "backendCommand": "npm start",
  "frontendCommand": "npm run build && npx vite preview --port 4173",
  "backendHealth": {"status": "ok"},
  "frontendUrl": "http://localhost:4173",
  "apiBaseUrl": "http://localhost:3000",
  "mode": "demo",
  "runId": "",
  "finalStatus": "DONE",
  "video": {"path": "", "sha256": ""},
  "trace": {"path": "", "sha256": ""},
  "network": {
    "requiredCalls": [
      "GET /api/health",
      "GET /api/runs",
      "POST /api/demo-runs",
      "GET /api/runs/:id",
      "GET /api/runs/:id/events"
    ],
    "allPassed": true
  }
}
```

---

## L. Non-Goals

- Kein neues Auto-Merge
- Kein echtes Merge im UI-Acceptance-Test
- Keine echten GitHub Writes im Demo Mode
- Kein OpenClaw / Paperclip / Researcher / externe Agenten
- Kein Release-Tag bevor UI Acceptance grün ist

---

## M. Acceptance Criteria (Erweitert um Design System)

### Core Functionality
- [ ] UI öffnet live
- [ ] Backend läuft offiziell über `npm start`
- [ ] UI zeigt Backend-Verbindungsstatus
- [ ] Demo Mode ist sichtbar
- [ ] Demo Blueprint kann geladen werden
- [ ] Demo Run kann aus UI gestartet werden
- [ ] Run erscheint in Run-Liste
- [ ] Run-Detail ist erreichbar
- [ ] 28-Phasen-Pipeline sichtbar
- [ ] EventLog sichtbar
- [ ] TestReport sichtbar
- [ ] Evidence sichtbar
- [ ] Merge-Gates sichtbar
- [ ] Safety Controls verständlich
- [ ] Adapter Health verständlich
- [ ] Empty States erklären, was zu tun ist
- [ ] Video zeigt echten Nutzerfluss
- [ ] Trace zeigt echte UI-Aktionen
- [ ] Network-Log zeigt echte Backend-API-Calls
- [ ] Manifest mit Hashes existiert
- [ ] README enthält "How to use the UI"
- [ ] `npm test` grün
- [ ] `npm run build` grün
- [ ] Playwright E2E grün
- [ ] Abschlussbericht

### Design System Compliance (NEU — Pflicht)
- [ ] **Font-Migration:** `index.html` verwendet `Space Grotesk` + `IBM Plex Sans` + `IBM Plex Mono` (kein Inter, kein JetBrains Mono, kein Arial)
- [ ] **Farbpalette:** Alle Farben entsprechen den Design Tokens (B1) — keine Wildcard-Farben, keine undefinierten Tailwind-Klassen
- [ ] **Grid-System:** Alle Abstände in Vielfachen von 4px/8px — keine zufälligen Werte
- [ ] **Panel-Identität:** Jeder der 10 Sub-Panels hat eigenständiges visuelles Erscheinungsbild — keine austauschbaren Card-Layouts
- [ ] **Kein AI-Slop:** Keine lila-blauen Verläufe, keine generischen Gradient-Buttons, keine sterilen Dashboard-Raster
- [ ] **Motion:** Staggered Panel Load-In, Phase-Transitionen mit `cubic-bezier(0.16, 1, 0.3, 1)`, SSE-Event-Animation, Mode-Badge-Pulse
- [ ] **prefers-reduced-motion:** Alle Animationen respektieren die System-Einstellung
- [ ] **Hover-Effekte:** Snappy, wertig, konsistent — alle mit `cubic-bezier(0.16, 1, 0.3, 1)`
- [ ] **Accessibility:** ARIA-Attribute an allen interaktiven Elementen (E1), Keyboard-Navigation vollständig (E2), Screenreader-Announcements (E4)
- [ ] **Color Contrast:** Alle Text/Hintergrund-Kombinationen erfüllen WCAG 2.1 AA (E5)
- [ ] **Color NOT alone:** Status wird immer durch Farbe + Icon + Text kommuniziert
- [ ] **Shared Components:** `StatusCard`, `EmptyState`, `PhaseNode`, `Badge`, `Tooltip` als wiederverwendbare Komponenten
- [ ] **Semantic HTML:** `header`, `nav`, `main`, `section`, `ol`, `dl`, `menu` korrekt verwendet

---

## N. Abschlussausgabe

```markdown
# Issue Result: Usable Operator Dashboard + Workflow Proof

## Status
PASS / PARTIAL / BLOCKED / FAIL

## Implemented
-

## UI Verification
- User can open UI:
- User can operate demo UI:
- Backend API used by UI:
- Demo mode visible:
- Real mode explained:

## Design System Verification
- Fonts migrated:
- Color tokens applied:
- Grid system respected:
- Panel identities distinct:
- Motion implemented:
- Accessibility checks passed:
- Color contrast WCAG AA:

## Workflow Proof
- Video:
- Trace:
- Network log:
- Manifest:
- Final status:

## Tests
- npm test:
- npm run build:
- Playwright:
- Playwright Accessibility:

## Remaining Gaps
-

## Release Decision
Ready for v0.1.0-rc.1 tag: YES/NO
```

Wichtig: Wenn kein echter Demo-Run aus der UI gestartet werden kann, dann ist das Ergebnis nicht PASS.

---

## Architecture Notes

> Dieser Issue wurde durch ein Architecture Review validiert. ADR-0005 (Operator Dashboard as Primary UI) ist empfohlen.

**Key Findings:**
- **Phase count corrected**: 28 Phasen (nicht 21) - synchron mit `packages/shared/src/types.ts` `ALL_PHASES`
- **PUSH ist Sub-Operation**, nicht separate Phase (kontrolliert via `POSITRON_ENABLE_PUSH`)
- **SSE-Infrastruktur produktionsreif**: rate limiting, secret redaction, W3C Last-Event-ID, reconnect
- **Test Report Endpoint fehlt**: `GET /api/runs/:id/test-report` muss aus `run_events` aggregiert werden
- **Alle Constitution-Prinzipien erfüllt**: Evidence-Gated Progression, Controlled Autonomy, Spec Before Code etc.

## Design System Notes (NEU)

- **Design-Richtung:** "Brutalist Operator Terminal" — funktionale, ehrliche Ästhetik ohne dekorative Elemente
- **Frontend-Design Skill** (`.claude/skills/frontend-design/SKILL.md`) wurde vollständig in diese Spec integriert
- **Font-Migration** von `Inter`/`JetBrains Mono` → `Space Grotesk`/`IBM Plex Sans`/`IBM Plex Mono` ist Pflicht
- **Design Token Mapping** ersetzt alle Wildcard-Farbverwendungen durch zentrale, dokumentierte Tokens
- **Komponenten-Architektur** definiert wiederverwendbare Bausteine für alle 10 Sub-Panels

## Supersedes

- **#55** ("Make Operator UI Actually Usable") - erste Iteration, abgelöst durch diese umfassende Spec
- **#56** ("Real UI Workflow Acceptance Test") - Workflow Proof Teil dieser Spec, erweiterter 16-Step Test

## Depends On

- **#67** ("Release/Demo Readiness Gate v0.1.0-rc.1") - v0.1.0-rc.1 muss getaggt sein vor Beginn
