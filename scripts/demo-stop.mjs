/**
 * Positron Demo Stop — demo-stop.mjs
 *
 * Kills processes occupying the demo ports (3000, 5173).
 * Cross-platform: Windows (netstat + taskkill) and Unix (lsof/fuser + kill).
 */

import { execSync } from 'node:child_process';
import { platform } from 'node:process';

const PORTS = [3000, 5173];

function killPortWin32(port) {
	try {
		const result = execSync(`netstat -ano | findstr :${port}`, { stdio: 'pipe', encoding: 'utf8' });
		const lines = result.trim().split('\n');
		const pids = new Set();
		for (const line of lines) {
			const parts = line.trim().split(/\s+/);
			const pid = parts[parts.length - 1];
			if (pid && /^\d+$/.test(pid)) pids.add(pid);
		}
		for (const pid of pids) {
			try {
				execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
				console.log(`[demo:stop] Killed PID ${pid} on port ${port}`);
			} catch {
				// Process might already be gone
			}
		}
	} catch {
		console.log(`[demo:stop] No process found on port ${port}`);
	}
}

function killPortUnix(port) {
	try {
		execSync(
			`lsof -ti :${port} | xargs kill -9 2>/dev/null || fuser -k ${port}/tcp 2>/dev/null || true`,
			{ stdio: 'pipe' },
		);
		console.log(`[demo:stop] Freed port ${port}`);
	} catch {
		console.log(`[demo:stop] No process found on port ${port}`);
	}
}

console.log('[demo:stop] Stopping demo processes...');

for (const port of PORTS) {
	if (platform === 'win32') {
		killPortWin32(port);
	} else {
		killPortUnix(port);
	}
}

console.log('[demo:stop] Done.');
