# Evidence Log Template

Dieses Template dokumentiert alle Beweise, die ein KI-Agent während eines Runs gesammelt hat. Jeder Eintrag muss verifizierbar sein.

---

## Evidence Log

### Run Metadata

```yaml
run_id: "<uuid>"
issue: "#<number>"
agent: "<agent-name>"
started_at: "<ISO8601>"
completed_at: "<ISO8601>"
```

---

## Tool Call Log

| # | Timestamp | Tool | Args (redacted) | Result | Duration (ms) |
|---|---|---|---|---|---|
| 1 | `<ISO8601>` | `<tool>` | `<summary>` | SUCCESS/FAIL/DENIED | `<ms>` |
| 2 | ... | ... | ... | ... | ... |

---

## Agent Decisions

| # | Timestamp | Decision Type | Decision | Evidence Refs | Confidence | Human Approved |
|---|---|---|---|---|---|---|
| 1 | `<ISO8601>` | `severity_claim` / `architecture_choice` / `migration_approval` / `compliance_judgment` | `<what was decided>` | `<refs>` | HIGH/MEDIUM/LOW | true/false |

---

## Evidence Collection

### Test Results

| Suite | Passed | Failed | Skipped | Duration | Artifact |
|---|---|---|---|---|---|
| `<suite-name>` | `<n>` | `<n>` | `<n>` | `<ms>` | `<path>` |

Test command: `npm test` / `npx vitest run` / `npx playwright test`

### Build Status

- [ ] `npm run build` — SUCCESS / FAIL
- [ ] `npm run typecheck` — SUCCESS / FAIL
- [ ] `npm run lint` — SUCCESS / FAIL

### Documentation Build

- [ ] `mkdocs build --strict` — SUCCESS / FAIL
- [ ] Markdown-Lint — SUCCESS / FAIL

### Git Diff Summary

```
<git diff --stat output>
```

---

## Delegation Events

| # | Timestamp | Parent Agent | Child Agent | Task | Reason |
|---|---|---|---|---|---|
| 1 | `<ISO8601>` | `<parent>` | `<child>` | `<task>` | `<why delegated>` |

---

## Security Checks

- [ ] No secrets in output/logs
- [ ] No `.env` files committed
- [ ] No tokens in test fixtures
- [ ] Branch follows naming convention (`positron/issue-<n>-<slug>`)
- [ ] No push to `main`/`master`
- [ ] All MCP tool responses validated before use

---

## Acceptance Criteria Mapping

| AC # | Criterion | Evidence | Status |
|---|---|---|---|
| 1 | `<acceptance criterion>` | `<evidence reference>` | MET / NOT MET |
| 2 | ... | ... | ... |

---

## Final Verification

- [ ] All tests pass
- [ ] Build succeeds
- [ ] Documentation updated
- [ ] GitHub issue commented with completion summary
- [ ] Human review requested / completed

### Completion Comment Template

```markdown
## Task Completed

### Context
- Issue: #<number>
- Branch: <branch>
- Commit: <commit>

### Changes
- <summary of what was implemented>

### Files Changed
- <list of changed files>

### Tests Run
- \`test command\` :white_check_mark:
- \`test command\` :x:

### Result
- <pass/fail summary>

### Blockers / Follow-ups
- <any remaining issues>
```
