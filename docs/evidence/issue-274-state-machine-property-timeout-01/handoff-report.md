# Issue #274 — State-Machine Property-Test Timeout Fix Handoff

## Summary

Fixes the local-ci timeout in `packages/run-state/src/__tests__/state-machine.property.test.ts`.

## Root Cause

`transitionChainArb` used rejection-based generation:

```ts
fc.array(validTransitionArb, { minLength: 2, maxLength: 20 }).filter(...)
```

With sparse valid transitions (28 phases, few valid edges per phase), fast-check discarded too many generated arrays before finding connected chains. Under full-suite parallelism, this made Invariant 8 hit the 5000ms test timeout. Even in isolation, the test took 6102ms to complete (vs 5000ms timeout).

### Before fix (targeted isolation):
```
FAIL Invariant 8 — Test timed out in 5000ms (actual: 6102ms)
transitionChainArb produces connected chains: 1804ms
```

### After fix (targeted isolation):
```
PASS Invariant 8 — 242ms
transitionChainArb produces connected chains: 25ms
```

## Fix

Replaced the rejection-based connected-chain generator with a constructive generator that builds connected transition chains directly:

- Start from a random valid transition (`validTransitionArb` seed)
- Extend the chain step-by-step through valid outgoing edges
- Handle terminal phases gracefully (stop extending)
- Deterministic but varied selection through modulo cycling

```ts
const transitionChainArb: fc.Arbitrary<[Phase, Phase][]> = fc
	.tuple(validTransitionArb, fc.integer({ min: 2, max: 20 }))
	.map(([seed, targetLength]) => {
		const chain: [Phase, Phase][] = [seed];
		let currentPhase: Phase = seed[1];
		while (chain.length < targetLength) {
			const nextTargets = VALID_TRANSITIONS[currentPhase] as readonly Phase[];
			if (nextTargets.length === 0) break;
			const nextPhase = nextTargets[chain.length % nextTargets.length]!;
			chain.push([currentPhase, nextPhase]);
			currentPhase = nextPhase;
		}
		return chain;
	});
```

## Scope

Changed:

* `packages/run-state/src/__tests__/state-machine.property.test.ts`
* `docs/evidence/issue-274-state-machine-property-timeout-01/handoff-report.md`

Not changed:

* production state-machine code
* secret-manager property tests
* GitHub workflows
* stashes
* `.opencode/*`
* Biome lint backlog

## Local Gates

| Gate | Command | Result |
|------|---------|--------|
| Format | `npx biome format .` | PASS (370 files, 0 fixes) |
| Targeted state-machine | `npx vitest run packages/run-state/src/__tests__/state-machine.property.test.ts` | 37/37 PASS, 4.20s (Invariant 8: 242ms) |
| Invariant 8 targeted | `npx vitest run ... -t "Invariant 8"` | PASS, 556ms |
| Full suite | `npm test` | 915/917 PASS (2 pre-existing secret-manager failures) |
| Build | `npm run build` | PASS |
| Typecheck | `npm run typecheck` | PASS |
| git diff --check | `git diff --check` | PASS |

## Secondary Observation

`packages/shared/src/__tests__/secret-manager.property.test.ts` shows 2 timeouts under full `npm test` (valid KEY=VALUE and invalid lines). This is documented as out of scope and should be handled in a separate issue.

## CI Policy

Local gates are source of truth. GitHub Actions remains advisory-only and was not rerun.

## Was kann die Software jetzt im Vergleich zum vorherigen Lauf?

### Neue Fähigkeiten

* State-machine property test no longer depends on inefficient rejection-based chain generation.
* Invariant 8 runs reliably under local tests (242ms vs 6102ms timeout).

### Entfernte Blocker

* The state-machine property-test timeout is removed.

### Unveränderte Einschränkungen

* GitHub-CI remains advisory-only.
* Biome lint backlog remains out of scope.
* Secret-manager property timeout remains out of scope.
* stash@{0} and stash@{1} remain intact.

### Verbleibende Risiken

* Secret-manager property tests remain flaky under full-suite parallelism (separate issue).

### Nächster sinnvoller Schritt

Review and merge the Issue #274 PR after human approval.
