# Context Manifest Template

Dieses Template dokumentiert den Kontext eines KI-Agenten-Laufs und trennt Cold, Warm und Hot Context.

---

## Context Manifest

### Session Metadata

```yaml
session_id: "<uuid>"
agent: "<agent-name>"
started_at: "<ISO8601>"
completed_at: "<ISO8601>"
duration_ms: <number>
confidence: "HIGH|MEDIUM|LOW"
human_approved: true|false
```

### Token/Scope Budget

```yaml
estimated_tokens: <number>
actual_tokens: <number>
scope: "<issue-number> | <task-description>"
```

### Files Read

- `<path>` — purpose of read
- `<path>` — purpose of read

### Files Modified

- `<path>` — what was changed and why
- `<path>` — what was changed and why

---

## Context Layers

### Cold Context (stable project rules)

- [x] `.specify/memory/constitution.md` loaded
- [x] `AGENTS.md` loaded
- [ ] Architecture documents: `<list>`
- [ ] Glossary: `docs/glossary.md`
- [ ] Governance rules: `<list>`

### Warm Context (current project state)

- [ ] Active Issue: `#<number> — <title>`
- [ ] Open PRs: `<list>`
- [ ] Roadmap items: `<list>`
- [ ] Known technical debt: `<list>`
- [ ] Recent changelog: `<list>`

### Hot Context (this agent run)

- [ ] Issue specification: `<path>` or `<summary>`
- [ ] Implementation plan: `<path>` or `<summary>`
- [ ] Task list: `<path>` or `<summary>`
- [ ] Test files: `<paths>`
- [ ] Error messages: `<summary>`
- [ ] Diff summary: `<summary>`

---

## Assumptions

| # | Assumption | Confidence | Verification Method |
|---|---|---|---|
| 1 | `<assumption>` | HIGH/MEDIUM/LOW | `<how to verify>` |

---

## Evidence Log

- [ ] Test results: `<path or summary>`
- [ ] Build output: `<path or summary>`
- [ ] GitHub comment: `<link>`
- [ ] Screenshots: `<paths>`
- [ ] Diff review: `<path or summary>`

---

## Open Items

| # | Item | Priority | Owner |
|---|---|---|---|
| 1 | `<open question>` | HIGH/MEDIUM/LOW | `<who>` |

---

## Sign-off

- [ ] All acceptance criteria met
- [ ] Tests pass
- [ ] Documentation updated (if applicable)
- [ ] GitHub issue commented
- [ ] Human review: PENDING / APPROVED / REVISIONS REQUESTED
