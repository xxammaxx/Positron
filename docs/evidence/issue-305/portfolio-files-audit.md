# Portfolio Files Audit — Issue #305

## Metadata
- **Timestamp:** 2026-06-27T13:10:00Z
- **Run ID:** issue-305-portfolio-audit-01
- **Executor:** issue-orchestrator

---

## File 1: `docs/status/current-capabilities.md`

### General
| Property | Value |
|----------|-------|
| **Exists** | YES |
| **Size** | 157 lines |
| **Content type** | Mixed — prose + structured tables |

### Sections Analysis

| Section | Lines | Type | Auto-Updatable? |
|---------|-------|------|-----------------|
| Title + Status header | 1–5 | Prose (manual) | NO — manual overview |
| Local Gates table | 9–18 | Structured table | PARTIAL — new gates could be appended |
| Implemented Capabilities (prose subsections) | 22–98 | Prose paragraphs | NO — human-written descriptions |
| GitHub/Remote CI Status | 100–104 | Prose | NO — policy statement |
| Active Backlog table | 108–118 | Structured table | YES — issue rows are append-only |
| Evidence References table | 122–141 | Structured table | YES — issue/PR rows are append-only |
| Test Breakdown table | 145–157 | Structured table | YES — package rows are append-only |

### Manual Sections (MUST NOT be overwritten)
- Lines 1–5: Title and status overview
- Lines 22–98: Implemented Capabilities prose
- Lines 100–104: GitHub/Remote CI Status prose

### Automatable Sections (append-only)
- Lines 108–118: Active Backlog table
- Lines 122–141: Evidence References table
- Lines 145–157: Test Breakdown table

### Recommended Auto-Update Markers
The file has **no existing auto-update markers**. Adding markers before appendable sections would be safe:

```markdown
<!-- positron:auto-generated:start backlog -->
| Issue | Title | Risk | Priority |
...
<!-- positron:auto-generated:end backlog -->

<!-- positron:auto-generated:start evidence-refs -->
| Issue/PR | Description | Status |
...
<!-- positron:auto-generated:end evidence-refs -->

<!-- positron:auto-generated:start test-breakdown -->
| Package | Tests | Status |
...
<!-- positron:auto-generated:end test-breakdown -->
```

---

## File 2: `docs/status/known-limitations.md`

### General
| Property | Value |
|----------|-------|
| **Exists** | YES |
| **Size** | 97 lines |
| **Content type** | Mixed — prose + structured tables |

### Sections Analysis

| Section | Lines | Type | Auto-Updatable? |
|---------|-------|------|-----------------|
| Remote CI prose | 3–11 | Prose | NO — policy description |
| Biome Lint Backlog | 13–15 | Prose | NO |
| Full Real Mode prose | 17–22 | Prose | NO |
| E2E Testing prose | 24–31 | Prose + structure | PARTIAL — sub-issues could be added |
| Open Issues/PRs | 33–38 | Prose list | YES — issue list is appendable |
| PR Chain table | 42–56 | Structured table | NO — reference data |
| Stashes | 60–65 | Prose | NO — manual policy |
| Active Limitations table | 71–85 | Structured table | YES — limitation rows are append-only |
| Resolved Limitations table | 89–96 | Structured table | YES — resolved rows are append-only |

### Manual Sections (MUST NOT be overwritten)
- Lines 3–11: Remote CI prose
- Lines 13–15: Biome Lint Backlog
- Lines 17–22: Full Real Mode prose
- Lines 24–31: E2E Testing prose
- Lines 33–38: Open Issues/PRs list
- Lines 60–65: Stashes policy

### Automatable Sections (append-only)
- Lines 71–85: Active Limitations table
- Lines 89–96: Resolved Limitations table

### Recommended Auto-Update Markers
```markdown
<!-- positron:auto-generated:start active-limitations -->
| Item | Status | Issue |
...
<!-- positron:auto-generated:end active-limitations -->

<!-- positron:auto-generated:start resolved-limitations -->
| Item | Resolution |
...
<!-- positron:auto-generated:end resolved-limitations -->
```

---

## File 3: `docs/status/evidence-index.md`

### General
| Property | Value |
|----------|-------|
| **Exists** | YES |
| **Size** | 93 lines |
| **Content type** | Mixed — prose + structured tables |

### Sections Analysis

| Section | Lines | Type | Auto-Updatable? |
|---------|-------|------|-----------------|
| Intro + Truth Layer Model | 1–13 | Prose + table | NO — foundational docs |
| Evidence Directory Map (Rudolph Beacon) | 17–29 | Structured table | YES — rows appendable |
| Evidence Directory Map (CI Recovery) | 33–41 | Structured table | YES — rows appendable |
| Evidence Directory Map (Post-268) | 45–51 | Structured table | YES — rows appendable |
| Evidence Directory Map (Portfolio Gap) | 55–58 | Structured table | YES — rows appendable |
| Evidence Directory Map (Docs Sync #307) | 62–71 | Structured table | YES — rows appendable |
| Capability & Limitation Docs | 75–78 | Reference table | PARTIAL — links are stable |
| Key Run Reports | 82–87 | Structured table | YES — new rows appendable |
| Notes | 90–93 | Prose | NO — policy statement |

### Manual Sections (MUST NOT be overwritten)
- Lines 1–13: Truth Layer Model + intro
- Lines 90–93: Notes (policy about immutability)

### Automatable Sections (append-only)
- All Evidence Directory Map tables (by run namespace)
- Key Run Reports table

### Recommended Auto-Update Markers
```markdown
<!-- positron:auto-generated:start evidence-map -->
### <Run Name>
...
<!-- positron:auto-generated:end evidence-map -->

<!-- positron:auto-generated:start key-reports -->
| Path | Issue | Run |
...
<!-- positron:auto-generated:end key-reports -->
```

---

## Overall Assessment

### Update Strategy Recommendation

**MVP Approach (GREEN_SAFE):**

1. **Generated blocks with HTML comment markers** — use `<!-- positron:auto-generated:start <section> -->` / `<!-- positron:auto-generated:end <section> -->` pairs to protect manual content

2. **Append-only for structured tables** — new rows are inserted before end markers

3. **No prose rewriting** — only structured tables and lists within marked blocks

4. **Three update targets for MVP:**
   - `current-capabilities.md`: Evidence References table, Active Backlog table
   - `known-limitations.md`: Active Limitations table
   - `evidence-index.md`: Evidence Directory Map (new run namespace), Key Run Reports

5. **Conflict detection:**
   - If markers are missing → WARNING (manual override or corrupted)
   - If duplicate entries detected → skip with warning
   - If content between markers is unrecognizable → skip, don't overwrite

### Preservation Rules
- Lines outside auto-generated markers → NEVER modified
- Content between markers → regenerated from evidence data
- Manual prose sections → read-only, never parsed for auto-update

### Classification

```
ISSUE_305_PORTFOLIO_AUDIT_STATUS: COMPLETE
```

### Justification
- All 3 portfolio files examined
- Section-by-section analysis with line numbers
- Clear distinction between manual and automatable sections
- Marker strategy defined
- Update targets scoped to MVP
- Conflict detection strategy outlined
