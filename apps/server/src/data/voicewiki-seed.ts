// Positron — VoiceWiki Managed External Project Seed Data
// Read-only, static. No VoiceWiki mutations.

export interface ManagedProject {
	id: string;
	name: string;
	description: string;
	repoUrl: string;
	defaultBranch: string;
	status: 'FIRST_EXTERNAL_TEST_SUCCESS' | 'EXTERNAL_TEST_PENDING' | 'BUILD_IN_PROGRESS' | 'BLOCKED';
	externalTestStatus: string;
	lastMergedPr: {
		number: number;
		title: string;
		mergeSha: string;
		mergedAt: string;
		url: string;
	};
	knownBlockers: Array<{
		id: string;
		description: string;
		severity: 'blocker' | 'warning';
	}>;
	timeline: Array<{
		step: string;
		status: 'completed' | 'next' | 'planned';
		description: string;
	}>;
	nextRecommendedRun: {
		label: string;
		description: string;
		approvalLabel: string;
	};
	nextAppLevelRun: {
		label: string;
		description: string;
		approvalLabel: string;
	};
	safetyStatus: {
		appCodeChanged: boolean;
		sttEnabled: boolean;
		modelAudioFilesAdded: boolean;
		cloudTelemetryEnabled: boolean;
		realMode: boolean;
		phaseDProbe: boolean;
	};
	evidenceReportUrl: string | null;
	createdAt: string;
	updatedAt: string;
}

export const VOICEWIKI_SEED: ManagedProject = {
	id: 'xxammaxx/VoiceWiki',
	name: 'VoiceWiki',
	description: 'Local-first voice-to-wiki application. On-device STT, privacy-first architecture, offline-first mobile app.',
	repoUrl: 'https://github.com/xxammaxx/VoiceWiki',
	defaultBranch: 'master',
	status: 'FIRST_EXTERNAL_TEST_SUCCESS',
	externalTestStatus: 'FIRST_EXTERNAL_TEST_SUCCESS',
	lastMergedPr: {
		number: 35,
		title: 'docs: add VoiceWiki setup readiness evidence and fix stale test count',
		mergeSha: 'a7059ff2ceb20b9501684a1e511574e38d67a02e',
		mergedAt: '2026-07-03T11:39:10Z',
		url: 'https://github.com/xxammaxx/VoiceWiki/pull/35',
	},
	knownBlockers: [
		{
			id: 'flutter-sdk-mismatch',
			description: 'Local Flutter/Dart SDK mismatch: Dart 3.11.0 installed, ^3.11.3 required. CI uses Flutter 3.41.5.',
			severity: 'blocker',
		},
	],
	timeline: [
		{
			step: 'External repo suitability audit',
			status: 'completed',
			description: 'VoiceWiki evaluated as better first external Positron test than Neutrino. Has real Flutter code, CI gates, privacy architecture.',
		},
		{
			step: 'PR #35 readiness/evidence docs',
			status: 'completed',
			description: 'Merged docs-only PR adding setup readiness evidence. No app code changed.',
		},
		{
			step: 'Local Flutter toolchain alignment',
			status: 'next',
			description: 'Align local Flutter/Dart SDK to match VoiceWiki requirements (Dart ^3.11.3).',
		},
		{
			step: 'Privacy Settings Snapshot / Doc Consistency',
			status: 'planned',
			description: 'First small app-level test: snapshot privacy settings UI, verify documentation consistency.',
		},
	],
	nextRecommendedRun: {
		label: 'Local Flutter Toolchain Alignment',
		description: 'Resolve local Dart SDK mismatch (3.11.0 → ^3.11.3). Align with CI Flutter 3.41.5.',
		approvalLabel: 'APPROVE VOICEWIKI LOCAL FLUTTER TOOLCHAIN ALIGNMENT',
	},
	nextAppLevelRun: {
		label: 'First Small App Test — Privacy Settings Snapshot / Doc Consistency',
		description: 'After toolchain alignment: snapshot privacy settings UI, verify no doc drift. No app code changes yet.',
		approvalLabel: 'APPROVE VOICEWIKI FIRST SMALL APP TEST — PRIVACY SETTINGS SNAPSHOT / DOC CONSISTENCY ONLY',
	},
	safetyStatus: {
		appCodeChanged: false,
		sttEnabled: false,
		modelAudioFilesAdded: false,
		cloudTelemetryEnabled: false,
		realMode: false,
		phaseDProbe: false,
	},
	evidenceReportUrl: null,
	createdAt: '2026-07-03T00:00:00Z',
	updatedAt: '2026-07-03T12:00:00Z',
};

export function getManagedProjects(): ManagedProject[] {
	return [VOICEWIKI_SEED];
}
