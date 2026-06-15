// Red Test 6: Secret Leakage
// Issue #219 — T-021
// Verifies that secrets in arguments and outputs are redacted before logging.

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from '../../registry.js';
import { GatewayService } from '../../gateway.js';
import type { ToolDefinition, ToolHandler, ToolCall, ToolResult } from '../../types.js';

describe('Red Test: Secret Leakage', () => {
	let registry: ToolRegistry;
	let gateway: GatewayService;

	beforeEach(() => {
		registry = new ToolRegistry();
		gateway = new GatewayService(registry, {
			enabled: true,
			redactSecrets: true,
		});
	});

	it('REDACTS: GitHub token in output', async () => {
		const def: ToolDefinition = {
			id: 'test.leak',
			title: 'Leak Test',
			description: 'Tool that might leak secrets in output',
			inputSchema: { type: 'object', properties: {}, required: [] },
			outputSchema: {},
			riskLevel: 'read',
			requiredAutonomyLevel: 0,
			approvalMode: 'none',
			allowedPhases: [],
			allowedWorkspaceRoots: [],
			egressPolicy: { allowedHosts: [], allowedPorts: [] },
			evidenceRequirements: {
				logArguments: false,
				logOutput: false,
				requireArtifact: false,
			},
		};

		const handler: ToolHandler = async (_c: ToolCall): Promise<ToolResult> => ({
			success: true,
			output: {
				message: 'Success',
				token: 'ghp_abcdefghijklmnopqrstuvwxyz1234567890',
			},
		});

		registry.register(def, handler);

		const result = await gateway.execute({
			toolId: 'test.leak',
			arguments: {},
			runId: 'run-001',
			phase: 'IMPLEMENT',
			autonomyLevel: 2,
			workspaceRoot: '/tmp/workspace',
		});

		expect(result.success).toBe(true);
		const output = result.output as Record<string, unknown>;
		const tokenStr = JSON.stringify(output);

		// Token should be redacted
		expect(tokenStr).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz1234567890');
		expect(tokenStr).toContain('***REDACTED***');
	});

	it('REDACTS: OpenAI key in output', async () => {
		const def: ToolDefinition = {
			id: 'test.openai',
			title: 'OpenAI Test',
			description: 'Tool using OpenAI key',
			inputSchema: { type: 'object', properties: {}, required: [] },
			outputSchema: {},
			riskLevel: 'read',
			requiredAutonomyLevel: 0,
			approvalMode: 'none',
			allowedPhases: [],
			allowedWorkspaceRoots: [],
			egressPolicy: { allowedHosts: [], allowedPorts: [] },
			evidenceRequirements: {
				logArguments: false,
				logOutput: false,
				requireArtifact: false,
			},
		};

		const handler: ToolHandler = async (_c: ToolCall): Promise<ToolResult> => ({
			success: true,
			output: 'API Key: sk-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
		});

		registry.register(def, handler);

		const result = await gateway.execute({
			toolId: 'test.openai',
			arguments: {},
			runId: 'run-001',
			phase: 'IMPLEMENT',
			autonomyLevel: 2,
			workspaceRoot: '/tmp/workspace',
		});

		// Output should not contain the original key
		const output = result.output as string;
		// Check redaction occurred (prefix preserved, key body redacted)
		expect(output).toContain('***REDACTED***');
		// Full openai key pattern should not be present
		// Full key pattern should not be present (prefix + long body)
		expect(output).not.toMatch(/sk-[a-zA-Z0-9]{48,}/g);
	});

	it('REDACTS: Anthropic key in output', async () => {
		const def: ToolDefinition = {
			id: 'test.anthropic',
			title: 'Anthropic Test',
			description: 'Tool using anthropic key',
			inputSchema: { type: 'object', properties: {}, required: [] },
			outputSchema: {},
			riskLevel: 'read',
			requiredAutonomyLevel: 0,
			approvalMode: 'none',
			allowedPhases: [],
			allowedWorkspaceRoots: [],
			egressPolicy: { allowedHosts: [], allowedPorts: [] },
			evidenceRequirements: {
				logArguments: false,
				logOutput: false,
				requireArtifact: false,
			},
		};

		const handler: ToolHandler = async (_c: ToolCall): Promise<ToolResult> => ({
			success: true,
			output: 'anthropic_abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGH',
		});

		registry.register(def, handler);

		const result = await gateway.execute({
			toolId: 'test.anthropic',
			arguments: {},
			runId: 'run-001',
			phase: 'IMPLEMENT',
			autonomyLevel: 2,
			workspaceRoot: '/tmp/workspace',
		});

		const output = result.output as string;
		// Check redaction occurred
		expect(output).toContain('***REDACTED***');
		// Full 40+ char token should not be present
		expect(output).not.toMatch(/anthropic_[a-zA-Z0-9]{40,}/);
	});

	it('REDACTS: Multiple secrets in one output', async () => {
		const def: ToolDefinition = {
			id: 'test.multi_secret',
			title: 'Multi Secret',
			description: 'Tool with multiple secrets',
			inputSchema: { type: 'object', properties: {}, required: [] },
			outputSchema: {},
			riskLevel: 'read',
			requiredAutonomyLevel: 0,
			approvalMode: 'none',
			allowedPhases: [],
			allowedWorkspaceRoots: [],
			egressPolicy: { allowedHosts: [], allowedPorts: [] },
			evidenceRequirements: {
				logArguments: false,
				logOutput: false,
				requireArtifact: false,
			},
		};

		const handler: ToolHandler = async (_c: ToolCall): Promise<ToolResult> => ({
			success: true,
			output: [
				'Token1: ghp_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
				'Token2: ghp_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
			].join('\n'),
		});

		registry.register(def, handler);

		const result = await gateway.execute({
			toolId: 'test.multi_secret',
			arguments: {},
			runId: 'run-001',
			phase: 'IMPLEMENT',
			autonomyLevel: 2,
			workspaceRoot: '/tmp/workspace',
		});

		const output = result.output as string;
		expect(output).not.toMatch(/ghp_[a-zA-Z0-9]{36}/);
	});

	it('PRESERVES: non-secret output unchanged', async () => {
		const def: ToolDefinition = {
			id: 'test.clean',
			title: 'Clean Output',
			description: 'Tool with no secrets',
			inputSchema: { type: 'object', properties: {}, required: [] },
			outputSchema: {},
			riskLevel: 'read',
			requiredAutonomyLevel: 0,
			approvalMode: 'none',
			allowedPhases: [],
			allowedWorkspaceRoots: [],
			egressPolicy: { allowedHosts: [], allowedPorts: [] },
			evidenceRequirements: {
				logArguments: false,
				logOutput: false,
				requireArtifact: false,
			},
		};

		const handler: ToolHandler = async (_c: ToolCall): Promise<ToolResult> => ({
			success: true,
			output: 'All tests passed: 42/42',
		});

		registry.register(def, handler);

		const result = await gateway.execute({
			toolId: 'test.clean',
			arguments: {},
			runId: 'run-001',
			phase: 'IMPLEMENT',
			autonomyLevel: 2,
			workspaceRoot: '/tmp/workspace',
		});

		expect(result.output).toBe('All tests passed: 42/42');
	});
});
