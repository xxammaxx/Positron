# VoiceWiki Managed Project UI Report

## Purpose

Positron now tracks VoiceWiki as the first managed external target project. VoiceWiki is visible in the Positron web interface with status, timeline, blocker tracking, and next-step guidance.

## VoiceWiki Reality

| Field | Value |
|---|---|
| Repo | https://github.com/xxammaxx/VoiceWiki |
| Default branch | master |
| PR #35 | MERGED |
| Merge SHA | a7059ff2ceb20b9501684a1e511574e38d67a02e |
| Current status | FIRST_EXTERNAL_TEST_SUCCESS |
| Known blocker | Local Flutter/Dart SDK mismatch (Dart 3.11.0 vs ^3.11.3) |

## UI Surfaces

| Surface | Status | Notes |
|---|---|---|
| Dashboard managed project card | Added | Shows VoiceWiki status, PR #35 merged, next step, blocker count |
| Projects page (`/projects`) | Added | Full detail: timeline, blockers, next runs, safety status |
| Sidebar nav item | Added | "Managed Projects" under Workspace section |
| Next owner approval display | Added | Both recommended and app-level run approvals shown |
| Safety status panel | Added | All 6 safety indicators (NO across the board) |

## Implementation Details

### Files Changed
| File | Change |
|---|---|
| `apps/server/src/data/voicewiki-seed.ts` | NEW — static VoiceWiki seed data |
| `apps/server/src/index.ts` | MODIFY — added `GET /api/projects` endpoint |
| `apps/web/src/types.ts` | MODIFY — added `ManagedProject` interface |
| `apps/web/src/api.ts` | MODIFY — added `getProjects()` method |
| `apps/web/src/App.tsx` | MODIFY — added `/projects` route |
| `apps/web/src/components/layout/Sidebar.tsx` | MODIFY — added "Managed Projects" nav item |
| `apps/web/src/components/projects/ProjectsPage.tsx` | NEW — full managed project detail page |
| `apps/web/src/components/dashboard/DashboardPage.tsx` | MODIFY — added managed project overview card |

### Tests
| Test Suite | Result |
|---|---|
| `npm test` (all packages) | 1692 tests passed |
| `npm test` (apps/web) | 196 tests passed |
| `gate-assembly.test.ts` | 48 tests passed |
| `gate-enforcement.test.ts` | 38 tests passed |
| `npm run typecheck` | Clean |
| `npm run build` | Clean |

## Boundaries

| Rule | Enforced |
|---|---|
| No VoiceWiki code changed | YES |
| No VoiceWiki PR created | YES |
| No VoiceWiki issue closed | YES |
| No Real Mode | YES |
| No Phase-D probe | YES |
| No push/merge action from UI | YES |
| No dependency changes | YES |
| No workflow changes | YES |
| No secrets exposed | YES |

## Classification

VOICEWIKI_UI_DIFF_STATUS: CLEAN_POSITRON_UI_TRACKING_ONLY

## Branch

`feat/voicewiki-managed-project-ui`
