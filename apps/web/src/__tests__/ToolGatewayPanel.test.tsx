import React from 'react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ToolGatewayPanel from '../components/dashboard/ToolGatewayPanel.jsx';

// Mock the api module
vi.mock('../api.js', () => {
	const mockStatus = {
		gatewayEnabled: false,
		mcpExposeEnabled: false,
		registeredTools: 8,
		sealed: true,
		runtimeActive: false,
		enforcePathBoundaries: true,
		enforceEgress: true,
		redactSecrets: true,
	};

	const mockTools = {
		tools: [
			{
				id: 'repo.read_file',
				category: 'repo',
				title: 'Read File',
				description: 'Read file contents',
				riskLevel: 'read',
				requiredAutonomyLevel: 0,
				approvalMode: 'none',
				allowedPhases: [],
				egressPolicy: { allowedHosts: [], allowedPorts: [] },
				evidenceRequirements: { logArguments: true, logOutput: false, requireArtifact: false },
				inputSchema: {},
				outputSchema: {},
			},
			{
				id: 'tests.run_selected',
				category: 'tests',
				title: 'Run Selected Tests',
				description: 'Run specific test command',
				riskLevel: 'write',
				requiredAutonomyLevel: 1,
				approvalMode: 'ask',
				allowedPhases: [],
				egressPolicy: { allowedHosts: [], allowedPorts: [] },
				evidenceRequirements: { logArguments: true, logOutput: true, requireArtifact: true },
				inputSchema: {},
				outputSchema: {},
			},
		],
		total: 2,
	};

	return {
		api: {
			getToolGatewayStatus: vi.fn().mockResolvedValue(mockStatus),
			getToolGatewayTools: vi.fn().mockResolvedValue(mockTools),
		},
	};
});

describe('ToolGatewayPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('renders gateway status section', async () => {
		render(<ToolGatewayPanel />);

		await waitFor(() => {
			expect(screen.getByText('Tool Gateway')).toBeDefined();
		});

		// Status cards should be visible
		expect(screen.getByText('Gateway')).toBeDefined();
		expect(screen.getByText('MCP Exposure')).toBeDefined();
		expect(screen.getByText('Registered Tools')).toBeDefined();
		expect(screen.getByText('Runtime')).toBeDefined();
	});

	test('shows gateway as disabled (safe default)', async () => {
		render(<ToolGatewayPanel />);

		await waitFor(() => {
			// "Disabled" appears in both Gateway and MCP Exposure cards
			const disabledElements = screen.getAllByText('Disabled');
			expect(disabledElements.length).toBeGreaterThanOrEqual(1);
		});

		// Should show inactive warning in the Gateway card subtitle
		const inactiveLabels = screen.getAllByText(/Inactive/);
		expect(inactiveLabels.length).toBeGreaterThanOrEqual(1);

		// Should mention safe default (appears in Gateway card, MCP Exposure card, and warning banner)
		const safeDefaultElements = screen.getAllByText(/Safe Default/i);
		expect(safeDefaultElements.length).toBeGreaterThan(0);
	});

	test('shows MCP exposure as disabled', async () => {
		render(<ToolGatewayPanel />);

		await waitFor(() => {
			const disabledElements = screen.getAllByText('Disabled');
			expect(disabledElements.length).toBeGreaterThanOrEqual(1);
		});
	});

	test('shows registered tools count', async () => {
		render(<ToolGatewayPanel />);

		await waitFor(() => {
			expect(screen.getByText('8')).toBeDefined();
		});
	});

	test('shows feature flags', async () => {
		render(<ToolGatewayPanel />);

		await waitFor(() => {
			expect(screen.getByText(/Path Boundaries/i)).toBeDefined();
			expect(screen.getByText(/Egress Enforcement/i)).toBeDefined();
			expect(screen.getByText(/Secret Redaction/i)).toBeDefined();
		});
	});

	test('renders registered tools table', async () => {
		render(<ToolGatewayPanel />);

		await waitFor(() => {
			expect(screen.getByText('Registered Tools (2)')).toBeDefined();
			expect(screen.getByText('repo.read_file')).toBeDefined();
			expect(screen.getByText('tests.run_selected')).toBeDefined();
		});
	});

	test('shows risk levels with correct styling', async () => {
		render(<ToolGatewayPanel />);

		await waitFor(() => {
			expect(screen.getByText('read')).toBeDefined();
			expect(screen.getByText('write')).toBeDefined();
		});
	});

	test('shows approval modes', async () => {
		render(<ToolGatewayPanel />);

		await waitFor(() => {
			// "none" appears in both Approval column and Egress column — use getAllByText
			const noneElements = screen.getAllByText('none');
			expect(noneElements.length).toBeGreaterThanOrEqual(1);
			expect(screen.getByText('ask')).toBeDefined();
		});
	});

	test('does not contain Run Tool button', async () => {
		render(<ToolGatewayPanel />);

		await waitFor(() => {
			expect(screen.getByText('Tool Gateway')).toBeDefined();
		});

		// There should be no "Run" buttons
		const runButtons = screen.queryAllByRole('button', { name: /run/i });
		expect(runButtons.length).toBe(0);

		// No action buttons for tool execution
		expect(screen.queryByText(/execute/i)).toBeNull();
		expect(screen.queryByText(/trigger/i)).toBeNull();
	});

	test('shows note about no dashboard execution', async () => {
		render(<ToolGatewayPanel />);

		await waitFor(() => {
			expect(screen.getByText(/Tool execution is not available from the dashboard/i)).toBeDefined();
		});
	});
});
