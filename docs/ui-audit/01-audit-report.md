# Positron UI/UX Audit Report

**Date**: 2026-05-25
**Auditor**: Issue Orchestrator (AI Agent)
**Scope**: Full frontend codebase (`apps/web/`) + live rendering observation

---

## 1. Current State Summary

Positron v3.0 has a functional React 18 / Tailwind CSS frontend that renders correctly in Chromium. It consists of:

- **App.tsx**: Horizontal top navigation bar with 2 links (Dashboard, Repositories) + HealthIndicator
- **Dashboard.tsx**: 4 metric cards, search/filter inputs, runs table, new run modal
- **RunDetail.tsx**: Breadcrumb, header card, 2-column layout (LogViewer | PhaseTimeline + GateControls + ArtifactPanel)
- **Repositories.tsx**: Card list with expandable issues, add repo modal
- **HealthIndicator.tsx**: Colored dot (green/yellow/red) with hover tooltip
- **LogViewer.tsx**: Filterable, auto-scrolling log stream with SSE events
- **PhaseTimeline.tsx**: 26-phase vertical timeline with completion status
- **GateControls.tsx**: Human-in-the-loop approve/revise controls
- **ArtifactPanel.tsx**: Tabbed artifact viewer (Spec, Plan, Tasks, Diff) with download
- **PhaseBadge.tsx**: Colored pill badges for phases
- **NotFound.tsx**: 404 page
- **Types**: Comprehensive TypeScript definitions for all data models

**Technical baseline**: The app renders, fetches data, handles SSE, and has error/loading/empty states.
**Product baseline**: Technically functional but not product-quality as a developer/agent execution dashboard.

---

## 2. Major Problems

### 2.1 Information Architecture (CRITICAL)

| Problem | Severity | Detail |
|---------|----------|--------|
| Only 2 nav items | HIGH | Dashboard + Repositories. No way to access Runs independently, Evidence, Reports, or Agent status. |
| Flat hierarchy | HIGH | All information exists at page level. No side panels, drawers, or persistent status components. |
| Missing concept views | CRITICAL | No way to see: "What needs my attention?", "What tests passed/failed?", "Where is evidence?" |
| No decision queue | HIGH | Gate decisions require navigating into each run individually. No aggregate view of pending approvals. |
| Mixed concerns | MEDIUM | Repositories page mixes repo CRUD with issue browsing and run launching. |

### 2.2 Visual Design (HIGH)

| Problem | Severity | Detail |
|---------|----------|--------|
| Low visual hierarchy | HIGH | Every card uses identical `bg-slate-800 border-slate-700 p-6`. No distinction between data types. |
| Dense tables | MEDIUM | Dashboard table has 8 columns with tiny text. Information overload on first load. |
| Emoji branding | MEDIUM | ⚡ in logo is unprofessional for a serious development tool. |
| No design tokens | MEDIUM | Colors are hardcoded Tailwind classes spread across components. No central design token file. |
| Undifferentiated typography | HIGH | Headings are `text-2xl font-bold text-white` everywhere but have no semantic hierarchy beyond that. |
| Text readability | HIGH | Heavy use of `text-xs` and `text-[10px]` throughout. Low contrast `text-slate-400` on `bg-slate-800` is borderline. |

### 2.3 Accessibility (HIGH)

| Problem | Severity | Detail |
|---------|----------|--------|
| No visible focus ring on buttons/links | HIGH | Only `focus:ring` on `.input` class. Nav links and buttons lack focus-visible styles. |
| Color-only status indicators | HIGH | HealthIndicator green/red dot has no text alternative in markup. PhaseBadge uses color as sole differentiator. |
| Missing ARIA landmarks | MEDIUM | `<main>` exists but no `<nav>` semantic element, no `<aside>`, no `<header>`/`<banner>` roles. |
| No skip link | MEDIUM | No "skip to content" for keyboard users. |
| Low text contrast | MEDIUM | `text-slate-400` (#94a3b8) on `bg-slate-800` (#1e293b): contrast ratio ~4.7:1 (WCAG AA requires 4.5:1 for normal text but this is used extensively on *small* text which requires 4.5:1 — borderline). |
| Form label association | LOW | Most labels use `<label htmlFor>` correctly, but radio buttons in autonomy selector are `sr-only`. |
| Touch targets | MEDIUM | Phase timeline has very tight `py-1.5 px-2` — hard to tap precisely. |

### 2.4 Missing Product Concepts (CRITICAL)

Positron is an **evidence-gated agent execution tool**. The UI should reflect this identity. Currently missing:

1. **Evidence Summary**: No panel showing "What evidence was collected?", "Which tests passed?", "Which gates were cleared?"
2. **Test Results Dashboard**: No aggregated view of test outcomes across runs
3. **Run Status at a Glance**: Dashboard shows a table — not a high-level status summary with PASS/PARTIAL/FAIL aggregation
4. **Agent Activity Feed**: No indication of which agents are currently active or what phases are running
5. **Risk/Badge System**: No visual representation of safety gates, blocked runs, or security findings
6. **Audit Trail Visibility**: The audit logs exist in the backend but have zero UI presence
7. **Configuration/Settings**: No settings page (MCP configuration, adapters, thresholds)
8. **Human Decision Tracker**: Gate controls exist per-run but there's no queue of "decisions awaiting human input"

### 2.5 Empty/Loading/Error States (MEDIUM)

| State | Current Quality | Issues |
|-------|----------------|--------|
| **Loading** | Adequate | Spinner + text. Functional but uninspired. No skeleton screens, no progress indication. |
| **Empty (no data)** | Minimal | Huge emoji + one-line text. No onboarding, no suggested action beyond "create first run". |
| **Error** | Functional | Red banner with dismiss. No retry action, no diagnostic info exposed to user. |
| **SSE Disconnect** | Minimal | "Reconnecting" label in RunDetail. No global connection status for SSE. |
| **Offline/Backend down** | Basic | HealthIndicator shows red dot. No global warning banner. |

### 2.6 Navigation & Layout (HIGH)

| Problem | Detail |
|---------|--------|
| **No sidebar** | Only top nav. A developer tool of this complexity needs persistent navigation. |
| **No breadcrumbs** on Dashboard | Only RunDetail has breadcrumbs. Repositories and Dashboard have none. |
| **No responsive navigation** | No hamburger menu, no collapsible sidebar. The app assumes desktop-only. |
| **Run list buried in Dashboard** | Must go to Dashboard to find runs. No dedicated Runs page. |
| **No back navigation state** | Going from RunDetail back to Dashboard loses filter context. |

### 2.7 Layout & Grid Issues (MEDIUM)

| Problem | Detail |
|---------|--------|
| **Dashboard uses 4-column grid** | `grid-cols-4` for metric cards works on desktop but lacks responsive breakpoints. |
| **RunDetail 2-column** | `grid-cols-[2fr_1fr]` works but no stacking on narrow screens. |
| **No max-width constraint on log entries** | Long log messages can overflow. |
| **PhaseTimeline shows all 26 phases** | This is overwhelming. Only the relevant subset should be shown by default. |

---

## 3. Impact on Usability

The current UI is **discoverable by developers** who already know Positron's concepts, but presents significant barriers:

1. **First-time user**: Lands on Dashboard with a table of empty data and "Noch keine Runs". No onboarding, no explanation of what Positron does, no guided first action.
2. **Returning operator**: Must scan a dense table to find active runs. No "attention required" section.
3. **Security reviewer**: Cannot quickly see evidence summaries or gate decisions. Must click into each run.
4. **Developer debugging a failed run**: Must navigate to RunDetail, then scan logs manually. No error aggregation or pattern detection.
5. **Keyboard-only user**: Can technically navigate but has no visible focus indicators, making orientation impossible.

---

## 4. Recommended Redesign Direction

### Core Principles
1. **Information hierarchy first**: What needs attention NOW > Recent activity > Historical data
2. **Evidence everywhere**: Every status should link to its proof
3. **Operator confidence**: The UI should make the user feel in control, not overwhelmed
4. **Progressive disclosure**: Surface what matters, hide details behind expansion
5. **Accessible by default**: Every interaction must work with keyboard + screen reader

### Proposed Structure
```
┌──────────────────────────────────────────────────┐
│ TOP BAR: Logo | System Status | User Actions      │
├──────────┬───────────────────────────────────────┤
│ SIDEBAR  │ MAIN CONTENT AREA                     │
│          │                                        │
│ Dashboard│ ┌─────────┐ ┌─────────┐ ┌───────────┐ │
│ Runs     │ │ Status  │ │ Active  │ │ Evidence  │ │
│ Evidence │ │ Summary │ │ Runs    │ │ Summary   │ │
│ Reports  │ └─────────┘ └─────────┘ └───────────┘ │
│ Settings │                                        │
│          │ ┌──────────────────────────────────┐  │
│          │ │ Recent Activity / Run List       │  │
│          │ └──────────────────────────────────┘  │
│          │                                        │
│          │ ┌──────────────────────────────────┐  │
│          │ │ System Health / Adapter Status   │  │
│          │ └──────────────────────────────────┘  │
└──────────┴───────────────────────────────────────┘
```

### New/Reworked Screens
1. **App Shell** — Sidebar + TopBar + Main + StatusBar
2. **Dashboard (redesigned)** — Status cards, attention queue, recent activity, system health
3. **Runs (new page)** — Dedicated run list with advanced filtering
4. **RunDetail (enhanced)** — Add evidence panel, test results tab, decision history
5. **Evidence (new page)** — Aggregated evidence across runs, searchable, filterable
6. **Settings (new page)** — MCP config, adapter management, thresholds

---

## 5. Priority Fixes (First Iteration)

| # | Fix | Impact | Effort |
|---|-----|--------|--------|
| 1 | **App Shell with Sidebar** | Foundation for all navigation | Medium |
| 2 | **Dashboard redesign** | First impression, operator overview | High |
| 3 | **Design tokens** | Consistency foundation | Low |
| 4 | **Focus states** | Accessibility | Low |
| 5 | **Status cards (PASS/PARTIAL/FAIL)** | Core product concept | Medium |
| 6 | **Evidence summary panel** | Core product concept | Medium |
| 7 | **Empty state redesign** | First-time experience | Low |
| 8 | **Typography system** | Readability, professionalism | Low |
| 9 | **Semantic HTML/ARIA** | Accessibility | Low |
| 10 | **Console error monitoring in UI** | Debuggability | Low |

---

## 6. Acceptance Criteria for First Iteration

- [ ] App renders with a **sidebar navigation** (5+ nav items)
- [ ] Dashboard shows **status summary cards** (PASS/PARTIAL/FAIL aggregation)
- [ ] **Evidence summary** is visible on Dashboard (test results count, artifacts count)
- [ ] **Empty states** are informative and guide the user to first action
- [ ] **Focus indicators** are visible on all interactive elements
- [ ] **Semantic HTML** uses `<nav>`, `<main>`, `<aside>`, proper heading hierarchy
- [ ] **Typography** has clear visual hierarchy (h1 through h4)
- [ ] **Console has 0 errors** in diagnostic test
- [ ] **All existing tests pass** (unit + e2e)
- [ ] **New E2E tests** verify: sidebar visible, dashboard cards visible, no console errors
- [ ] **Before/After screenshots** show clear improvement
- [ ] **Observe mode** works — browser stays open for human review
