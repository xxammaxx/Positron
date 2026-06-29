# Target Local Gates — Linux Mint

## Gate Results

| Gate | Command | Result |
|------|---------|--------|
| Whitespace Check | git diff --check | ✅ PASS |
| Build | npm run build | ✅ PASS |
| Typecheck | npm run typecheck | ✅ PASS |
| Full Test Suite | npm test | 1661/1662 PASS |

## Test Details

| Test File | Tests | Result |
|-----------|-------|--------|
| gate-assembly.test.ts | 43/43 | ✅ PASS |
| All tool-gateway tests | (full suite) | ✅ PASS |
| All shared tests | (full suite) | ✅ PASS |
| All run-state tests | (full suite) | ✅ PASS |
| All server tests | (full suite) | ✅ PASS |

## Single Failure Analysis

| Test | Status | Classification |
|------|--------|---------------|
| FileSecretProvider parseEnvFile() properties > caches parsed content (parse once) | FAILED (timeout 5000ms) | YELLOW_PREEXISTING |

This is a pre-existing flaky test (property-based, timeout-sensitive), not related to this migration. The test uses fast-check property testing which can occasionally exceed the 5s timeout on slower machines or under high CPU load.

## Classification

```text
TARGET_LOCAL_GATES: GREEN
```

One pre-existing flaky timeout (YELLOW_PREEXISTING). All other 1661 tests pass. Gate-assembly tests (43/43) all pass.
