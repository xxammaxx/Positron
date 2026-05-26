/** Konfiguration für Live-GitHub-E2E-Tests */
export interface LiveGitHubE2EConfig {
    /** Owner des Test-Repositories */
    owner: string;
    /** Name des Test-Repositories */
    repo: string;
    /** GitHub Token */
    token: string;
    /** Ob Schreiboperationen erlaubt sind */
    allowWrite: boolean;
}
/** Ergebnis eines Live-E2E-Tests */
export interface LiveGitHubE2EResult {
    success: boolean;
    runId: string;
    summary: string;
    details?: Record<string, unknown>;
}
/** Lädt die Live-E2E-Konfiguration aus Umgebungsvariablen */
export declare function loadLiveGitHubE2EConfig(env?: Record<string, string | undefined>): LiveGitHubE2EConfig | null;
/** Prüft ob Live-GitHub-E2E-Tests übersprungen werden sollen */
export declare function shouldSkipLiveGitHubE2E(env?: Record<string, string | undefined>): boolean;
/** Prüft ob schreibende Live-E2E-Tests übersprungen werden sollen */
export declare function shouldSkipLiveGitHubWriteE2E(env?: Record<string, string | undefined>): boolean;
/** Generiert eine eindeutige Run-ID für Live-E2E-Tests */
export declare function generateLiveRunId(): string;
/** Marker für Live-E2E-Test-Kommentare */
export declare function liveE2EMarker(runId: string): string;
/** Prüft ob ein String nur ASCII-Zeichen enthält */
export declare function isAsciiOnly(value: string): boolean;
//# sourceMappingURL=live-e2e.d.ts.map