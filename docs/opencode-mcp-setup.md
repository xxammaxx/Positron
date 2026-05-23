# MCP Setup Report

## Gesamtstatus

PARTIAL

## Projektanalyse

Positron is a TypeScript monorepo for GitHub issue orchestration.

The repo uses GitHub as the source of truth, Vitest for unit and integration tests, an Express backend, a React/Vite frontend, and a local SQLite-backed run-state layer.

Relevant project signals:

- `package.json` defines a TypeScript workspace monorepo.
- `apps/server/` contains the orchestrator and REST API.
- `apps/web/` contains the frontend.
- `packages/run-state/` uses `better-sqlite3`.
- `packages/github-adapter/` handles GitHub issues, labels, and comments.
- `packages/sandbox/` handles git workspaces and test execution.
- There is a repo-local `.opencode/opencode.jsonc` for a minimal OpenCode MCP set.
- There is no `playwright.config.*` in the repo.
- There is no Dockerfile or Compose file in the repo root.

## Erkannter Stack

- Language: TypeScript
- Backend: Node.js + Express
- Frontend: React + Vite + Tailwind
- Test runner: Vitest
- Database: SQLite
- GitHub integration: Octokit-based adapter
- Workspace isolation: Git workspaces

## OpenCode Snapshot

Checked locally:

- `opencode --version`: available
- `opencode auth list`: available and populated
- `opencode mcp list`: passes with the repo-local MCP config
- `opencode mcp ls`: usable again

Observed config locations:

- Global config exists at `~/.config/opencode/opencode.json`
- Repo-local OpenCode config exists at `./.opencode/opencode.jsonc`

The global OpenCode config already contains MCP entries for GitHub, Playwright, Docker, SQLite, Brave Search, and a local `gptr-mcp` server. The repo-local config overrides that set to keep only the baseline servers needed for this repository.

## Empfohlene MCPs

| MCP | Status | Reason |
|---|---|---|
| `github` | keep | GitHub issues and PRs are the source of truth for Positron. |
| `sqlite` | keep | The run-state package uses SQLite and benefits from schema/debug access. |
| `playwright` | optional | The repo has a frontend, but no Playwright config or browser test suite is currently present. |
| `docker` | not recommended | No Dockerfile or Compose workflow is present in the repo. |
| `brave-search` | not recommended by default | Live search is not required for the repo's normal workflow. |
| `context7` | not recommended by default | External docs lookup is useful only for specific tasks, not as a default MCP. |
| `gptr-mcp` | not recommended by default | It is global tooling, but not necessary for the Positron baseline workflow. |

Filesystem access is already covered by the local workspace and does not need a separate MCP here.

## Nicht Empfohlene MCPs

- `docker`: no current container workflow in the repo.
- `playwright`: no browser automation setup to exercise yet.
- `brave-search` and `context7`: useful on demand, but not needed in the minimal repo-local set.
- `gptr-mcp`: available globally, but not required for the repo's default issue-to-run path.

## Finale Konfiguration

Repo-local `.opencode/opencode.jsonc` was created and is intentionally minimal.

Reason:

- The global config contains secrets, so copying it into the repository would be unsafe.
- The repo-local config uses only the minimum server set needed here.

If the repo-local config is expanded later, it should:

- reference secrets by environment variable name only,
- avoid duplicating unnecessary global servers,
- and preserve the existing global config behavior.

## Benötigte Secrets

Names only, no values:

- `GITHUB_TOKEN` or equivalent GitHub PAT for the GitHub MCP
- `BRAVE_API_KEY` only if Brave Search is enabled
- Any future OpenCode provider or MCP credentials kept in user-local config

## Testbefehle

Executed during this run:

- `node --version`
- `npm --version`
- `pnpm --version`
- `uv --version`
- `docker --version`
- `git --version`
- `opencode --version`
- `opencode auth list`
- `opencode mcp list`
- `npm run typecheck`
- `npm test`

## Testergebnisse

| Check | Result | Notes |
|---|---|---|
| `npm run typecheck` | PASS | TypeScript project references build cleanly. |
| `npm test` | PASS | Completed outside the sandbox so the server integration test could bind a local port. |
| `opencode mcp list` | PASS | Repo-local sqlite server now handles OpenCode's JSONL transport. |

## Sicherheitsentscheidungen

- No secret values were written into the repository.
- Repo-local OpenCode config was created without secrets and keeps the server set minimal.
- The repo-level `AGENTS.md` now includes an MCP usage gate.
- No destructive shell commands were used.

## Wartungshinweise

- Re-run `opencode mcp list` after repairing the local OpenCode state if the command is needed for day-to-day work.
- Keep any future repo-local config minimal and secret-free.
- Prefer `github` and `sqlite` as the default MCPs for this repo.

## Troubleshooting

- If `opencode mcp list` reports a timeout on `sqlite`, verify the transport framing. OpenCode here uses JSONL requests, so the server needs to accept both JSONL and Content-Length messages.
- If integration tests fail on port binding in a sandboxed environment, run the test suite outside the sandbox or keep the test harness local-only.
- If a future repo-local OpenCode config is added, confirm it does not duplicate or overwrite the user's global credentials.
