// Positron — SpecKit Adapter Package: Zentrale Exporte

/**
 * Legacy-Stub: runSpecify erzeugt eine Fake-Spezifikation.
 * Wird als Fallback aufgerufen wenn der Real/Fake-Adapter nicht genutzt wird.
 */
export async function runSpecify(workspacePath?: string, issueContext?: string): Promise<string> {
  console.log('[speckit-stub] runSpecify aufgerufen');
  return [
    '# Specification (Stub)',
    `Generated at: ${new Date().toISOString()}`,
    `Workspace: ${workspacePath ?? 'N/A'}`,
    '## Context',
    issueContext ?? 'Issue #0 – Automatisierte Änderungen',
    '## Acceptance Criteria',
    '- [ ] Feature implementiert',
    '- [ ] Tests vorhanden und grün',
    '- [ ] Dokumentation aktualisiert',
    '- [ ] PR erstellt',
    '## Technical Notes',
    '- Diese Spezifikation wurde vom Legacy-Stub generiert',
    '- Für volle Funktionalität den RealSpecKitAdapter verwenden',
  ].join('\n');
}

/**
 * Legacy-Stub: runPlan erzeugt einen Fake-Implementierungsplan.
 */
export async function runPlan(workspacePath?: string, spec?: string): Promise<string> {
  console.log('[speckit-stub] runPlan aufgerufen');
  return [
    '# Implementation Plan (Stub)',
    `Generated at: ${new Date().toISOString()}`,
    `Workspace: ${workspacePath ?? 'N/A'}`,
    '## Steps',
    '1. Analyse der bestehenden Codebase und Identifikation der betroffenen Module',
    '2. Implementierung der geforderten Änderungen gemäß Spezifikation',
    '3. Erstellung von Unit-Tests und Integrationstests',
    '4. Durchführung eines manuellen oder automatisierten Reviews',
    '5. Erstellung des Pull Requests und Merge',
    '## Dependencies',
    '- Keine externen Abhängigkeiten für diesen Stub',
    '## Risiken',
    '- Gering – Standard-Änderungen mit Testabdeckung',
  ].join('\n');
}

/**
 * Legacy-Stub: runTasks erzeugt Fake-Tasks.
 */
export async function runTasks(workspacePath?: string, plan?: string): Promise<string[]> {
  console.log('[speckit-stub] runTasks aufgerufen');
  return [
    `TASK-1: Codebase-Analyse für Issue #0`,
    `TASK-2: Feature-Implementierung (Hauptlogik)`,
    `TASK-3: Unit-Tests für die neue Funktionalität`,
    `TASK-4: Integrationstests und End-to-End-Tests`,
    `TASK-5: Code-Review und Bug-Fixes`,
    `TASK-6: PR-Erstellung und Dokumentation`,
  ];
}

export { RealSpecKitAdapter } from './real-adapter.js';
export { FakeSpecKitAdapter, FAKE_HEALTH_AVAILABLE, FAKE_HEALTH_UNAVAILABLE } from './fake-adapter.js';
export { scanWorkspace, isPathSafe, computeSha256 } from './artifact-scanner.js';
