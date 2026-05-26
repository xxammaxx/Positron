// Positron — OpenCode Adapter Package: Zentrale Exporte

/**
 * Legacy-Stub: executeTasks simuliert die Task-Ausführung.
 *
 * @deprecated Wird nur als Fallback genutzt wenn kein echter Adapter konfiguriert ist.
 *             Setze POSITRON_OPENCODE_MODE=real für echte Task-Ausführung.
 */
export async function executeTasks(
  workspacePath?: string,
  tasks?: string[],
): Promise<{ success: boolean; completedTasks: string[]; errors: string[] }> {
  console.warn('[opencode-stub] ⚠️ DEPRECATED: executeTasks Legacy-Stub aufgerufen — setze POSITRON_OPENCODE_MODE=real für echte Ausführung');
  return {
    success: true,
    completedTasks: tasks ?? [],
    errors: [],
  };
}

export { RealOpenCodeAdapter } from './real-adapter.js';
export { FakeOpenCodeAdapter, FAKE_OPENCODE_HEALTH_AVAILABLE, FAKE_OPENCODE_HEALTH_UNAVAILABLE } from './fake-adapter.js';
