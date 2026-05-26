// Positron — SpecKit Adapter Package: Zentrale Exporte

/**
 * Legacy-Stub: runSpecify erzeugt eine Fake-Spezifikation.
 *
 * @deprecated Wird nur als Fallback genutzt wenn kein echter Adapter konfiguriert ist.
 *             Setze POSITRON_SPECKIT_MODE=real und POSITRON_ENABLE_REAL_SPECKIT=true
 *             für echte SpecKit-Generierung.
 */
export async function runSpecify(workspacePath?: string, issueContext?: string): Promise<string> {
  console.warn('[speckit-stub] ⚠️ DEPRECATED: runSpecify Legacy-Stub aufgerufen — setze POSITRON_SPECKIT_MODE=real für echte SpecKit-Generierung');
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
    '- ⚠️ Diese Spezifikation wurde vom Legacy-Stub generiert',
    '- Für volle Funktionalität POSITRON_SPECKIT_MODE=real setzen',
  ].join('\n');
}

/**
 * Legacy-Stub: runPlan erzeugt einen Fake-Implementierungsplan.
 *
 * @deprecated Wird nur als Fallback genutzt wenn kein echter Adapter konfiguriert ist.
 *             Setze POSITRON_SPECKIT_MODE=real und POSITRON_ENABLE_REAL_SPECKIT=true.
 */
export async function runPlan(workspacePath?: string, spec?: string): Promise<string> {
  console.warn('[speckit-stub] ⚠️ DEPRECATED: runPlan Legacy-Stub aufgerufen — setze POSITRON_SPECKIT_MODE=real für echte Plan-Generierung');
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
 *
 * @deprecated Wird nur als Fallback genutzt wenn kein echter Adapter konfiguriert ist.
 *             Setze POSITRON_SPECKIT_MODE=real und POSITRON_ENABLE_REAL_SPECKIT=true.
 */
export async function runTasks(workspacePath?: string, plan?: string): Promise<string[]> {
  console.warn('[speckit-stub] ⚠️ DEPRECATED: runTasks Legacy-Stub aufgerufen — setze POSITRON_SPECKIT_MODE=real für echte Task-Generierung');
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
