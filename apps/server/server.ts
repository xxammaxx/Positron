// Positron Server — Offizieller Entry Point
// Startet den REST API Server für Backend und Frontend.

import { createServer, setWorkspaceAdapter } from './src/index.js';
import { RealGitWorkspaceAdapter, FakeGitWorkspaceAdapter } from '@positron/sandbox';

// Use env vars or safe demo defaults
const repoOwner = process.env.POSITRON_REPO_OWNER || 'demo-owner';
const repoName = process.env.POSITRON_REPO_NAME || 'demo-repo';
const githubMode = process.env.GITHUB_MODE || 'fake';
const isFake = githubMode === 'fake';
const isDemo = !process.env.GITHUB_TOKEN;

// Set defaults so server starts without .env
process.env.POSITRON_REPO_OWNER = repoOwner;
process.env.POSITRON_REPO_NAME = repoName;
process.env.GITHUB_MODE = githubMode;

// Use FakeWorkspace for demo/fake mode, RealWorkspace for real
setWorkspaceAdapter(isFake ? new FakeGitWorkspaceAdapter() : new RealGitWorkspaceAdapter());

const server = createServer();
const PORT = parseInt(process.env.POSITRON_PORT || '3000', 10);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[positron] v0.1.0-rc.1`);
  console.log(`[positron] Backend:  http://0.0.0.0:${PORT}`);
  console.log(`[positron] API:     http://localhost:${PORT}/api/health`);
  console.log(`[positron] Repo:    ${repoOwner}/${repoName}`);
  if (isDemo) {
    console.log(`[positron] ⚠️  DEMO MODE — no GITHUB_TOKEN set`);
    console.log(`[positron]    Frontend: cd apps/web && npm run build && npx vite preview --port 4173`);
    console.log(`[positron]    For real mode: set GITHUB_TOKEN + POSITRON_REPO_OWNER/NAME`);
  } else {
    console.log(`[positron] Mode:    ${githubMode} · Push=${process.env.POSITRON_ENABLE_PUSH === 'true' ? 'ON' : 'OFF'} · Merge=${process.env.POSITRON_ENABLE_MERGE === 'true' ? 'ON' : 'OFF'}`);
  }
});
