// Spec Kit Adapter — Real Adapter + Legacy Stubs (Issue #15)

// Legacy stub functions (backward compatibility for MVP)
export function runSpecify(): string { return '# Spec\nGenerated spec content.'; }
export function runPlan(): string { return '# Plan\nGenerated plan content.'; }
export function runTasks(): string { return '# Tasks\n- [ ] Task 1\n- [ ] Task 2'; }

// Real Spec Kit Adapter (Issue #15)
export { RealSpecKitAdapter } from './real-adapter.js';

// Fake Spec Kit Adapter for testing (Issue #15)
export { FakeSpecKitAdapter, FAKE_HEALTH_AVAILABLE, FAKE_HEALTH_UNAVAILABLE } from './fake-adapter.js';

// Artifact Scanner (Issue #15)
export { scanWorkspace, isPathSafe, computeSha256 } from './artifact-scanner.js';
