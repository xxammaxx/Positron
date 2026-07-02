# Specification: Operator Cockpit UI Redesign

**Issue:** #248  
**Status:** Draft  
**Date:** 2026-07-02  
**Author:** Issue Orchestrator (human-approved prompt)

## 1. Purpose

Positron's frontend needs a visible product-level redesign so the operator immediately understands what the system is, what is happening, what evidence exists, and which actions are safe or blocked.

This issue is frontend-only. It aims to turn the current dashboard-style shell into a clearer evidence-gated operations cockpit without changing backend behavior, workflow logic, or runtime safety rules.

## 2. Non-Goals

- No backend changes
- No data model changes
- No workflow changes
- No Real Mode changes
- No Phase-D probe
- No dependency upgrades unless strictly necessary
- No new GitHub write actions from the UI
- No merge, no push to `main`, no issue closure

## 3. Product Goals

The redesigned UI should help the user understand:

1. What Positron is.
2. What is currently happening.
3. Which runs are active, blocked, or completed.
4. What evidence is available.
5. Which actions are safe.
6. Which actions require human approval.
7. That the product is controlled, local-first, and evidence-gated.

## 4. Visual Direction

The UI should feel like an operator console rather than a generic admin dashboard:

- quiet and serious
- dark-mode friendly
- compact but readable
- clear status colors
- stronger hierarchy
- stronger empty states
- explicit safety cues
- better responsive layout

## 5. Scope

Primary routes and shells:

- `/`
- `/runs`
- `/runs/:id`
- `/evidence`
- `/repos`
- `/settings`
- `/admin`

Shared UI areas:

- app shell
- sidebar
- top bar
- cards
- empty states
- status badges
- tables and filters
- modal surfaces

## 6. Current Problems

- The shell looks flat and inconsistent.
- Navigation is functional but not product-level.
- Dashboard cards communicate data, but not structure.
- Empty states are too generic.
- Runs are presented like a table instead of a lifecycle.
- Evidence is dense, but not curated visually.
- Settings and Admin do not clearly communicate risk or safety boundaries.
- Mobile presentation is likely too close to desktop layouts.

## 7. Success Criteria

- The dashboard explains Positron within a few seconds.
- Safety gates are visually obvious.
- Evidence feels like a first-class concept.
- Runs are easier to scan and understand.
- Navigation feels intentional and consistent.
- Empty states provide guidance, not just emptiness.
- Admin actions look clearly dangerous.
- The UI works on narrow screens without breaking structure.
- No false claims about real mode or unsafe automation appear.

## 8. Acceptance Criteria

- Frontend-only code changes
- Visual hierarchy is improved across the shell and key pages
- Dashboard, runs, evidence, repositories, settings, and admin all get a cleaner operator-cockpit treatment
- Screenshot evidence is captured before and after
- Tests and build remain green
- No backend, workflow, or dependency changes are introduced

