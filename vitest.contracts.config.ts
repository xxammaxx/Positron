import { defineConfig } from 'vitest/config';

// Contract-Test-Konfiguration
// Validiert, dass alle Adapter-Implementierungen (fake und real)
// dieselbe Verhaltens-Schnittstelle implementieren.
//
// Struktur:
//   packages/*/src/__contracts__/adapter-name.contract.test.ts
//
// Jeder Contract-Test wird zweimal ausgeführt:
//   1. Gegen den Fake-Adapter
//   2. Gegen den Real-Adapter (wenn CI-Umgebung Tokens hat)
export default defineConfig({
  test: {
    env: {
      POSITRON_GITHUB_MODE: 'fake',
      GITHUB_MODE: 'fake',
      POSITRON_SPECKIT_MODE: 'fake',
      POSITRON_OPENCODE_MODE: 'fake',
      // Real-Adapter-Tokens (leer = überspringen)
      GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
    },
    include: [
      'packages/*/src/__contracts__/**/*.contract.test.ts',
    ],
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: ['verbose'],
    setupFiles: [],
  },
});
