// Positron — Rudolph Beacon Fixtures Tests (Red Tests)
//
// Tests for beacon-fixtures.ts: deterministic scan simulator.
//
// Red Tests: 6, 7 from the specification

import { describe, expect, it } from 'vitest';
import { KNOWN_BEACONS, simulateBeaconScan } from '../beacon-fixtures.js';

const SCAN_TIME = '2026-12-24T10:00:00Z';

// =============================================================================
// Red Test 6: Same seed + same time = identical result
// =============================================================================
describe('Red Test 6 — Deterministic scan: same seed = identical result', () => {
	it('same seed "north-pole" produces identical results', () => {
		const result1 = simulateBeaconScan('north-pole', SCAN_TIME);
		const result2 = simulateBeaconScan('north-pole', SCAN_TIME);

		// Identical seed and time → identical entries
		expect(result1.entries).toHaveLength(result2.entries.length);
		for (let i = 0; i < result1.entries.length; i++) {
			expect(result1.entries[i]).toEqual(result2.entries[i]);
		}

		// Identical notFound arrays
		expect(result1.notFound).toEqual(result2.notFound);
	});

	it('same seed "santa" produces identical results on repeated calls', () => {
		const results = Array.from({ length: 5 }, () => simulateBeaconScan('santa', SCAN_TIME));

		// All 5 runs must be identical
		const first = results[0]!;
		for (let i = 1; i < results.length; i++) {
			expect(results[i]!.entries).toEqual(first.entries);
		}
	});

	it('same seed with same requested IDs produces identical filtered results', () => {
		const ids = ['rudolph-1', 'rudolph-2'];
		const result1 = simulateBeaconScan('filter-test', SCAN_TIME, ids);
		const result2 = simulateBeaconScan('filter-test', SCAN_TIME, ids);

		expect(result1.entries).toEqual(result2.entries);
	});

	it('different seed produces different (but valid) results', () => {
		const result1 = simulateBeaconScan('seed-alpha', SCAN_TIME);
		const result2 = simulateBeaconScan('seed-beta', SCAN_TIME);

		// Different seeds should produce at least one different entry
		const allSame = result1.entries.every(
			(e, i) =>
				e.batteryPercent === result2.entries[i]?.batteryPercent &&
				e.rssi === result2.entries[i]?.rssi,
		);
		expect(allSame).toBe(false);
	});

	it('different seed produces valid statuses for all entries', () => {
		const result = simulateBeaconScan('random-seed-check', SCAN_TIME);
		const validStatuses = ['GREEN', 'YELLOW', 'RED'];
		for (const entry of result.entries) {
			expect(validStatuses).toContain(entry.status);
		}
	});
});

// =============================================================================
// Red Test 7: Unknown beacon ID → error (not silent)
// =============================================================================
describe('Red Test 7 — Unknown beacon ID produces error', () => {
	it('unknown beacon ID appears in notFound', () => {
		const result = simulateBeaconScan('test', SCAN_TIME, ['nonexistent-beacon']);
		expect(result.notFound).toContain('nonexistent-beacon');
	});

	it('unknown beacon ID generates warning', () => {
		const result = simulateBeaconScan('test', SCAN_TIME, ['fake-beacon-42']);
		expect(result.warnings).toContain('Unknown beacon ID: "fake-beacon-42" — not in known fleet');
	});

	it('unknown beacon IDs are not in entries', () => {
		const result = simulateBeaconScan('test', SCAN_TIME, ['unknown-id']);
		const entryIds = result.entries.map((e) => e.beaconId);
		expect(entryIds).not.toContain('unknown-id');
	});

	it('mixed known and unknown: known ones scanned, unknown ones in notFound', () => {
		const result = simulateBeaconScan('mixed', SCAN_TIME, ['rudolph-1', 'unknown-id']);
		expect(result.entries).toHaveLength(1);
		expect(result.entries[0]!.name).toBe('Rudolph');
		expect(result.notFound).toContain('unknown-id');
	});

	it('unknown beacon does not silently succeed', () => {
		const result = simulateBeaconScan('silent-test', SCAN_TIME, ['ghost-beacon']);
		// Should not have any entries for the unknown beacon
		expect(result.entries).toHaveLength(0);
		expect(result.notFound).toHaveLength(1);
	});
});

// =============================================================================
// Additional: Deterministic properties
// =============================================================================
describe('Deterministic scan properties', () => {
	it('scan always includes seed in result', () => {
		const result = simulateBeaconScan('my-seed', SCAN_TIME);
		expect(result.seed).toBe('my-seed');
	});

	it('scan always includes scannedAt timestamp', () => {
		const result = simulateBeaconScan('time-test', SCAN_TIME);
		expect(result.scannedAt).toBe(SCAN_TIME);
	});

	it('all entries have valid battery range (0-100)', () => {
		const result = simulateBeaconScan('range-test', SCAN_TIME);
		for (const entry of result.entries) {
			expect(entry.batteryPercent).toBeGreaterThanOrEqual(0);
			expect(entry.batteryPercent).toBeLessThanOrEqual(100);
		}
	});

	it('scan all beacons returns all known beacons', () => {
		const result = simulateBeaconScan('full-scan', SCAN_TIME);
		expect(result.entries).toHaveLength(KNOWN_BEACONS.length);
	});

	it('requested subset returns only those beacons', () => {
		const result = simulateBeaconScan('subset', SCAN_TIME, ['rudolph-1', 'rudolph-3']);
		expect(result.entries).toHaveLength(2);
		const names = result.entries.map((e) => e.name);
		expect(names).toContain('Rudolph');
		expect(names).toContain('Dancer');
	});
});
