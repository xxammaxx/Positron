#!/usr/bin/env node

/**
 * Positron Doctor — System Health Check
 *
 * Prüft:
 *  - Node.js Version (>= 18)
 *  - npm Version
 *  - .env vorhanden oder Demo-Mode
 *  - Ports frei (3000, 5173)
 *  - Redis optional
 *  - Git verfügbar
 *  - GitHub Token optional
 *  - Safety Defaults
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:net";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

let checksPassed = 0;
let checksFailed = 0;
let warnings = 0;

function check(name, fn) {
	try {
		const result = fn();
		checksPassed++;
		console.log(`  ${GREEN}PASS${RESET} ${name}${result ? ` ${result}` : ""}`);
	} catch (err) {
		checksFailed++;
		console.log(`  ${RED}FAIL${RESET} ${name}`);
		console.log(`      ${err.message}`);
	}
}

function warn(name, msg) {
	warnings++;
	console.log(`  ${YELLOW}WARN${RESET} ${name}: ${msg}`);
}

console.log("\n Positron Doctor — System Health Check");
console.log("=".repeat(50));

// ── Node.js Version ──────────────────────────────────────
check("Node.js >= 18", () => {
	const v = process.versions.node.split(".").map(Number);
	if (v[0] < 18) throw new Error(`Node ${process.version} detected, need >= 18`);
	return `v${process.version}`;
});

// ── npm Version ──────────────────────────────────────────
check("npm installed", () => {
	const v = execSync("npm --version", { encoding: "utf8" }).trim();
	return `v${v}`;
});

// ── .env or Demo Mode ───────────────────────────────────
const envPath = resolve(ROOT, ".env");
const envPresent = existsSync(envPath);

if (envPresent) {
	try {
		const envContent = readFileSync(envPath, "utf8");
		const hasGithubToken = /\bGITHUB_TOKEN\s*=\s*(ghp_|github_pat_)/i.test(envContent);

		console.log(`  ${GREEN}INFO${RESET} .env found at ${envPath}`);
		if (hasGithubToken) {
			console.log(`  ${GREEN}INFO${RESET} GitHub Token configured`);
		} else {
			warn("GitHub Token", "not set — running in Demo/Fake mode (no real GitHub access)");
		}
	} catch {
		warn(".env", "present but unreadable");
	}
} else {
	warn(".env", "not found — using Demo/Fake mode defaults");
	console.log(`  ${YELLOW}INFO${RESET} Copy .env.example to .env for custom config`);
}

// ── Safety Defaults ──────────────────────────────────────
const safetyDefaults = {
	POSITRON_ENABLE_PUSH: process.env.POSITRON_ENABLE_PUSH ?? "false",
	POSITRON_ENABLE_MERGE: process.env.POSITRON_ENABLE_MERGE ?? "false",
	POSITRON_ENABLE_FIX_LOOP: process.env.POSITRON_ENABLE_FIX_LOOP ?? "false",
	POSITRON_MERGE_KILL_SWITCH: process.env.POSITRON_MERGE_KILL_SWITCH ?? "true",
	POSITRON_GITHUB_MODE: process.env.POSITRON_GITHUB_MODE ?? "fake",
};

console.log("\n Safety Defaults:");
for (const [key, val] of Object.entries(safetyDefaults)) {
	const isSafe =
		(key === "POSITRON_MERGE_KILL_SWITCH" && val === "true") ||
		((key === "POSITRON_ENABLE_PUSH" || key === "POSITRON_ENABLE_MERGE" || key === "POSITRON_ENABLE_FIX_LOOP") && val === "false") ||
		(key === "POSITRON_GITHUB_MODE" && val === "fake");

	console.log(`  ${isSafe ? GREEN + "SAFE" : RED + "UNSAFE"}${RESET} ${key}=${val}`);
}

if (safetyDefaults.POSITRON_ENABLE_PUSH === "true") {
	warn("Safety", "POSITRON_ENABLE_PUSH=true — echte Git-Pushes sind aktiviert");
}
if (safetyDefaults.POSITRON_ENABLE_MERGE === "true") {
	warn("Safety", "POSITRON_ENABLE_MERGE=true — echte Merges sind aktiviert");
}

// ── Ports ────────────────────────────────────────────────
function checkPort(port) {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.once("error", (err) => {
			if (err.code === "EADDRINUSE") {
				reject(new Error(`Port ${port} ist belegt`));
			} else {
				reject(err);
			}
		});
		server.once("listening", () => {
			server.close();
			resolve();
		});
		server.listen(port, "127.0.0.1");
	});
}

await Promise.all([
	checkPort(3000)
		.then(() => check("Port 3000 (Server)", () => "frei"))
		.catch((err) => {
			checksFailed++;
			console.log(`  ${RED}FAIL${RESET} Port 3000 (Server)`);
			console.log(`      ${err.message}`);
		}),
	checkPort(5173)
		.then(() => check("Port 5173 (Frontend)", () => "frei"))
		.catch((err) => {
			checksFailed++;
			console.log(`  ${RED}FAIL${RESET} Port 5173 (Frontend)`);
			console.log(`      ${err.message}`);
		}),
]);

// ── Git ──────────────────────────────────────────────────
check("Git verfügbar", () => {
	try {
		const v = execSync("git --version", { encoding: "utf8" }).trim();
		return v;
	} catch {
		throw new Error("git nicht im PATH gefunden");
	}
});

try {
	const branch = execSync("git branch --show-current", { encoding: "utf8", cwd: ROOT }).trim();
	console.log(`  ${GREEN}INFO${RESET} Current branch: ${branch}`);
} catch {
	warn("Git", "Could not determine current branch");
}

// ── Redis (optional) ────────────────────────────────────
check("Redis (optional)", () => {
	const redisUrl = process.env.POSITRON_REDIS_URL ?? "redis://localhost:6379";
	try {
		execSync(`node -e "
			const net = require('net');
			const client = net.createConnection({ host: 'localhost', port: 6379 });
			client.setTimeout(2000);
			client.on('connect', () => { client.end(); process.exit(0); });
			client.on('error', () => process.exit(1));
			client.on('timeout', () => process.exit(1));
		"`, { timeout: 3000 });
		return `Redis erreichbar (${redisUrl})`;
	} catch {
		console.log(`  ${YELLOW}INFO${RESET} Redis nicht erreichbar — Worker läuft inline (Dev-Mode)`);
		return "nicht erreichbar (inline fallback aktiv)";
	}
});

// ── Summary ──────────────────────────────────────────────
console.log(`\n${"=".repeat(50)}`);
console.log(` Result: ${checksPassed} passed, ${checksFailed} failed, ${warnings} warnings`);

if (checksFailed === 0) {
	console.log(`\n${GREEN} System ready! Start with:${RESET}`);
	console.log(`  Demo Mode:   ${GREEN}npm run dev:demo${RESET}`);
	console.log(`  Full Stack:  ${GREEN}docker compose up --build${RESET}`);
	console.log(`  Verify:      ${GREEN}npm run verify${RESET}`);
} else {
	console.log(`\n${RED} ${checksFailed} issue(s) found. Fix before starting.${RESET}`);
}

process.exit(checksFailed > 0 ? 1 : 0);
