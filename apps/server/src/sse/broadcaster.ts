/**
 * SSE Broadcaster — Real-time event streaming for Positron.
 * Supports: event sequences, rate limiting, W3C Last-Event-ID, secret redaction.
 */

import type { Response } from 'express';

const clients = new Map<string, Set<Response>>();
const eventSequences = new Map<string, number>();
const rateLimitBuckets = new Map<string, number[]>();
const MAX_EVENTS_PER_SEC = 20;
const MAX_PAYLOAD_DEPTH = 20;
const MAX_PAYLOAD_LENGTH = 5000;

// Secret patterns to redact from event data
const SECRET_PATTERNS = [
	/ghp_[A-Za-z0-9]{36}/g,
	/gho_[A-Za-z0-9]{36}/g,
	/github_pat_[A-Za-z0-9_]{82}/g,
	/sk-[A-Za-z0-9]{20,}/g,
	/sk-ant-[A-Za-z0-9]{20,}/g,
	/AIza[0-9A-Za-z_-]{35}/g,
	/Bearer\s+[A-Za-z0-9._\-+/=]{20,}/gi,
	/xox[abp]-[A-Za-z0-9]{10,}/g,
	/AKIA[0-9A-Z]{16}/g,
];

function redactValue(value: unknown, depth = 0): unknown {
	if (depth > MAX_PAYLOAD_DEPTH) return '[MAX_DEPTH]';
	if (typeof value === 'string') {
		if (value.length > MAX_PAYLOAD_LENGTH) return '[TRUNCATED]';
		let redacted = value;
		for (const pattern of SECRET_PATTERNS) {
			redacted = redacted.replace(pattern, '***-redacted-***');
		}
		return redacted;
	}
	if (Array.isArray(value)) {
		return value.map((v) => redactValue(v, depth + 1));
	}
	if (value && typeof value === 'object') {
		const result: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
			const lowerKey = key.toLowerCase();
			if (['token', 'secret', 'password', 'key', 'auth'].some((k) => lowerKey.includes(k))) {
				result[key] = '***-redacted-***';
			} else {
				result[key] = redactValue(val, depth + 1);
			}
		}
		return result;
	}
	return value;
}

function checkRateLimit(runId: string): boolean {
	const now = Date.now();
	const window = 1000; // 1 second
	if (!rateLimitBuckets.has(runId)) {
		rateLimitBuckets.set(runId, []);
	}
	const bucket = rateLimitBuckets.get(runId);
	if (!bucket) return false;
	// Remove entries older than 1s
	while (bucket.length > 0 && (bucket[0] ?? 0) < now - window) {
		bucket.shift();
	}
	if (bucket.length >= MAX_EVENTS_PER_SEC) {
		return false; // Rate limited
	}
	bucket.push(now);
	return true;
}

export function resetEventSequence(runId: string): void {
	eventSequences.set(runId, 0);
}

export function primeEventSequence(runId: string, initialSeq?: number): void {
	if (!eventSequences.has(runId)) {
		eventSequences.set(runId, initialSeq ?? 0);
	}
}

export function broadcastSSE(runId: string, event: string, data: object): void {
	const runClients = clients.get(runId);
	if (!runClients || runClients.size === 0) return;

	// Rate limiting (skip heartbeats and rate-limit internal events)
	if (event !== 'heartbeat' && !checkRateLimit(runId)) {
		return; // Silently drop rate-limited events
	}

	// Sequence number
	const seq = (eventSequences.get(runId) ?? 0) + 1;
	eventSequences.set(runId, seq);

	// Deep-clone + redact + add sequence
	const payload = redactValue({
		...data,
		_sequence: seq,
	}) as Record<string, unknown>;

	const ssePayload = `event: ${event}\nid: ${seq}\ndata: ${JSON.stringify(payload)}\n\n`;

	for (const res of runClients) {
		try {
			res.write(ssePayload);
		} catch {
			/* client disconnected */
		}
	}
}

export function addSSEClient(runId: string, res: Response): void {
	if (!clients.has(runId)) clients.set(runId, new Set());
	clients.get(runId)?.add(res);
	res.on('close', () => {
		clients.get(runId)?.delete(res);
		if (clients.get(runId)?.size === 0) clients.delete(runId);
	});
}

export function removeSSEClient(runId: string, res: Response): void {
	clients.get(runId)?.delete(res);
}

/** Get the last sent event ID for W3C Last-Event-ID reconnection support */
export function getLastEventId(runId: string): number {
	return eventSequences.get(runId) ?? 0;
}
