# Spec Kit Real Adapter Validation

> Last validated: 2026-05-21

## Sources

1. GitHub Spec Kit Repository: https://github.com/github/spec-kit (README, pyproject.toml, source)
2. Official Spec Kit Documentation: https://github.github.io/spec-kit/
3. Installation Guide: https://github.github.io/spec-kit/installation.html
4. Core Commands Reference: https://github.github.io/spec-kit/reference/core.html
5. Integrations Reference: https://github.github.io/spec-kit/reference/integrations.html
6. Microsoft Developer Blog: "Diving Into Spec-Driven Development With GitHub Spec Kit"

## CLI Facts

| Fact | Confidence | Source |
|------|-----------|--------|
| The CLI executable is named `specify` | VERIFIED | pyproject.toml: `[project.scripts] specify = "specify_cli:main"` |
| Package name is `specify-cli` | VERIFIED | pyproject.toml: `[project] name = "specify-cli"` |
| Official installation: `uvx --from git+https://github.com/github/spec-kit.git specify init <PROJECT>` | VERIFIED | Installation guide |
| PyPI packages named `specify-cli` are NOT official | VERIFIED | Installation guide warning |
| `specify version` — displays CLI version, Python version, platform, architecture | VERIFIED | Core Commands reference |
| `specify --version` / `specify -V` — short form: `specify <version>` | VERIFIED | Core Commands reference, CLI source |
| `specify version --features` — inspect local CLI capabilities | VERIFIED | Core Commands reference |
| `specify version --features --json` — JSON output for scripts/agents | VERIFIED | Core Commands reference |
| `specify check` — checks git and CLI-based AI agents (offline) | VERIFIED | Core Commands reference |
| `specify init [<name>]` — creates .specify/ structure, templates, scripts, AI agent integration files | VERIFIED | README, Core Commands ref, CLI source |
| `specify init --integration <key>` — modern way to specify AI agent (replaces deprecated `--ai`) | VERIFIED | Core Commands ref, CLI source |
| `--ai` flag is DEPRECATED, will be removed in v0.10.0+ | VERIFIED | CLI source prints deprecation warning |
| `--ai-commands-dir` and `--ai-skills` are also legacy/deprecated | VERIFIED | CLI source |
| Other init flags: `--here`, `--force`, `--no-git`, `--ignore-agent-tools`, `--script sh|ps`, `--preset <id>`, `--branch-numbering` | VERIFIED | Core Commands reference, CLI source |
| `specify integration list` — list available integrations | VERIFIED | README, integrations reference |
| `specify extension *` — extension management (search, add, remove, etc.) | VERIFIED | Extensions reference |
| `specify preset *` — preset management | VERIFIED | Presets reference |
| `specify workflow *` — workflow management | VERIFIED | Workflows reference |
| Latest release at access time: v0.8.12 (main: 0.8.13.dev0) | VERIFIED | GitHub releases, pyproject.toml |

## Workflow Facts

| Command | Type | Executable via CLI? | Confidence |
|---------|------|--------------------|------------|
| `/speckit.constitution` | Agent Slash Command / Skill | NO — agent-only | VERIFIED |
| `/speckit.specify` | Agent Slash Command / Skill | NO — agent-only | VERIFIED |
| `/speckit.clarify` | Agent Slash Command / Skill | NO — agent-only | VERIFIED |
| `/speckit.plan` | Agent Slash Command / Skill | NO — agent-only | VERIFIED |
| `/speckit.tasks` | Agent Slash Command / Skill | NO — agent-only | VERIFIED |
| `/speckit.taskstoissues` | Agent Slash Command / Skill | NO — agent-only | VERIFIED |
| `/speckit.analyze` | Agent Slash Command / Skill | NO — agent-only | VERIFIED |
| `/speckit.checklist` | Agent Slash Command / Skill | NO — agent-only | VERIFIED |
| `/speckit.implement` | Agent Slash Command / Skill | NO — agent-only | VERIFIED |
| `specify version` | Direct CLI | YES | VERIFIED |
| `specify check` | Direct CLI | YES | VERIFIED |
| `specify init` | Direct CLI | YES | VERIFIED |
| `specify integration *` | Direct CLI | YES | VERIFIED |
| `specify extension *` | Direct CLI | YES | VERIFIED |
| `specify preset *` | Direct CLI | YES | VERIFIED |
| `specify workflow *` | Direct CLI | YES | VERIFIED |

The distinction is critical:
- `specify` is the terminal CLI that bootstraps and manages Spec Kit projects
- `/speckit.*` commands are prompt/skill files installed into AI coding agents after `specify init`
- The CLI does NOT have subcommands like `specify speckit.specify` or `specify /speckit.specify`

In Codex CLI skills mode, commands use `$speckit-<command>` syntax instead of `/speckit.<command>`.

## Artifact Structure

After `specify init`:
```
.specify/
  memory/
    constitution.md      # Project principles
  scripts/
    bash/                # Shell scripts (create-new-feature.sh, check-prerequisites.sh)
    powershell/          # PowerShell scripts
  templates/
    spec-template.md     # Spec document template
    plan-template.md     # Plan document template
    tasks-template.md    # Tasks document template
    commands/            # Agent command templates (specify.md, plan.md, tasks.md, etc.)
  init-options.json      # Record of init options used
  integration.json       # Integration configuration
  workflows/
    speckit/             # Default speckit workflow
```

After the SDD workflow runs (via agent slash commands):
```
specs/
  <feature-slug>/
    spec.md              # Generated specification
    plan.md              # Implementation plan
    tasks.md             # Task breakdown
    research.md          # Research findings
    data-model.md        # Data model documentation
    quickstart.md        # Quickstart guide
    checklists/
      requirements.md    # Requirements quality checklist
    contracts/           # API contracts
```

After `/speckit.specify`:
- Creates `specs/<feature>/spec.md` from template
- Creates `specs/<feature>/checklists/requirements.md`
- Writes `.specify/feature.json` with feature directory resolution
- Default feature directory: `specs/` (configurable via `SPECIFY_FEATURE_DIRECTORY`)

After `/speckit.plan`:
- Creates `specs/<feature>/plan.md`
- May create `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

After `/speckit.tasks`:
- Creates `specs/<feature>/tasks.md`
- Organized by user story, ordered by dependencies
- Parallel markers `[P]`, file paths, checkpoints

## Commands That Are Safe to Run (for Issue #15)

| Command | Safe? | Rationale |
|---------|-------|-----------|
| `specify version` | YES | Read-only, outputs version info |
| `specify version --features --json` | YES | Read-only, structured output |
| `specify check` | YES | Read-only, checks installed tools |
| `specify init . --integration opencode` | YES (with caveats) | Creates files in current directory; needs workspace path validation |
| `specify init . --integration generic` | YES (with caveats) | Same as above |

## Commands That Are NOT Direct CLI Commands

| Command | Issue #15 Strategy |
|---------|-------------------|
| `/speckit.specify` | Document as "requires agent execution" — detect artifacts if they exist |
| `/speckit.plan` | Document as "requires agent execution" — detect artifacts if they exist |
| `/speckit.tasks` | Document as "requires agent execution" — detect artifacts if they exist |
| `/speckit.analyze` | Document as "requires agent execution" — detect artifacts if they exist |
| `/speckit.constitution` | Constitution is created during `specify init` — detect it after init |
| `/speckit.clarify` | Document as "requires agent execution" |
| `/speckit.checklist` | Document as "requires agent execution" |
| `/speckit.implement` | NOT in scope for Issue #15 (requires OpenCode agent + code changes) |

## Commands That Are BLOCKED

| Command | Reason |
|---------|--------|
| `specify extension add *` | Downloads external code — not allowed |
| `specify extension install *` | Downloads external code — not allowed |
| `specify preset add *` | Downloads external code — not allowed |
| `specify preset install *` | Downloads external code — not allowed |
| `uvx --from ...` | Downloads/installs — not allowed in this issue |
| `pip install *` | Not allowed in this issue |
| `curl`, `wget` | Network downloads — not allowed |
| `rm -rf` | Destructive — blocked by shell metacharacter policy |
| `sudo` | Privilege escalation — not in allowed commands |
| `bash -c`, `sh -c` | Shell injection vectors — not in allowed commands |

## Supported AI Agent Integrations (for `--integration`)

Verified integrations (from official docs):
```
amp, antigravity, auggie, claude, codebuddy, codex, copilot, cursor,
devin, forge, gemini, goose, ibm-bob, iflow, junie, kilo-code, kimi-code,
kiro, lingma, mistral-vibe, opencode, pi, qoder, qwen, roo-code, shai,
tabnine, trae, windsurf, generic
```

Key integrations for Positron:
- `opencode` — relevant for future OpenCode Real Adapter (Issue #16)
- `generic` — fallback when no specific agent is targeted
- `copilot` — GitHub Copilot (default when non-interactive)

## Security Implications

1. **Installation source:** Only `github/spec-kit` GitHub builds are official — PyPI packages are not affiliated
2. **Agent folder security:** `specify init` may create agent folders that contain credentials/tokens — these need `.gitignore`
3. **Third-party risk:** Extensions, presets, and community workflows are NOT audited or endorsed by GitHub — must be reviewed before installation
4. **Local execution:** Coding agents execute local CLI commands (npm, dotnet, etc.) — these are agent-controlled, not adapter-controlled
5. **Vulnerability reporting:** Coordinated disclosure via opensource-security@github.com — not public issues

For Issue #15:
- No installation or downloads are performed
- No extensions or presets are installed
- Only read-only commands (version, check) or safe init (with path validation) are allowed
- All stdout/stderr is redacted before storage

## Consequences for Implementation

### What CAN be implemented in Issue #15:
1. **CLI health check** — detect `specify` in PATH, run `specify version`
2. **Safe init** — run `specify init . --integration opencode` with workspace path validation
3. **Artifact detection** — scan for `.specify/memory/constitution.md` and `specs/*/` patterns
4. **Artifact mapping** — convert detected files to Positron artifact records
5. **Command policy** — allowlist-safe specify commands, block dangerous ones
6. **Honest slash-command documentation** — clearly state that `/speckit.*` requires agent execution

### What CANNOT be implemented in Issue #15:
1. Executing `/speckit.specify`, `/speckit.plan`, `/speckit.tasks` as CLI commands
2. Running the full SDD workflow autonomously
3. Installing Spec Kit or its dependencies
4. Installing extensions, presets, or workflows
5. Triggering actual code implementation

### Design Decision:
The adapter's `runSpecify()`, `runPlan()`, `runTasks()`, and `runAnalyze()` methods will:
- In `safe-cli` mode: return BLOCKED with explanation that these are agent slash commands
- In `artifact-only` mode: detect existing artifacts at expected paths
- In `detect-only` mode: only check CLI availability and artifact existence

This is honest and prevents hallucinated CLI execution.
