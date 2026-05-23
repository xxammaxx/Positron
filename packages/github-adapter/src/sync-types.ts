// Positron — Sync Types: Evidence and LLM Metadata (Issue #13.1)

/**
 * Sichere, redacted LLM-Metadaten für GitHub-Kommentare.
 * Enthält KEINE vollständigen Prompts oder Secrets.
 */
export interface SafeLlmRunMetadata {
  /** Provider-Name (z.B. 'openai', 'anthropic', 'deepseek') — nur wenn bekannt */
  provider?: string;
  /** Model-ID (z.B. 'gpt-4o', 'claude-sonnet-4') — nur wenn bekannt */
  model?: string;
  /** Hash des System-Prompts (SHA-256, erste 12 Zeichen) */
  promptHash?: string;
  /** Hash des User-Prompts (SHA-256, erste 12 Zeichen) */
  userPromptHash?: string;
  /** Anzahl der Tokens im Prompt (wenn messbar) */
  promptTokens?: number;
  /** Anzahl der Tokens in der Antwort (wenn messbar) */
  completionTokens?: number;
  /** Temperatur-Wert (wenn bekannt) */
  temperature?: number;
  /** LLM-Agenten-Rolle (z.B. 'orchestrator', 'implementer', 'reviewer') */
  agentRole?: string;
  /** Timestamp des LLM-Calls (ISO 8601) */
  timestamp?: string;
}

/**
 * Einzelnes Evidence-Item für GitHub-Kommentare.
 * Fasst Tests, Screenshots, Logs und Artefakte zusammen.
 * Keine Rohlogs — nur Zusammenfassungen und Artefaktverweise.
 */
export interface EvidenceItem {
  /** Kurzer Bezeichner (z.B. 'unit-tests', 'e2e-screenshot', 'security-audit') */
  kind: string;
  /** Status: pass, fail, blocked, skipped, partial */
  status: 'pass' | 'fail' | 'blocked' | 'skipped' | 'partial';
  /** Menschenlesbare Zusammenfassung (max. 500 Zeichen) */
  summary: string;
  /** Pfad zum Artefakt (z.B. 'reports/test-report.json') — relativ */
  artifactPath?: string;
  /** Timestamp der Evidenz-Erstellung */
  timestamp?: string;
}

/**
 * Erweiterung des GitHubStatusSyncInput um Evidence- und LLM-Metadata-Support.
 * Wird als Teil des Sync-Inputs verwendet, nicht als eigenständiger Typ.
 */
export interface SyncEvidenceInput {
  /** Evidence-Items für den GitHub-Kommentar */
  evidence?: EvidenceItem[];
  /** Sichere LLM-Metadaten für den GitHub-Kommentar */
  llmMetadata?: SafeLlmRunMetadata[];
}
