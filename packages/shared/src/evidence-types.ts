// Positron — Evidence, Context Manifest, and Reviewer type definitions
// Derived from:
//   - docs/agent/VIBE_CODING_CONTEXT_MANIFEST_TEMPLATE.md
//   - docs/agent/VIBE_CODING_EVIDENCE_LOG_TEMPLATE.md
//   - docs/review/REVIEWER_AGENT_CONTRACT.md
//   - docs/testing/VIBE_CODING_VERIFICATION_CONTRACT.md

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Regex für UUID v4-Erkennung (Standard-Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx).
 */
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Vereinfachter ISO8601-Validator.
 * Erlaubt Datum + Zeit mit/without T- und Z-Suffix sowie Offset.
 */
const ISO8601_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

// ---------------------------------------------------------------------------
// Gate / Artifact helper types
// ---------------------------------------------------------------------------

/**
 * Ergebnis eines einzelnen Qualitätsgates.
 * Wird innerhalb von EvidenceLog verwendet, um den Status jedes Pipeline-Gates
 * maschinenlesbar zu dokumentieren.
 */
export interface EvidenceGateResult {
  /** Name des Gates (z. B. "test_run", "ci_status", "security_scan") */
  name: string;
  /** Status-Durchlauf */
  status: 'pass' | 'fail' | 'partial' | 'skipped';
  /** Belege / Metadaten, die das Gate-Ergebnis stützen */
  evidence: Record<string, unknown>;
}

/**
 * Ein einzelnes Artefakt mit SHA-256-Integritätshash.
 */
export interface EvidenceArtifact {
  /** Art des Artefakts (z. B. "test-report", "diff", "screenshot") */
  kind: string;
  /** Relativer Pfad innerhalb des Run-Verzeichnisses */
  path: string;
  /** SHA-256-Hex-Hash zur Integritätsprüfung */
  sha256: string;
  /** Dateigrösse in Bytes */
  sizeBytes: number;
}

// ---------------------------------------------------------------------------
// 1. ContextManifest
// ---------------------------------------------------------------------------

/**
 * Strukturierte Brücke zwischen Positrons Orchestrator und dem Coding-Agenten.
 *
 * Enthält alle Informationen, die der Agent für seine Arbeit benötigt:
 * Issue-Kontext, Repository, Workspace, Spec, Verification Contract,
 * Agenten-Deklaration und Evidence-Anforderungen.
 *
 * @see docs/agent/VIBE_CODING_CONTEXT_MANIFEST_TEMPLATE.md
 */
export interface ContextManifest {
  /** Schema-Version des Manifests */
  manifestVersion: string;
  /** ISO8601-Zeitstempel der Erzeugung */
  generatedAt: string;
  /** Name des erzeugenden Systems (z. B. "positron-orchestrator") */
  generatedBy: string;

  /** Laufzeit-Informationen zum aktuellen Run */
  run: {
    /** Eindeutige Run-ID (UUID v4) */
    id: string;
    /** Aktuelle Pipeline-Phase */
    phase: string;
    /** Autonomie-Level (0 = Observer, 4 = CI Auto-PR) */
    autonomyLevel: number;
    /** Aktueller Versuch (1-based) */
    attempt: number;
    /** Maximale Anzahl von Versuchen */
    maxAttempts: number;
  };

  /** GitHub-Issue, das diesen Run ausgelöst hat */
  issue: {
    /** Issue-Nummer */
    number: number;
    /** Issue-Titel */
    title: string;
    /** Vollständiger Issue-Text (Body) */
    body: string;
    /** Issue-Label */
    labels: string[];
    /** Vollständige URL zum Issue */
    url: string;
  };

  /** Repository-Metadaten */
  repository: {
    /** Repository-Owner (User oder Organisation) */
    owner: string;
    /** Repository-Name */
    name: string;
    /** Name des Default-Branches (meist "main") */
    defaultBranch: string;
    /** Remote-URL (z. B. https://github.com/xxammaxx/Positron.git) */
    remoteUrl: string;
    /** Haupt-Programmiersprache (z. B. "typescript") */
    language: string;
    /** Paketmanager (z. B. "npm") */
    packageManager: string;
    /** Runtime-Anforderung (z. B. "node >= 22") */
    runtime: string;
  };

  /** Isolierter Workspace für den Run */
  workspace: {
    /** Absoluter Pfad zum Workspace */
    path: string;
    /** Branch-Name (z. B. "positron/issue-42-slug") */
    branch: string;
    /** Basis-Commit-Hash (vor Änderungen) */
    baseCommit: string;
    /** Isolationsmechanismus (z. B. "worktree", "sandbox") */
    isolation: string;
  };

  /** Referenz auf die Spezifikations-Artefakte (optional) */
  specification?: {
    /** Ob Spezifikations-Artefakte existieren */
    exists: boolean;
    /** Pfad zur Spezifikations-Datei */
    path: string;
    /** Map von Artefakt-Typ zu Pfad (z. B. constitution, spec, plan, tasks) */
    artifacts: Record<string, string>;
  };

  /** Referenz auf den Verification Contract (optional) */
  verificationContract?: {
    /** Ob ein Contract existiert */
    exists: boolean;
    /** Pfad zur Contract-Datei */
    path: string;
    /** Prüfbare Akzeptanzkriterien */
    acceptanceCriteria: string[];
    /** Erforderliche Gates */
    requiredGates: string[];
    /** Verbotene Ergebnisse */
    forbiddenOutcomes: string[];
  };

  /** Red-Test-Konfiguration (optional) */
  redTests?: {
    /** Ob Red Tests existieren (vor der Implementierung geschrieben) */
    exist: boolean;
    /** Pfade zu den Red-Test-Dateien */
    paths: string[];
    /** Test-Frameworks (z. B. ["vitest"]) */
    frameworks: string[];
    /** Erwartete Anzahl fehlschlagender Tests */
    expectedFailures: number;
  };

  /** Kontext für den Agenten: betroffene Module, bestehende Tests, etc. */
  context: {
    /** Module, die geändert werden sollen */
    affectedModules: string[];
    /** Bereits vorhandene Tests */
    existingTests: string[];
    /** Typdefinition-Dateien */
    typeDefinitions: string[];
    /** Konfigurationsdateien */
    configurationFiles: string[];
    /** Kürzliche Änderungen (Commit-Hashes oder Datei:Timestamp-Marker) */
    recentChanges: string[];
  };

  /** Abhängigkeiten (optional, für Sicherheits-Scans) */
  dependencies?: {
    /** Produktions-Dependencies (package → version) */
    production: Record<string, string>;
    /** Entwicklungs-Dependencies (package → version) */
    development: Record<string, string>;
    /** Bekannte Sicherheitswarnungen */
    securityAlerts: string[];
  };

  /** Agenten-Deklaration */
  agent: {
    /** Agent-Typ (z. B. "opencode", "codex", "claude-code") */
    type: string;
    /** Formale Capability-Deklaration */
    declaration: {
      /** Liste der Capabilities (z. B. ["repo_read", "code_write"]) */
      capabilities: string[];
      /** Vertrauensstufe (0–4) */
      trustTier: number;
      /** Risikostufe */
      riskLevel: string;
      /** Pfade, auf die der Agent zugreifen darf */
      allowedPaths: string[];
      /** Pfade, die für den Agenten gesperrt sind */
      deniedPaths: string[];
    };
  };

  /** Constraints, die den Agenten binden */
  constraints: {
    /** Pfad zur Constitution-Datei */
    constitution: string;
    /** Zusätzliche Policy-Referenzen */
    policies: string[];
  };

  /** Welche Evidence-Artefakte für diesen Run erforderlich sind */
  evidenceRequirements: {
    /** Test-Report erforderlich */
    testReport: boolean;
    /** Diff-Zusammenfassung erforderlich */
    diffSummary: boolean;
    /** CI-Status erforderlich */
    ciStatus: boolean;
    /** Preview-Screenshot erforderlich */
    previewScreenshot: boolean;
    /** Security-Scan erforderlich */
    securityScan: boolean;
    /** Reviewer-Verdikt erforderlich */
    reviewerVerdict: boolean;
    /** Menschliche Genehmigung erforderlich */
    humanApproval: boolean;
  };

  /** Ausgabepfade für Artefakte */
  output: {
    /** Verzeichnis für Evidence-Artefakte */
    evidenceDir: string;
    /** Verzeichnis für sonstige Run-Artefakte */
    artifactDir: string;
  };
}

// ---------------------------------------------------------------------------
// 2. validateContextManifest
// ---------------------------------------------------------------------------

/**
 * Validiert ein ContextManifest und gibt eine Liste von Fehlermeldungen zurück.
 * Ein leeres Array bedeutet "gültig".
 *
 * Prüft:
 * - Pflichtfelder auf Leere
 * - UUID-Format der run.id
 * - issue.number > 0
 * - Evidence-Anforderungen (mindestens testReport: true)
 * - ISO8601-Format von generatedAt
 * - Secret-Muster in allen String-Feldern
 */
export function validateContextManifest(manifest: ContextManifest): string[] {
  const errors: string[] = [];

  // -- Defensive: handle completely missing sub-objects --
  if (!manifest || typeof manifest !== 'object') {
    errors.push('manifest must be a valid object');
    return errors;
  }

  // -- Pflichtfelder (non-empty) --
  if (!manifest.manifestVersion) errors.push('manifestVersion must be non-empty');
  if (!manifest.generatedBy) errors.push('generatedBy must be non-empty');
  if (!manifest.run?.id) errors.push('run.id must be non-empty');
  if (!manifest.issue?.title) errors.push('issue.title must be non-empty');
  if (!manifest.repository?.owner) errors.push('repository.owner must be non-empty');
  if (!manifest.repository?.name) errors.push('repository.name must be non-empty');
  if (!manifest.workspace?.path) errors.push('workspace.path must be non-empty');
  if (!manifest.agent?.type) errors.push('agent.type must be non-empty');
  if (!manifest.constraints?.constitution) errors.push('constraints.constitution must be non-empty');

  // -- Numerische Checks --
  if (!(manifest.issue?.number! > 0)) errors.push('issue.number must be > 0');

  // -- UUID-Format --
  if (manifest.run?.id && !UUID_V4_RE.test(manifest.run.id)) {
    errors.push('run.id must be a valid UUID v4');
  }

  // -- ISO8601 --
  if (manifest.generatedAt && !ISO8601_RE.test(manifest.generatedAt)) {
    errors.push('generatedAt must be a valid ISO8601 string');
  }

  // -- Evidence-Anforderungen: mindestens testReport: true --
  if (!manifest.evidenceRequirements?.testReport) {
    errors.push('evidenceRequirements.testReport must be true');
  }

  // -- Secret-Prüfung auf allen String-Feldern --
  const stringFields = collectStringValues(manifest);
  for (const { path: fieldPath, value } of stringFields) {
    if (isSecretPattern(value)) {
      errors.push(`Secret pattern detected in ${fieldPath}`);
    }
  }

  // -- Context-Ownership/Freshness-Marker --
  // Wenn context.recentChanges befüllt ist, sollten Einträge Marker enthalten
  // (z. B. "datei.ts:abc123def" oder "datei.ts@2026-06-10").
  if (
    manifest.context?.recentChanges &&
    manifest.context.recentChanges.length > 0
  ) {
    for (let i = 0; i < manifest.context.recentChanges.length; i++) {
      const entry = manifest.context.recentChanges[i]!;
      if (!entry.includes(':') && !entry.includes('@') && entry.length < 15) {
        errors.push(
          `context.recentChanges[${i}] is missing an ownership/freshness marker ` +
            `(expected format "path:commitSha" or "path@timestamp")`,
        );
      }
    }
  }

  return errors;
}

/**
 * Sammelt rekursiv alle String-Werte aus einem Objekt für die Secret-Prüfung.
 * Gibt eine flache Liste mit Feld-Pfaden und Werten zurück.
 */
function collectStringValues(
  obj: unknown,
  prefix = '',
  depth = 0,
): { path: string; value: string }[] {
  const results: { path: string; value: string }[] = [];
  const MAX_DEPTH = 10;
  if (depth > MAX_DEPTH || obj === null || obj === undefined) return results;

  if (typeof obj === 'string') {
    results.push({ path: prefix || '(root)', value: obj });
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      results.push(...collectStringValues(obj[i], `${prefix}[${i}]`, depth + 1));
    }
  } else if (typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const childPath = prefix ? `${prefix}.${key}` : key;
      results.push(...collectStringValues(val, childPath, depth + 1));
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// 3. EvidenceLog
// ---------------------------------------------------------------------------

/**
 * Strukturierter Run-Evidence-Log, der als GitHub-Issue-Kommentar gepostet wird.
 *
 * Enthält alle Gate-Ergebnisse, Artefakt-Hashes, den Reviewer-Verdikt,
 * die menschliche Genehmigung und die Merge-Entscheidung.
 *
 * @see docs/agent/VIBE_CODING_EVIDENCE_LOG_TEMPLATE.md
 */
export interface EvidenceLog {
  /** Eindeutige Run-ID */
  runId: string;
  /** Nummer des zugehörigen GitHub-Issues */
  issueNumber: number;
  /** Branch-Name */
  branch: string;

  /** Agent, der den Run ausgeführt hat */
  agent: {
    /** Agent-Typ (z. B. "opencode") */
    type: string;
    /** Agent-Version */
    version: string;
    /** Deklarierte Capabilities */
    capabilities: string[];
  };

  /** Zeitliche Metadaten des Runs */
  timing: {
    /** ISO8601-Startzeit */
    startedAt: string;
    /** ISO8601-Endzeit */
    completedAt: string;
    /** Dauer in Millisekunden */
    durationMs: number;
  };

  /** Ergebnisse aller durchlaufenen Gates */
  gates: EvidenceGateResult[];

  /** Verdikt des Reviewer-Agenten */
  reviewerVerdict: ReviewReport;

  /** Liste der erzeugten Artefakte */
  artifacts: EvidenceArtifact[];

  /** Menschliche Genehmigung (falls erforderlich) */
  humanApproval: {
    /** Ob menschliche Genehmigung erforderlich ist */
    required: boolean;
    /** Ob die Genehmigung erteilt wurde */
    approved: boolean;
    /** Genehmigender Benutzer (optional) */
    approvedBy?: string;
    /** ISO8601-Zeitstempel der Genehmigung (optional) */
    approvedAt?: string;
  };

  /** Merge-Status und PR-Informationen */
  merge: {
    /** Pull-Request-Nummer */
    prNumber: number;
    /** Vollständige PR-URL */
    prUrl: string;
    /** Ob der PR mergebar ist */
    mergeable: boolean;
    /** Ob der PR bereits gemerged wurde */
    merged: boolean;
    /** Blockierende Faktoren */
    blockers: string[];
  };
}

// ---------------------------------------------------------------------------
// 4. validateEvidenceLog
// ---------------------------------------------------------------------------

/**
 * Validiert einen EvidenceLog und gibt eine Liste von Fehlermeldungen zurück.
 *
 * Prüft:
 * - runId non-empty
 * - issueNumber > 0
 * - timing.durationMs >= 0
 * - Gates nicht leer
 * - Kein 'pass' ohne evidence
 * - Strukturelle Konsistenz bei merge.merged === true
 * - humanApproval-Konsistenz
 */
export function validateEvidenceLog(log: EvidenceLog): string[] {
  const errors: string[] = [];

  // -- Pflichtfelder --
  if (!log.runId) errors.push('runId must be non-empty');
  if (!(log.issueNumber > 0)) errors.push('issueNumber must be > 0');
  if (log.timing.durationMs < 0) errors.push('timing.durationMs must be >= 0');

  // -- Menschliche Genehmigung --
  if (log.humanApproval.required && !log.humanApproval.approved) {
    errors.push('human approval is required but not approved');
  }
  if (log.humanApproval.approved && !log.humanApproval.approvedBy) {
    errors.push('humanApproval.approvedBy must be set when approved is true');
  }
  if (log.humanApproval.approved && !log.humanApproval.approvedAt) {
    errors.push('humanApproval.approvedAt must be set when approved is true');
  }

  // -- Gates müssen existieren --
  if (!log.gates || log.gates.length === 0) {
    errors.push('gates array must not be empty');
  }

  // -- Ein Gate darf nicht 'pass' ohne evidence behaupten --
  for (const gate of log.gates) {
    if (
      gate.status === 'pass' &&
      (gate.evidence === undefined ||
        gate.evidence === null ||
        Object.keys(gate.evidence).length === 0)
    ) {
      errors.push(
        `Gate "${gate.name}" claims 'pass' but has no evidence`,
      );
    }

    // Strukturelle Prüfung: Gate "test_run" mit 'pass' und fehlenden Tests
    if (
      gate.status === 'pass' &&
      gate.name === 'test_run' &&
      typeof gate.evidence === 'object' &&
      gate.evidence !== null
    ) {
      const ev = gate.evidence as Record<string, unknown>;
      if (
        typeof ev.passed === 'number' &&
        typeof ev.total === 'number' &&
        ev.passed < ev.total
      ) {
        errors.push(
          `Gate "${gate.name}" claims 'pass' but test results show ` +
            `${ev.passed}/${ev.total} passing`,
        );
      }
    }
  }

  // -- Wenn merge.merged true, müssen alle Gates 'pass' oder 'partial' sein --
  if (log.merge.merged && log.gates.length > 0) {
    for (const gate of log.gates) {
      if (gate.status !== 'pass' && gate.status !== 'partial') {
        errors.push(
          `Cannot merge: gate "${gate.name}" has status "${gate.status}". ` +
            `All gates must be 'pass' or 'partial' when merged is true.`,
        );
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// 5. ReviewReport + 6. ReviewFinding
// ---------------------------------------------------------------------------

/**
 * Ein einzelner Prüfungsbefund des Reviewer-Agenten.
 */
export interface ReviewFinding {
  /** Eindeutige ID (z. B. "REV-W001") */
  id: string;
  /** Schweregrad */
  severity: 'blocking' | 'warning' | 'info';
  /** Kategorie (z. B. "implementationQuality", "securitySurface") */
  category: string;
  /** Menschlich lesbare Beschreibung */
  description: string;
  /** Dateipfad oder Evidence-Referenz (optional) */
  location?: string;
  /** Empfehlung zur Behebung */
  recommendation: string;
}

/**
 * Maschinenlesbarer Report des Reviewer-Agenten.
 *
 * Der Reviewer validiert Änderungen gegen den Verification Contract
 * und erzeugt diesen Report als Grundlage für die Merge-Entscheidung.
 *
 * @see docs/review/REVIEWER_AGENT_CONTRACT.md
 */
export interface ReviewReport {
  /** Gesamt-Verdikt */
  verdict: 'pass' | 'changes_requested' | 'fail';

  /** Blockierende Befunde (verhindern Merge) */
  blockingFindings: ReviewFinding[];
  /** Nicht-blockierende Befunde (Warnungen/Hinweise) */
  nonBlockingFindings: ReviewFinding[];

  /**
   * Ergebnisse der Checklisten-Kategorien.
   * Bekannte Schlüssel: issueFulfilment, specAlignment, redTestVerification,
   * implementationQuality, securitySurface, mockDetection, uiVerification,
   * evidenceIntegrity.
   */
  checklistResults: Record<
    string,
    'pass' | 'fail' | 'partial' | 'warning' | 'not_applicable'
  >;

  /** Evidence-Artefakte, die tatsächlich geprüft wurden */
  evidenceChecked: string[];
  /** Evidence-Artefakte, die erwartet, aber nicht gefunden wurden */
  missingEvidence: string[];

  /** Risikostufe */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Ob menschliche Genehmigung erforderlich ist */
  humanApprovalRequired: boolean;

  /** Zusammenfassung des Reviews */
  summary: string;
  /** Liste von Empfehlungen */
  recommendations: string[];

  /** ISO8601-Zeitstempel des Reviews */
  reviewedAt: string;
  /** Name/Versionsbezeichnung des Reviewers (z. B. "review-agent v1.0") */
  reviewedBy: string;
}

// ---------------------------------------------------------------------------
// 7. validateReviewReport
// ---------------------------------------------------------------------------

/**
 * Validiert einen ReviewReport und gibt eine Liste von Fehlermeldungen zurück.
 *
 * Prüft:
 * - Kein 'pass'-Verdikt bei blockierenden Befunden
 * - Kein 'pass' ohne evidenceChecked
 * - Kein 'pass' mit missingEvidence
 * - riskLevel konsistent zum verdict
 * - fail → humanApprovalRequired
 * - Befund-Severity konsistent zur Kategorie
 */
export function validateReviewReport(report: ReviewReport): string[] {
  const errors: string[] = [];

  // -- Verdict: 'pass' darf keine blocking findings haben --
  if (
    report.verdict === 'pass' &&
    report.blockingFindings.length > 0
  ) {
    errors.push(
      'Reviewer cannot give "pass" verdict when blockingFindings is non-empty',
    );
  }

  // -- Verdict: 'pass' erfordert evidenceChecked --
  if (report.verdict === 'pass' && report.evidenceChecked.length === 0) {
    errors.push(
      'Reviewer cannot give "pass" verdict when evidenceChecked is empty',
    );
  }

  // -- Verdict: 'pass' darf kein missingEvidence haben (ausser optional) --
  if (
    report.verdict === 'pass' &&
    report.missingEvidence.length > 0
  ) {
    // Da wir nicht wissen können, welche optional sind, ist non-empty immer ein Problem
    errors.push(
      'Reviewer cannot give "pass" verdict when missingEvidence is non-empty',
    );
  }

  // -- riskLevel muss zum verdict passen --
  if (report.verdict === 'fail') {
    if (report.riskLevel !== 'high' && report.riskLevel !== 'critical') {
      errors.push(
        `Verdict is "fail" but riskLevel is "${report.riskLevel}". ` +
          `Expected "high" or "critical".`,
      );
    }
  }

  // -- fail → humanApprovalRequired muss true sein --
  if (report.verdict === 'fail' && !report.humanApprovalRequired) {
    errors.push(
      'When verdict is "fail", humanApprovalRequired must be true',
    );
  }

  // -- Blocking findings müssen severity 'blocking' haben --
  for (const finding of report.blockingFindings) {
    if (finding.severity !== 'blocking') {
      errors.push(
        `Blocking finding "${finding.id}" has severity "${finding.severity}", ` +
          `expected "blocking"`,
      );
    }
  }

  // -- Non-blocking findings müssen severity 'warning' oder 'info' haben --
  for (const finding of report.nonBlockingFindings) {
    if (finding.severity !== 'warning' && finding.severity !== 'info') {
      errors.push(
        `Non-blocking finding "${finding.id}" has severity "${finding.severity}", ` +
          `expected "warning" or "info"`,
      );
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// 8. VerificationContract
// ---------------------------------------------------------------------------

/**
 * Maschinenlesbarer Verification Contract, der VOR jeder Implementierung
 * aus der Specification abgeleitet wird.
 *
 * Der Contract dient als "Source of Truth" für alle nachfolgenden Gates
 * und als Prüfgrundlage für den Reviewer-Agenten.
 *
 * @see docs/testing/VIBE_CODING_VERIFICATION_CONTRACT.md
 */
export interface VerificationContract {
  /** Schema-Version des Contracts */
  contractVersion: string;
  /** Scope des Contracts (z. B. "positron-core", "issue-42-fix-login-timeout") */
  scope: string;
  /** Source of Truth (z. B. "github") */
  sourceOfTruth: string;
  /** Optional: Referenz auf einen übergeordneten Contract */
  parentContract?: string;

  /** Erforderliche Gates (z. B. "ci_status", "security_scan") */
  requiredGates: string[];
  /** Optionale Gates (z. B. "preview_screenshot") */
  optionalGates?: string[];
  /** Behauptungen, die ohne Beleg verboten sind */
  forbiddenClaims: string[];
  /** Verbotene Ergebnisse (z. B. "test_regression", "secret_leakage") */
  forbiddenOutcomes: string[];

  /** Prüfbare Akzeptanzkriterien */
  acceptanceCriteria: string[];

  /** Test-Strategie */
  testStrategy: {
    /** Unit-Tests sind erforderlich */
    unitRequired: boolean;
    /** Contract-Tests sind erforderlich (optional) */
    contractRequired?: boolean;
    /** Safety-Coverage-Tests erforderlich (optional) */
    safetyRequired?: boolean;
    /** Property-basierte Tests erforderlich (optional) */
    propertyRequired?: boolean;
    /** E2E-Tests erforderlich (optional) */
    e2eRequired?: boolean;
    /** Red Tests müssen VOR der Implementierung geschrieben werden */
    redTestsBeforeImplementation?: boolean;
    /** Erlaubte Test-Frameworks (optional) */
    frameworks?: string[];
    /** Coverage-Ziele pro Modul/Metrik (optional) */
    coverageTargets?: Record<string, Record<string, number>>;
  };

  /** Merge-Policy (z. B. "no_merge_without_evidence") */
  mergePolicy: string;

  /** Map von Evidence-Anforderungen (Key → erforderlich ja/nein) */
  evidenceRequirements: Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// 9. validateVerificationContract
// ---------------------------------------------------------------------------

/**
 * Validiert einen VerificationContract und gibt eine Liste von Fehlermeldungen zurück.
 *
 * Prüft:
 * - Pflichtfelder (contractVersion, scope, sourceOfTruth)
 * - requiredGates non-empty
 * - acceptanceCriteria non-empty
 * - unitRequired === true
 * - evidenceRequirements non-empty
 */
export function validateVerificationContract(
  contract: VerificationContract,
): string[] {
  const errors: string[] = [];

  // -- Pflichtfelder --
  if (!contract.contractVersion) errors.push('contractVersion must be non-empty');
  if (!contract.scope) errors.push('scope must be non-empty');
  if (!contract.sourceOfTruth) errors.push('sourceOfTruth must be non-empty');

  // -- Arrays --
  if (contract.requiredGates.length === 0) {
    errors.push('requiredGates must not be empty');
  }

  if (contract.acceptanceCriteria.length === 0) {
    errors.push('acceptanceCriteria must not be empty');
  }

  // -- Test-Strategie --
  if (!contract.testStrategy.unitRequired) {
    errors.push('testStrategy.unitRequired must be true');
  }

  // -- Evidence-Anforderungen --
  if (
    !contract.evidenceRequirements ||
    Object.keys(contract.evidenceRequirements).length === 0
  ) {
    errors.push('evidenceRequirements must not be empty');
  }

  return errors;
}

// ---------------------------------------------------------------------------
// 10. isSecretPattern
// ---------------------------------------------------------------------------

/**
 * Prüft, ob ein String bekannte Secret-Muster enthält.
 *
 * Erkannte Muster (case-sensitive):
 * - ghp_* (GitHub Personal Access Token)
 * - gho_* (GitHub OAuth Access Token)
 * - ghb_* (GitHub App Token)
 * - github_pat_* (GitHub Fine-Grained PAT)
 * - sk-* (OpenAI API Key)
 * - AIza* (Google API Key / Gemini)
 * - anthropic_* (Anthropic API Key)
 *
 * @param value Zu prüfender String
 * @returns true wenn ein Secret-Muster gefunden wurde
 */
export function isSecretPattern(value: string): boolean {
  // Normalisiere: nur sichtbare Zeichen, trim
  const normalized = value.trim();
  if (!normalized) return false;

  const patterns: RegExp[] = [
    // GitHub Tokens
    /\bghp_[a-zA-Z0-9]{36}\b/,
    /\bgho_[a-zA-Z0-9_]{36}\b/,
    /\bghb_[a-zA-Z0-9_]{36}\b/,
    /\bgithub_pat_[a-zA-Z0-9_]{82}\b/,
    // OpenAI
    /\bsk-[a-zA-Z0-9]{48,}\b/,
    // Google / Gemini
    /\bAIza[a-zA-Z0-9_-]{35}\b/,
    // Anthropic
    /\banthropic_[a-zA-Z0-9]{40,}\b/,
    // Slack / Discord (häufige Pattern)
    /\bxox[baprs]-[a-zA-Z0-9-]{10,}\b/,
    // AWS Access Key
    /\bAKIA[0-9A-Z]{16}\b/,
    // Heroku
    /\bheroku[a-f0-9]{20,}\b/,
  ];

  for (const pattern of patterns) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  return false;
}
