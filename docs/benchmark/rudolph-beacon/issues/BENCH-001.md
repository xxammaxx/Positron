# BENCH-001 — Domain Baseline

## Summary
Define and test the Rudolph Beacon domain model including `ReindeerBeacon` type, `BeaconStatus` classification, and deterministic status rules.

## Acceptance Criteria

- [x] `ReindeerBeacon` type exists with all required fields (id, name, beaconId, zone, batteryPercent, rssi, lastSeenAt)
- [x] `BeaconStatus` is `'GREEN' | 'YELLOW' | 'RED'`
- [x] GREEN: battery >= 40 AND rssi >= -75 AND lastSeenAt <= 30 min
- [x] YELLOW: battery 20-39 OR rssi -90 to -76 (when not RED)
- [x] RED: battery < 20 OR rssi < -90 OR lastSeenAt > 30 min
- [x] RED takes precedence over YELLOW over GREEN
- [x] Boundary values tested: battery at 19 vs 20, rssi at -90 vs -91, stale at exactly 30 min
- [x] No network, no hardware, no real secrets
- [x] `classifyBeacon` is a pure function (deterministic given inputs)

## Test Coverage
- `packages/benchmark-rudolph/src/__tests__/beacon-domain.test.ts` — 34 tests
- Red Tests covered: #1 (battery 19% → RED), #2 (battery 20% not RED), #3 (rssi -91 → RED), #4 (rssi -90 not RED), #5 (stale → RED)

## Implementation
- `packages/benchmark-rudolph/src/beacon-domain.ts`

## Status: DONE
Confidence: 0.95
