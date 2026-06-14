/**
 * Positron — SecretManager
 *
 * Centralized secret resolution with multiple providers.
 * Resolution order: env → Docker secret → file → keychain (future)
 *
 * Uses existing redactSecrets from utils.ts for log masking.
 */
import fs from 'node:fs';
import path from 'node:path';
import { redactSecrets } from './utils.js';
// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------
/**
 * Reads secrets from process.env
 */
export class EnvSecretProvider {
    name = 'env';
    getSecret(key) {
        return process.env[key] ?? null;
    }
}
/**
 * Reads secrets from Docker secrets (/run/secrets/<key>).
 * Docker secrets are mounted as files, one per secret, with lowercase names.
 */
export class DockerSecretProvider {
    name = 'docker-secret';
    secretsDir;
    constructor(secretsDir = '/run/secrets') {
        this.secretsDir = secretsDir;
    }
    getSecret(key) {
        // Docker secrets use lowercase filenames
        const secretPath = path.join(this.secretsDir, key.toLowerCase());
        try {
            return fs.readFileSync(secretPath, 'utf-8').trim();
        }
        catch {
            return null;
        }
    }
}
/**
 * Reads secrets from a .env-style file.
 * Parses KEY=VALUE lines, supports # comments and quoted values.
 */
export class FileSecretProvider {
    name = 'file';
    envPath;
    parsed = null;
    constructor(envPath) {
        this.envPath = envPath;
    }
    getSecret(key) {
        if (!this.parsed) {
            this.parsed = this.parseEnvFile();
        }
        return this.parsed[key] ?? null;
    }
    parseEnvFile() {
        const result = {};
        try {
            const content = fs.readFileSync(this.envPath, 'utf-8');
            for (const line of content.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#'))
                    continue;
                const eqIdx = trimmed.indexOf('=');
                if (eqIdx === -1)
                    continue;
                const key = trimmed.slice(0, eqIdx).trim();
                let value = trimmed.slice(eqIdx + 1).trim();
                // Strip surrounding quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                if (key)
                    result[key] = value;
            }
        }
        catch {
            // File not found or unreadable — return empty
        }
        return result;
    }
}
// ---------------------------------------------------------------------------
// SecretManager
// ---------------------------------------------------------------------------
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
export class SecretManager {
    providers;
    constructor(options = {}) {
        this.providers = options.providers ?? [
            new EnvSecretProvider(),
            new DockerSecretProvider(),
            new FileSecretProvider(options.envFilePath ?? this.resolveDefaultEnvPath()),
        ];
    }
    /**
     * Resolves a secret by trying each provider in order.
     * Returns the first non-null value, or null if not found.
     */
    getSecret(key) {
        for (const provider of this.providers) {
            const value = provider.getSecret(key);
            if (value !== null && value.length > 0) {
                return value;
            }
        }
        return null;
    }
    /**
     * Returns a masked display name for the given key.
     * Use for log messages: "GITHUB_TOKEN is set" → "GITHUB_TOKEN=***-redacted-***"
     */
    mask(key) {
        const val = this.getSecret(key);
        if (val === null)
            return `${key}=<not set>`;
        return `${key}=***-redacted-***`;
    }
    /**
     * Masks secret values in a string using the existing redactSecrets rules.
     */
    maskValue(input) {
        return redactSecrets(input);
    }
    /**
     * Returns true if the given secret is available.
     */
    hasSecret(key) {
        return this.getSecret(key) !== null;
    }
    /**
     * Lists all configured provider names.
     */
    getProviderNames() {
        return this.providers.map((p) => p.name);
    }
    resolveDefaultEnvPath() {
        // Try common locations
        const candidates = [
            path.resolve(process.cwd(), '.env'),
            path.resolve(process.cwd(), 'apps/server/.env'),
        ];
        for (const candidate of candidates) {
            if (fs.existsSync(candidate))
                return candidate;
        }
        return candidates[0];
    }
}
//# sourceMappingURL=secret-manager.js.map