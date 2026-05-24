// Positron Dogfood Runner — Startet den Server und führt einen Run aus
import { createServer, setWorkspaceAdapter } from './src/index.js';
import { RealGitWorkspaceAdapter } from '@positron/sandbox';

const repoOwner = process.env.POSITRON_REPO_OWNER || 'xxammaxx';
const repoName = process.env.POSITRON_REPO_NAME || 'Positron';
const enablePush = process.env.POSITRON_ENABLE_PUSH === 'true';

// For a real dogfood run, use the real git workspace adapter
// The fake adapter cannot actually push branches to GitHub
setWorkspaceAdapter(new RealGitWorkspaceAdapter());

const server = createServer();
const PORT = 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[dogfood] Positron server running on http://0.0.0.0:${PORT}`);
  console.log(`[dogfood] Repository: ${repoOwner}/${repoName}`);
  console.log(`[dogfood] Mode: ${enablePush ? 'PUSH=ON' : 'PUSH=OFF'} MERGE=OFF KILL_SWITCH=ON`);
  console.log(`[dogfood] Workspace: RealGitWorkspaceAdapter`);
  console.log(`[dogfood] Ready for dogfood. Press Ctrl+C to stop.`);
});
