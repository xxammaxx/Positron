import { describe, expect, test, beforeEach, afterEach, it, vi } from 'vitest';
import { SecretManager, EnvSecretProvider, DockerSecretProvider, FileSecretProvider, resolveDefaultEnvPath, } from '../secret-manager.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
// ---------------------------------------------------------------------------
// EnvSecretProvider
// ---------------------------------------------------------------------------
describe('EnvSecretProvider', () => {
    const provider = new EnvSecretProvider();
    test('reads existing env var', () => {
        process.env['TEST_SECRET_1'] = 'env-value-1';
        expect(provider.getSecret('TEST_SECRET_1')).toBe('env-value-1');
        delete process.env['TEST_SECRET_1'];
    });
    test('returns null for missing env var', () => {
        expect(provider.getSecret('UNDEFINED_SECRET_12345')).toBeNull();
    });
    test('handles empty string env var', () => {
        process.env['EMPTY_SECRET'] = '';
        expect(provider.getSecret('EMPTY_SECRET')).toBe('');
        delete process.env['EMPTY_SECRET'];
    });
    test('has correct provider name', () => {
        expect(provider.name).toBe('env');
    });
});
// ---------------------------------------------------------------------------
// DockerSecretProvider
// ---------------------------------------------------------------------------
describe('DockerSecretProvider', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-test-'));
    const secretsDir = path.join(tmpDir, 'run-secrets');
    const provider = new DockerSecretProvider(secretsDir);
    beforeEach(() => {
        fs.mkdirSync(secretsDir, { recursive: true });
    });
    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });
    test('reads secret from file', () => {
        fs.writeFileSync(path.join(secretsDir, 'github_token'), 'my-docker-secret');
        expect(provider.getSecret('GITHUB_TOKEN')).toBe('my-docker-secret');
    });
    test('uses lowercase filename for lookup', () => {
        fs.writeFileSync(path.join(secretsDir, 'mixed_case_secret'), 'lowercase-value');
        expect(provider.getSecret('MIXED_CASE_SECRET')).toBe('lowercase-value');
    });
    test('returns null for missing secret file', () => {
        expect(provider.getSecret('NONEXISTENT_SECRET')).toBeNull();
    });
    test('trims whitespace from secret value', () => {
        fs.writeFileSync(path.join(secretsDir, 'trimmed'), '\n  my-value  \n');
        expect(provider.getSecret('TRIMMED')).toBe('my-value');
    });
    test('has correct provider name', () => {
        expect(provider.name).toBe('docker-secret');
    });
});
// ---------------------------------------------------------------------------
// FileSecretProvider
// ---------------------------------------------------------------------------
describe('FileSecretProvider', () => {
    let tmpDir;
    let envPath;
    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-test-'));
        envPath = path.join(tmpDir, '.env');
    });
    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });
    test('reads secrets from .env file', () => {
        fs.writeFileSync(envPath, 'MY_SECRET=my-value\nANOTHER=another-value\n');
        const provider = new FileSecretProvider(envPath);
        expect(provider.getSecret('MY_SECRET')).toBe('my-value');
        expect(provider.getSecret('ANOTHER')).toBe('another-value');
    });
    test('returns null for missing key', () => {
        fs.writeFileSync(envPath, 'EXISTING=yes\n');
        const provider = new FileSecretProvider(envPath);
        expect(provider.getSecret('MISSING_KEY')).toBeNull();
    });
    test('returns null for nonexistent file', () => {
        const provider = new FileSecretProvider(path.join(tmpDir, 'nonexistent.env'));
        expect(provider.getSecret('ANY_KEY')).toBeNull();
    });
    test('parses quoted values', () => {
        fs.writeFileSync(envPath, 'QUOTED="quoted-value"\nSINGLE=\'single-value\'\n');
        const provider = new FileSecretProvider(envPath);
        expect(provider.getSecret('QUOTED')).toBe('quoted-value');
        expect(provider.getSecret('SINGLE')).toBe('single-value');
    });
    test('skips comments and empty lines', () => {
        fs.writeFileSync(envPath, '# comment\n\nKEY=value\n# another comment\n');
        const provider = new FileSecretProvider(envPath);
        expect(provider.getSecret('KEY')).toBe('value');
        expect(provider.getSecret('comment')).toBeNull();
    });
    test('caches parsed file', () => {
        fs.writeFileSync(envPath, 'FIRST=original\n');
        const provider = new FileSecretProvider(envPath);
        expect(provider.getSecret('FIRST')).toBe('original');
        // Change file after first read — should still return cached value
        fs.writeFileSync(envPath, 'FIRST=changed\n');
        expect(provider.getSecret('FIRST')).toBe('original');
    });
    test('has correct provider name', () => {
        const provider = new FileSecretProvider(envPath);
        expect(provider.name).toBe('file');
    });
    test('handles line without equals sign', () => {
        fs.writeFileSync(envPath, 'KEY=value\nline_without_equals\n');
        const provider = new FileSecretProvider(envPath);
        expect(provider.getSecret('KEY')).toBe('value');
    });
    test('handles line with empty key name', () => {
        fs.writeFileSync(envPath, '=orphan-value\n');
        const provider = new FileSecretProvider(envPath);
        expect(provider.getSecret('')).toBeNull();
    });
});
// ---------------------------------------------------------------------------
// SecretManager integration
// ---------------------------------------------------------------------------
describe('SecretManager', () => {
    let tmpDir;
    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-test-'));
    });
    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        delete process.env['SM_TEST_VAR'];
    });
    test('resolves from first provider that has value', () => {
        process.env['SM_TEST_VAR'] = 'from-env';
        const envFile = path.join(tmpDir, '.env');
        fs.writeFileSync(envFile, 'SM_TEST_VAR=from-file\n');
        // Order: env then file
        const sm = new SecretManager({
            providers: [
                new EnvSecretProvider(),
                new FileSecretProvider(envFile),
            ],
        });
        expect(sm.getSecret('SM_TEST_VAR')).toBe('from-env');
    });
    test('falls back to second provider when first returns null', () => {
        delete process.env['SM_FALLBACK'];
        const envFile = path.join(tmpDir, '.env');
        fs.writeFileSync(envFile, 'SM_FALLBACK=from-file\n');
        const sm = new SecretManager({
            providers: [
                new EnvSecretProvider(),
                new FileSecretProvider(envFile),
            ],
        });
        expect(sm.getSecret('SM_FALLBACK')).toBe('from-file');
    });
    test('returns null when no provider has the secret', () => {
        const sm = new SecretManager({
            providers: [
                new EnvSecretProvider(),
            ],
        });
        expect(sm.getSecret('NONEXISTENT_SECRET_999')).toBeNull();
    });
    test('mask returns masked string for set secrets', () => {
        process.env['MASK_TEST'] = 'super-secret-value';
        const sm = new SecretManager({
            providers: [new EnvSecretProvider()],
        });
        expect(sm.mask('MASK_TEST')).toBe('MASK_TEST=***-redacted-***');
        delete process.env['MASK_TEST'];
    });
    test('mask returns not-set for missing secrets', () => {
        const sm = new SecretManager({
            providers: [new EnvSecretProvider()],
        });
        expect(sm.mask('MISSING_MASK_TEST')).toBe('MISSING_MASK_TEST=<not set>');
    });
    test('maskValue redacts using default rules', () => {
        const sm = new SecretManager({
            providers: [new EnvSecretProvider()],
        });
        const result = sm.maskValue('My token is ghp_abcdefghijklmnopqrstuvwxyz0123456789abcd');
        expect(result).toContain('ghp_***REDACTED***');
        expect(result).not.toContain('ghp_abcdefgh');
    });
    test('hasSecret returns correct status', () => {
        process.env['HAS_SECRET_TEST'] = 'yes';
        const sm = new SecretManager({
            providers: [new EnvSecretProvider()],
        });
        expect(sm.hasSecret('HAS_SECRET_TEST')).toBe(true);
        expect(sm.hasSecret('NONEXISTENT')).toBe(false);
        delete process.env['HAS_SECRET_TEST'];
    });
    test('getProviderNames returns configured providers', () => {
        const sm = new SecretManager({
            providers: [
                new EnvSecretProvider(),
                new FileSecretProvider(path.join(tmpDir, '.env')),
            ],
        });
        expect(sm.getProviderNames()).toEqual(['env', 'file']);
    });
    test('skips empty string values when resolving', () => {
        process.env['EMPTY_RESOLVE'] = '';
        const envFile = path.join(tmpDir, '.env');
        fs.writeFileSync(envFile, 'EMPTY_RESOLVE=from-file\n');
        const sm = new SecretManager({
            providers: [
                new EnvSecretProvider(),
                new FileSecretProvider(envFile),
            ],
        });
        // Empty string from env should count as "not found", fall through to file
        expect(sm.getSecret('EMPTY_RESOLVE')).toBe('from-file');
        delete process.env['EMPTY_RESOLVE'];
    });
});
describe('resolveDefaultEnvPath', () => {
    it('should return first candidate when it exists', () => {
        const mockExists = (p) => p.includes('.env') && !p.includes('apps/server');
        expect(resolveDefaultEnvPath('/tmp', mockExists)).toContain('.env');
    });
    it('should return second candidate when first does not exist', () => {
        const mockExists = (p) => p.includes('apps/server/.env');
        const result = resolveDefaultEnvPath('/tmp', mockExists);
        expect(result).toContain('apps/server/.env');
    });
    it('should return first candidate when neither exists (fallback)', () => {
        const mockExists = () => false;
        const result = resolveDefaultEnvPath('/workspace', mockExists);
        expect(result).toContain('/workspace/.env');
    });
    it('should handle cwd with trailing components', () => {
        const mockExists = () => false;
        const result = resolveDefaultEnvPath('/home/user/project', mockExists);
        expect(result).toBe('/home/user/project/.env');
    });
    it('should be callable from SecretManager constructor via private method', () => {
        // Mock fs.existsSync to return true — triggers resolveDefaultEnvPath() in constructor
        const spy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        const sm = new SecretManager();
        expect(sm).toBeDefined();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
});
//# sourceMappingURL=secret-manager.test.js.map