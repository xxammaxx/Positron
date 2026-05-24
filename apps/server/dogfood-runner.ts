// Positron Dogfood Runner — Startet den Server und führt einen Run aus
import { createServer } from './src/index.js';

const repoOwner = process.env.POSITRON_REPO_OWNER || 'xxammaxx';
const repoName = process.env.POSITRON_REPO_NAME || 'Positron';

const server = createServer();
const PORT = 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[dogfood] Positron server running on http://0.0.0.0:${PORT}`);
  console.log(`[dogfood] Repository: ${repoOwner}/${repoName}`);
  console.log(`[dogfood] Supervised mode — PUSH=OFF MERGE=OFF KILL_SWITCH=ON`);
  console.log(`[dogfood] Ready for dogfood. Press Ctrl+C to stop.`);
});
