// Voice Settings — localStorage-basierte Persistenz für Voice-Einstellungen
// Keine externen Dienste, keine Cloud — alle Einstellungen bleiben im Browser.

const STORAGE_KEY = 'positron-voice-settings';

export type VoiceEventType =
	| 'run_started'
	| 'phase_failed'
	| 'run_blocked'
	| 'human_action'
	| 'merge_blocked'
	| 'run_done';

export interface VoiceSettings {
	/** Voice Output aktiviert (Default: false) */
	enabled: boolean;
	/** URI der ausgewählten Stimme (null = System-Default) */
	selectedVoiceURI: string | null;
	/** Sprechgeschwindigkeit 0.5–2.0 (Default: 1.0) */
	rate: number;
	/** Lautstärke 0–1 (Default: 1.0) */
	volume: number;
	/** Welche Event-Typen gesprochen werden sollen */
	enabledEventTypes: VoiceEventType[];
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
	enabled: false,
	selectedVoiceURI: null,
	rate: 1.0,
	volume: 1.0,
	enabledEventTypes: [
		'run_started',
		'phase_failed',
		'run_blocked',
		'human_action',
		'merge_blocked',
		'run_done',
	],
};

export function loadVoiceSettings(): VoiceSettings {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULT_VOICE_SETTINGS };

		const parsed = JSON.parse(raw) as Partial<VoiceSettings>;

		// Sichere Migration bei invalid/fehlenden Feldern
		return {
			enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_VOICE_SETTINGS.enabled,
			selectedVoiceURI:
				typeof parsed.selectedVoiceURI === 'string' || parsed.selectedVoiceURI === null
					? parsed.selectedVoiceURI
					: DEFAULT_VOICE_SETTINGS.selectedVoiceURI,
			rate: typeof parsed.rate === 'number' && parsed.rate >= 0.5 && parsed.rate <= 2.0
				? parsed.rate
				: DEFAULT_VOICE_SETTINGS.rate,
			volume: typeof parsed.volume === 'number' && parsed.volume >= 0 && parsed.volume <= 1.0
				? parsed.volume
				: DEFAULT_VOICE_SETTINGS.volume,
			enabledEventTypes: Array.isArray(parsed.enabledEventTypes)
				? parsed.enabledEventTypes.filter(
						(t): t is VoiceEventType =>
							typeof t === 'string' &&
							DEFAULT_VOICE_SETTINGS.enabledEventTypes.includes(t as VoiceEventType),
					)
				: DEFAULT_VOICE_SETTINGS.enabledEventTypes,
		};
	} catch {
		// Invalid JSON → Fallback auf Defaults
		return { ...DEFAULT_VOICE_SETTINGS };
	}
}

export function saveVoiceSettings(settings: VoiceSettings): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch {
		// localStorage voll oder deaktiviert → silent fail, kein Crash
	}
}

/** Convenience: Toggle enabled ohne vollständigen Settings-Read/Write */
export function toggleVoiceEnabled(): boolean {
	const current = loadVoiceSettings();
	const next = !current.enabled;
	saveVoiceSettings({ ...current, enabled: next });
	return next;
}
