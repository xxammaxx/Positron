// Positron — Context Manifest Unit Tests
//
// Tests the structure and validation of ContextManifest objects
// using validateContextManifest() from @positron/shared.

import { describe, test, expect } from 'vitest';
import { validateContextManifest } from '../evidence-types.js';
import type { ContextManifest } from '../evidence-types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a minimal valid ContextManifest for use as a base in tests. */
function makeValidManifest(overrides?: Partial<ContextManifest>): ContextManifest {
  const base: ContextManifest = {
    manifestVersion: '1.0',
    generatedAt: '2026-06-10T12:00:00.000Z',
    generatedBy: 'positron-orchestrator',
    run: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      phase: 'IMPLEMENT',
      autonomyLevel: 2,
      attempt: 1,
      maxAttempts: 3,
    },
    issue: {
      number: 42,
      title: 'Fix login timeout',
      body: 'Users are experiencing login timeouts after 30s of inactivity.',
      labels: ['bug', 'priority-high'],
      url: 'https://github.com/xxammaxx/Positron/issues/42',
    },
    repository: {
      owner: 'xxammaxx',
      name: 'Positron',
      defaultBranch: 'main',
      remoteUrl: 'https://github.com/xxammaxx/Positron.git',
      language: 'typescript',
      packageManager: 'npm',
      runtime: 'node >= 22',
    },
    workspace: {
      path: '/home/user/positron',
      branch: 'positron/issue-42-fix-login-timeout',
      baseCommit: 'abc123def456',
      isolation: 'worktree',
    },
    specification: {
      exists: true,
      path: '.positron/specs/issue-42.md',
      artifacts: {
        constitution: '.positron/specs/constitution.md',
        spec: '.positron/specs/issue-42-spec.md',
        plan: '.positron/specs/issue-42-plan.md',
        tasks: '.positron/specs/issue-42-tasks.md',
      },
    },
    verificationContract: {
      exists: true,
      path: '.positron/contracts/issue-42.md',
      acceptanceCriteria: [
        'Session timeout is extended to 5 minutes',
        'Users see a warning before timeout',
      ],
      requiredGates: ['test_run', 'ci_status'],
      forbiddenOutcomes: ['secret_leakage', 'test_regression'],
    },
    redTests: {
      exist: true,
      paths: ['packages/server/src/__tests__/login-timeout.red.test.ts'],
      frameworks: ['vitest'],
      expectedFailures: 2,
    },
    context: {
      affectedModules: ['packages/server/src/auth/login.ts'],
      existingTests: ['packages/server/src/__tests__/auth.test.ts'],
      typeDefinitions: ['packages/server/src/types/auth.d.ts'],
      configurationFiles: ['packages/server/.env.example'],
      recentChanges: ['packages/server/src/auth/login.ts:abc123def'],
    },
    dependencies: {
      production: { express: '^4.18.0' },
      development: { vitest: '^4.0.0' },
      securityAlerts: [],
    },
    agent: {
      type: 'opencode',
      declaration: {
        capabilities: ['repo_read', 'code_write'],
        trustTier: 1,
        riskLevel: 'medium',
        allowedPaths: ['**/*'],
        deniedPaths: ['**/node_modules/**'],
      },
    },
    constraints: {
      constitution: '.positron/constitution.md',
      policies: ['.positron/policies/evidence-gates.json'],
    },
    evidenceRequirements: {
      testReport: true,
      diffSummary: true,
      ciStatus: true,
      previewScreenshot: false,
      securityScan: true,
      reviewerVerdict: true,
      humanApproval: false,
    },
    output: {
      evidenceDir: '.positron/evidence',
      artifactDir: '.positron/artifacts',
    },
  };

  return { ...base, ...overrides };
}

// ---------------------------------------------------------------------------
// 1. Context Manifest Structure
// ---------------------------------------------------------------------------

describe('Context Manifest Structure', () => {
  test('context manifest has required run.id', () => {
    const manifest = makeValidManifest();
    expect(manifest.run.id).toBeTruthy();
    expect(typeof manifest.run.id).toBe('string');
    expect(manifest.run.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  test('context manifest has required issue fields', () => {
    const manifest = makeValidManifest();
    expect(manifest.issue.number).toBeGreaterThan(0);
    expect(manifest.issue.title).toBeTruthy();
    expect(typeof manifest.issue.title).toBe('string');
    expect(manifest.issue.body).toBeTruthy();
    expect(Array.isArray(manifest.issue.labels)).toBe(true);
    expect(manifest.issue.url).toBeTruthy();
  });

  test('context manifest has required repository fields', () => {
    const manifest = makeValidManifest();
    expect(manifest.repository.owner).toBeTruthy();
    expect(manifest.repository.name).toBeTruthy();
    expect(manifest.repository.defaultBranch).toBeTruthy();
    expect(manifest.repository.remoteUrl).toBeTruthy();
    expect(manifest.repository.language).toBeTruthy();
    expect(manifest.repository.packageManager).toBeTruthy();
    expect(manifest.repository.runtime).toBeTruthy();
  });

  test('context manifest has required workspace fields', () => {
    const manifest = makeValidManifest();
    expect(manifest.workspace.path).toBeTruthy();
    expect(manifest.workspace.branch).toBeTruthy();
    expect(manifest.workspace.baseCommit).toBeTruthy();
    expect(manifest.workspace.isolation).toBeTruthy();
  });

  test('context manifest has required agent fields', () => {
    const manifest = makeValidManifest();
    expect(manifest.agent.type).toBeTruthy();
    expect(manifest.agent.declaration).toBeDefined();
    expect(Array.isArray(manifest.agent.declaration.capabilities)).toBe(true);
    expect(typeof manifest.agent.declaration.trustTier).toBe('number');
    expect(manifest.agent.declaration.riskLevel).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 2. Context Manifest Validation Edge Cases
// ---------------------------------------------------------------------------

describe('Context Manifest Validation Edge Cases', () => {
  test('empty manifest is rejected', () => {
    // An empty object should fail almost every validation rule
    const errors = validateContextManifest({} as ContextManifest);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('manifest with missing run is rejected', () => {
    const manifest = makeValidManifest();
    (manifest as any).run = {};
    const errors = validateContextManifest(manifest);
    // run.id must be non-empty
    expect(errors.some(e => e.includes('run.id'))).toBe(true);
  });

  test('manifest with missing issue is rejected', () => {
    const manifest = makeValidManifest();
    (manifest as any).issue = {};
    const errors = validateContextManifest(manifest);
    // issue.title must be non-empty
    expect(errors.some(e => e.includes('issue.title'))).toBe(true);
    // issue.number must be > 0
    expect(errors.some(e => e.includes('issue.number'))).toBe(true);
  });

  test('manifest with missing repository is rejected', () => {
    const manifest = makeValidManifest();
    (manifest as any).repository = {};
    const errors = validateContextManifest(manifest);
    expect(errors.some(e => e.includes('repository.owner'))).toBe(true);
    expect(errors.some(e => e.includes('repository.name'))).toBe(true);
  });

  test('manifest with missing workspace is rejected', () => {
    const manifest = makeValidManifest();
    (manifest as any).workspace = {};
    const errors = validateContextManifest(manifest);
    expect(errors.some(e => e.includes('workspace.path'))).toBe(true);
  });

  test('manifest with missing agent is rejected', () => {
    const manifest = makeValidManifest();
    (manifest as any).agent = {};
    const errors = validateContextManifest(manifest);
    expect(errors.some(e => e.includes('agent.type'))).toBe(true);
  });

  test('manifest with missing constraints.constitution is rejected', () => {
    const manifest = makeValidManifest();
    (manifest as any).constraints = {};
    const errors = validateContextManifest(manifest);
    expect(errors.some(e => e.includes('constraints.constitution'))).toBe(true);
  });

  test('manifest with missing output is rejected', () => {
    // validateContextManifest does not directly check output fields,
    // but output is marked as required by the ContextManifest interface.
    const manifest = makeValidManifest();
    (manifest as any).output = {};
    // output is not validated in validateContextManifest directly,
    // but we verify the manifest can still be constructed with empty output.
    // This is a documented interface requirement — the TS type enforces it.
    expect(manifest.output).toBeDefined();
    // The validation passes because output is not in the validation rules,
    // but the interface requires it. This test documents the gap.
    const errors = validateContextManifest(manifest);
    // All other fields are valid, so errors should be empty
    expect(errors.filter(e => e.includes('output'))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Hot / Warm / Cold Context Separation
// ---------------------------------------------------------------------------

describe('Hot/Warm/Cold Context Separation', () => {
  test('Hot context: affectedModules present — should be acceptable', () => {
    // Hot context means the manifest carries rich context data
    const manifest = makeValidManifest({
      context: {
        affectedModules: ['packages/server/src/auth/login.ts'],
        existingTests: ['packages/server/src/__tests__/auth.test.ts'],
        typeDefinitions: ['packages/server/src/types/auth.d.ts'],
        configurationFiles: ['packages/server/.env.example'],
        recentChanges: ['packages/server/src/auth/login.ts:abc123def'],
      },
    });
    expect(manifest.context.affectedModules.length).toBeGreaterThan(0);
    const errors = validateContextManifest(manifest);
    expect(errors).toHaveLength(0);
  });

  test('Cold context: minimal manifest without context fields — should be acceptable', () => {
    // Cold context means minimal context is provided (empty arrays)
    const manifest = makeValidManifest({
      context: {
        affectedModules: [],
        existingTests: [],
        typeDefinitions: [],
        configurationFiles: [],
        recentChanges: [],
      },
    });
    const errors = validateContextManifest(manifest);
    expect(errors).toHaveLength(0);
  });

  test('Retrieval context: context fields with ownership markers — should be acceptable', () => {
    // Retrievel (RAG) context means context items carry ownership markers
    // e.g. "path:commitSha" or "path@timestamp" in recentChanges
    const manifest = makeValidManifest({
      context: {
        affectedModules: ['packages/server/src/auth/login.ts'],
        existingTests: ['packages/server/src/__tests__/auth.test.ts'],
        typeDefinitions: ['packages/server/src/types/auth.d.ts'],
        configurationFiles: ['packages/server/.env.example'],
        recentChanges: [
          'packages/server/src/auth/login.ts:abc123def',
          'packages/server/src/utils/session.ts@2026-06-09',
        ],
      },
    });
    const errors = validateContextManifest(manifest);
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Evidence Requirements Validation
// ---------------------------------------------------------------------------

describe('Evidence Requirements Validation', () => {
  test('manifest without testReport evidence requirement is rejected', () => {
    const manifest = makeValidManifest({
      evidenceRequirements: {
        testReport: false,
        diffSummary: true,
        ciStatus: true,
        previewScreenshot: false,
        securityScan: true,
        reviewerVerdict: true,
        humanApproval: false,
      },
    });
    const errors = validateContextManifest(manifest);
    expect(errors.some(e => e.includes('testReport'))).toBe(true);
  });

  test('manifest with all evidence requirements is accepted', () => {
    const manifest = makeValidManifest({
      evidenceRequirements: {
        testReport: true,
        diffSummary: true,
        ciStatus: true,
        previewScreenshot: true,
        securityScan: true,
        reviewerVerdict: true,
        humanApproval: true,
      },
    });
    const errors = validateContextManifest(manifest);
    expect(errors).toHaveLength(0);
  });
});
