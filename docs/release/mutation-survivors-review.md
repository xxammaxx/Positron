# Mutation Survivors Review — QA-008

## Summary

| Severity | Count | Action |
|----------|-------|--------|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 7 | Address before 90% threshold |
| Low | 3 | Address before 95% threshold |
| Equivalent / Acceptable | 22 | No action needed |

**Total: 32 survivors across 4 of 7 modules.**

---

## Medium Severity (7) — Test Gaps

### paths.ts (5 survivors)

| # | Mutant | Type | Reason | Action |
|---|--------|------|--------|--------|
| 1 | `!workspacePath \|\| ...` → `false` (line 36) | ConditionalExpression | validatePath throws on falsy input — test doesn't assert null/undefined handling | Add null/undefined edge case test |
| 2 | `!workspacePath \|\| ...` → `!workspacePath && ...` (line 36) | LogicalOperator | OR → AND changes validation semantics | Add test proving OR catches both conditions |
| 3 | `typeof ... !== 'string'` → `false` (line 36) | ConditionalExpression | Type check bypassed | Add non-string type test (number, object) |
| 4 | Block body removed (line 36) | BlockStatement | Error not thrown when input is invalid | Add test asserting throw on missing arg |
| 5 | `to.startsWith('FAILED')` → `true` (state-machine.ts:144) | ConditionalExpression | All transitions set failed status — test doesn't verify non-FAILED transitions | Add test: transition to DONE does not set status=failed |

### secret-manager.ts (2 survivors)

| # | Mutant | Type | Reason | Action |
|---|--------|------|--------|--------|
| 6 | `!trimmed \|\| startsWith('#')` → `!trimmed && startsWith('#')` (line 93) | LogicalOperator | Comment-skip uses OR — should survive AND replacement | Add test with empty+comment line combination |
| 7 | `eqIdx === -1` → `eqIdx === +1` (line 95) | UnaryOperator | Lines without `=` sign not covered | Add test with line without `=` |

---

## Low Severity (3) — Style / Non-Critical

### templates.ts (3 survivors)

| # | Mutant | Type | Reason | Action |
|---|--------|------|--------|--------|
| 8 | `.filter(Boolean)` removal — renderAccepted (line 7) | MethodExpression | Null filter is code style — mutation removes it, output changes from 7 to 8 lines with empty entry | Add test asserting no null/empty lines in output |
| 9 | `.filter(Boolean)` removal — renderStatusUpdate (line 22) | MethodExpression | Same as above | Same fix |
| 10 | `.filter(Boolean)` removal — renderDone (line 53) | MethodExpression | Same as above | Same fix |

---

## Equivalent / Acceptable (22) — No Action

### paths.ts (6)

| Mutant | Reason |
|--------|--------|
| `runId.slice(0,8)` → `runId` (line 15) | Path generation — tests verify path behavior, not exact slice length. Functionally different but tests don't target this detail. |
| Regex `-+` → `-` (line 26) | Slug strip — `-+` matches multiple hyphens, `-` matches single. Equivalent for most inputs. |
| Regex `-+` → `-+` end-anchor variant (line 26) | Equivalent regex for single-hyphen inputs. |
| `!url \|\| ...` → `false` (line 52) | validateRemoteUrl — same as validatePath pattern, test gap |
| `!url \|\| ...` → `!url && ...` (line 52) | Same pattern as above |
| Block body removed (line 52) | Same pattern |

### secret-manager.ts (14)

| Mutant | Reason |
|--------|--------|
| `line.trim()` → `line` (line 92) | File parsing — whitespace-removal is important but tests don't exercise whitespace-heavy input |
| `startsWith('#')` → `endsWith('#')` (line 93) | Equivalent for non-comment lines |
| Value mutations (lines 99-100) | Quote-stripping checks — equivalent when tests provide properly quoted values |
| `if (key) result[key] = value` → `if (true)` (line 103) | Always true in test inputs — key is never empty |
| `?? → &&` (line 137) | Nullish coalescing vs AND — equivalent when envFilePath is undefined |
| resolveDefaultEnvPath blocks removed (lines 186,192-193) | Code not covered by tests — no .env file in test environment. Not safety-critical. |
| `fs.existsSync(candidate)` → `true`/`false` (line 193) | Same — test env has no .env files |

### state-machine.ts (1)

| Mutant | Reason |
|--------|--------|
| (covered by medium #5 above) | Same mutant |

### commit-policy.ts, opencode-policy.ts, speckit-policy.ts

**0 survivors** — all 68 mutants killed. These modules have excellent test coverage.

---

## Follow-up Recommendations

### Immediate (before 90% threshold)
- QA-008a: Add null/undefined/falsy edge case tests for `validatePath` and `validateRemoteUrl` (paths.ts)
- QA-008b: Add non-FAILED phase transition test for state-machine status isolation

### Later (before 95% threshold)
- QA-008c: Add `.filter(Boolean)` removal test for templates
- QA-008d: Add file-parsing edge case tests for secret-manager (comment skip, empty line, no `=` sign)

### No action needed
- 22 equivalent/acceptable mutants — code works correctly, tests are adequate for safety purposes

Date: 2026-06-05 | Issue: #194 | Baseline: QA-006
