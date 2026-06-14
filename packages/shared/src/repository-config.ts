// Positron — Repository-Konfiguration aus Umgebungsvariablen

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
export function loadRepositoryConfig(
	env?: Record<string, string | undefined>,
): RepositoryConfig | null {
	const e = env ?? process.env;
	const owner = e.POSITRON_REPO_OWNER ?? '';
	const repo = e.POSITRON_REPO_NAME ?? '';

	if (!owner || !repo) {
		return null;
	}

	const config: RepositoryConfig = {
		owner,
		repo,
		defaultBranch: e.POSITRON_REPO_DEFAULT_BRANCH ?? 'main',
	};

	const remoteUrl = e.POSITRON_REPO_REMOTE_URL;
	if (remoteUrl) {
		config.remoteUrl = remoteUrl;
	}

	return config;
}

/**
 * Laufzeit-Konfiguration aus Umgebungsvariablen laden.
 */
export function loadPositronRuntimeConfig(
	env?: Record<string, string | undefined>,
): PositronRuntimeConfig | null {
	const e = env ?? process.env;
	const repository = loadRepositoryConfig(e);
	if (!repository) return null;

	return {
		githubMode: (e.GITHUB_MODE as 'fake' | 'real') ?? 'fake',
		githubTokenPresent: !!e.GITHUB_TOKEN,
		repository,
		workspaceRoot: e.POSITRON_WORKSPACE_ROOT,
	};
}

/**
 * Validiert und normalisiert eine explizite Repository-Konfiguration.
 */
export function normalizeRepositoryConfig(config: RepositoryConfig): RepositoryConfig {
	if (!config.owner || !config.repo) {
		throw new Error('RepositoryConfig requires owner and repo');
	}
	return {
		...config,
		defaultBranch: config.defaultBranch ?? 'main',
		remoteUrl: config.remoteUrl ?? buildRemoteUrl(config.owner, config.repo),
	};
}

/**
 * Validiert einen GitHub-Owner-Namen.
 * Erlaubt: alphanumerische Zeichen und Bindestriche, 1-39 Zeichen.
 */
export function isValidOwner(value: string): boolean {
	return /^[a-zA-Z0-9-]{1,39}$/.test(value);
}

/**
 * Validiert einen GitHub-Repo-Namen.
 * Erlaubt: alphanumerische Zeichen, Punkte, Unterstriche und Bindestriche, 1-100 Zeichen.
 */
export function isValidRepo(value: string): boolean {
	return /^[a-zA-Z0-9._-]{1,100}$/.test(value);
}

/**
 * Erzeugt eine Remote-URL aus Owner und Repo-Name.
 * Validiert Eingaben vor der Konstruktion.
 */
export function buildRemoteUrl(owner: string, repo: string): string {
	if (!isValidOwner(owner)) {
		throw new Error(`Ungültiger GitHub-Owner: "${owner}"`);
	}
	if (!isValidRepo(repo)) {
		throw new Error(`Ungültiger Repository-Name: "${repo}"`);
	}
	return `https://github.com/${owner}/${repo}.git`;
}
