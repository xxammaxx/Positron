import { describe, expect, test } from 'vitest';
import { generateBranchName } from '../../utils.js';

describe('generateBranchName', () => {
  test('korrekter Branch-Name', () => {
    expect(generateBranchName(12, 'Screenshot-Tool hinzufügen')).toBe('positron/issue-12-screenshot-tool-hinzufuegen');
  });

  test('entfernt Sonderzeichen', () => {
    expect(generateBranchName(5, 'fix: auth / login (urgent)!')).toBe('positron/issue-5-fix-auth-login-urgent');
  });

  test('konvertiert zu lowercase', () => {
    expect(generateBranchName(3, 'ADD E2E Tests')).toBe('positron/issue-3-add-e2e-tests');
  });

  test('entfernt führende/abschließende Bindestriche', () => {
    expect(generateBranchName(7, ' - cleanup - ')).toBe('positron/issue-7-cleanup');
  });

  test('kürzt langen Titel', () => {
    const title = 'a'.repeat(100);
    const result = generateBranchName(42, title);
    expect(result.length).toBeLessThanOrEqual('positron/issue-42-'.length + 50);
  });

  test('Titel nur aus Sonderzeichen', () => {
    expect(generateBranchName(9, '!!!???---')).toBe('positron/issue-9');
  });
});
