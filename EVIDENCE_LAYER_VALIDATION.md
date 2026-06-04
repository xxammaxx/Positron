# Evidence Layer Validation Report

**Issue:** #165 — Phase 2 Hardening
**Date:** 2026-06-04
**Status:** PARTIALLY VERIFIED (Script crashes, CI job defined)

---

## Investigation Summary

| Check | Result | Evidence |
|-------|--------|----------|
| `collect-evidence.mjs` syntax | ❌ CRASHES | TypeScript `interface` in `.mjs` file → SyntaxError |
| `collect-evidence.mjs` execution | ❌ CRASHES | `node scripts/collect-evidence.mjs` → SyntaxError at line 65 |
| Evidence CI job defined | ✅ VERIFIED | `evidence-collect` job in `quality-gates.yml` |
| CI job depends on artifact producers | ✅ VERIFIED | `needs: [build-and-test, e2e-playwright, mutation-fast]` |
| `POSITRON_EVIDENCE_ISSUE` default | ✅ VERIFIED | Default set to `165` |
| Artifact collection logic | ⚠️ UNTESTED | Script crashes before logic executes |
| Evidence comment posting | ❌ UNTESTED | Cannot execute crashed script |
| Failure case handling | ❌ UNTESTED | Script crashes on startup |

## Critical Finding: TypeScript Syntax in .mjs File

The `scripts/collect-evidence.mjs` file **crashes immediately** when executed by Node.js:

```
file:///home/xxammaxx/Schreibtisch/Positron/scripts/collect-evidence.mjs:65
interface EvidenceClaim {
^^^^^^^^^

SyntaxError: Unexpected strict mode reserved word
```

**Root cause:** The `.mjs` file extension indicates an ES module that Node.js executes directly. However, the file contains TypeScript syntax (`interface EvidenceClaim` at line 65, type annotations like `: string`, `: boolean`, `: number`, `: Promise<...>` throughout). Node.js cannot parse TypeScript — it expects plain JavaScript.

**Affected lines with TypeScript syntax:**
- Line 65: `interface EvidenceClaim {`
- Line 66-70: Type annotations (`: number`, `: string`, `: boolean`)
- Line 73: Function return type `): EvidenceClaim`
- Line 84: Function return type `): Promise<EvidenceClaim[]>`
- Line 160: Function parameter type `(claims: EvidenceClaim[])`
- Line 186: Variable type `const lines: string[]`
- Line 226: Function return type `): Promise<void>`

**All other scripts in `scripts/` verified OK:**
- `alert-webhook-mock.mjs` ✅
- `capture-screenshots.mjs` ✅
- `chaos-drill.mjs` ✅
- `observability-drill.mjs` ✅
- `observability-validate.mjs` ✅
- `queue-backlog-drill.mjs` ✅
- `record-demo.mjs` ✅
- `sonarqube-quality-gate.mjs` ✅
- `verify-issues.mjs` ✅

**Only the Phase 1 scripts crash:**
- `ai-ui-review.mjs` ❌ (same bug — see AI_UI_REVIEW_VALIDATION.md)
- `collect-evidence.mjs` ❌ (this script)

## Impact

The Evidence Layer (Layer 7) is the **critical integration point** for the entire 7-layer framework. It must collect artifacts from all other layers and post a unified evidence report to GitHub Issues. With the script crashing, **zero evidence collection can occur**:

- ❌ Coverage reports not collected
- ❌ Test results not aggregated
- ❌ Screenshots not referenced
- ❌ SARIF/CodeQL/SonarQube reports not included
- ❌ No GitHub Issue comments posted
- ❌ CI evidence-collect job would fail silently (`continue-on-error: true`)

## CI Integration Status

The `evidence-collect` job is defined in `quality-gates.yml`:

```yaml
evidence-collect:
  runs-on: ubuntu-latest
  timeout-minutes: 5
  continue-on-error: true
  needs: [build-and-test, e2e-playwright, mutation-fast]
  if: always()
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - uses: actions/download-artifact@v4
    - run: node scripts/collect-evidence.mjs
      env:
        POSITRON_EVIDENCE_ISSUE: '165'
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This job would **fail** (but continue due to `continue-on-error: true`) because the script crashes. The job itself is correctly structured — it depends on artifact-producing jobs, downloads artifacts, and runs the collection script. The failure is entirely in the script.

## Evidence Rule (ADR-002) Compliance

ADR-002 states: "Every claim must be backed by at least one artifact. No evidence = no validation."

**Self-check:**
- [ ] Evidence collection script works → ❌ CRASHES
- [ ] Artifacts are stored → ❌ Cannot verify (script crash)
- [ ] Artifacts are referenced → ❌ Cannot verify
- [ ] Failure cases are handled → ❌ Crash-on-startup is worst failure mode

## Fix Required

The script must be converted to valid JavaScript. Options:

**Option A: Convert to TypeScript (`.ts`) and compile**
- Rename to `collect-evidence.ts`
- Add to `tsconfig.json` scripts compilation
- Update CI to run compiled `.js` output
- Pro: Type safety preserved
- Con: Adds build step for scripts

**Option B: Remove TypeScript syntax (keep `.mjs`)**
- Replace `interface` with JSDoc `@typedef`
- Remove type annotations from function parameters/returns
- Keep runtime logic unchanged
- Pro: No build step, direct execution
- Con: Loss of type safety

**Option C: Use `tsx` to run `.mjs` with TypeScript**
- Install `tsx` as dev dependency
- Run `npx tsx scripts/collect-evidence.mjs`
- Pro: Minimal changes, keeps TypeScript
- Con: Adds runtime dependency

**Recommendation: Option B** (remove TS syntax) — aligns with the pattern used by all other working scripts in `scripts/`.

## Blockers

| Blocker | Impact | Resolution |
|---------|--------|------------|
| Script crashes on startup | Evidence collection completely broken | Remove TypeScript syntax from .mjs file |
| No evidence ever collected | Layer 7 non-functional | Fix script before any merge |

---

**Conclusion:** The Evidence Layer CI integration is correctly designed but the core script (`collect-evidence.mjs`) is **broken by TypeScript syntax in a JavaScript file**. This is a Phase 1 bug that was never tested. The script must be fixed before any evidence can be collected. All other supporting infrastructure (CI job, artifact dependencies, environment variables) is correctly configured.
