/**
 * E2E Console & Network Evidence Capture — Layer 4 (Issue #170)
 *
 * Captures browser console messages and network requests during E2E tests.
 * All output is REDACTED — no secrets, tokens, or sensitive data.
 *
 * Usage:
 *   import { startConsoleCapture, startNetworkCapture, getEvidenceLogs } from "../support/console-network.js";
 *
 *   const stopConsole = await startConsoleCapture(page);
 *   const stopNetwork = await startNetworkCapture(page);
 *   // ... run tests ...
 *   const evidence = await getEvidenceLogs(stopConsole, stopNetwork);
 */

import type { Page, ConsoleMessage, Request } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

interface ConsoleEntry {
	type: string;
	text: string;
	timestamp: string;
}

interface NetworkEntry {
	url: string;
	method: string;
	status: number;
	duration: number;
	timestamp: string;
}

interface EvidenceLogs {
	console: ConsoleEntry[];
	network: NetworkEntry[];
	consoleErrors: number;
	networkErrors: number;
}

/** Patterns to redact from console/network output */
const REDACT_PATTERNS = [
	/token[=:]\s*\S+/gi,
	/ghp_\w{36}/gi,
	/sk-[a-zA-Z0-9]{32,}/gi,
	/Authorization:\s*\S+/gi,
	/x-api-key[=:]\s*\S+/gi,
];

function redact(text: string): string {
	let result = text;
	for (const pattern of REDACT_PATTERNS) {
		result = result.replace(pattern, "[REDACTED]");
	}
	return result;
}

/**
 * Start capturing browser console messages.
 * Returns a stop function that returns captured entries.
 */
export async function startConsoleCapture(
	page: Page,
): Promise<() => ConsoleEntry[]> {
	const entries: ConsoleEntry[] = [];

	const handler = (msg: ConsoleMessage) => {
		entries.push({
			type: msg.type(),
			text: redact(msg.text()),
			timestamp: new Date().toISOString(),
		});
	};

	page.on("console", handler);

	return () => {
		page.off("console", handler);
		return entries;
	};
}

/**
 * Start capturing network requests and responses.
 * Returns a stop function that returns captured entries.
 */
export async function startNetworkCapture(
	page: Page,
): Promise<() => NetworkEntry[]> {
	const entries: NetworkEntry[] = [];
	const pending = new Map<string, number>();

	const requestHandler = (req: Request) => {
		pending.set(req.url(), Date.now());
	};

	const responseHandler = (res: { url: () => string; status: () => number }) => {
		const startTime = pending.get(res.url());
		const duration = startTime ? Date.now() - startTime : 0;
		pending.delete(res.url());

		entries.push({
			url: redact(res.url()),
			method: "GET", // Playwright response doesn't expose method; captured as GET
			status: res.status(),
			duration,
			timestamp: new Date().toISOString(),
		});
	};

	page.on("request", requestHandler);
	page.on("response", responseHandler);

	return () => {
		page.off("request", requestHandler);
		page.off("response", responseHandler);
		return entries;
	};
}

/**
 * Collect all evidence logs and write to disk.
 * Returns the evidence log object and file paths.
 */
export async function getEvidenceLogs(
	consoleCapture: ConsoleEntry[],
	networkCapture: NetworkEntry[],
	outputDir?: string,
): Promise<{ logs: EvidenceLogs; manifestPath: string }> {
	const dir =
		outputDir ??
		path.resolve(process.cwd(), "test-results", "evidence");

	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	const consoleErrors = consoleCapture.filter(
		(e) => e.type === "error",
	).length;
	const networkErrors = networkCapture.filter(
		(e) => e.status >= 400,
	).length;

	const logs: EvidenceLogs = {
		console: consoleCapture,
		network: networkCapture,
		consoleErrors,
		networkErrors,
	};

	const manifestPath = path.join(dir, "evidence-log.json");
	fs.writeFileSync(manifestPath, JSON.stringify(logs, null, 2));

	return { logs, manifestPath };
}
