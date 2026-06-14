// Positron — GitHub Label Lifecycle Management

import type { Phase } from '@positron/shared';

export interface PhaseLabels {
	add: string[];
	remove: string[];
}

/**
 * Vollständige Label-Definitionen für alle Phasen.
 * name: GitHub-Label-Name
 * color: Hex-Farbe (ohne #)
 * description: Kurzbeschreibung
 */
export const PHASE_LABELS: Record<Phase, { name: string; color: string; description: string }> = {
	QUEUED: { name: 'positron:queued', color: 'e4e669', description: 'Wartet auf Verarbeitung' },
	CLAIMED: { name: 'positron:running', color: 'f9d0c4', description: 'Von Positron übernommen' },
	REPO_SYNC: {
		name: 'positron:repo-sync',
		color: 'f9d0c4',
		description: 'Repository wird synchronisiert',
	},
	ISSUE_CONTEXT: {
		name: 'positron:repo-sync',
		color: 'f9d0c4',
		description: 'Issue-Kontext wird analysiert',
	},
	WEB_RESEARCH: { name: 'positron:research', color: 'f9d0c4', description: 'Web-Recherche läuft' },
	SPECIFY: {
		name: 'positron:planning',
		color: 'f9d0c4',
		description: 'Spezifikation wird erstellt',
	},
	CLARIFY_OPTIONAL: {
		name: 'positron:planning',
		color: 'f9d0c4',
		description: 'Klarstellung erforderlich',
	},
	PLAN: { name: 'positron:planning', color: 'f9d0c4', description: 'Plan wird erstellt' },
	TASKS: { name: 'positron:planning', color: 'f9d0c4', description: 'Tasks werden generiert' },
	ANALYZE: { name: 'positron:planning', color: 'f9d0c4', description: 'Code-Analyse läuft' },
	REVIEW: { name: 'positron:planning', color: 'f9d0c4', description: 'Review läuft' },
	IMPLEMENT: {
		name: 'positron:implementing',
		color: '0075ca',
		description: 'Implementierung läuft',
	},
	TEST: { name: 'positron:testing', color: '0075ca', description: 'Tests werden ausgeführt' },
	VERIFY: { name: 'positron:testing', color: '0075ca', description: 'Verifikation läuft' },
	COMMIT: {
		name: 'positron:implementing',
		color: '0075ca',
		description: 'Änderungen werden committed',
	},
	PR_CREATE: {
		name: 'positron:implementing',
		color: '0075ca',
		description: 'Pull Request wird erstellt',
	},
	MERGE: { name: 'positron:merging', color: '0e8a16', description: 'Merge läuft' },
	DONE: { name: 'positron:done', color: '0e8a16', description: 'Erfolgreich abgeschlossen' },
	FAILED: { name: 'positron:failed', color: 'd73a4a', description: 'Fehlgeschlagen' },
	FAILED_TRANSIENT: {
		name: 'positron:failed',
		color: 'd73a4a',
		description: 'Fehlgeschlagen (wiederholbar)',
	},
	FAILED_BLOCKED: { name: 'positron:blocked', color: 'e99695', description: 'Blockiert' },
	FAILED_UNSAFE: {
		name: 'positron:failed-unsafe',
		color: 'b60205',
		description: 'Unsicher fehlgeschlagen',
	},
	BLOCKED_PUSH: { name: 'positron:blocked-push', color: 'e99695', description: 'Push blockiert' },
	BLOCKED_MERGE: {
		name: 'positron:blocked-merge',
		color: 'e99695',
		description: 'Merge blockiert',
	},
	GATE_APPROVE: {
		name: 'positron:gate-approve',
		color: 'fbca04',
		description: 'Warte auf Genehmigung',
	},
	GATE_REVISE: {
		name: 'positron:gate-revise',
		color: 'fbca04',
		description: 'Revision angefordert',
	},
	RESUME_PENDING: {
		name: 'positron:resume-pending',
		color: 'fbca04',
		description: 'Fortsetzung ausstehend',
	},
	CLEANUP: { name: 'positron:cleanup', color: 'cfd3d7', description: 'Cleanup läuft' },
};

/**
 * Lifecycle-Definition: Welche Labels für welche Phase gesetzt/entfernt werden.
 */
export const LABEL_LIFECYCLE: Record<string, PhaseLabels> = {
	QUEUED: { add: ['positron:queued'], remove: [] },
	CLAIMED: { add: ['positron:running'], remove: ['positron:queued', 'positron:ready'] },
	REPO_SYNC: { add: ['positron:repo-sync'], remove: [] },
	ISSUE_CONTEXT: { add: ['positron:running'], remove: [] },
	WEB_RESEARCH: { add: ['positron:research'], remove: [] },
	SPECIFY: { add: ['positron:planning'], remove: [] },
	CLARIFY_OPTIONAL: { add: ['positron:planning'], remove: [] },
	PLAN: { add: ['positron:planning'], remove: [] },
	TASKS: { add: ['positron:planning'], remove: [] },
	ANALYZE: { add: ['positron:planning'], remove: [] },
	REVIEW: { add: ['positron:planning'], remove: [] },
	IMPLEMENT: { add: ['positron:implementing'], remove: ['positron:planning'] },
	TEST: { add: ['positron:testing'], remove: ['positron:implementing'] },
	VERIFY: { add: ['positron:testing'], remove: [] },
	COMMIT: { add: ['positron:implementing'], remove: [] },
	PR_CREATE: { add: ['positron:implementing'], remove: [] },
	MERGE: { add: ['positron:merging'], remove: ['positron:implementing', 'positron:testing'] },
	DONE: {
		add: ['positron:done'],
		remove: [
			'positron:running',
			'positron:blocked',
			'positron:failed',
			'positron:implementing',
			'positron:testing',
			'positron:planning',
			'positron:research',
			'positron:repo-sync',
			'positron:queued',
			'positron:merging',
		],
	},
	FAILED: {
		add: ['positron:failed'],
		remove: ['positron:running', 'positron:implementing', 'positron:testing'],
	},
	FAILED_TRANSIENT: { add: ['positron:failed'], remove: ['positron:running'] },
	FAILED_BLOCKED: {
		add: ['positron:blocked'],
		remove: ['positron:running', 'positron:implementing', 'positron:testing'],
	},
	FAILED_UNSAFE: { add: ['positron:failed-unsafe'], remove: ['positron:running'] },
	BLOCKED_PUSH: { add: ['positron:blocked-push'], remove: [] },
	BLOCKED_MERGE: { add: ['positron:blocked-merge'], remove: [] },
	GATE_APPROVE: { add: ['positron:gate-approve'], remove: [] },
	GATE_REVISE: { add: ['positron:gate-revise'], remove: [] },
	RESUME_PENDING: { add: ['positron:resume-pending'], remove: [] },
	CLEANUP: { add: ['positron:cleanup'], remove: ['positron:failed', 'positron:blocked'] },
};

/**
 * Gibt die Label-Aktionen für eine bestimmte Phase zurück.
 */
export function getLabelsForPhase(phase: string, _reportStatus?: string): PhaseLabels {
	const lifecycle = LABEL_LIFECYCLE[phase];
	if (lifecycle) return lifecycle;

	// Fallback: Keine Label-Änderungen
	return { add: [], remove: [] };
}
