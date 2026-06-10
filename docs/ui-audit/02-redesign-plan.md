# Positron UI Redesign Plan — First Iteration

**Version**: 1.0
**Date**: 2026-05-25
**Scope**: App Shell, Dashboard, Evidence Visibility, Accessibility, Visual Quality

---

## 1. Design Goals

| Goal | Rationale |
|------|-----------|
| Operator overview at a glance | User must understand system state within 5 seconds |
| Evidence front-and-center | Core product concept: "evidence-gated execution" must be visible |
| Professional, calm aesthetic | Dark theme with clear hierarchy, not "terminal hacker" look |
| Keyboard + screen reader accessible | Every action must work without mouse |
| Progressive disclosure | Hide complexity behind expandable sections |
| Zero console errors | Baseline quality gate |

---

## 2. New Information Architecture

```
AppShell
├── TopBar (persistent)
│   ├── Logo + Version
│   ├── System Health Indicator (global)
│   └── Quick Actions (New Run, Settings shortcut)
├── Sidebar (persistent, collapsible)
│   ├── 📊 Dashboard
│   ├── ▶ Runs
│   ├── 🔍 Evidence
│   ├── 📁 Repositories
│   ├── ⚙ Settings
│   └── ────
│       StatusFooter: Connection status + last refresh
└── Main Content Area
    └── <Route> / <Outlet>
```

### Routes
| Path | Page | Purpose |
|------|------|---------|
| `/` | Dashboard | Operator overview, status summary, attention queue |
| `/runs` | RunsList | All runs with advanced filtering (new page) |
| `/runs/:id` | RunDetail | Enhanced with evidence panel (existing, enhanced) |
| `/evidence` | Evidence | Aggregated evidence across runs (new, stub) |
| `/repos` | Repositories | Repository management (existing, refactored) |
| `/settings` | Settings | MCP config, adapters, thresholds (new, stub) |

---

## 3. Component Architecture

### New Components

```
components/
├── layout/
│   ├── AppShell.tsx        — TopBar + Sidebar + <Outlet/>
│   ├── Sidebar.tsx         — Navigation with icons, collapsible
│   ├── TopBar.tsx          — Logo, status, actions
│   └── StatusBar.tsx       — Persistent bottom status (optional)
├── dashboard/
│   ├── DashboardPage.tsx   — Redesigned dashboard (replaces current)
│   ├── StatusSummary.tsx   — PASS/PARTIAL/FAIL aggregation cards
│   ├── EvidenceSummary.tsx — Test results, artifacts, evidence count
│   ├── AttentionQueue.tsx  — Pending gates, blocked runs, decisions needed
│   ├── RecentActivity.tsx  — Last N events stream
│   └── SystemHealth.tsx    — Adapter status, backend health
├── shared/
│   ├── StatusCard.tsx      — Reusable status card with icon + trend
│   ├── EmptyState.tsx      — Configurable empty state with illustration + CTA
│   ├── ErrorBanner.tsx     — Dismissible error with retry
│   └── LoadingSkeleton.tsx — Skeleton loading placeholder
├── evidence/
│   ├── EvidenceBadge.tsx   — PASS/FAIL/PARTIAL badge with evidence link
│   └── TestResultIcon.tsx  — Visual test result indicator
├── runs/
│   └── RunsPage.tsx        — New dedicated runs list page
└── existing/               — All current components, refactored as needed
    ├── Dashboard.tsx       → Renamed/removed (replaced by DashboardPage)
    ├── RunDetail.tsx       → Enhanced with evidence panel
    ├── Repositories.tsx    → Refactored with new shell
    ├── ...
```

### Component Tree (Dashboard)
```
DashboardPage
├── StatusSummary
│   ├── StatusCard (Total Runs)
│   ├── StatusCard (PASS — Done)
│   ├── StatusCard (PARTIAL — Blocked/Gate)
│   └── StatusCard (FAIL — Failed/Error)
├── EvidenceSummary
│   ├── TestResultIcon (passed count)
│   ├── TestResultIcon (failed count)
│   └── Artifact count + link
├── AttentionQueue
│   └── List of runs needing human decision
├── RecentActivity
│   └── Scrollable event feed (last 10 events)
└── SystemHealth
    └── Adapter status list
```

---

## 4. Design Tokens

```css
/* Design Tokens — Positron v3 */
:root {
  /* Colors */
  --color-bg-primary: #0f172a;      /* slate-900 */
  --color-bg-secondary: #1e293b;    /* slate-800 */
  --color-bg-tertiary: #334155;     /* slate-700 */
  --color-border: #334155;          /* slate-700 */
  --color-text-primary: #f1f5f9;    /* slate-100 */
  --color-text-secondary: #94a3b8;  /* slate-400 */
  --color-text-muted: #64748b;      /* slate-500 */
  
  /* Semantic Status */
  --color-pass: #22c55e;            /* green-500 */
  --color-partial: #eab308;         /* yellow-500 */
  --color-fail: #ef4444;            /* red-500 */
  --color-active: #3b82f6;          /* blue-500 */
  --color-blocked: #f59e0b;         /* amber-500 */
  
  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  
  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Cascadia Code', monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  
  /* Shadows */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-elevated: 0 4px 12px rgba(0,0,0,0.4);
}
```

---

## 5. Sidebar Specification

```
┌──────────────────┐
│ ⚡ Positron v3.0  │  ← Logo area
│──────────────────│
│ ▌ Dashboard      │  ← Active: left border accent
│   Runs            │  ← Inactive: no accent
│   Evidence        │
│   Repositories    │
│   Settings        │
│                  │
│──────────────────│
│ 🟢 Connected     │  ← Status footer
│ Letzte Akt. 12s  │
└──────────────────┘
```

- Width: 240px (expanded), 64px (collapsed, icons only)
- Background: `bg-slate-900` (slightly darker than main)
- Active item: Left border 3px `bg-blue-500`, subtle background highlight
- Hover: `bg-slate-800`
- Icons: Simple Unicode or SVG
- Footer: Connection status + auto-refresh indicator
- Collapsible via hamburger button in TopBar

---

## 6. Dashboard Layout (Redesigned)

```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard                                    [+ New Run]    │
│ Evidence-Gated Execution Overview                           │
├───────────┬───────────┬───────────┬───────────────────────┤
│  PASS     │  PARTIAL  │  FAIL     │  Active Runs          │
│  12       │  3        │  1        │  ▸ 2 running          │
│  ↑ 85%    │  ⚡ 2 gate │  ✗ Issue  │  ❚ 4 queued          │
├───────────┴───────────┴───────────┴───────────────────────┤
│ ┌─── Evidence Summary ───────────────────────────────────┐ │
│ │ 🧪 Tests: 47 passed, 2 failed, 1 skipped               │ │
│ │ 📋 Artifacts: 12 specs, 8 plans, 15 diffs              │ │
│ │ 📸 Screenshots: 34 captures                            │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Needs Attention ───────────────────────────────────┐  │
│ │ ⚡ Run #abc123 → GATE_APPROVE → [Review]               │  │
│ │ ✗ Run #def456 → FAILED_BLOCKED → [Investigate]        │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌─── Recent Runs ───────────────────────────────────────┐  │
│ │ ID        │ Phase    │ Status │ Repo    │ Time         │  │
│ │ #abc123   │ IMPLEMENT│ active │ Positron│ vor 2m       │  │
│ │ #def456   │ FAILED   │ failed │ testrepo│ vor 15m      │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌─── System Health ─────────────────────────────────────┐  │
│ │ 🟢 Backend: Online (uptime: 3h 12m)                   │  │
│ │ 🟢 GitHub Adapter: Connected                           │  │
│ │ 🟢 OpenCode Adapter: Connected                         │  │
│ │ 🟡 Speckit Adapter: Degraded                           │  │
│ └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Accessibility Requirements

### Focus Management
- All interactive elements: `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900`
- Nav links use `focus-visible` instead of `focus` to avoid mouse-click rings
- Skip-to-content link (first focusable element, visually hidden until focused)

### Semantic HTML
```html
<header>       → TopBar
<nav>          → Sidebar (with aria-label="Main navigation")
<main>         → Content area
<aside>        → Evidence panel (when present)
<footer>       → Status bar (when present)
```

### Color & Contrast
- No color-only indicators: Status dots always have text label
- All text meets WCAG AA contrast (4.5:1 for normal, 3:1 for large)
- Pass/Fail indicators use both color AND icon AND text

### Keyboard
- Tab order follows visual layout
- Sidebar items are focusable and activatable with Enter/Space
- Modals trap focus and close on Escape
- Dropdown menus use arrow keys

---

## 8. Implementation Sequence

### Step 1: Create Design Tokens
- Add Inter font to index.html
- Create CSS custom properties in index.css
- Add semantic utility classes

### Step 2: Build Layout Components
- `TopBar.tsx` — replace current nav bar
- `Sidebar.tsx` — new persistent sidebar with all nav items
- `AppShell.tsx` — wraps TopBar + Sidebar + Outlet
- Update `App.tsx` to use AppShell + Routes

### Step 3: Build Shared Components
- `StatusCard.tsx` — reusable metric card
- `EmptyState.tsx` —  empty state with illustration + CTA
- `LoadingSkeleton.tsx` — skeleton loading for cards/tables
- `ErrorBanner.tsx` — retry-enabled error display

### Step 4: Redesign Dashboard
- `DashboardPage.tsx` — new dashboard layout
- `StatusSummary.tsx` — PASS/PARTIAL/FAIL aggregation
- `EvidenceSummary.tsx` — test results, artifacts count
- `AttentionQueue.tsx` — pending human decisions
- `RecentActivity.tsx` — event stream
- `SystemHealth.tsx` — adapter health

### Step 5: Add Stub Pages
- `RunsPage.tsx` — wrapper around existing run list logic
- `SettingsPage.tsx` — minimal placeholder
- `EvidencePage.tsx` — minimal placeholder

### Step 6: Accessibility Pass
- Add `focus-visible` styles globally
- Semantic HTML audit on all components
- Add skip-to-content link
- ARIA labels on sidebar, main, etc.

### Step 7: Update E2E Tests
- New smoke tests for sidebar navigation
- New tests for dashboard cards visibility
- Console error assertions
- Accessibility snapshot tests

### Step 8: Run Full Test Suite
- Unit tests
- E2E (headless + headed + observe)
- Verify screenshots

---

## 9. File Changes Summary

| Action | File |
|--------|------|
| CREATE | `apps/web/src/components/layout/AppShell.tsx` |
| CREATE | `apps/web/src/components/layout/Sidebar.tsx` |
| CREATE | `apps/web/src/components/layout/TopBar.tsx` |
| CREATE | `apps/web/src/components/dashboard/DashboardPage.tsx` |
| CREATE | `apps/web/src/components/dashboard/StatusSummary.tsx` |
| CREATE | `apps/web/src/components/dashboard/EvidenceSummary.tsx` |
| CREATE | `apps/web/src/components/dashboard/AttentionQueue.tsx` |
| CREATE | `apps/web/src/components/dashboard/RecentActivity.tsx` |
| CREATE | `apps/web/src/components/dashboard/SystemHealth.tsx` |
| CREATE | `apps/web/src/components/shared/StatusCard.tsx` |
| CREATE | `apps/web/src/components/shared/EmptyState.tsx` |
| CREATE | `apps/web/src/components/shared/LoadingSkeleton.tsx` |
| CREATE | `apps/web/src/components/shared/ErrorBanner.tsx` |
| CREATE | `apps/web/src/components/runs/RunsPage.tsx` |
| CREATE | `apps/web/src/components/settings/SettingsPage.tsx` |
| CREATE | `apps/web/src/components/evidence/EvidencePage.tsx` |
| MODIFY | `apps/web/src/App.tsx` → use AppShell |
| MODIFY | `apps/web/src/index.css` → add design tokens, fonts, focus styles |
| MODIFY | `apps/web/index.html` → add Inter font, meta updates |
| MODIFY | `apps/web/src/main.tsx` → minor (add Routes wrapper if needed) |
| CREATE | `e2e/ui-quality.spec.ts` → new E2E tests |
| REMOVE/MOVE | `apps/web/src/components/Dashboard.tsx` → replaced |

---

## 10. Rollback Plan

Since this is a UI-only change (no backend, no data model changes):

1. All new components are additive — no existing component is deleted until verified
2. Old `Dashboard.tsx` is preserved at path `Dashboard.tsx` during transition
3. New `AppShell` wraps existing routes — rollback means reverting App.tsx to old nav
4. CSS changes are additive — old utility classes remain functional
5. E2E tests are additive — old smoke tests continue to work
6. Git commits are granular — each component is a separate commit for easy reverting

---

## 11. Non-Goals (This Iteration)

- Real-time SSE-driven dashboard updates (polling is sufficient for now)
- Mobile-first responsive design (desktop focus, responsive as baseline)
- Full settings page implementation (stub only)
- Evidence browser/search (stub only)
- Dark/light theme toggle (dark-only)
- Internationalization beyond German
- Animation/transition system
- Chart/graph visualizations
