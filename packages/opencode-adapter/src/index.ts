// Positron — OpenCode Adapter Package: Zentrale Exporte

/**
 * Legacy-Stub: executeTasks simuliert die Task-Ausführung.
 * Wird als Fallback aufgerufen wenn der Real/Fake-Adapter nicht genutzt wird.
 */
export async function executeTasks(
  workspacePath?: string,
  tasks?: string[],
): Promise<{ success: boolean; completedTasks: string[]; errors: string[] }> {
  console.log('[opencode-stub] executeTasks aufgerufen');
  console.log(`[opencode-stub] Tasks: ${tasks?.length ?? 0}`);
  return {
    success: true,
    completedTasks: tasks ?? [],
    errors: [],
  };
}

export { RealOpenCodeAdapter } from './real-adapter.js';
export { FakeOpenCodeAdapter, FAKE_OPENCODE_HEALTH_AVAILABLE, FAKE_OPENCODE_HEALTH_UNAVAILABLE } from './fake-adapter.js';
