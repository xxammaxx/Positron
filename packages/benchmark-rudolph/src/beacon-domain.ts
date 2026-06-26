// Positron — Rudolph Beacon Domain Model
//
// Deterministic domain logic for the Rudolph Beacon benchmark system.
// ReindeerBeacon type, BeaconStatus classification, and boundary-value rules.
// No network, no hardware, no randomness, no external dependencies.
//
// Issue: BENCH-001

// =============================================================================
// Core Types
// =============================================================================

/** A simulated reindeer Bluetooth beacon. */
export interface ReindeerBeacon {
	/** Unique beacon identifier */
	id: string;
	/** Human-readable name */
	name: string;
	/** Beacon hardware ID */
	beaconId: string;
	/** Zone/location identifier */
	zone: string;
	/** Battery percentage (0-100) */
	batteryPercent: number;
	/** Received Signal Strength Indicator (dBm, negative values typical) */
	rssi: number;
	/** ISO 8601 timestamp of last sighting */
	lastSeenAt: string;
}

/** Beacon health status classification. RED takes precedence over YELLOW over GREEN. */
export type BeaconStatus = 'GREEN' | 'YELLOW' | 'RED';

// =============================================================================
// Status Classification Rules
// =============================================================================

/**
 * GREEN: battery >= 40 AND rssi >= -75 AND lastSeenAt <= 30 minutes ago
 * YELLOW: battery 20-39 OR rssi between -90 and -76 (when not RED)
 * RED: battery < 20 OR rssi < -90 OR lastSeenAt > 30 minutes ago
 *
 * When rules overlap: RED wins over YELLOW wins over GREEN.
 */

const GREEN_BATTERY_THRESHOLD = 40;
const YELLOW_BATTERY_LOWER = 20;
const GREEN_RSSI_THRESHOLD = -75;
const YELLOW_RSSI_LOWER = -90;
const MAX_SEEN_MINUTES = 30;

/**
 * Classify a beacon's health status using the deterministic rules.
 *
 * @param beacon — The beacon to classify
 * @param nowIso — Current time as ISO 8601 string (injected for determinism)
 * @returns BeaconStatus
 */
export function classifyBeacon(beacon: ReindeerBeacon, nowIso: string): BeaconStatus {
	// Check RED conditions first (highest priority)
	if (beacon.batteryPercent < YELLOW_BATTERY_LOWER) {
		return 'RED';
	}
	if (beacon.rssi < YELLOW_RSSI_LOWER) {
		return 'RED';
	}
	if (isStale(beacon.lastSeenAt, nowIso)) {
		return 'RED';
	}

	// Check YELLOW conditions
	if (
		beacon.batteryPercent >= YELLOW_BATTERY_LOWER &&
		beacon.batteryPercent < GREEN_BATTERY_THRESHOLD
	) {
		return 'YELLOW';
	}
	if (beacon.rssi >= YELLOW_RSSI_LOWER && beacon.rssi < GREEN_RSSI_THRESHOLD) {
		return 'YELLOW';
	}

	// Default: GREEN
	return 'GREEN';
}

/**
 * Check if the beacon's last sighting is older than MAX_SEEN_MINUTES.
 * Pure function — no system time dependency.
 */
export function isStale(lastSeenAt: string, nowIso: string): boolean {
	const lastSeen = new Date(lastSeenAt).getTime();
	const now = new Date(nowIso).getTime();

	if (Number.isNaN(lastSeen) || Number.isNaN(now)) {
		return true; // Invalid dates → treat as stale (safety-first)
	}

	const diffMs = now - lastSeen;
	const diffMinutes = diffMs / (1000 * 60);
	return diffMinutes > MAX_SEEN_MINUTES;
}

// =============================================================================
// Boundary Value Helpers (for test discoverability)
// =============================================================================

/** Battery percentage at the exact GREEN/YELLOW boundary. */
export const BATTERY_GREEN_THRESHOLD = GREEN_BATTERY_THRESHOLD;

/** Battery percentage at the exact YELLOW/RED boundary. */
export const BATTERY_YELLOW_LOWER = YELLOW_BATTERY_LOWER;

/** RSSI at the exact GREEN/YELLOW boundary (dBm). */
export const RSSI_GREEN_THRESHOLD = GREEN_RSSI_THRESHOLD;

/** RSSI at the exact YELLOW/RED boundary (dBm). */
export const RSSI_YELLOW_LOWER = YELLOW_RSSI_LOWER;

/** Maximum minutes a beacon can be unseen before being classified RED. */
export const STALE_MINUTES = MAX_SEEN_MINUTES;

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a valid ReindeerBeacon with all required fields.
 * No defaults — every field must be explicitly provided.
 */
export function createBeacon(
	partial: Partial<ReindeerBeacon> & { id: string; name: string; beaconId: string },
): ReindeerBeacon {
	return {
		zone: partial.zone ?? 'unknown',
		batteryPercent: partial.batteryPercent ?? 100,
		rssi: partial.rssi ?? -40,
		lastSeenAt: partial.lastSeenAt ?? new Date().toISOString(),
		...partial,
	};
}
