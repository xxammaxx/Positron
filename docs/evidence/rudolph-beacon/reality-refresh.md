# Reality Refresh — Rudolph Beacon Benchmark

## Environment

| Parameter | Value |
|-----------|-------|
| OS | Microsoft Windows 10 Pro Education |
| Shell | PowerShell 5.1 (Build 19041) |
| Node.js | v24.14.0 |
| npm | 11.9.0 |
| Git Branch | `feat/issue-279-phase-1g-safe-apply-plan-20260624-135722` |
| Commit SHA | `368c9c00f4b3b9a4ced9cbe0c52a501c1ce05100` |
| Working tree | Clean (only untracked: `docs/audits/`, `evidence/`) |

## Package Structure

| Directory | Type | Exists |
|-----------|------|--------|
| `packages/shared` | Core types, utilities | YES |
| `packages/github-adapter` | GitHub API | YES |
| `packages/opencode-adapter` | OpenCode CLI adapter | YES |
| `packages/run-state` | State machine | YES |
| `packages/sandbox` | Git worktrees | YES |
| `packages/speckit-adapter` | SpecKit CLI | YES |
| `packages/tool-gateway` | MCP tool gateway | YES |
| `apps/server` | Express backend | YES |
| `apps/web` | React/Vite frontend | YES |

## Existing Positron Artifacts (Relevant)

| Artifact | Status |
|----------|--------|
| `DeterministicFixtureAgent` | Present in `packages/opencode-adapter/src/deterministic-fixture-agent.ts` — 179 lines, exports `EvidenceReport`, `Fixture`, `FixtureAgentConfig` |
| `OpenCodeDryRunAgent` | Present in `packages/opencode-adapter/src/dry-run-agent.ts` — 377 lines, exports `ActionPlan`, `DryRunAgentConfig` |
| `ExecutionMode` type | `'fixture' | 'dry-run' | 'real'` in `packages/shared/src/opencode-types.ts` |
| `OpenCodeRunInput` interface | Present in `packages/shared/src/opencode-types.ts` |
| `EvidenceReport` | Defined separately in both agents (same shape, not shared) |
| `RudolphBenchmarkRunSummary` | NOT EXISTING — to be created |
| Vitest config | `vitest.config.ts` — includes `packages/*/src/__tests__/**/*.test.ts` |
| `npm test` | `vitest run && cd apps/web && npx vitest run` — 917 core tests PASS |
| `npm run build` | `tsc -b packages/... apps/...` |
| `npm run typecheck` | `tsc -b --dry` |

## Known Issues / PRs

| Issue/PR | Title | Status |
|----------|-------|--------|
| #279 | Replacement-Pfad für alte #229-Architektur | Open (current branch) |
| #268 | GitHub-CI advisory-only / Zero-Step/runner problem | Open |
| PR #218 | Stop/Ask / GATE_APPROVE | Open — MUST NOT merge automatically |
| apps/web tests | 5 pre-existing JSX/TSX failures | Known, not core gate |

## Stale / Conflict Check

| Doc | Assessment |
|-----|------------|
| `docs/status/current-capabilities.md` | MATCHES local — 917 tests documented |
| `docs/status/known-limitations.md` | UNREAD — deferred |
| `README.md` | UNREAD — deferred |
| `Blueprint.md` | UNREAD — deferred |

## Key Findings

1. **Positron is NOT an empty blueprint** — it's a functioning TypeScript monorepo with 917 passing core tests.
2. **EvidenceReport is duplicated** in both `deterministic-fixture-agent.ts` and `dry-run-agent.ts` (same structure, not shared). This is a pre-existing code quality issue — NOT to be fixed in this benchmark run (scope control).
3. **Current branch** is `feat/issue-279-phase-1g-safe-apply-plan-20260624-135722` — the benchmark work will modify files on this branch. No merge without approval.
4. **Vitest config auto-includes** `packages/*/src/__tests__/**/*.test.ts` — new tests will be picked up automatically.
5. **Build references** in root `tsconfig.json` will need updating to include the new package.
6. **Working tree is clean** — good starting point.

## Tool Gaps

| Tool | Status |
|------|--------|
| Mermaid validator | TOOL_GAP — no local validator detected |
| GitHub Issue creation (remote) | NOT ALLOWED — per prompt, no remote write actions |
| Playwright visual QA | NOT NEEDED for this benchmark |
| Docker | NOT NEEDED for this benchmark |

## Source of Truth Resolution

For this run, Source of Truth priority:
1. Current local code (scripts executed, files present) — ✅ verified
2. Current Git status — ✅ clean
3. Locally executed gates — PENDING (will run after implementation)
4. Current Evidence artifacts — PENDING (will create)
5. GitHub Issues/PRs — advisory reference only
6. Docs — verified `current-capabilities.md` matches local
7. Chat/memory context — lowest priority; overridden by local findings
