/**
 * Repository-Konfiguration für die Positron-Laufzeit.
 */
export interface RepositoryConfig {
    /** Repository-Owner (GitHub-Benutzer oder Organisation) */
    owner: string;
    /** Standard-Repository-Name */
    repo: string;
    /** Optional: Standard-Branch für Workspace-Vorbereitung */
    defaultBranch?: string;
    /** Optional: Remote-URL; wird aus owner/repo konstruiert wenn nicht gesetzt */
    remoteUrl?: string;
}
/**
 * Laufzeit-Konfiguration für Server und Live-E2E-Tests.
 */
export interface PositronRuntimeConfig {
    githubMode: 'fake' | 'real';
    githubTokenPresent: boolean;
    repository: RepositoryConfig;
    workspaceRoot?: string;
}
/**
 * Repository-Konfiguration aus Umgebungsvariablen laden.
 *
 * Erforderliche Variablen:
 *   POSITRON_REPO_OWNER — GitHub Owner
 *   POSITRON_REPO_NAME — Repository-Name
 *
 * Optional:
 *   POSITRON_REPO_REMOTE_URL — Eigene Remote-URL
 *
 * Gibt null zurück wenn erforderliche Variablen fehlen.
 */
export declare function loadRepositoryConfig(env?: Record<string, string | undefined>): RepositoryConfig | null;
/**
 * Laufzeit-Konfiguration aus Umgebungsvariablen laden.
 */
export declare function loadPositronRuntimeConfig(env?: Record<string, string | undefined>): PositronRuntimeConfig | null;
/**
 * Validiert und normalisiert eine explizite Repository-Konfiguration.
 */
export declare function normalizeRepositoryConfig(config: RepositoryConfig): RepositoryConfig;
/**
 * Validiert einen GitHub-Owner-Namen.
 * Erlaubt: alphanumerische Zeichen und Bindestriche, 1-39 Zeichen.
 */
export declare function isValidOwner(value: string): boolean;
/**
 * Validiert einen GitHub-Repo-Namen.
 * Erlaubt: alphanumerische Zeichen, Punkte, Unterstriche und Bindestriche, 1-100 Zeichen.
 */
export declare function isValidRepo(value: string): boolean;
/**
 * Erzeugt eine Remote-URL aus Owner und Repo-Name.
 * Validiert Eingaben vor der Konstruktion.
 */
export declare function buildRemoteUrl(owner: string, repo: string): string;
//# sourceMappingURL=repository-config.d.ts.map