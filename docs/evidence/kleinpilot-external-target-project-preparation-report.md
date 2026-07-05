# KleinPilot External Target Project Preparation Report

## Purpose
Prepare KleinPilot as the next external managed target project after PR #345 introduced the generic Managed Target Project Registry, which decoupled Positron from VoiceWiki-specific logic.

## Reality Refresh (2026-07-05)

| Field | Value |
|---|---|
| Positron HEAD | `7a2dcabfe6eead8807291096c33823291ac2f619` |
| PR #345 | MERGED — Managed Target Project Registry decoupling |
| Issue #308 | OPEN — [RESEARCH] Supervised Full Real Mode pilot |
| Issue #340 | OPEN — Biome lint and organizeImports backlog |
| Open PRs | None |
| Working Tree | Clean (only pre-existing unrelated `docs/release/ui-workflow-proof/`) |
| Dangerous Env Vars | None |
| Host | Linux Mint 22.1, Node v22.22.0 |

## Existing Repo Discovery

| Search | Result |
|---|---|
| `gh repo list` (100 repos, keyword scan) | Only `BescheidPilot` found (unrelated) |
| `gh search repos "KleinPilot"` | Empty |
| `gh search repos "Kleinanzeigen"` | Empty |
| `gh search repos "Inserat"` | Empty |
| `gh search repos "anzeigen"` | Empty |

**KLEINPILOT_TARGET_REPO_STATUS: NOT_YET_CREATED**

## Product Decision

KleinPilot will be a local-first Android app for preparing manual Kleinanzeigen listing drafts. It is explicitly NOT a bot, scraper, or automation tool.

## Scope Decision

**Allowed (this and future runs):**
- Local draft helper.
- Manual copy/export.
- Owner review enforcement.

**Forbidden (permanent):**
- Automatic posting.
- Scraping.
- Login automation.
- Messaging automation.
- Account automation.
- CAPTCHA bypass.
- Rate-limit bypass.

## Registry Decision

- **Added to registry:** YES (Phase E)
- **Reason:** The generic Managed Target Project Registry model (post PR #345) supports `candidate_project` role with `NOT_YET_EVALUATED` status, making it suitable for planned but not-yet-created target repos.
- **Role:** `candidate_project`
- **Status:** `NOT_YET_EVALUATED`
- **repoUrl / defaultBranch:** Set to empty strings — the model requires non-null strings, and the UI clearly marks the project as a "Candidate" with "Not Evaluated" status and blockers stating the repo does not exist yet.

## Android Test Resource

| Field | Value |
|---|---|
| Device ID | `f7710718` |
| Device | Samsung SM T595 |
| Codename | `gta2xllte` |
| API | 29 |
| Use | Reserved for future KleinPilot Android build runs |

## Files Changed

- `docs/product/kleinpilot-product-brief.md` — NEW
- `docs/product/kleinpilot-reverse-prd.md` — NEW
- `docs/product/kleinpilot-safety-policy.md` — NEW
- `docs/evidence/kleinpilot-external-target-project-preparation-report.md` — NEW
- `apps/server/src/data/managed-target-projects.ts` — MODIFIED (registry entry added)

## Gates

| Gate | Status |
|---|---|
| `git diff --check` | Pending |
| `npm run build` | Pending |
| `npm run typecheck` | Pending |
| `npm test` | Pending |
| Gate assembly tests | Pending |

## Safety

All KleinPilot safety checks set to `pass` by design — the project is scoped as a manual draft helper with no platform automation.

**No KleinPilot app code, no scraping, no login automation, no auto-posting.**

## Next Owner Approval

```
APPROVE KLEINPILOT TARGET REPO CREATION AND FLUTTER MVP SCAFFOLD
```
