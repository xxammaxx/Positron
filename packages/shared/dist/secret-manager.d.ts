export interface SecretProvider {
    readonly name: string;
    getSecret(key: string): string | null;
}
export interface SecretManagerOptions {
    /** Providers in resolution order. Defaults to [envProvider, dockerSecretProvider, fileProvider] */
    providers?: SecretProvider[];
    /** Custom .env file path for FileProvider */
    envFilePath?: string;
}
/**
 * Reads secrets from process.env
 */
export declare class EnvSecretProvider implements SecretProvider {
    readonly name = "env";
    getSecret(key: string): string | null;
}
/**
 * Reads secrets from Docker secrets (/run/secrets/<key>).
 * Docker secrets are mounted as files, one per secret, with lowercase names.
 */
export declare class DockerSecretProvider implements SecretProvider {
    readonly name = "docker-secret";
    private readonly secretsDir;
    constructor(secretsDir?: string);
    getSecret(key: string): string | null;
}
/**
 * Reads secrets from a .env-style file.
 * Parses KEY=VALUE lines, supports # comments and quoted values.
 */
export declare class FileSecretProvider implements SecretProvider {
    readonly name = "file";
    private readonly envPath;
    private parsed;
    constructor(envPath: string);
    getSecret(key: string): string | null;
    private parseEnvFile;
}
/**
 * Centralized secret manager with chained provider resolution.
 *
 * Default resolution order:
 *   1. EnvSecretProvider   — process.env
 *   2. DockerSecretProvider — /run/secrets/<key>
 *   3. FileSecretProvider   — .env file
 *
 * Usage:
 *   const sm = new SecretManager();
 *   const token = sm.getSecret('GITHUB_TOKEN');
 *   console.log(sm.mask('GITHUB_TOKEN'));     // "***-redacted-***"
 *   console.log(sm.maskValue('ghp_xxx...'));  // "ghp_***REDACTED***"
 */
export declare class SecretManager {
    private readonly providers;
    constructor(options?: SecretManagerOptions);
    /**
     * Resolves a secret by trying each provider in order.
     * Returns the first non-null value, or null if not found.
     */
    getSecret(key: string): string | null;
    /**
     * Returns a masked display name for the given key.
     * Use for log messages: "GITHUB_TOKEN is set" → "GITHUB_TOKEN=***-redacted-***"
     */
    mask(key: string): string;
    /**
     * Masks secret values in a string using the existing redactSecrets rules.
     */
    maskValue(input: string): string;
    /**
     * Returns true if the given secret is available.
     */
    hasSecret(key: string): boolean;
    /**
     * Lists all configured provider names.
     */
    getProviderNames(): string[];
    private resolveDefaultEnvPath;
}
//# sourceMappingURL=secret-manager.d.ts.map