# Issue: Transfer New SDD, Fleet, OpenCode & Context Engineering Standards into Positron

<!-- INTERNAL -->
<!-- Issue #205 — Iteration 2 (Documentation Phase) -->

## Problem

Positron's architecture is fundamentally aligned with modern SDD (Spec-Driven Development), Fleet Orchestration, OpenCode integration, and Context Engineering principles. However, several concepts are **practiced but not formally named**, and some **documentation gaps** exist between the project's operational reality and its documented standards.

The prompt (derived from `positron_blueprint.md`, `Vibe_Coding_Master_Framework.md`, `KI-ANLEITUNG.md`, `Speckit_SDD_Anleitung.md`, etc.) describes a 10-phase fleet model, test-first RED_TESTS, multi-step verification, and context budget management — most of which Positron already does but hasn't formalized with those exact terms.

## Goal

Transfer all relevant SDD/Fleet/OpenCode/Context Engineering insights into Positron's documentation, configuration, and codebase — **without**:

- Blindly overwriting existing well-written documentation
- Adding unnecessary Phase types to the existing 27-type enum
- Creating duplicate/parallel documentation
- Implementing code without spec and tests

## Non-Goals

- Adding new Phase enum values to `packages/shared/src/types.ts` (deferred to future issue)
- Implementing new UI components (Sandbox Preview panel, Context Budget display, Risk Banner)
- Adding new CI workflows (Security scan, dependency audit) — separate CI improvement issue
- Changing the state machine transition rules
- Modifying `.specify/memory/constitution.md` or `AGENTS.md` (requires review per CONTRIBUTING.md)

## Acceptance Criteria

- [x] AC-1: Context Manifest created documenting all files read and architecture found (Phase 0)
- [x] AC-2: Gap Analysis created comparing actual Positron vs. target standards (Phase 1)
- [ ] AC-3: State Machine Mapping document shows how Positron phases map to Fleet phases
- [ ] AC-4: Architecture doc extends existing `docs/architecture.md` with SDD/Fleet principles (NOT duplicate)
- [ ] AC-5: Verification Contract standard extended with RED_TESTS and Sandbox Preview fields
- [ ] AC-6: Gate Matrix extended with fleet-specific gates (Security, Sandbox Preview, Reviewer-Agent)
- [ ] AC-7: Agent Permission Profiles documented for all agent types (not just Build/Reviewer)
- [ ] AC-8: `mkdocs.yml` updated with any new document navigation entries
- [ ] AC-9: All new/modified docs pass `npx markdownlint` and `mkdocs build --strict`
- [ ] AC-10: Tests executed and passing (baseline evidence)
- [ ] AC-11: Evidence Log created with all artifacts
- [ ] AC-12: No existing files blindly overwritten or duplicated

## Verification Contract

### Spec Reference
Spec artifacts created in iteration-1.md (Phase 0–4). This issue continues from that point.

### Required Tests
```bash
npm test                              # Unit + Integration (vitest)
npx markdownlint "docs/**/*.md" "*.md" --config .markdownlint.json
mkdocs build --strict
```

### Success Definition
All 12 Acceptance Criteria checked, all tests pass, new documentation pages build cleanly in MkDocs, no markdown lint errors.

## Risks

| Risk | Mitigation |
|---|---|
| Creating docs that conflict with existing well-written docs | Always read existing docs first; extend, don't replace |
| Scope creep into code changes | Strictly limit to documentation this session |
| mkdocs build failure on new docs | Run build incrementally after each doc write |
| Markdown lint violations | Run lint after each doc write |

## Rollback Plan

- All new files are in `docs/` subdirectories — revert via `git checkout` if needed
- Existing files are only extended (edit tool), not replaced — diff reviewable
- No code changes to packages/ — zero runtime impact

## Evidence Requirements

- [ ] Context Manifest: `docs/agent/POSITRON_TRANSFER_CONTEXT_MANIFEST.md`
- [ ] Gap Analysis: `docs/audits/POSITRON_NEW_INSIGHTS_GAP_ANALYSIS.md`
- [ ] Test Results: `npm test` output in Evidence Log
- [ ] Lint Results: `markdownlint` output
- [ ] Build Results: `mkdocs build --strict` output
- [ ] Evidence Log: `docs/agent/POSITRON_NEW_INSIGHTS_EVIDENCE_LOG.md`
- [ ] Changed Files: `git diff --stat` summary

## Related

- Iteration 1: `docs/changelog/iteration-1.md`
- Blueprint: `Blueprint.md`
- Constitution: `.specify/memory/constitution.md`
- Context Manifest: `docs/agent/CONTEXT_MANIFEST_TEMPLATE.md`
