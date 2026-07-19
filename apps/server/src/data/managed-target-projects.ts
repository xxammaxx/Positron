// Positron — Managed Target Projects Registry
//
// GENERIC Registry externer Zielprojekte, die Positron verwalten, prüfen oder
// bauen kann. Jedes Zielprojekt ist ein Datenbank-Eintrag — keine App-spezifische
// Businesslogik im Positron-Orchestrator.
//
// VoiceWiki und spätere Projekte sind externe Zielprojekte mit
// eigener Codebase, eigenem Repo und eigener Produktlogik.
//
// Positron = Build-/Agenten-/Evidence-Orchestrator für GitHub-Issues und externe
// Zielprojekte.

// ---------------------------------------------------------------------------
// Typdefinition (server-seitig, kompatibel mit apps/web/src/types.ts)
// ---------------------------------------------------------------------------

export interface SafetyCheck {
	id: string;
	label: string;
	status: 'pass' | 'warn' | 'fail' | 'unknown';
	description?: string;
}

export type TargetProjectRole = 'external_target_project' | 'proof_project' | 'candidate_project';

export type TargetProjectStatus =
	| 'LOCAL_GATES_REPRODUCIBLE'
	| 'LOCAL_GATES_BLOCKED'
	| 'NOT_YET_EVALUATED'
	| 'DEPLOYED'
	| 'ARCHIVED';

export interface ManagedTargetProject {
	/** Eindeutige ID, z.B. "xxammaxx/VoiceWiki" (owner/repo) */
	id: string;
	/** Anzeigename des Zielprojekts */
	name: string;
	/** Rolle im Positron-Ökosystem */
	role: TargetProjectRole;
	/** GitHub Repo-URL */
	repoUrl: string;
	/** Default-Branch des Zielprojekts */
	defaultBranch: string;
	/** Aktueller Status des Zielprojekts */
	status: TargetProjectStatus;
	/** Kurzbeschreibung des Zielprojekts (generisch, nicht Positron-spezifisch) */
	description: string;
	/** Technologie-Stack des Zielprojekts (informativ) */
	techStack: string[];
	/** Letzte bekannte Evidence (ISO-Datum oder null) */
	lastEvidence: string | null;
	/** Letzte PR-/Issue-Referenz (optional) */
	lastRunRef: string | null;
	/** Bekannte Blocker (optional) */
	blockers: string[];
	/** Empfohlene nächste Positron-Runs */
	nextRecommendedRuns: string[];
	/** Generische Safety-Checks (pro Projekt unterschiedlich) */
	safetyChecks: SafetyCheck[];
	/** Security-Status */
	securityStatus: 'ok' | 'review_needed' | 'vulnerable' | 'unknown';
	/** Letzter Sicherheits-Check (ISO-Datum oder null) */
	lastSecurityScan: string | null;
}

// ---------------------------------------------------------------------------
// Registry — externe Zielprojekte als reine Datensätze
// ---------------------------------------------------------------------------

export const MANAGED_TARGET_PROJECTS: ManagedTargetProject[] = [
	// ── VoiceWiki — Proof Project ──────────────────────────────────────
	{
		id: 'xxammaxx/VoiceWiki',
		name: 'VoiceWiki',
		role: 'proof_project',
		repoUrl: 'https://github.com/xxammaxx/VoiceWiki',
		defaultBranch: 'master',
		status: 'LOCAL_GATES_REPRODUCIBLE',
		description:
			'Voice-controlled wiki application — external proof project demonstrating Positron-managed builds.',
		techStack: ['Flutter', 'Dart', 'STT Engine', 'Firebase'],
		lastEvidence: null,
		lastRunRef: null,
		blockers: [],
		nextRecommendedRuns: [
			'Full SpecKit workflow (constitution → specify → plan → tasks)',
			'Local gate verification (build, typecheck, test)',
			'Evidence-gated PR creation',
		],
		safetyChecks: [
			{
				id: 'stt_permissions',
				label: 'STT Engine Permissions',
				status: 'unknown',
				description: 'Verify microphone permissions are gated behind user consent',
			},
			{
				id: 'audio_files_included',
				label: 'Model Audio Files Present',
				status: 'unknown',
				description: 'Check that required TTS/STT model files are tracked or documented',
			},
			{
				id: 'cloud_telemetry',
				label: 'Cloud Telemetry Status',
				status: 'unknown',
				description: 'Verify no unexpected cloud telemetry in build artifacts',
			},
			{
				id: 'offline_capability',
				label: 'Offline Capability',
				status: 'unknown',
				description: 'Primary STT should function without network dependency',
			},
		],
		securityStatus: 'unknown',
		lastSecurityScan: null,
	},

	// ── KleinPilot — Draft Persistence Pass (GREEN_LOCAL_PERSISTENCE_VERIFIED_ON_ANDROID) ──
	{
		id: 'xxammaxx/kleinpilot',
		name: 'KleinPilot',
		role: 'candidate_project',
		repoUrl: 'https://github.com/xxammaxx/KleinPilot',
		defaultBranch: 'main',
		status: 'LOCAL_GATES_REPRODUCIBLE',
		description:
			'Local-first Android test app for preparing manual Kleinanzeigen listing drafts with local photo attachments, local draft persistence, and deterministic German listing template quality. No scraping, no login automation, no auto-posting, no AI generation.',
		techStack: [
			'Flutter',
			'Dart',
			'Android',
			'image_picker',
			'shared_preferences',
			'Local-first storage',
		],
		lastEvidence: '2026-07-06',
		lastRunRef: 'https://github.com/xxammaxx/KleinPilot/pull/6 (Draft Persistence Pass)',
		blockers: [],
		nextRecommendedRuns: [
			'APPROVE FINAL AUDIT AND MERGE KLEINPILOT DRAFT PERSISTENCE PR #6',
			'APPROVE FINAL AUDIT AND MERGE POSITRON KLEINPILOT DRAFT PERSISTENCE TRACKING PR #<n>',
			'APPROVE KLEINPILOT MANUAL EXPORT PACKAGE PASS',
		],
		safetyChecks: [
			{
				id: 'no_auto_posting',
				label: 'No automatic posting',
				status: 'pass',
				description: 'KleinPilot is scoped as a manual draft helper only.',
			},
			{
				id: 'no_scraping',
				label: 'No scraping',
				status: 'pass',
				description: 'No Kleinanzeigen.de scraping or automated platform access is allowed.',
			},
			{
				id: 'no_login_automation',
				label: 'No login automation',
				status: 'pass',
				description: 'No account login or session management for any third-party platform.',
			},
			{
				id: 'manual_review',
				label: 'Manual owner review required',
				status: 'pass',
				description: 'All listing text must be reviewed and copied/exported manually.',
			},
			{
				id: 'no_telemetry',
				label: 'No telemetry',
				status: 'pass',
				description: 'No usage data collection, analytics, or crash reporting.',
			},
			{
				id: 'photo_local_only',
				label: 'Photos remain local',
				status: 'pass',
				description:
					'Photo attachments are local file references only. No upload, no cloud sync, no Kleinanzeigen.de integration.',
			},
			{
				id: 'no_exif_extraction',
				label: 'No EXIF/GPS extraction',
				status: 'pass',
				description:
					'Only file paths are stored — no EXIF metadata or GPS coordinates are read from photos.',
			},
			{
				id: 'no_ai_text_generation',
				label: 'No AI text generation',
				status: 'pass',
				description:
					'Listing templates are deterministic string formatting only. No cloud LLM, no AI text generation.',
			},
			{
				id: 'local_only_storage',
				label: 'Local-only draft storage',
				status: 'pass',
				description:
					'Drafts are saved locally via SharedPreferences as JSON. No cloud sync, no account, no upload, no remote storage.',
			},
		],
		securityStatus: 'ok',
		lastSecurityScan: '2026-07-06',
	},

	// ── Template: Weitere Zielprojekte ──────────────────────────────────
	//
	// Neue Zielprojekte werden hier als Registry-Eintrag hinzugefügt.
	// KEINE App-spezifische Businesslogik in Positron einbauen.
	// Jeder Eintrag ist ein reiner Datensatz mit Metadaten, Status und
	// empfohlenen Runs — die Produktlogik bleibt im Zielprojekt-Repo.
];

// ---------------------------------------------------------------------------
// Registry-Hilfsfunktionen
// ---------------------------------------------------------------------------

/** Liefert alle registrierten Managed Target Projects */
export function getManagedTargetProjects(): ManagedTargetProject[] {
	return MANAGED_TARGET_PROJECTS;
}

/** Findet ein Zielprojekt anhand seiner ID (owner/repo) */
export function findTargetProject(id: string): ManagedTargetProject | undefined {
	return MANAGED_TARGET_PROJECTS.find((p) => p.id === id);
}

/** Filtert Zielprojekte nach Rolle */
export function filterByRole(role: TargetProjectRole): ManagedTargetProject[] {
	return MANAGED_TARGET_PROJECTS.filter((p) => p.role === role);
}

// Alias für Abwärtskompatibilität (falls bestehender Code "getManagedProjects" erwartet)
export const getManagedProjects = getManagedTargetProjects;
