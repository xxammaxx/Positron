## Revision Summary: Frontend Design System Integration

This issue specification has been revised to fully integrate the **Frontend-Design Skill** (`.claude/skills/frontend-design/SKILL.md`). Below is a mapping of all changes to the skill sections.

### What Changed & Why

#### A. Design Philosophy — "Anti-AI-Slop" (Skill §2)
- **Added:** Design direction "Brutalist Operator Terminal" — functional, raw, honest aesthetic
- **Added:** Requirement that each of the 10 Run-Detail sub-panels must have a distinct visual identity (no interchangeable cards)
- **Rejected:** Generic gradients, uniform card grids, sterile dashboard layouts

#### B. Design Tokens — Color Palette & Spacing (Skill §3)
- **Added:** Complete color-to-element mapping table (17 color tokens → specific UI elements)
- **Enforced:** Primary `#0f172a` (slate-900), Secondary `#111827` (gray-900), Accent `#38bdf8` (sky-400)
- **Enforced:** Strict 8px grid system — all padding/margin via Tailwind scale, no arbitrary values
- **Added:** Specified exact Tailwind classes for every panel, button, badge, and card

#### C. Typography (Skill §2)
- **Mandated:** Font migration from Inter/JetBrains Mono → Space Grotesk (headings) + IBM Plex Sans (body) + IBM Plex Mono (code)
- **Added:** Complete typographic scale with 8 text roles (h1–h4, status numbers, phase labels, event log, body, metadata)
- **Added:** Font weights, sizes, line-heights for every text element in the dashboard

#### D. Motion & Interaction (Skill §4)
- **Added:** Staggered panel load-in with `animation-delay` (0s → 0.45s across 10 panels)
- **Added:** Phase status transition specs (pending→active→completed→failed) with durations and easing
- **Added:** SSE live event appearance animation (slide-in from left with sky-400 border)
- **Added:** Hover effect table for all interactive elements using `cubic-bezier(0.16, 1, 0.3, 1)`
- **Added:** Run Control button feedback specs (start, pause, abort, retry, export)
- **Added:** Mode Badge pulse/glow animation for REAL mode warning

#### E. Accessibility — NEW Section (Skill §5 Workflow-Anweisung)
- **Added:** ARIA attribute table for ALL interactive elements (16 element types)
- **Added:** Complete keyboard navigation path (Tab-Reihenfolge + shortcuts: Ctrl+K, Escape, R, ?)
- **Added:** Focus management rules (SSE doesn not steal focus, modal focus traps, navigation focus)
- **Added:** Screen reader announcement specs (`aria-live="polite"` + `aria-live="assertive"`)
- **Added:** WCAG 2.1 AA color contrast verification table (8 combinations tested)
- **Added:** `prefers-reduced-motion` support — all animations respect system setting
- **Added:** "Color NOT alone" rule — every status uses color + icon + text

#### F. Component Architecture (Skill §1)
- **Added:** Complete component tree with Props interfaces (AppShell → 30+ components)
- **Added:** Reusable shared component catalog (StatusCard, EmptyState, PhaseNode, Badge, Tooltip, Skeleton, ErrorBanner, ConfirmDialog)
- **Added:** Semantic HTML mapping (header, nav, main, section, ol, dl, menu)

### Acceptance Criteria — Additions
- **10 new ACs** for Design System Compliance:
  - Font migration verification
  - Color token compliance
  - Grid system adherence
  - Panel identity distinctness
  - No AI-Slop patterns
  - Motion implementation
  - prefers-reduced-motion support
  - Hover effect consistency
  - Accessibility completeness
  - Color contrast WCAG AA
- **3 new items** in the completion report template (Design System Verification section)

### What Was Preserved
- All original structural sections (Problem, Goal, Design Principles A–N)
- All 28 phases from `ALL_PHASES`
- All API endpoint requirements
- All acceptance criteria (core functionality)
- Demo/Real Mode requirements
- 16-step Playwright workflow
- Architecture notes and dependencies

### Recommendation
The revised spec should replace the issue body (not just sit as a comment). The full revised body is in the previous comment. When `gh issue edit` permission is available, update the body from `.opencode/temp/issue-68-revised.md`.

⚠️ Note: `gh issue edit` was blocked by the current bash trust policy. The full revised body is posted as comment [#4542736287](https://github.com/xxammaxx/Positron/issues/68#issuecomment-4542736287). To make it the single source of truth, the issue body needs to be updated manually or with elevated permissions.
