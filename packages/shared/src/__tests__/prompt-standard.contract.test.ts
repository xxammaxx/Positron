import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Red Test: Positron Prompt Standard Validation
 *
 * This test validates that the canonical prompt standard
 * (`docs/prompts/positron-prompt-standard.md`) contains ALL mandatory sections.
 * Any missing PFLICHT section causes a FAIL — preventing prompts
 * from being generated without the full mandatory structure.
 *
 * Contract:
 * - The prompt standard file MUST exist
 * - The prompt standard MUST contain the workflow chain
 * - The prompt standard MUST contain all 14 PFLICHT sections
 * - The prompt standard MUST NOT contain Auto-Merge or force push authorizations
 */

const PROMPT_STANDARD_PATH = resolve(
	__dirname,
	'../../../../docs/prompts/positron-prompt-standard.md',
);

/**
 * PFLICHT sections that MUST appear in every Positron agent prompt.
 * Each entry is [sectionName, requiredSubstring] — the test verifies
 * that the canonical prompt standard contains each section heading
 * AND the associated required content.
 */
const MANDATORY_SECTIONS: [string, string][] = [
	// 1. Target runtime / agent role
	['Ziel-Agent / Runtime', 'OpenCode'],

	// 2. OS/Shell preflight detection
	['Betriebssystem-/Shell-Erkundung', 'Preflight'],

	// 3. Conservative permissions / operating mode
	['OpenCode-Betriebsmodus / Permissions', 'Plan/Analysis'],

	// 4. Context window recommendation
	['Kontextfenster-Empfehlung', 'Context'],

	// 5. Preflight scan requirement
	['Preflight-Scan', 'branch'],

	// 6. Cold/Warm/Hot context definition
	['Cold/Warm/Hot Context', 'Cold Context'],

	// 7. Source of truth (GitHub Issues)
	['Source of Truth', 'GitHub Issues'],

	// 8. Hard constraints / prohibitions
	['Hard Constraints', 'prohibitions'],

	// 9. Tool discovery instead of tool dump
	['Tool-Discovery', 'runtime environment'],

	// 10. Verification Contract pattern
	['Verification Contract', 'PASS/FAIL'],

	// 11. Red Tests requirement
	['Red Tests', 'MUST fail'],

	// 12. Security gates reference
	['Security Gates', 'Secret scanning'],

	// 13. Evidence portfolio requirement
	['Evidence Portfolio', 'current-capabilities'],

	// 14. GitHub repository polish
	['GitHub Repository Pflege', 'README'],

	// 15. Next-step handoff
	['Next-Step-Handoff', 'Summary verdict'],

	// 16. "Was kann die Software jetzt" mandatory reflection
	// Note: heading may include quotes and trailing comparison text
	['Was kann die Software jetzt', 'New Capabilities'],
];

const WORKFLOW_CHAIN =
	'Issue → Spec → Verification Contract → Red Tests → Agent-Code → CI/Security Gates → Sandbox Preview → Reviewer-Agent → Human Approval → Evidence-Kommentar → Merge';

const PROHIBITED_PATTERNS = [
	// Auto-Merge must not be enabled
	/Auto-Merge\s*(aktivieren|enabled|activate)/i,
	// Force push must not be allowed
	/Force[- ]?Push\s*(erlaubt|allowed|enabled|aktivieren)/i,
	// Destructive delete without explicit Human Approval
	/destruktiv.*löschen\s*ohne\s*.*[Ff]reigabe/i,
];

describe('Positron Prompt Standard (Red Tests)', () => {
	it('prompt standard file exists', () => {
		expect(existsSync(PROMPT_STANDARD_PATH)).toBe(true);
	});

	let content: string;

	it('can read prompt standard file', () => {
		content = readFileSync(PROMPT_STANDARD_PATH, 'utf-8');
		expect(content.length).toBeGreaterThan(500);
	});

	it('contains the full workflow chain', () => {
		expect(content).toContain(WORKFLOW_CHAIN);
	});

	it('OpenCode is named as target runtime', () => {
		// The prompt standard must mention OpenCode as the runtime
		expect(content).toMatch(/OpenCode.*Runtime|Runtime.*OpenCode|Ziel-Agent.*Runtime/i);
	});

	it('Plan-Agent is required before Build-Agent', () => {
		expect(content).toMatch(
			/Plan.*Agent.*vor.*Build.*Agent|Plan.*before.*Build|Plan\/Analysis.*mode/i,
		);
	});

	// Test every mandatory section
	for (const [sectionName, requiredSubstring] of MANDATORY_SECTIONS) {
		it(`PFLICHT section "${sectionName}" is present and contains "${requiredSubstring}"`, () => {
			// Extract the section content by finding the heading
			// The heading may include quotes or parenthetical clarifications
			const sectionHeadingPattern = new RegExp(
				`##\\s+PFLICHT:\\s*"?${escapeRegex(sectionName)}[^\\n]*`,
				'i',
			);
			expect(content).toMatch(sectionHeadingPattern);

			// Find the section content (from heading to next ## or end)
			const sectionStart = content.search(sectionHeadingPattern);
			expect(sectionStart).not.toBe(-1);

			const afterSection = content.slice(sectionStart);
			const nextHeading = afterSection.slice(4).search(/^##\s/m); // skip the heading itself
			const sectionContent =
				nextHeading === -1 ? afterSection : afterSection.slice(0, nextHeading + 4);

			expect(sectionContent.toLowerCase()).toContain(requiredSubstring.toLowerCase());
		});
	}

	it('does NOT allow Auto-Merge without Human Approval', () => {
		for (const pattern of PROHIBITED_PATTERNS) {
			expect(content).not.toMatch(pattern);
		}
	});

	it('contains the mandatory reflection section "Was kann die Software jetzt"', () => {
		expect(content).toMatch(/Was kann die Software jetzt.*Vergleich/i);
		// Must contain New Capabilities, Removed Blockers, Unchanged Limitations, Remaining Risks, Next Step
		expect(content).toMatch(/New Capabilities|Neue F.higkeiten/i);
		expect(content).toMatch(/Removed Blockers|Entfernte Blocker/i);
		expect(content).toMatch(/Unchanged Limitations|Unver.nderte Einschr.nkungen/i);
		expect(content).toMatch(/Remaining Risks|Verbleibende Risiken/i);
		expect(content).toMatch(/Next Step|N.chster.*Schritt/i);
	});

	it('counts exactly the expected number of PFLICHT sections', () => {
		const pflichtMatches = content.match(/##\s+PFLICHT:/gi);
		expect(pflichtMatches).not.toBeNull();
		// There should be exactly 16 PFLICHT sections
		expect(pflichtMatches!.length).toBe(MANDATORY_SECTIONS.length);
	});

	it('Security Gates section references secret scanning', () => {
		// The security gates section must exist and reference secret scanning and tool gateway
		const securitySection = content.match(
			/##\s+PFLICHT:\s*Security Gates([\s\S]*?)(?=##\s+PFLICHT:|$)/i,
		);
		expect(securitySection).not.toBeNull();
		expect(securitySection![1]).toMatch(/secret|Secret/);
		expect(securitySection![1]).toMatch(/gate|Gate|Tool Gateway/i);
	});

	it('Evidence Portfolio section references the correct files', () => {
		const evidenceSection = content.match(
			/##\s+PFLICHT:\s*Evidence Portfolio([\s\S]*?)(?=##\s+PFLICHT:|$)/i,
		);
		expect(evidenceSection).not.toBeNull();
		expect(evidenceSection![1]).toContain('current-capabilities.md');
		expect(evidenceSection![1]).toContain('known-limitations.md');
	});

	it('GitHub Repository section references README and badges', () => {
		const githubSection = content.match(
			/##\s+PFLICHT:\s*GitHub Repository([\s\S]*?)(?=##\s+PFLICHT:|$)/i,
		);
		expect(githubSection).not.toBeNull();
		if (!githubSection) return;
		expect(githubSection[1]).toMatch(/README|readme/i);
		expect(githubSection[1]).toMatch(/badge|Badge/i);
	});

	it('Handoff section contains all required fields', () => {
		const handoffSection = content.match(
			/##\s+PFLICHT:\s*Next-Step-Handoff([\s\S]*?)(?=##\s+PFLICHT:|$)/i,
		);
		expect(handoffSection).not.toBeNull();
		if (!handoffSection) return;
		const sectionText = handoffSection[1] ?? '';
		const fields = [
			'Summary verdict',
			'Runtime',
			'verified',
			'changed',
			'NOT changed',
			'Tests',
			'PR',
			'CI',
			'Risks',
			'Human Approval',
			'Evidence',
			'Next step',
		];
		for (const field of fields) {
			expect(sectionText.toLowerCase()).toContain(field.toLowerCase());
		}
	});
});

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
