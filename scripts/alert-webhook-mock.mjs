#!/usr/bin/env node
/**
 * Positron Alert Webhook Receiver Mock (QA-017)
 *
 * Minimal local webhook receiver for Alertmanager E2E validation.
 * Stores alerts in memory only — never sends to real services.
 *
 * Port:    5001 (configurable via PORT env var)
 * Alertmanager expects: POST /alertmanager/critical, POST /alertmanager/warning
 *
 * Usage:
 *   node scripts/alert-webhook-mock.mjs
 *   PORT=5001 node scripts/alert-webhook-mock.mjs
 *
 * Endpoints:
 *   GET  /health                     — health check (returns {status, uptime, alertCount})
 *   GET  /alerts                     — list all received alerts
 *   GET  /alerts/critical            — list critical alerts only
 *   GET  /alerts/warning             — list warning alerts only
 *   POST /alertmanager/critical      — receive critical alert webhook from Alertmanager
 *   POST /alertmanager/warning       — receive warning alert webhook from Alertmanager
 *
 * Exit: Ctrl+C (SIGINT) or SIGTERM — clean shutdown
 *
 * No secrets. No external calls. No real webhooks.
 */

import http from "node:http";

// ── Configuration ──────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "5001", 10);
const HOST = process.env.HOST ?? "0.0.0.0";
const startedAt = new Date().toISOString();

// ── In-Memory Alert Store ─────────────────────────────────────────────────
/** @typedef {{ timestamp: string, route: string, severity: string, data: object }} StoredAlert */
/** @type {StoredAlert[]} */
const alertStore = [];

// Track counts and resolved alerts separately
let criticalCount = 0;
let warningCount = 0;
let resolvedCount = 0;

// ── Helpers ────────────────────────────────────────────────────────────────

/** Read and parse JSON body from request */
function readBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on("data", (chunk) => chunks.push(chunk));
		req.on("end", () => {
			try {
				const raw = Buffer.concat(chunks).toString("utf-8");
				resolve(raw ? JSON.parse(raw) : null);
			} catch (err) {
				reject(err);
			}
		});
		req.on("error", reject);
	});
}

/** Send JSON response */
function sendJson(res, statusCode, data) {
	const body = JSON.stringify(data, null, 2);
	res.writeHead(statusCode, {
		"Content-Type": "application/json",
		"Access-Control-Allow-Origin": "*",
	});
	res.end(body + "\n");
}

/** Structured log with timestamp */
function log(level, message, details = "") {
	const ts = new Date().toISOString();
	const prefix = level === "ERROR" ? "❌" : level === "WARN" ? "⚠️" : "📨";
	const detailsStr = details ? ` — ${details}` : "";
	console.log(`[${ts}] ${prefix} [${level}] ${message}${detailsStr}`);
}

/**
 * Extract alert info from Alertmanager webhook payload.
 * Alertmanager sends: { version, groupKey, status, receiver, groupLabels,
 *   commonLabels, commonAnnotations, externalURL, alerts: [...] }
 */
function extractAlertInfo(payload, route) {
	if (!payload || !payload.alerts || !Array.isArray(payload.alerts)) {
		return { alertCount: 0, summaries: [] };
	}

	const summaries = payload.alerts.map((a) => {
		const labels = a.labels ?? {};
		const annotations = a.annotations ?? {};
		const alertname = labels.alertname ?? "unknown";
		const status = a.status ?? "unknown"; // "firing" or "resolved"
		return {
			alertname,
			severity: labels.severity ?? route,
			status,
			summary: annotations.summary ?? "",
			runbook_url: annotations.runbook_url ?? "",
			startsAt: a.startsAt ?? "",
			endsAt: a.endsAt ?? "",
		};
	});

	return {
		alertCount: summaries.length,
		summaries,
		groupKey: payload.groupKey ?? "",
		status: payload.status ?? "",
	};
}

// ── HTTP Server ────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
	const { method, url } = req;

	// ── CORS preflight ────────────────────────────────────────────────────
	if (method === "OPTIONS") {
		res.writeHead(204, {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		});
		res.end();
		return;
	}

	// ── Health check ──────────────────────────────────────────────────────
	if (method === "GET" && url === "/health") {
		sendJson(res, 200, {
			status: "ok",
			service: "positron-alert-webhook-mock",
			uptime: `${Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)}s`,
			totalAlerts: alertStore.length,
			criticalAlerts: criticalCount,
			warningAlerts: warningCount,
			resolvedAlerts: resolvedCount,
			startedAt,
		});
		return;
	}

	// ── List all alerts ───────────────────────────────────────────────────
	if (method === "GET" && url === "/alerts") {
		sendJson(res, 200, {
			total: alertStore.length,
			criticalCount,
			warningCount,
			resolvedCount,
			alerts: alertStore.slice(0, 100), // Limit to last 100
		});
		return;
	}

	// ── List critical alerts ──────────────────────────────────────────────
	if (method === "GET" && url === "/alerts/critical") {
		const critical = alertStore.filter((a) => a.severity === "critical");
		sendJson(res, 200, {
			count: critical.length,
			alerts: critical.slice(0, 100),
		});
		return;
	}

	// ── List warning alerts ───────────────────────────────────────────────
	if (method === "GET" && url === "/alerts/warning") {
		const warnings = alertStore.filter((a) => a.severity === "warning");
		sendJson(res, 200, {
			count: warnings.length,
			alerts: warnings.slice(0, 100),
		});
		return;
	}

	// ── Receive CRITICAL alert webhook ────────────────────────────────────
	if (method === "POST" && url === "/alertmanager/critical") {
		try {
			const payload = await readBody(req);
			const info = extractAlertInfo(payload, "critical");

			for (const alert of info.summaries) {
				const isResolved = alert.status === "resolved";
				alertStore.unshift({
					timestamp: new Date().toISOString(),
					route: "critical",
					severity: "critical",
					data: alert,
				});
				if (isResolved) resolvedCount++;
				else criticalCount++;
			}

			log(
				"INFO",
				`Critical webhook received: ${info.alertCount} alert(s)`,
				info.summaries.map((a) => `${a.alertname}[${a.status}]`).join(", "),
			);

			sendJson(res, 200, {
				received: true,
				route: "critical",
				alertCount: info.alertCount,
				status: info.status,
				alerts: info.summaries,
			});
		} catch (err) {
			log("ERROR", "Failed to parse critical webhook", err.message);
			sendJson(res, 400, { error: "Invalid json body", detail: err.message });
		}
		return;
	}

	// ── Receive WARNING alert webhook ─────────────────────────────────────
	if (method === "POST" && url === "/alertmanager/warning") {
		try {
			const payload = await readBody(req);
			const info = extractAlertInfo(payload, "warning");

			for (const alert of info.summaries) {
				const isResolved = alert.status === "resolved";
				alertStore.unshift({
					timestamp: new Date().toISOString(),
					route: "warning",
					severity: "warning",
					data: alert,
				});
				if (isResolved) resolvedCount++;
				else warningCount++;
			}

			log(
				"INFO",
				`Warning webhook received: ${info.alertCount} alert(s)`,
				info.summaries.map((a) => `${a.alertname}[${a.status}]`).join(", "),
			);

			sendJson(res, 200, {
				received: true,
				route: "warning",
				alertCount: info.alertCount,
				status: info.status,
				alerts: info.summaries,
			});
		} catch (err) {
			log("ERROR", "Failed to parse warning webhook", err.message);
			sendJson(res, 400, { error: "Invalid json body", detail: err.message });
		}
		return;
	}

	// ── 404 ────────────────────────────────────────────────────────────────
	sendJson(res, 404, { error: "Not found", path: url });
});

// ── Start ──────────────────────────────────────────────────────────────────

server.listen(PORT, HOST, () => {
	console.log("=".repeat(55));
	console.log(" Positron Alert Webhook Receiver Mock (QA-017)");
	console.log("=".repeat(55));
	console.log(` Listening: http://${HOST}:${PORT}`);
	console.log(` Health:    http://localhost:${PORT}/health`);
	console.log(` Alerts:   http://localhost:${PORT}/alerts`);
	console.log(` Critical: POST http://localhost:${PORT}/alertmanager/critical`);
	console.log(` Warning:  POST http://localhost:${PORT}/alertmanager/warning`);
	console.log("");
	console.log(" No secrets. No external calls. No real webhooks.");
	console.log(" Press Ctrl+C to stop.");
	console.log("=".repeat(55));
});

// ── Graceful Shutdown ──────────────────────────────────────────────────────
function shutdown(signal) {
	log(
		"INFO",
		`${signal} received — shutting down`,
		`total alerts: ${alertStore.length}`,
	);
	server.close(() => {
		console.log(`[${new Date().toISOString()}] ✅ Server stopped. Exit code 0`);
		process.exit(0);
	});
	// Force close after 5s
	setTimeout(() => {
		console.error("Force shutdown after timeout");
		process.exit(0);
	}, 5000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
