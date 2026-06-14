// Positron — Live E2E Test-Konfiguration
import crypto from 'node:crypto';
/** Lädt die Live-E2E-Konfiguration aus Umgebungsvariablen */
export function loadLiveGitHubE2EConfig(env) {
    const e = env ?? process.env;
    const token = e.GITHUB_TOKEN ?? '';
    const owner = e.POSITRON_REPO_OWNER ?? '';
    const repo = e.POSITRON_REPO_NAME ?? '';
    if (!token || !owner || !repo) {
        return null;
    }
    return {
        token,
        owner,
        repo,
        allowWrite: e.POSITRON_LIVE_TEST_ALLOW_WRITE === 'true',
    };
}
/** Prüft ob Live-GitHub-E2E-Tests übersprungen werden sollen */
export function shouldSkipLiveGitHubE2E(env) {
    const e = env ?? process.env;
    return e.POSITRON_ENABLE_LIVE_GITHUB_TESTS !== 'true';
}
/** Prüft ob schreibende Live-E2E-Tests übersprungen werden sollen */
export function shouldSkipLiveGitHubWriteE2E(env) {
    const e = env ?? process.env;
    return e.POSITRON_LIVE_TEST_ALLOW_WRITE !== 'true';
}
/** Generiert eine eindeutige Run-ID für Live-E2E-Tests */
export function generateLiveRunId() {
    return `live-${crypto.randomUUID().slice(0, 8)}`;
}
/** Marker für Live-E2E-Test-Kommentare */
export function liveE2EMarker(runId) {
    return `<!-- positron:live-e2e:${runId} -->`;
}
/** Prüft ob ein String nur ASCII-Zeichen enthält */
export function isAsciiOnly(value) {
    for (let i = 0; i < value.length; i++) {
        if (value.charCodeAt(i) > 127)
            return false;
    }
    return true;
}
//# sourceMappingURL=live-e2e.js.map