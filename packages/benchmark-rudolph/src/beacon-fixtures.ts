// Positron — Rudolph Beacon Fixtures (Deterministic Scan Simulator)
//
// Deterministic seed-based beacon scan simulator for the Rudolph Beacon benchmark.
// Same seed + same time = identical result. No randomness, no network, no hardware.
//
// Issue: BENCH-002

import type { ReindeerBeacon, BeaconStatus } from './beacon-domain.js';
import { classifyBeacon } from './beacon-domain.js';

// =============================================================================
// Types
// =============================================================================

/** Result of scanning a single beacon. */
export interface BeaconScanEntry {
	beaconId: string;
	name: string;
	zone: string;
	batteryPercent: number;
	rssi: number;
	status: BeaconStatus;
	lastSeenAt: string;
}

/** Result of a full scan operation. */
export interface BeaconScanResult {
	/** The seed used for this scan (for traceability) */
	seed: string;
	/** ISO 8601 timestamp when the scan was simulated */
	scannedAt: string;
	/** All beacon entries found in the scan */
	entries: BeaconScanEntry[];
	/** Beacons that were requested but not found */
	notFound: string[];
	/** Total scan duration in ms (simulated) */
	durationMs: number;
	/** Any warnings or errors during the scan */
	warnings: string[];
}

// =============================================================================
// Known Beacon Registry (deterministic, hardcoded)
// =============================================================================

/** Known beacons in the Rudolph fleet. The deterministic scan can only report on these. */
const KNOWN_BEACONS: ReindeerBeacon[] = [
	{
		id: 'rudolph-1',
		name: 'Rudolph',
		beaconId: 'BLE-RD-001',
		zone: 'North Pole Hangar A',
		batteryPercent: 92,
		rssi: -42,
		lastSeenAt: '2026-12-24T10:00:00Z',
	},
	{
		id: 'rudolph-2',
		name: 'Dasher',
		beaconId: 'BLE-DS-002',
		zone: 'Sleigh Bay 3',
		batteryPercent: 55,
		rssi: -60,
		lastSeenAt: '2026-12-24T10:00:00Z',
	},
	{
		id: 'rudolph-3',
		name: 'Dancer',
		beaconId: 'BLE-DN-003',
		zone: 'Reindeer Stables West',
		batteryPercent: 18,
		rssi: -88,
		lastSeenAt: '2026-12-24T10:00:00Z',
	},
	{
		id: 'rudolph-4',
		name: 'Prancer',
		beaconId: 'BLE-PR-004',
		zone: 'Reindeer Stables East',
		batteryPercent: 45,
		rssi: -95,
		lastSeenAt: '2026-12-24T10:00:00Z',
	},
	{
		id: 'rudolph-5',
		name: 'Vixen',
		beaconId: 'BLE-VX-005',
		zone: 'North Pole Hangar B',
		batteryPercent: 75,
		rssi: -50,
		lastSeenAt: '2026-12-24T09:20:00Z',
	},
	{
		id: 'rudolph-6',
		name: 'Comet',
		beaconId: 'BLE-CM-006',
		zone: 'Sleigh Bay 1',
		batteryPercent: 30,
		rssi: -78,
		lastSeenAt: '2026-12-24T10:00:00Z',
	},
	{
		id: 'rudolph-7',
		name: 'Cupid',
		beaconId: 'BLE-CP-007',
		zone: 'Reindeer Stables West',
		batteryPercent: 10,
		rssi: -70,
		lastSeenAt: '2026-12-24T10:00:00Z',
	},
	{
		id: 'rudolph-8',
		name: 'Donner',
		beaconId: 'BLE-DO-008',
		zone: 'Reindeer Stables East',
		batteryPercent: 60,
		rssi: -45,
		lastSeenAt: '2026-12-24T10:00:00Z',
	},
	{
		id: 'rudolph-9',
		name: 'Blitzen',
		beaconId: 'BLE-BL-009',
		zone: 'North Pole Hangar A',
		batteryPercent: 85,
		rssi: -35,
		lastSeenAt: '2026-12-24T10:00:00Z',
	},
];

// =============================================================================
// Deterministic PRNG (simple hash-based, no Math.random())
// =============================================================================

/**
 * Simple deterministic hash function for seed-based value generation.
 * Produces a pseudo-random number in [0, 1) from a string seed and index.
 * Same input always produces same output.
 */
function seededHash(seed: string, index: number): number {
	let h = 0;
	const s = `${seed}-${index}`;
	for (let i = 0; i < s.length; i++) {
		h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
	}
	// Normalize to [0, 1)
	return ((h >>> 0) % 10000) / 10000;
}

// =============================================================================
// Scan Simulator
// =============================================================================

/**
 * Simulate a beacon scan with deterministic results.
 *
 * @param seed — String seed for deterministic variation
 * @param nowIso — ISO 8601 timestamp for the scan (injected, no system time)
 * @param requestedIds — Optional array of beacon IDs to scan. If empty, scan all known beacons.
 * @returns BeaconScanResult with deterministic entries
 *
 * Acceptance criteria:
 * - Same seed + same nowIso = identical result
 * - Different seed = different (but valid) result
 * - Unknown beacon ID → classified as error (notFound), never silently ignored
 * - No Math.random() used (seededHash only)
 * - No system time dependency (nowIso is injected)
 * - No network/hardware dependency
 */
export function simulateBeaconScan(
	seed: string,
	nowIso: string,
	requestedIds?: string[],
): BeaconScanResult {
	const warnings: string[] = [];
	const notFound: string[] = [];

	// Determine which beacons to scan
	const idsToScan =
		requestedIds && requestedIds.length > 0 ? requestedIds : KNOWN_BEACONS.map((b) => b.id);

	// Look up beacons
	const entries: BeaconScanEntry[] = [];

	for (let i = 0; i < idsToScan.length; i++) {
		const id = idsToScan[i]!;
		const beacon = KNOWN_BEACONS.find((b) => b.id === id);

		if (!beacon) {
			// Unknown beacon ID — never silently ignored
			notFound.push(id);
			warnings.push(`Unknown beacon ID: "${id}" — not in known fleet`);
			continue;
		}

		// Apply deterministic variation based on seed
		const hashVal = seededHash(seed, i);
		const batteryVariation = Math.round((hashVal - 0.5) * 10); // -5 to +5%
		const rssiVariation = Math.round((hashVal - 0.5) * 20); // -10 to +10 dBm

		const adjustedBattery = Math.max(0, Math.min(100, beacon.batteryPercent + batteryVariation));
		const adjustedRssi = beacon.rssi + rssiVariation;

		const status = classifyBeacon(
			{
				...beacon,
				batteryPercent: adjustedBattery,
				rssi: adjustedRssi,
			},
			nowIso,
		);

		entries.push({
			beaconId: beacon.beaconId,
			name: beacon.name,
			zone: beacon.zone,
			batteryPercent: adjustedBattery,
			rssi: adjustedRssi,
			status,
			lastSeenAt: beacon.lastSeenAt,
		});
	}

	return {
		seed,
		scannedAt: nowIso,
		entries,
		notFound,
		// Deterministic simulated duration (no wall-clock dependency)
		durationMs: Math.round(seededHash(seed, idsToScan.length) * 50),
		warnings,
	};
}

// =============================================================================
// Exports
// =============================================================================

export { KNOWN_BEACONS };
