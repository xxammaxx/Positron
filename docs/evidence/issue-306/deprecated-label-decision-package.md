# Deprecated Label Decision Package — Issue #306

**Generated:** 2026-06-27T14:10:00+02:00
**For:** Owner review and decision

---

## Potentially Redundant / Deprecated Labels

### Priority Duplicates

| Label | Status | Used on open? | Issue |
|-------|--------|---------------|-------|
| `P0` | Actively used | YES | Duplicates `priority: high` concept |
| `P1` | Actively used | YES | Duplicates `priority: medium` concept |
| `P2` | Actively used | YES | Duplicates `priority: low` concept |
| `priority: high` | Present | Not on open issues | Duplicates `P0` concept |
| `priority: medium` | Present | Not on open issues | Duplicates `P1` concept |
| `priority: low` | Present | Not on open issues | Duplicates `P2` concept |

### Module / Domain Duplicates

| Label | Status | Used on open? | Issue |
|-------|--------|---------------|-------|
| `server` | Present | Not on open issues | Duplicates `app:server` |
| `web` | Present | Not on open issues | Duplicates `app:web` |

### Type-Adjacent Legacy Labels

| Legacy | New Equivalent | Used on open? | Action |
|--------|---------------|---------------|--------|
| `bug` | `type:bug` | YES | Keep — actively used |
| `enhancement` | `type:feature` | YES | Keep — actively used |
| `documentation` | `type:docs` | YES | Keep — actively used |
| `architecture` | `type:architecture` | YES | Keep — actively used |
| `refactor` | `type:technical-debt` | No | Keep — may be used on closed issues |
| `infrastructure` | `type:infra` | YES | Keep — actively used |
| `ci` | `type:infra` | No | Keep — may be used on closed issues |
| `tooling` | `type:infra` | YES | Keep — actively used |
| `qa` | `type:validation` | YES | Keep — actively used |
| `testing` | `type:validation` | YES | Keep — actively used |
| `observation` | `type:research` | No | Keep — may be used on closed issues |

---

## Risk Assessment

### Risk of Deleting Labels
- **HIGH:** Deleting labels used on closed issues breaks historical queries and filters
- **MEDIUM:** Deleting unused labels has no functional impact but removes the label name for future use
- **LOW:** Consolidating priority model would simplify but requires relabeling all P0/P1/P2 issues

### Risk of NOT Deleting Labels
- **LOW:** Extra labels cause no functional harm
- **LOW:** Stale labels are a documentation/clarity concern only
- **LOW:** AI orchestrator can be told which labels to prefer

---

## Owner Decision Options

### Option A — Behalten und nur dokumentieren
Keep ALL existing labels. Document which are legacy/preferred. No deletions.

**Pros:** Zero risk. No issue history broken.
**Cons:** Label list remains large (79). Duplicate concepts remain.

### Option B — In späterem Run unused Labels löschen
In a future run, delete only labels that are:
- Not used on any open issue
- Not used on any closed issue (need to check API)
- Clearly redundant with a preferred equivalent

**Pros:** Cleaner label list.
**Cons:** Requires thorough usage audit. Risk of breaking closed issue context.

### Option C — In späterem Run Issues schrittweise relabeln
Gradually relabel existing issues from legacy labels to `type:` equivalents.

**Pros:** Full migration to new taxonomy.
**Cons:** High effort. Spam notifications. Risk of errors.

### Option D — Keine Label-Löschung, nur neue Taxonomie verwenden (RECOMMENDED)
Keep all existing labels. Use `type:` labels for all new issues. Document legacy equivalents.

**Pros:** Zero risk. Clean forward path. No issue history broken.
**Cons:** Label list stays large.

---

## Recommendation

```text
D — Keine Label-Löschung, nur neue Taxonomie verwenden
```

**Rationale:**
1. Deleting labels breaks closed-issue filters and search queries
2. Legacy labels are actively used on open issues (P0, P1, P2, bug, enhancement, etc.)
3. The `type:` taxonomy provides a clean forward path without destructive changes
4. LABELS.md documents the mapping for both humans and AI

---

## Classification

```text
DEPRECATED_LABEL_DECISION_STATUS: DOCUMENTED
```

**Rationale:** All potentially redundant labels identified, risks assessed, options documented. Recommendation provided for owner decision.
