// Tool Gateway — Type extension tests (Issue #229)
// Validates that ToolDefinition accepts new optional metadata fields
// without breaking existing required fields.

import { describe, expect, test } from 'vitest';
import type { ToolDefinition } from '../types.js';

function makeMinimalDef(): ToolDefinition {
	return {
		id: 'test.tool',
		title: 'Test Tool',
		description: 'A test tool',
		inputSchema: {},
		outputSchema: {},
		riskLevel: 'read',
		requiredAutonomyLevel: 0,
		approvalMode: 'none',
		allowedPhases: ['TEST'],
		allowedWorkspaceRoots: [],
		egressPolicy: { allowedHosts: [], allowedPorts: [] },
		evidenceRequirements: { logArguments: false, logOutput: false, requireArtifact: false },
	};
}

describe('ToolDefinition (Issue #229 metadata extension)', () => {
	test('minimal definition compiles without new fields', () => {
		const def = makeMinimalDef();
		expect(def.id).toBe('test.tool');
		expect(def.category).toBeUndefined();
		expect(def.mcpServerName).toBeUndefined();
		expect(def.warmupStatus).toBeUndefined();
	});

	test('accepts category field', () => {
		const def: ToolDefinition = {
			...makeMinimalDef(),
			category: 'testing',
		};
		expect(def.category).toBe('testing');
	});

	test('accepts mcpServerName field', () => {
		const def: ToolDefinition = {
			...makeMinimalDef(),
			mcpServerName: 'playwright-mcp',
		};
		expect(def.mcpServerName).toBe('playwright-mcp');
	});

	test('accepts warmupStatus field', () => {
		const def: ToolDefinition = {
			...makeMinimalDef(),
			warmupStatus: 'pass',
		};
		expect(def.warmupStatus).toBe('pass');
	});

	test('accepts providerStatus field', () => {
		const def: ToolDefinition = {
			...makeMinimalDef(),
			providerStatus: 'not_provider',
		};
		expect(def.providerStatus).toBe('not_provider');
	});

	test('accepts requiresMcpWarmup field', () => {
		const def: ToolDefinition = {
			...makeMinimalDef(),
			requiresMcpWarmup: true,
		};
		expect(def.requiresMcpWarmup).toBe(true);
	});

	test('accepts requiresModelWarmup field', () => {
		const def: ToolDefinition = {
			...makeMinimalDef(),
			requiresModelWarmup: false,
		};
		expect(def.requiresModelWarmup).toBe(false);
	});

	test('accepts requiresSpecKitSync field', () => {
		const def: ToolDefinition = {
			...makeMinimalDef(),
			requiresSpecKitSync: false,
		};
		expect(def.requiresSpecKitSync).toBe(false);
	});

	test('all new fields together do not break existing fields', () => {
		const def: ToolDefinition = {
			...makeMinimalDef(),
			category: 'filesystem',
			mcpServerName: 'filesystem-mcp',
			warmupStatus: 'unknown',
			providerStatus: 'not_provider',
			requiresMcpWarmup: false,
			requiresModelWarmup: false,
			requiresSpecKitSync: false,
		};

		// Existing fields remain intact
		expect(def.id).toBe('test.tool');
		expect(def.title).toBe('Test Tool');
		expect(def.riskLevel).toBe('read');
		expect(def.allowedPhases).toEqual(['TEST']);
		expect(def.egressPolicy.allowedHosts).toEqual([]);
	});
});
