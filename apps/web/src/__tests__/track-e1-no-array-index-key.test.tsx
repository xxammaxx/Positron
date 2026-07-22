/**
 * Track E1 — lint/suspicious/noArrayIndexKey focused tests
 *
 * Issue #340: Verifies that all 7 index-as-key usages are resolved
 * without introducing React duplicate-key warnings, rendering
 * regressions, or index-based key strategies.
 */

import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import ProjectsPage, {
	createStableTextItems,
	type StableTextItem,
} from '../components/projects/ProjectsPage.js';

// -----------------------------------------------------------------------
// Helper: createStableTextItems
// -----------------------------------------------------------------------

describe('createStableTextItems', () => {
	test('unique values produce distinct keys', () => {
		const result = createStableTextItems(['alpha', 'beta']);

		expect(result).toHaveLength(2);
		expect(result[0].key).not.toBe(result[1].key);
		expect(result[0].value).toBe('alpha');
		expect(result[1].value).toBe('beta');
	});

	test('values are unchanged', () => {
		const input: readonly string[] = ['hello', 'world'];
		const result = createStableTextItems(input);

		expect(result.map((r) => r.value)).toEqual(input);
	});

	test('order is unchanged', () => {
		const input: readonly string[] = ['first', 'second', 'third'];
		const result = createStableTextItems(input);

		expect(result).toHaveLength(3);
		expect(result[0].value).toBe('first');
		expect(result[1].value).toBe('second');
		expect(result[2].value).toBe('third');
	});

	test('duplicate values produce distinct keys', () => {
		const result = createStableTextItems(['duplicate', 'duplicate']);

		expect(result).toHaveLength(2);
		expect(result[0].key).not.toBe(result[1].key);
		expect(result[0].value).toBe('duplicate');
		expect(result[1].value).toBe('duplicate');
	});

	test('reordering unique values preserves key identity', () => {
		const first = createStableTextItems(['alpha', 'beta'] as const);
		const second = createStableTextItems(['beta', 'alpha'] as const);

		expect(first[0].key).toBe(second[1].key); // alpha key unchanged
		expect(first[1].key).toBe(second[0].key); // beta key unchanged
	});

	test('determinism — same input yields same keys', () => {
		const input: readonly string[] = ['x', 'y', 'z', 'x'];

		const a = createStableTextItems(input);
		const b = createStableTextItems(input);

		expect(a).toEqual(b);
	});

	test('triple duplicates', () => {
		const result = createStableTextItems(['dup', 'dup', 'dup']);

		expect(result).toHaveLength(3);
		const keys = new Set(result.map((r) => r.key));
		expect(keys.size).toBe(3);
	});

	test('empty array', () => {
		const result = createStableTextItems([]);
		expect(result).toHaveLength(0);
	});

	test('input is not mutated', () => {
		const input = Object.freeze(['a', 'b', 'a']);
		expect(() => createStableTextItems(input)).not.toThrow();
	});
});

// -----------------------------------------------------------------------
// ProjectsPage rendering — duplicate data
// -----------------------------------------------------------------------

describe('ProjectsPage with duplicate blockers and recommended runs', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	test('renders without React duplicate-key warnings for duplicate blockers', () => {
		const warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		vi.doMock('../api.js', () => ({
			api: {
				getManagedTargetProjects: vi.fn().mockResolvedValue({
					projects: [
						{
							id: 'xxammaxx/TestProjectA',
							name: 'TestProjectA',
							role: 'proof_project',
							repoUrl: 'https://github.com/xxammaxx/TestProjectA',
							defaultBranch: 'main',
							status: 'LOCAL_GATES_REPRODUCIBLE',
							description: 'Test project with duplicate blockers.',
							techStack: [],
							lastEvidence: null,
							lastRunRef: null,
							blockers: ['duplicate blocker', 'duplicate blocker'],
							nextRecommendedRuns: ['duplicate run', 'duplicate run'],
							safetyChecks: [],
							securityStatus: 'ok',
						},
					],
				}),
			},
		}));

		// Re-import so the mock is picked up
		return import('../components/projects/ProjectsPage.js').then(
			async (mod) => {
				const Page = mod.default as React.FC;

				render(
					<MemoryRouter>
						<Page />
					</MemoryRouter>,
				);

				// Wait for data to resolve
				await vi.waitFor(() => {
					expect(screen.getByText('TestProjectA')).toBeDefined();
				});

				// Check for React duplicate-key warnings
				const duplicateKeyCalls = warnSpy.mock.calls.filter((call) => {
					const msg = String(call[0]);
					return (
						msg.includes('Encountered two children with the same key') ||
						msg.includes('duplicate key')
					);
				});
				expect(duplicateKeyCalls).toHaveLength(0);

				warnSpy.mockRestore();
			},
		);
	});

	test('both duplicate blockers are rendered', async () => {
		vi.doMock('../api.js', () => ({
			api: {
				getManagedTargetProjects: vi.fn().mockResolvedValue({
					projects: [
						{
							id: 'xxammaxx/TestProjectB',
							name: 'TestProjectB',
							role: 'proof_project',
							repoUrl: 'https://github.com/xxammaxx/TestProjectB',
							defaultBranch: 'main',
							status: 'LOCAL_GATES_REPRODUCIBLE',
							description: 'Test with duplicate data.',
							techStack: [],
							lastEvidence: null,
							lastRunRef: null,
							blockers: ['dup blocker', 'dup blocker'],
							nextRecommendedRuns: [],
							safetyChecks: [],
							securityStatus: 'ok',
						},
					],
				}),
			},
		}));

		const mod = await import('../components/projects/ProjectsPage.js');
		const Page = mod.default as React.FC;

		render(
			<MemoryRouter>
				<Page />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText('TestProjectB')).toBeDefined();
		});

		// Expand details to see blockers
		const showDetails = screen.getByText('▼ Show Details');
		showDetails.click();

		await vi.waitFor(() => {
			const listItems = screen.getAllByText('dup blocker');
			expect(listItems).toHaveLength(2);
		});
	});

	test('both duplicate recommended runs are rendered', async () => {
		vi.doMock('../api.js', () => ({
			api: {
				getManagedTargetProjects: vi.fn().mockResolvedValue({
					projects: [
						{
							id: 'xxammaxx/TestProjectC',
							name: 'TestProjectC',
							role: 'proof_project',
							repoUrl: 'https://github.com/xxammaxx/TestProjectC',
							defaultBranch: 'main',
							status: 'LOCAL_GATES_REPRODUCIBLE',
							description: 'Test with duplicate runs.',
							techStack: [],
							lastEvidence: null,
							lastRunRef: null,
							blockers: [],
							nextRecommendedRuns: ['dup run', 'dup run'],
							safetyChecks: [],
							securityStatus: 'ok',
						},
					],
				}),
			},
		}));

		const mod = await import('../components/projects/ProjectsPage.js');
		const Page = mod.default as React.FC;

		render(
			<MemoryRouter>
				<Page />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText('TestProjectC')).toBeDefined();
		});

		const showDetails = screen.getByText('▼ Show Details');
		showDetails.click();

		await vi.waitFor(() => {
			const listItems = screen.getAllByText('dup run');
			expect(listItems).toHaveLength(2);
		});
	});

	test('order of unique blockers is preserved', async () => {
		vi.doMock('../api.js', () => ({
			api: {
				getManagedTargetProjects: vi.fn().mockResolvedValue({
					projects: [
						{
							id: 'xxammaxx/TestProjectD',
							name: 'TestProjectD',
							role: 'proof_project',
							repoUrl: 'https://github.com/xxammaxx/TestProjectD',
							defaultBranch: 'main',
							status: 'LOCAL_GATES_REPRODUCIBLE',
							description: 'Test order preservation.',
							techStack: [],
							lastEvidence: null,
							lastRunRef: null,
							blockers: ['first', 'second', 'third'],
							nextRecommendedRuns: [],
							safetyChecks: [],
							securityStatus: 'ok',
						},
					],
				}),
			},
		}));

		const mod = await import('../components/projects/ProjectsPage.js');
		const Page = mod.default as React.FC;

		render(
			<MemoryRouter>
				<Page />
			</MemoryRouter>,
		);

		await vi.waitFor(() => {
			expect(screen.getByText('TestProjectD')).toBeDefined();
		});

		const showDetails = screen.getByText('▼ Show Details');
		showDetails.click();

		await vi.waitFor(() => {
			const items = screen.getAllByRole('listitem');
			const blockers = items
				.map((el) => el.textContent)
				.filter((t) => ['first', 'second', 'third'].includes(t ?? ''));
			expect(blockers).toEqual(['first', 'second', 'third']);
		});
	});
});

// -----------------------------------------------------------------------
// Skeleton rendering — fixed-size slot groups
// -----------------------------------------------------------------------

describe('Skeleton rendering — fixed-size groups and suppression sites', () => {
	test('RecentActivity skeleton renders 4 rows', async () => {
		const { default: RecentActivity } = await import(
			'../components/dashboard/RecentActivity.js'
		);

		const { container } = render(
			<MemoryRouter>
				<RecentActivity runs={[]} isLoading={true} />
			</MemoryRouter>,
		);

		// Each skeleton row has "skeleton" class on inner elements
		const skeletonRows = container.querySelectorAll(
			'[class*="skeleton"][class*="rounded-full"]',
		);
		expect(skeletonRows).toHaveLength(4);
	});

	test('StatusSummary skeleton renders 4 cards', async () => {
		const { default: StatusSummary } = await import(
			'../components/dashboard/StatusSummary.js'
		);

		const { container } = render(
			<StatusSummary metrics={null} isLoading={true} />,
		);

		const skeletonCards = container.querySelectorAll('.card.animate-pulse');
		expect(skeletonCards).toHaveLength(4);
	});

	test('LoadingSkeleton table variant renders requested rows', async () => {
		const { default: LoadingSkeleton } = await import(
			'../components/shared/LoadingSkeleton.js'
		);

		const { container } = render(<LoadingSkeleton variant="table" rows={4} />);

		const rows = container.querySelectorAll('.flex.gap-4');
		expect(rows).toHaveLength(4);
	});

	test('LoadingSkeleton text variant renders requested rows', async () => {
		const { default: LoadingSkeleton } = await import(
			'../components/shared/LoadingSkeleton.js'
		);

		const { container } = render(<LoadingSkeleton variant="text" rows={5} />);

		const lines = container.querySelectorAll('.skeleton.h-3');
		expect(lines).toHaveLength(5);
	});

	test('RunsPage skeleton renders 8 rows', async () => {
		// Mock api to never resolve — keeps loading=true and skeleton visible
		vi.doMock('../api.js', () => ({
			api: {
				getRuns: vi.fn(
					() => new Promise(() => {
						/* never resolves — loading stays true */
					}),
				),
			},
		}));

		const { default: RunsPage } = await import(
			'../components/runs/RunsPage.js'
		);

		const { container } = render(
			<MemoryRouter>
				<RunsPage />
			</MemoryRouter>,
		);

		const skeletonRows = container.querySelectorAll(
			'.skeleton.h-10',
		);
		expect(skeletonRows).toHaveLength(8);
	});
});

// -----------------------------------------------------------------------
// React hook rules compliance (no hooks-in-conditions etc.)
// -----------------------------------------------------------------------

describe('React hook rules compliance', () => {
	test('createStableTextItems is a pure function (not a hook)', () => {
		// Verify it doesn't throw when called outside component context
		const result = createStableTextItems(['a', 'b']);
		expect(result).toBeDefined();
		expect(result).toHaveLength(2);
	});
});
