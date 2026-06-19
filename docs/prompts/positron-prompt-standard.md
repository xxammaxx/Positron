# Positron Prompt Standard v1.0

## Purpose

This document defines the mandatory structure for all Positron agent run prompts.
Every prompt that triggers a Positron coding agent run MUST include all sections
marked as **PFLICHT** (mandatory). Sections marked as **OPTIONAL** may be omitted
only when not applicable to the specific task.

Violations of this standard are caught by automated Red Tests (see
`packages/shared/src/__tests__/prompt-standard.contract.test.ts`).

---

## PFLICHT: Ziel-Agent / Runtime (Target Agent)

Every prompt MUST explicitly name OpenCode as the target runtime and specify
the role the agent is expected to play (e.g., Senior Software Engineer,
Agent Orchestrator, Test/CI Engineer).

```markdown
## Ziel-Agent / Runtime

Du bist OpenCode und arbeitest als <ROLE> für das Projekt Positron.

Arbeite nach diesem Ablauf:
Issue → Spec → Verification Contract → Red Tests → Agent-Code → CI/Security Gates → Sandbox Preview → Reviewer-Agent → Human Approval → Evidence-Kommentar → Merge
```

---

## PFLICHT: Betriebssystem-/Shell-Erkundung im Preflight (OS/Shell Preflight)

Every prompt MUST require explicit operating system and shell detection BEFORE
any file changes or test execution. Commands must be compatible with the
detected environment.

Required outputs:
- Detected OS (Windows/Linux/macOS/WSL/Container)
- Detected Shell (PowerShell/Bash/Zsh/Fish/CMD)
- Path convention (backslash/forward slash)
- Package manager in use
- Encoding risks
- Commands that must be avoided

---

## PFLICHT: OpenCode-Betriebsmodus / Permissions (Operating Mode)

Every prompt MUST define conservative OpenCode permissions and require
Plan/Analysis mode before Build/Edit mode.

Required rules:
- Start in Plan/Analysis mode (read-only)
- Switch to Build/Edit mode only after documented preflight
- Git push only after successful local gates
- No destructive commands without explicit Human Approval
- No auto-merge, no force push on main

---

## PFLICHT: Kontextfenster-Empfehlung (Context Window)

Every prompt MUST include context window management:
- Load fresh session in root directory
- Use Plan-Agent first, Build-Agent later
- Do not replay unverified chat history
- Treat stored handoff state as potentially stale

---

## PFLICHT: Preflight-Scan (Preflight)

Every prompt MUST require a preflight scan documenting:
- Repository status (branch, commit, dirty/clean)
- CI/CD status
- Related PRs/Issues
- Files that will be read
- Files that will be changed
- Areas explicitly not touched
- Rollback strategy
- Human Approval requirements

---

## PFLICHT: Cold/Warm/Hot Context

Every prompt MUST define context tiers:

| Tier | Content | Purpose |
|------|---------|---------|
| **Cold Context** | Prompt, README, AGENTS.md, CI config, project structure | Always loaded |
| **Warm Context** | Current branch, PR, related issues, known test state | Loaded for task |
| **Hot Context** | Specific errors, files to fix, evidence to update | Active work |

---

## PFLICHT: Source of Truth

Every prompt MUST designate GitHub Issues as the single source of truth.
No implementation from memory. Every task starts with `git fetch --all --prune`
and `gh issue view`.

---

## PFLICHT: Hard Constraints (Harte Grenzen)

Every prompt MUST enumerate explicit prohibitions:
- No merge to main without Human Approval
- No force push
- No destructive delete commands
- No secret exposure
- No unverified claims
- No Linux-only commands on Windows (and vice versa)
- No architecture rewrites without ADR
- No modification of unrelated PRs

---

## PFLICHT: Tool-Discovery statt Tool-Dump

Every prompt MUST instruct the agent to discover available tools from the
runtime environment rather than listing all possible tools. Use `Get-Command`
or `command -v` for dynamic tool discovery.

---

## PFLICHT: Verification Contract

Every prompt MUST reference the Verification Contract pattern:
- PASS/FAIL criteria defined before code
- Agent separation (creator ≠ verifier ≠ implementer)
- Structured evidence per criterion
- See `docs/adr/ADR-verification-contract-first-workflow.md`

---

## PFLICHT: Red Tests

Every prompt MUST require Red Tests:
- Tests that MUST fail before implementation
- Validate that the implementation actually addresses the issue
- Prevent false positives

---

## PFLICHT: Security Gates

Every prompt MUST reference Positron security gates:
- Secret scanning
- Infrastructure gate matrix
- Tool Gateway default-deny posture
- Merge kill switch
- See `docs/security/`

---

## PFLICHT: Evidence Portfolio / Living Software Portfolio

Every prompt MUST require evidence to be documented in the living software
portfolio:
- `docs/status/current-capabilities.md` — what works now
- `docs/status/known-limitations.md` — what is intentionally absent
- `docs/evidence/` — run-specific evidence subdirectories

---

## PFLICHT: GitHub Repository Pflege & Erscheinungsbild (GitHub Polish)

Every prompt SHOULD include repository maintenance awareness:
- README accuracy
- CI badge status
- License visibility
- Screenshot currency
- Issue/PR template completeness

---

## PFLICHT: Next-Step-Handoff

Every prompt completion MUST produce a structured handoff containing:
1. Summary verdict (GREEN/YELLOW/RED)
2. Runtime details (OS, Shell, OpenCode version)
3. What was verified
4. What was changed
5. What was NOT changed
6. Tests/Gates (command, shell, exit code, result)
7. PR/Branch/Commit status
8. CI status
9. Risks/Blockers
10. Human Approval needed for merge
11. Evidence files
12. Next step

---

## PFLICHT: "Was kann die Software jetzt im Vergleich zum vorherigen Lauf?"

Every prompt completion MUST answer concretely:
- **New Capabilities:** What new capability does Positron actually have now?
- **Removed Blockers:** Which CI/prompt/documentation/OS-compatibility blockers were removed?
- **Unchanged Limitations:** What remains manual, blocked, or unverified?
- **Remaining Risks:** Which risks persist despite green tests?
- **Next Step:** Exactly ONE prioritized next step, not a broad options menu.

---

## OPTIONAL: UI Preview / Sandbox Preview

Required only when UI or web files are changed. Otherwise state:
`Sandbox Preview: not required; docs/config/test-only change.`

---

## Validation

This standard is machine-validated by the Red Test:
`packages/shared/src/__tests__/prompt-standard.contract.test.ts`

The test:
1. Reads this file
2. Extracts all PFLICHT section headings
3. Fails if any mandatory section heading is missing
4. Fails if the full workflow chain is absent

---

*Version 1.0 — Established 2026-06-19 as part of Prompt/Evidence/GitHub Hardening run.*
