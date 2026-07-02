# Task Breakdown: Operator Cockpit UI Redesign

**Issue:** #248  
**Date:** 2026-07-02

## T-001: Reality refresh
**Priority:** P0 | **Estimated effort:** 10 min | **Depends on:** —  
Confirm branch, clean working tree, and GitHub issue state.

## T-002: Frontend structure audit
**Priority:** P0 | **Estimated effort:** 20 min | **Depends on:** T-001  
Inspect `apps/web/src`, identify the shell, routes, and page components to redesign.

## T-003: Before screenshots
**Priority:** P0 | **Estimated effort:** 20 min | **Depends on:** T-001  
Capture current screenshots for dashboard, runs, evidence, repositories, settings, admin, and mobile dashboard.

## T-004: UI diagnosis
**Priority:** P0 | **Estimated effort:** 20 min | **Depends on:** T-003  
Document concrete visual and interaction problems in the current interface.

## T-005: Shell redesign
**Priority:** P0 | **Estimated effort:** 45 min | **Depends on:** T-004  
Improve the app shell, sidebar, top bar, spacing, and background treatment.

## T-006: Shared visual language
**Priority:** P0 | **Estimated effort:** 45 min | **Depends on:** T-005  
Refine cards, badges, buttons, inputs, empty states, and safety/status surfaces.

## T-007: Dashboard redesign
**Priority:** P0 | **Estimated effort:** 60 min | **Depends on:** T-006  
Make the dashboard read as an evidence-gated operator cockpit with clearer hierarchy.

## T-008: Runs redesign
**Priority:** P0 | **Estimated effort:** 45 min | **Depends on:** T-006  
Improve the runs page, filters, and lifecycle/status presentation.

## T-009: Evidence redesign
**Priority:** P0 | **Estimated effort:** 45 min | **Depends on:** T-006  
Improve evidence summaries, list presentation, and empty states.

## T-010: Repositories redesign
**Priority:** P1 | **Estimated effort:** 30 min | **Depends on:** T-006  
Clarify repository management, add-run affordances, and empty states.

## T-011: Settings redesign
**Priority:** P1 | **Estimated effort:** 30 min | **Depends on:** T-006  
Make safety defaults and configuration boundaries more legible.

## T-012: Admin redesign
**Priority:** P1 | **Estimated effort:** 30 min | **Depends on:** T-006  
Make dangerous actions feel obviously separated and controlled.

## T-013: Mobile and accessibility pass
**Priority:** P0 | **Estimated effort:** 30 min | **Depends on:** T-005 through T-012  
Verify narrow-screen layout, focus states, and contrast.

## T-014: Validation gates
**Priority:** P0 | **Estimated effort:** 30 min | **Depends on:** T-005 through T-013  
Run build, typecheck, and web tests.

## T-015: After screenshots and comparison
**Priority:** P0 | **Estimated effort:** 20 min | **Depends on:** T-014  
Capture after screenshots and compare them against the baseline.

## T-016: GitHub documentation and handoff
**Priority:** P0 | **Estimated effort:** 20 min | **Depends on:** T-015  
Document the changes, test results, and screenshot evidence in GitHub.

