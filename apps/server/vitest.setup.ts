// Vitest setup — forces fake mode for integration tests
process.env.POSITRON_GITHUB_MODE = 'fake';
process.env.GITHUB_MODE = 'fake';
delete process.env.POSITRON_WORKSPACE_ROOT;
