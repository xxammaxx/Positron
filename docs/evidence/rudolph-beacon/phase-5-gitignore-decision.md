# Phase 5 — Gitignore Decision: Root `evidence/` Directory

**Timestamp:** 2026-06-24T17:20:00Z
**Decision Maker:** KI (GREEN_SAFE — softwaretechnische Entscheidung)
**Issue:** #279

## Decision

**Root `evidence/` directory is added to `.gitignore` as `/evidence/`.**

## Rationale

### Analysis

The root `evidence/` directory contains:
- `evidence/github-issue-cleanup/code-markers.txt` — runtime tool artifact
- `evidence/github-issue-cleanup/git-files.txt` — runtime tool artifact
- `evidence/github-issue-cleanup/issue-*.json` — GitHub API JSON snapshots (16 files)
- `evidence/github-issue-cleanup/issues-all.json` — aggregated API dump
- `evidence/github-issue-cleanup/prs-all.json` — aggregated API dump

These are **runtime tool artifacts**, not project documentation. They are analogous to:
- `.positron/runs/` (already gitignored)
- `.positron/evidence/` (already gitignored)
- `.opencode/logs/` (already gitignored)
- `.local-artifacts/` (already gitignored)

### Safety Check

The `.gitignore` addition uses `/evidence/` (with leading slash), which only matches the root `evidence/` directory. This does NOT affect:
- `docs/evidence/rudolph-beacon/` — versioned project evidence
- Any `evidence/` subdirectory inside `docs/`

### Regenerability

All files in root `evidence/` can be regenerated from GitHub API calls. They contain no unique data, no secrets, and no user-generated content.

### Principle

Git commits should contain source code, documentation, and evidence artifacts that are intentionally authored. Runtime dumps of external API data should not be versioned.

## Implementation

Added to `.gitignore` (lines 87-90):

```gitignore
# Runtime evidence artifacts (not documentation)
# docs/evidence/ is versioned documentation — this only affects root evidence/
/evidence/
```

## Verification

- `git ls-files --others --exclude-standard` does NOT list `evidence/` or any files within it
- `docs/evidence/rudolph-beacon/` remains tracked and versioned
- All Phase-4 and Phase-5 evidence artifacts are properly committed

## GREEN_SAFE Classification

This decision is classified GREEN_SAFE because:
1. Only affects runtime-generated artifacts
2. No production code or documentation is affected
3. Consistent with existing `.gitignore` patterns
4. Cannot cause data loss (files remain on disk, just not tracked)
5. Cannot affect security, push, merge, or remote operations
