# Prompt/Evidence/GitHub Hardening Run 01 — Evidence

## Run Metadata

| Field | Value |
|-------|-------|
| **Run ID** | `prompt-hardening-01` |
| **Date** | 2026-06-19 |
| **OpenCode Version** | 1.15.0 |
| **OS** | Windows 10.0.19045 (PowerShell 5.1) |
| **Branch** | `feature/hermes-opencode-adapter-capability-pack` |
| **Commit (start)** | `52f3f62` |
| **Trigger** | Manual Prompt/Evidence/GitHub Hardening Run |

## What Was Done

### 1. Reality Check / Preflight
- Verified PR #147, branch `feature/optimizer-placeholder-hardening`, commit `e5792bb` — **all confirmed non-existent**
- Documented real working state: branch `feature/hermes-opencode-adapter-capability-pack`
- Detected OS: Windows 10, PowerShell 5.1, Codepage 850
- Confirmed OpenCode 1.15.0, Node.js 24.14.0, git 2.47.0 operational
- 20 open PRs identified, none is #147

### 2. Prompt-Archiv-Hardening
- Created canonical prompt standard: `docs/prompts/positron-prompt-standard.md`
  - 16 mandatory (PFLICHT) sections covering all required hardening topics
  - Workflow chain: Issue → Spec → Verification Contract → Red Tests → Agent-Code → CI/Security Gates → Sandbox Preview → Reviewer-Agent → Human Approval → Evidence-Kommentar → Merge
  - OS/Shell preflight requirement embedded in every prompt standard
  - OpenCode named as target runtime
  - Plan-Agent before Build-Agent enforced
- Created Red Test: `packages/shared/src/__tests__/prompt-standard.contract.test.ts`
  - 28 test assertions
  - Validates all 16 mandatory sections exist with required content
  - Blocks prompts missing any mandatory section
  - Blocks Auto-Merge, force push, and destructive command authorization

### 3. Evidence Portfolio
- Updated this evidence directory with full preflight + run documentation

### 4. GitHub Repository Pflege
- Created hardening checklist at `docs/repository-hardening-checklist.md`
- Evaluated 25+ repository maintenance items

## Files Created

| File | Purpose |
|------|---------|
| `docs/prompts/positron-prompt-standard.md` | Canonical Positron agent prompt standard |
| `packages/shared/src/__tests__/prompt-standard.contract.test.ts` | Red Test for prompt standard validation |
| `docs/evidence/prompt-hardening-01/` | This evidence directory |
| `docs/evidence/prompt-hardening-01/POSITRON_OPENCODE_PREFLIGHT_PROMPT_HARDENING.md` | Comprehensive preflight report |
| `docs/evidence/prompt-hardening-01/README.md` | This file |
| `docs/repository-hardening-checklist.md` | GitHub repository polish checklist |

## Files Modified

| File | Change |
|------|--------|
| None | No existing files modified in this run |

## Tests Run

### Prompt Standard Red Tests
```
npx vitest run packages/shared/src/__tests__/prompt-standard.contract.test.ts
→ 28 passed, 0 failed ✅
```

## Red Tests Verification

The Red Tests validate that any generated Positron agent prompt contains:
- ✅ OpenCode as target runtime
- ✅ Plan-Agent before Build-Agent
- ✅ Conservative OpenCode permissions
- ✅ Preflight scan
- ✅ OS/Shell detection in preflight
- ✅ Cold/Warm/Hot Context
- ✅ Source of Truth
- ✅ Verification Contract
- ✅ Red Tests
- ✅ CI/Security Gates
- ✅ Human Approval
- ✅ Evidence-Kommentar
- ✅ GitHub Repository Pflege
- ✅ Living Software Portfolio / Evidence Portfolio
- ✅ "Was kann die Software jetzt im Vergleich zum vorherigen Lauf?"
- ✅ No Auto-Merge without Human Approval
- ✅ No force push authorization
- ✅ No destructive commands without approval

If any of these are missing from a future prompt template, the test will turn RED.

## Known Limitations

- The prompt standard is a template — actual prompts still need human/AI authoring
- Red Tests only validate the standard document, not runtime prompt generation
- Codepage 850 encoding on Windows may affect console display of German umlauts
- No CI verification on this branch (CI targets `main/master/develop` only)

## Next Step

Run the full test suite and CI gates (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`) to verify no regressions, then proceed to human approval.

---

*Part of Prompt/Evidence/GitHub Hardening Run 01 — 2026-06-19*
