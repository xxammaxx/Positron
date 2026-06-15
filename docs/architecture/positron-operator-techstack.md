# Positron Operator Techstack

## Purpose

Positron as a **local supervised issue-to-PR operator** — a safety-gated orchestrator that connects GitHub Issues, OpenCode agents, MCP tools, browser evidence, tests, evidence logs, and human approval into a single controlled pipeline.

## Current Pipeline (to be replaced)

```
Mensch → ChatGPT/Prompt → OpenCode/KI-Agent → GitHub/Repo → Tests/Review → Mensch entscheidet
```

Problems:
- Manual prompt assembly
- Manual context gathering
- Manual agent invocation
- Manual evidence collection
- Manual review cycle repetition
- Manual issue/PR status tracking

## Target Pipeline

```
Mensch → Positron Operator UI → GitHub Issue → Verification Contract → OpenCode/Agent → MCP Tools → Tests/Evidence → Reviewer-Agent → Human Approval → PR/Merge
```

## Replaces

| Manual Task | Positron Replacement |
|---|---|
| Manual prompting | Issue-based plan generation via Spec workflow |
| Manual context gathering | Context Manifest from GitHub + codebase |
| Manual agent invocation | Run state machine with worker queue |
| Manual test/evidence collection | Automated test execution + Evidence Log |
| Manual browser checking | Playwright + DevTools MCP (isolated) |
| Manual GitHub/PR status tracking | GitHub Adapter + sync comments |
| Manual review cycle repetition | Reviewer Agent + Verification Contract |

## Does Not Replace

| Human Responsibility | Why |
|---|---|
| Human approval | Product judgment cannot be automated |
| Product judgment | Requires context, empathy, and domain knowledge |
| Risk acceptance | Legal and ethical liability stays with humans |
| Final merge decision | Merge is the ultimate approval gate |
| Feature prioritization | Requires business and user understanding |
| Architecture decisions | Trade-off judgment requires experience |

## Hands (Code and System Actions)

| Hand / Tool | Action | Risk | Gate |
|---|---|---|---|
| OpenCode Adapter | Code write/modify in workspace | High | Sandbox + Contract + Review |
| Git Adapter | Branch, commit, diff | High | Commit Policy (no main/master, branch naming) |
| GitHub Adapter | Issue, PR, comment, label | Medium/High | GitHub Policy (no auto-merge, rate limiting) |
| Filesystem MCP | File read/write | High | Workspace Allowlist (no traversal, no system dirs) |
| Terminal/Sandbox Adapter | Run tests, build | High | Command Allowlist (no destructive commands) |
| Docker/gVisor Sandbox | Isolated execution | Medium | Runtime Policy (egress allowlisting) |
| SQLite/DB Adapter | Run-state persistence | Medium | DB Safety Contract (no production data, no NFS) |

### Prohibited Hands Without Explicit Human Approval

```
rm -rf                     # destructive filesystem
force push                 # bypasses branch protection
merge                      # final integration gate
delete branch              # irreversible
delete database            # data loss
production API mutation    # external impact
secret access              # credential exposure
external deployment        # uncontrolled release
dependency major upgrade   # breaking change risk
global agent config modification  # safety bypass
```

## Eyes (Perception and Verification)

| Eye / Tool | Observation | Risk | Gate |
|---|---|---|---|
| Browser MCP / Chrome DevTools MCP | UI, Console, Network, Screenshots | High | Isolated profile only; no real credentials |
| Playwright | E2E, Trace, Video, Screenshot | Medium | Test artifact policy; don't commit binaries |
| GitHub Checks API | CI status read | Low/Medium | Read-only |
| Logs / SSE | Run state streaming | Low | Redaction for secrets in logs |
| Evidence Explorer | Artifact inspection | Low | Artifact hygiene (no runtime DBs, traces) |
| Test Reporter | Test result analysis | Low | Verification Contract PASS/FAIL |
| Secret Scanner | Leak detection | Medium | Fail gate on detection |

### Browser Evidence Safety Rules

1. **Never** with real logins, tokens, or production credentials
2. **Never** with production data
3. **Always** with isolated browser profile
4. **Always** with test/development data only
5. Artifacts treated as CI test artifacts — never committed

## Brain (Agents and Models)

| Agent Role | Responsibility | Can Write Code? | Can Approve? |
|---|---|---|---|
| Planner Agent | Issue → Spec/Plan | No | No |
| Code Agent / OpenCode | Implementation | Yes, in workspace | No |
| Test Agent | Test generation/execution | Yes, limited | No |
| Browser Evidence Agent | UI verification | No | No |
| Reviewer Agent | Contract review | No | No |
| Security Reviewer | Secrets/policy check | No | No |
| **Human** | Decision | Yes/approval | **Yes** |

### Separation Rule

> Generator-Agent ≠ Reviewer-Agent. No agent may approve its own work.

## Memory (Context and Evidence)

| Artifact | Purpose | Source of Truth? |
|---|---|---|
| GitHub Issue | Task definition and tracking | **Yes** |
| GitHub PR | Code change and review | **Yes** |
| Context Manifest | Run context snapshot | Derived |
| Evidence Log | Immutable action/result record | Derived |
| Verification Contract | PASS/FAIL criteria | Derived from Issue |
| Reviewer Report | Contract compliance check | Derived |
| Run Events | State machine transitions | Derived |
| GitHub Issue Comments | Progress and decisions | **Yes** |
| CI Artifacts | Test results, screenshots | Derived |
| Local DB (SQLite) | Run state persistence | Derived |

### Memory Rule

> GitHub Issue + PR + Evidence are Source of Truth. No agent shall rely on hidden, global, or external AGENTS.md files.

## MCP Boundary

### Allowed MCPs

- GitHub MCP (read/search)
- Brave Search (read-only research)
- Context7 (dependency lookup)
- Playwright (sandboxed browser)
- SQLite (project-local only)
- Filesystem (workspace-scoped with allowlist)
- Chrome DevTools MCP (isolated profile, no credentials)

### Forbidden MCPs

- Paperclip (prohibited)
- OpenClaw (prohibited)
- Researcher (quarantined)
- Deep Research (quarantined)
- PARA (quarantined)
- Any MCP without capability manifest
- Any MCP with unrestricted filesystem or shell

### Required MCP Manifest Fields

- `server_id` — unique identifier
- `owner` — responsible team/person
- `transport` — stdio, HTTP, etc.
- `auth_required` — authentication mechanism
- `tools` — explicit tool list
- `allowed_paths` — filesystem scope
- `allowed_domains` — network scope
- `write_capabilities` — declared write operations
- `read_capabilities` — declared read operations
- `destructive_capabilities` — destructive operations requiring human approval
- `requires_human_approval` — tool-level approval gates
- `logging` — audit log requirements
- `redaction` — secret redaction rules
- `timeout` — max execution time
- `rate_limit` — max invocations per period

## Technology Stack

```text
TypeScript Monorepo    — all packages in one repo
Node Backend           — apps/server (Express)
Worker Queue           — apps/worker
State Machine          — packages/run-state
SQLite                 — run-state persistence
GitHub API / Octokit   — packages/github-adapter
Evidence Log           — packages/shared (audit)
Context Manifest       — packages/shared (types)
Verification Contract  — packages/shared (types)
Reviewer Report        — packages/github-adapter (templates)
Human Approval Gate    — packages/run-state (GATE_APPROVE phase)
```
