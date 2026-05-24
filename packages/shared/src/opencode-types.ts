// Positron — OpenCode Typdefinitionen

/** OpenCode Adapter Phasen */
export type OpenCodePhase =
  | 'health'
  | 'constitution'
  | 'specify'
  | 'clarify'
  | 'plan'
  | 'tasks'
  | 'analyze'
  | 'checklist'
  | 'implement';

/** OpenCode Kommando-Status */
export type OpenCodeCommandStatus = 'success' | 'failed' | 'blocked' | 'skipped';

/** OpenCode CLI Health-Check Ergebnis */
export interface OpenCodeHealth {
  /** true wenn CLI gefunden und ausführbar */
  available: boolean;
  /** Installierte Version */
  version?: string;
  /** Pfad zum CLI-Binary */
  commandPath?: string;
  /** Grund warum nicht verfügbar */
  reason?: string;
}

/** Ergebnis eines OpenCode Kommandos */
export interface OpenCodeCommandResult {
  /** Ausgeführte Phase */
  phase: OpenCodePhase;
  /** Ergebnis-Status */
  status: OpenCodeCommandStatus;
  /** Ausgeführtes Kommando */
  command: string;
  /** Kommando-Argumente (Array, kein shell-string) */
  args: string[];
  /** Working Directory */
  cwd: string;
  /** Exit Code */
  exitCode: number | null;
  /** Dauer in ms */
  durationMs: number;
  /** Pfad zur stdout-Logdatei */
  stdoutPath?: string;
  /** Pfad zur stderr-Logdatei */
  stderrPath?: string;
  /** Zusammenfassung */
  summary: string;
  /** Grund für Blockierung */
  blockedReason?: string;
  /** Session-ID (falls OpenCode eine Session gestartet hat) */
  sessionId?: string;
}

/** Input für OpenCode Adapter-Methoden */
export interface OpenCodeRunInput {
  /** Run-ID */
  runId: string;
  /** Workspace-Pfad */
  workspacePath: string;
  /** Issue-Titel */
  issueTitle: string;
  /** Issue-Body */
  issueBody?: string;
  /** Issue-Nummer */
  issueNumber?: number;
  /** Adapter-Modus */
  mode?: 'detect-only' | 'safe-cli';
  /** OpenCode Modell (provider/model) */
  model?: string;
  /** Autonomie-Level (0-4) */
  autonomyLevel?: number;
}

/** OpenCode Adapter Interface */
export interface OpenCodeAdapter {
  /** Prüft ob OpenCode CLI verfügbar ist */
  healthCheck(workspacePath: string): Promise<OpenCodeHealth>;
  /**
   * Führt einen Spec Kit Slash Command über OpenCode aus.
   *
   * Unterstützte Commands: speckit.specify, speckit.plan, speckit.tasks,
   * speckit.analyze, speckit.constitution, speckit.clarify
   */
  runSlashCommand(command: string, input: OpenCodeRunInput): Promise<OpenCodeCommandResult>;
  /**
   * Führt OpenCode mit einem freien Prompt aus (IMPLEMENT-Phase).
   * Dies ist die Phase, in der OpenCode tatsächlich Code ändern kann.
   */
  runImplement(input: OpenCodeRunInput): Promise<OpenCodeCommandResult>;
}
