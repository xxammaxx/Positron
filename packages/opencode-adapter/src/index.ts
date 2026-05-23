// OpenCode Adapter — Real Adapter + Legacy Stubs (Issue #16)

// Legacy stub (backward compatibility)
export function executeTasks(): string { return 'OpenCode stub: implementation simulated.'; }

// Real OpenCode Adapter (Issue #16)
export { RealOpenCodeAdapter } from './real-adapter.js';

// Fake OpenCode Adapter for testing (Issue #16)
export { FakeOpenCodeAdapter, FAKE_OPENCODE_HEALTH_AVAILABLE, FAKE_OPENCODE_HEALTH_UNAVAILABLE } from './fake-adapter.js';
