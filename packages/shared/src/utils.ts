// Positron — Utility-Funktionen

import { randomUUID } from 'node:crypto';
import { BRANCH_PREFIX, MAX_BRANCH_SLUG_LENGTH } from './constants.js';

// Branch-Namen ---------------------------------------------------------------

export function generateBranchName(issueNumber: number, title: string): string {
  const slug = title
    .toLowerCase()
    // Deutsche Umlaute und ß normalisieren
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_BRANCH_SLUG_LENGTH)
    .replace(/-+$/, '');
  return `${BRANCH_PREFIX}-${issueNumber}-${slug}`;
}

// Secret-Redaction ------------------------------------------------------------

export interface RedactionRule {
  name: string;
  pattern: RegExp;
  replacement: string;
}

export const DEFAULT_REDACTION_RULES: readonly RedactionRule[] = [
  { name: 'github-token', pattern: /gh[pousr]_[A-Za-z0-9_]{20,}/g, replacement: '[REDACTED_GITHUB_TOKEN]' },
  { name: 'github-pat', pattern: /github_pat_[A-Za-z0-9_]{20,}/g, replacement: '[REDACTED_GITHUB_PAT]' },
  { name: 'bearer-token', pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, replacement: 'Bearer [REDACTED]' },
  { name: 'openai-key', pattern: /\bsk-[A-Za-z0-9]{32,}\b/g, replacement: '[REDACTED_OPENAI_KEY]' },
  { name: 'anthropic-key', pattern: /\banthropic_[A-Za-z0-9]{20,}\b/g, replacement: '[REDACTED_ANTHROPIC_KEY]' },
  { name: 'gemini-key', pattern: /\bgemini_[A-Za-z0-9]{20,}\b/g, replacement: '[REDACTED_GEMINI_KEY]' },
  { name: 'api-key-value', pattern: /\b(api[_-]?key|token|secret)\s*[:=]\s*[^\s,;]+/gi, replacement: '$1=[REDACTED]' },
];

export function redactSecrets(input: string, rules: readonly RedactionRule[] = DEFAULT_REDACTION_RULES): string {
  return rules.reduce((value, rule) => value.replace(rule.pattern, rule.replacement), input);
}

export function redactValue(input: unknown): string {
  const text = typeof input === 'string' ? input : safeStringify(input);
  return redactSecrets(text);
}

function safeStringify(value: unknown): string {
  try { return JSON.stringify(value); } catch { return String(value); }
}

// ID-Generierung -------------------------------------------------------------

export function createRunId(): string {
  return randomUUID();
}

export type IdGenerator = () => string;
