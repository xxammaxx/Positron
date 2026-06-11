// Positron — OpenCode Adapter Package: Zentrale Exporte

function isTestEnv(): boolean {
	return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

/**
 * Legacy-Stub: executeTasks simuliert die Task-Ausführung.
 *
 * @deprecated Use OpenCodeAdapter (Real/Fake) instead.
 *             This function only works in test mode. In production, it throws.
 */
export async function executeTasks(
	_workspacePath?: string,
	tasks?: string[],
): Promise<{ success: boolean; completedTasks: string[]; errors: string[] }> {
	if (!isTestEnv()) {
		throw new Error('DEPRECATED: executeTasks is deprecated. Use OpenCodeAdapter instead.');
	}
	return {
		success: true,
		completedTasks: tasks ?? [],
		errors: [],
	};
}

export { RealOpenCodeAdapter } from './real-adapter.js';
export {
	FakeOpenCodeAdapter,
	FAKE_OPENCODE_HEALTH_AVAILABLE,
	FAKE_OPENCODE_HEALTH_UNAVAILABLE,
} from './fake-adapter.js';
