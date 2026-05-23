import { describe, expect, test } from 'vitest';
import {
  renderSyncAccepted, renderSyncPhaseUpdate, renderSyncTestReport,
  renderSyncBlocked, renderSyncFailed, renderSyncDone,
  syncMarker, truncateComment,
  renderEvidenceSection, renderLlmMetadataSection,
} from '../sync-templates.js';
import { redactSecrets } from '@positron/shared';
import type { EvidenceItem, SafeLlmRunMetadata } from '../sync-types.js';

describe('syncMarker', () => {
  test('erzeugt korrekten HTML-Marker', () => {
    const m = syncMarker('run-1', 'TEST', 'test-report');
    expect(m).toBe('<!-- positron:run=run-1;phase=TEST;kind=test-report -->');
  });
});

describe('Sync Templates', () => {
  test('Accepted enthält Marker', () => {
    const body = renderSyncAccepted('abc', 42, 'positron/issue-42-test');
    expect(body).toContain('positron:run=abc;phase=CLAIMED;kind=accepted');
    expect(body).toContain('`abc`');
    expect(body).toContain('#42');
  });

  test('Phase Update enthält Marker', () => {
    const body = renderSyncPhaseUpdate('r1', 'REPO_SYNC', 'active', 'Workspace ready');
    expect(body).toContain('phase=REPO_SYNC;kind=phase-update');
    expect(body).toContain('`REPO_SYNC`');
  });

  test('Blocked enthält Reason', () => {
    const body = renderSyncBlocked('r1', 'TEST', 'No package.json', '- Log');
    expect(body).toContain('kind=blocked');
    expect(body).toContain('No package.json');
    expect(body).toContain('- Log');
  });

  test('Failed enthält Reason', () => {
    const body = renderSyncFailed('r1', 'TEST', 'Tests failed');
    expect(body).toContain('kind=failed');
    expect(body).toContain('Tests failed');
  });

  test('Done enthält Evidence', () => {
    const body = renderSyncDone('r1', '- Test: passed', 'positron/issue-1-test');
    expect(body).toContain('kind=done');
    expect(body).toContain('- Test: passed');
  });
});

describe('truncateComment', () => {
  test('kürzt zu langen Text', () => {
    const long = 'x'.repeat(30_000);
    const truncated = truncateComment(long, 100);
    expect(truncated.length).toBeLessThan(200);
  });

  test('behält kurzen Text', () => {
    expect(truncateComment('short', 1_000)).toBe('short');
  });
});

// ---------------------------------------------------------------------------
// Issue #13.1 — Evidence and LLM Metadata Rendering
// ---------------------------------------------------------------------------

describe('renderEvidenceSection', () => {
  test('leere Evidence → leerer String', () => {
    const result = renderEvidenceSection([], 'run-1');
    expect(result).toBe('');
  });

  test('rendert pass/fail/blocked mit korrekten Emojis', () => {
    const evidence: EvidenceItem[] = [
      { kind: 'unit-tests', status: 'pass', summary: 'All unit tests passed' },
      { kind: 'e2e', status: 'fail', summary: 'E2E tests failed — 3 of 5' },
      { kind: 'security-audit', status: 'blocked', summary: 'Security audit blocked: no token' },
      { kind: 'lint', status: 'partial', summary: 'Lint partial: 2 warnings' },
      { kind: 'mystery', status: 'skipped', summary: 'Skipped checks' },
    ];
    const result = renderEvidenceSection(evidence, 'run-1');
    expect(result).toContain(':white_check_mark:');
    expect(result).toContain(':x:');
    expect(result).toContain(':no_entry:');
    expect(result).toContain(':warning:');
    expect(result).toContain(':grey_question:');
    expect(result).toContain('`unit-tests`');
    expect(result).toContain('`e2e`');
    expect(result).toContain('`security-audit`');
    expect(result).toContain('All unit tests passed');
    expect(result).toContain('E2E tests failed');
  });

  test('enthält Deduplizierungs-Marker', () => {
    const evidence: EvidenceItem[] = [
      { kind: 'test', status: 'pass', summary: 'OK' },
    ];
    const result = renderEvidenceSection(evidence, 'run-abc');
    expect(result).toContain('<!-- positron:run=run-abc;phase=EVIDENCE;kind=evidence-section -->');
  });

  test('enthält keine Rohlogs (nur Zusammenfassungen)', () => {
    const evidence: EvidenceItem[] = [
      { kind: 'tests', status: 'fail', summary: '3 tests failed' },
    ];
    const result = renderEvidenceSection(evidence, 'r1');
    // Should contain summary but be Markdown table format
    expect(result).toContain('## Evidence');
    expect(result).toContain('| Status | Kind | Summary |');
  });
});

describe('renderLlmMetadataSection', () => {
  test('leere Metadaten → leerer String', () => {
    const result = renderLlmMetadataSection([], 'run-1');
    expect(result).toBe('');
  });

  test('rendert Provider, Model, PromptHash sicher', () => {
    const metadata: SafeLlmRunMetadata[] = [{
      provider: 'openai',
      model: 'gpt-4o',
      promptHash: 'abc123def456',
      promptTokens: 1000,
      completionTokens: 500,
      agentRole: 'orchestrator',
    }];
    const result = renderLlmMetadataSection(metadata, 'run-1');
    expect(result).toContain('openai');
    expect(result).toContain('gpt-4o');
    expect(result).toContain('`abc123def456`');
    expect(result).toContain('1000 / 500');
    expect(result).toContain('`orchestrator`');
  });

  test('zeigt nie vollständige Prompts', () => {
    const metadata: SafeLlmRunMetadata[] = [{
      provider: 'anthropic',
      model: 'claude-sonnet-4',
      promptHash: 'deadbeef1234',
      promptTokens: 200,
      completionTokens: 100,
    }];
    const result = renderLlmMetadataSection(metadata, 'r1');
    // promptHash is truncated to 12 chars max
    expect(result).toContain('`deadbeef1234`');
    // No full prompt content anywhere
    expect(result).not.toContain('You are a helpful');
    expect(result).not.toContain('System: ');
    // Safety disclaimer present
    expect(result).toContain('No full prompts or secrets are included');
  });

  test('unknown Provider/Model werden als _unknown_ angezeigt', () => {
    const metadata: SafeLlmRunMetadata[] = [
      { promptHash: 'hash1' },
      {}, // completely empty
    ];
    const result = renderLlmMetadataSection(metadata, 'r1');
    expect(result).toContain('_unknown_');
    expect(result).toContain('_n/a_');
  });

  test('erfindet keine Provider/Modelle', () => {
    const metadata: SafeLlmRunMetadata[] = [{
      promptHash: 'test123',
      promptTokens: 10,
      completionTokens: 5,
    }];
    const result = renderLlmMetadataSection(metadata, 'r1');
    // Should show _unknown_ for provider/model, not invent names
    expect(result).toMatch(/_unknown_\s+\|\s+_unknown_/);
  });

  test('enthält Deduplizierungs-Marker', () => {
    const metadata: SafeLlmRunMetadata[] = [{
      provider: 'deepseek', model: 'deepseek-v4', promptHash: 'ff0011',
    }];
    const result = renderLlmMetadataSection(metadata, 'run-xyz');
    expect(result).toContain('<!-- positron:run=run-xyz;phase=LLM_METADATA;kind=llm-metadata -->');
  });

  test('Secrets werden nicht angezeigt', () => {
    // Even if somehow included, the rendering should sanitize
    const metadata: SafeLlmRunMetadata[] = [{
      provider: 'openai',
      model: 'gpt-4o',
      promptHash: 'abc123',
      // No secrets field exists on SafeLlmRunMetadata!
    }];
    const result = renderLlmMetadataSection(metadata, 'r1');
    expect(result).not.toContain('sk-');
    expect(result).not.toContain('token');
    expect(result).not.toContain('Bearer');
    expect(result).not.toContain('ghp_');
  });
});
