# Known Limitations — Positron

## Remote CI

GitHub Actions currently fails in zero-step/runner-quota style and is advisory-only. Despite correctly configured workflow YAML and passing local gates, no runner steps execute. Root cause assessment points to runner quota/billing exhaustion for the private repository. Tracked in Issue #268.

- GitHub Actions: all jobs fail in 2–3 seconds with empty steps arrays.
- No self-hosted runners available.
- Billing API inaccessible (requires `user` scope).

## Biome Lint Backlog

`npx biome check .` remains advisory-only due to a known lint backlog (approximately 786 errors / 486 warnings). This is separate from formatting; `npx biome format .` passes consistently with 370 files checked and 0 fixes needed.

## apps/web Test Backlog

The latest closeout verification reports 5 pre-existing JSX/TSX test failures in `apps/web`:

- `src/__tests__/BlueprintPanel.test.tsx` — JSX parsing failure
- `src/__tests__/PhasePipeline.test.tsx` — JSX parsing failure
- `src/__tests__/smoke.test.tsx` — JSX parsing failure
- `src/__tests__/voice-smoke.test.tsx` — JSX parsing failure
- `src/__tests__/VoiceControls.test.tsx` — JSX parsing failure

These are not part of the local core/package test gate (917/917 passing) and should be triaged separately if app/web closure is required. Likely root cause: Vite/Vitest JSX transform configuration for the `apps/web` workspace.

## Open Issues / PRs

- **15 open issues** — classified as: approval-blocked, deferred, superseded, safe/closeable, and 1 CI tracker (#268).
- **15 open PRs** — includes the 13-PR Issue #229 chain (#230–#242), plus PRs #218 and #228.
- The Issue #229 PR chain (#230–#242) remains intentionally untouched pending human decision on whether to merge, rebase, or close.

## Issue #229 PR-Chain Status

| PR | Base | Title | Mergeable |
|----|------|-------|-----------|
| #230 | #224 | Tool Gateway metadata for MCP/provider planning | MERGEABLE |
| #231 | #230 | OpenCode model profile types, validation, warm-up | MERGEABLE |
| #232 | #231 | Spec Kit sync profile validation | MERGEABLE |
| #233 | #232 | MCP warm-up contract and evidence model | MERGEABLE |
| #234 | #233 | MCP warm-up runtime executor foundation | MERGEABLE |
| #235 | #234 | OpenCode provider detection foundation | MERGEABLE |
| #236 | #235 | Human oversight question queue | MERGEABLE |
| #237 | #236 | Oversight approvals wired to provider/MCP gates | MERGEABLE |
| #238 | #237 | Blueprint Launcher foundation and validation | MERGEABLE |
| #239 | #238 | Blueprint gated pipeline handoff | MERGEABLE |
| #240 | #239 | Blueprint handoff to infrastructure gates | MERGEABLE |
| #241 | #240 | Infrastructure state stores | MERGEABLE |
| #242 | #241 | Infrastructure state stores + Proxmox dev docs | MERGEABLE |

All 13 PRs in the chain are mergeable but require human decision for final disposition.

## Stashes

Two stashes remain preserved and untouched on `main`:

- `stash@{0}`: "safety: dirty tree before clean workspace policy pr"
- `stash@{1}`: "stash: doc modification from spec phase"

These must not be applied, popped, or dropped without explicit human instruction.

## Missing / Deferred

| Item | Status |
|------|--------|
| Mermaid architecture diagrams | Added as baseline in this closeout PR |
| `docs/status/` documentation | Added in this closeout PR |
| GitHub repository polish | Deferred (Issue #252, #211) |
| Remote CI reactivation | Requires explicit approval + quota resolution |
| Biome lint backlog resolution | Out of scope for closeout |
| apps/web test fixes | Out of scope for closeout |
| CHANGELOG v0.3.0 | Deferred |
