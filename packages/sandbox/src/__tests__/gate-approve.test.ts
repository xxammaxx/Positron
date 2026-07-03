// Positron — GATE_APPROVE Integration Tests
//
// Verify that the Stop/Ask Policy is properly integrated with the
// GATE_APPROVE runtime hook in the state machine pipeline.
//
// Issue #215: Safety: Integrate Stop/Ask Policy via GATE_APPROVE runtime hook

import { describe, expect, it } from 'vitest';

// Tests will import from the module once implemented
// import { gateApproveAction, GateApproveResult } from '../gate-approve.js';

// ─── Test 1: Harmless read/test commands pass through ────────────────────────

describe('GATE_APPROVE Integration — ALLOW path', () => {
	it('harmless read command is allowed', async () => {
		// Dynamically import after implementation exists
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'read package.json',
			command: 'cat package.json',
		});

		expect(result.allowed).toBe(true);
		expect(result.decision).toBe('ALLOW');
		expect(result.humanApprovalRequired).toBe(false);
		expect(result.nextPhase).toBeTruthy();
		expect(result.events).toBeInstanceOf(Array);
		// An ALLOW should produce at least one GATE event for audit
		expect(result.events.length).toBeGreaterThan(0);
		const gateEvent = result.events.find((e: { level: string }) => e.level === 'GATE');
		expect(gateEvent).toBeTruthy();
		expect(gateEvent!.message).toMatch(/allowed/i);
	});

	it('npm test command is allowed', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'run tests',
			command: 'npm test',
		});

		expect(result.allowed).toBe(true);
		expect(result.decision).toBe('ALLOW');
		expect(result.humanApprovalRequired).toBe(false);
	});

	it('git commit is allowed', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'git commit -m "fix: bug"',
			command: 'git commit -m "fix: bug"',
		});

		expect(result.allowed).toBe(true);
		expect(result.decision).toBe('ALLOW');
	});

	it('npm run build is allowed', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'build project',
			command: 'npm run build',
		});

		expect(result.allowed).toBe(true);
		expect(result.decision).toBe('ALLOW');
	});
});

// ─── Test 2: rm -rf is blocked ──────────────────────────────────────────────

describe('GATE_APPROVE Integration — DENY path', () => {
	it('rm -rf is blocked in GATE_APPROVE', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'rm -rf /workspace/temp',
			command: 'rm -rf /workspace/temp',
			destructive: true,
		});

		expect(result.allowed).toBe(false);
		expect(result.decision).toBe('DENY');
		expect(result.humanApprovalRequired).toBe(true);

		// Must produce a SAFETY_BLOCK event
		const blockEvent = result.events.find(
			(e: { level: string }) => e.level === 'ERROR' || e.level === 'GATE',
		);
		expect(blockEvent).toBeTruthy();
		expect(blockEvent!.message).toMatch(/denied|blocked|recursive|data loss/i);
	});

	it('DROP TABLE is blocked', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'DROP TABLE users',
			command: 'DROP TABLE users;',
			destructive: true,
		});

		expect(result.allowed).toBe(false);
		expect(result.decision).toBe('DENY');
		expect(result.humanApprovalRequired).toBe(true);
	});

	it('secret access is blocked via touchesSecrets flag', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'read config',
			touchesSecrets: true,
		});

		expect(result.allowed).toBe(false);
		expect(result.decision).toBe('DENY');
	});

	it('outside workspace action is blocked', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'cleanup',
			outsideWorkspace: true,
		});

		expect(result.allowed).toBe(false);
		expect(result.decision).toBe('DENY');
	});
});

// ─── Test 3: force push is not automatically allowed ────────────────────────

describe('GATE_APPROVE Integration — force push gated', () => {
	it('git push --force is not allowed', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'git push --force origin main',
			command: 'git push --force origin main',
		});

		expect(result.allowed).toBe(false);
		expect(result.decision).not.toBe('ALLOW');
		expect(result.humanApprovalRequired).toBe(true);
	});

	it('push to main is blocked', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'push to main branch',
			command: 'git push origin main',
		});

		expect(result.allowed).toBe(false);
		expect(result.decision).not.toBe('ALLOW');
	});

	it('git push -f is blocked', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'git push -f origin main',
			command: 'git push -f origin main',
		});

		expect(result.allowed).toBe(false);
		expect(result.decision).not.toBe('ALLOW');
	});
});

// ─── Test 4: merge requires human approval or review ────────────────────────

describe('GATE_APPROVE Integration — merge gated', () => {
	it('merge to main requires human approval', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'git merge feature into main',
			command: 'git merge feature/xyz',
		});

		expect(result.allowed).toBe(false);
		expect(result.humanApprovalRequired).toBe(true);
	});

	it('feature branch merge requires review evidence', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'merge feature/xyz into develop',
			command: 'git merge feature/xyz',
		});

		// Feature-to-feature merge: not ALLOW, requires evidence
		expect(result.allowed).toBe(false);
		expect(result.requiredEvidence).toBeInstanceOf(Array);
		expect(result.requiredEvidence.length).toBeGreaterThan(0);
	});
});

// ─── Test 5: secret access is never allowed ─────────────────────────────────

describe('GATE_APPROVE Integration — secret access gated', () => {
	it('explicit secret access action is blocked', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'secret access to GITHUB_TOKEN',
			touchesSecrets: true,
		});

		expect(result.allowed).toBe(false);
		expect(result.decision).toBe('DENY');
	});

	it('credential access is blocked', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'credential access to AWS keys',
			touchesSecrets: true,
		});

		expect(result.allowed).toBe(false);
	});
});

// ─── Test 6: outside workspace cleanup is blocked ────────────────────────────

describe('GATE_APPROVE Integration — outside workspace gated', () => {
	it('cleanup outside workspace is blocked', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'cleanup /tmp/build-artifacts',
			outsideWorkspace: true,
		});

		expect(result.allowed).toBe(false);
	});

	it('write outside workspace is blocked', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'write config to /etc/positron',
			outsideWorkspace: true,
		});

		expect(result.allowed).toBe(false);
	});
});

// ─── Test 7: decisions generate events/evidence ─────────────────────────────

describe('GATE_APPROVE Integration — events and evidence', () => {
	it('ALLOW decision produces a GATE event with audit info', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'read file',
			command: 'cat src/index.ts',
		});

		expect(result.events.length).toBeGreaterThan(0);
		expect(result.events[0]!.level).toBe('GATE');
		expect(result.events[0]!.phase).toBe('GATE_APPROVE');
		expect(result.events[0]!.message).toBeTruthy();
	});

	it('DENY decision produces an ERROR event with reason', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'rm -rf /tmp',
			command: 'rm -rf /tmp',
		});

		const errorEvent = result.events.find((e: { level: string }) => e.level === 'ERROR');
		expect(errorEvent).toBeTruthy();
		expect(errorEvent!.phase).toBe('GATE_APPROVE');
		expect(errorEvent!.message.length).toBeGreaterThan(0);
	});

	it('ASK_HUMAN decision produces a HUMAN-level event', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'major version upgrade',
			command: 'npm install react@19',
		});

		const humanEvent = result.events.find((e: { level: string }) => e.level === 'HUMAN');
		expect(humanEvent).toBeTruthy();
	});

	it('event payload contains decision metadata', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'git push --force',
			command: 'git push --force',
		});

		const errorEvent = result.events.find((e: { level: string }) => e.level === 'ERROR');
		expect(errorEvent).toBeTruthy();
		expect(errorEvent!.payload).toBeTruthy();
		expect(errorEvent!.payload!.decision).toBeTruthy();
		expect(errorEvent!.payload!.risk).toBeTruthy();
		expect(errorEvent!.payload!.category).toBeTruthy();
	});

	it('result includes requiredEvidence array', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'database migration',
			command: 'npx prisma migrate deploy',
		});

		expect(result.requiredEvidence).toBeInstanceOf(Array);
		expect(result.requiredEvidence.length).toBeGreaterThan(0);
	});
});

// ─── Test 8: human approval is not replaced by model decision ───────────────

describe('GATE_APPROVE Integration — human approval preserved', () => {
	it('DENY decision does not auto-approve', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'rm -rf /tmp',
		});

		expect(result.humanApprovalRequired).toBe(true);
		expect(result.allowed).toBe(false);
	});

	it('ASK_HUMAN decision does not proceed without human', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'external deployment',
		});

		expect(result.humanApprovalRequired).toBe(true);
		expect(result.allowed).toBe(false);
	});

	it('humanApprovalRequired is always a boolean', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const actions = ['read file', 'rm -rf /tmp', 'merge feature', 'npm install x'];
		for (const action of actions) {
			const result = gateApproveAction({ action });
			expect(typeof result.humanApprovalRequired).toBe('boolean');
		}
	});

	it('non-ALLOW decisions always set allowed=false', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const riskyActions = [
			{ action: 'rm -rf /tmp' },
			{ action: 'git push --force' },
			{ action: 'DROP TABLE users' },
			{ action: 'external deployment' },
			{ action: 'database migration' },
		];

		for (const input of riskyActions) {
			const result = gateApproveAction(input);
			if (result.decision !== 'ALLOW') {
				expect(result.allowed).toBe(false);
			}
		}
	});
});

// ─── Test 9: #205 is not referenced or modified ─────────────────────────────

describe('GATE_APPROVE Integration — #205 isolation', () => {
	it('does not reference issue #205 in any event message', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const actions = ['read file', 'rm -rf /tmp', 'merge feature'];
		for (const action of actions) {
			const result = gateApproveAction({ action });
			for (const event of result.events) {
				expect(event.message).not.toMatch(/205/);
				if (event.payload) {
					expect(JSON.stringify(event.payload)).not.toMatch(/205/);
				}
			}
		}
	});

	it('does not reference SDD or Fleet engineering in decisions', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({ action: 'read file' });
		expect(result.reason).not.toMatch(/SDD|Fleet|Kontext-Engineering/i);
	});
});

// ─── Test 10: existing Stop/Ask unit tests remain green ─────────────────────
// This is verified separately by running the stop-ask-policy test suite.
// This test confirms the integration module delegates to the Stop/Ask policy.

describe('GATE_APPROVE Integration — Stop/Ask delegation', () => {
	it('uses Stop/Ask policy for evaluation (not reimplementing)', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		// Same inputs should produce same decisions as evaluateStopAsk
		const readResult = gateApproveAction({ action: 'read package.json' });
		expect(readResult.decision).toBe('ALLOW');

		const rmResult = gateApproveAction({ action: 'rm -rf /tmp' });
		expect(rmResult.decision).toBe('DENY');

		const installResult = gateApproveAction({ action: 'npm install lodash' });
		expect(installResult.decision).toBe('REQUIRE_REVIEW');
	});

	it('repoRisk affects decision', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const prodResult = gateApproveAction({
			action: 'read config',
			repoRisk: 'PRODUCTION',
		});

		expect(prodResult.allowed).toBe(false);
		expect(prodResult.humanApprovalRequired).toBe(true);
	});

	it('externalMutation flag gates properly', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({
			action: 'update remote config',
			externalMutation: true,
		});

		expect(result.allowed).toBe(false);
		expect(result.decision).toBe('ASK_HUMAN');
	});
});

// ─── Structural Tests ───────────────────────────────────────────────────────

describe('GATE_APPROVE Integration — structural integrity', () => {
	it('result has all required fields', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const result = gateApproveAction({ action: 'read file' });

		expect(result).toHaveProperty('allowed');
		expect(result).toHaveProperty('decision');
		expect(result).toHaveProperty('risk');
		expect(result).toHaveProperty('reason');
		expect(result).toHaveProperty('category');
		expect(result).toHaveProperty('humanApprovalRequired');
		expect(result).toHaveProperty('requiredEvidence');
		expect(result).toHaveProperty('nextPhase');
		expect(result).toHaveProperty('events');

		expect(typeof result.allowed).toBe('boolean');
		expect(typeof result.decision).toBe('string');
		expect(typeof result.risk).toBe('string');
		expect(typeof result.reason).toBe('string');
		expect(typeof result.category).toBe('string');
		expect(typeof result.humanApprovalRequired).toBe('boolean');
		expect(Array.isArray(result.requiredEvidence)).toBe(true);
		expect(typeof result.nextPhase).toBe('string');
		expect(Array.isArray(result.events)).toBe(true);
	});

	it('decision is always a valid StopAskDecision', async () => {
		const { gateApproveAction } = await import('../gate-approve.js');

		const validDecisions = [
			'ALLOW',
			'DENY',
			'ASK_HUMAN',
			'REQUIRE_DRY_RUN',
			'REQUIRE_BACKUP',
			'REQUIRE_REVIEW',
		];

		const actions = [
			'read file',
			'rm -rf /tmp',
			'merge feature',
			'database migration',
			'npm install x',
			'external deployment',
		];

		for (const action of actions) {
			const result = gateApproveAction({ action });
			expect(validDecisions).toContain(result.decision);
		}
	});
});
