// Positron — OpenCode Adapter: Frontend-Design Skill Smoke-Test

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const skillPath = resolve(process.cwd(), '.opencode/skills/frontend-design/SKILL.md');

describe('frontend-design skill', () => {
	test('skill file exists at the OpenCode skill path', () => {
		expect(existsSync(skillPath)).toBe(true);
	});

	test('skill frontmatter exposes the expected metadata', () => {
		const content = readFileSync(skillPath, 'utf8');

		expect(content).toContain('name: frontend-design');
		expect(content).toContain(
			'description: Create distinctive, production-grade frontend interfaces with high design quality.',
		);
		expect(content).toContain('license: Complete terms in LICENSE.txt');
	});

	test('skill guidance emphasizes distinctive frontend design choices', () => {
		const content = readFileSync(skillPath, 'utf8');

		expect(content).toContain('avoid generic "AI slop" aesthetics');
		expect(content).toContain('Typography');
		expect(content).toContain('Color & Theme');
		expect(content).toContain('Motion');
		expect(content).toContain('you are capable of extraordinary creative work');
	});
});
