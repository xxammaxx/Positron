# Positron — Containerized Deployment MVP
# Single-container build: Web UI + API + SQLite
# Safe demo defaults — no secrets, no real runs, no tool gateway execute, no auto-merge

# ── Stage 1: Build ──────────────────────────────────────────
FROM node:22-slim AS build

WORKDIR /app

# Build dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# ── Layer 1: Package manifests (cache-friendly) ──
COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/run-state/package.json ./packages/run-state/
COPY packages/github-adapter/package.json ./packages/github-adapter/
COPY packages/speckit-adapter/package.json ./packages/speckit-adapter/
COPY packages/opencode-adapter/package.json ./packages/opencode-adapter/
COPY packages/sandbox/package.json ./packages/sandbox/
COPY packages/tool-gateway/package.json ./packages/tool-gateway/
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/

RUN npm ci

# ── Layer 2: Source + Build ──
COPY packages ./packages
COPY apps ./apps
COPY tsconfig.json ./

# Build TypeScript packages + server
RUN npx tsc -b packages/shared packages/sandbox packages/github-adapter \
    packages/run-state packages/speckit-adapter packages/opencode-adapter \
    packages/tool-gateway apps/server

# Build web frontend
RUN npm --workspace apps/web run build

# ── Stage 2: Runtime ────────────────────────────────────────
FROM node:22-slim AS runtime

WORKDIR /app

# Runtime system dependencies (git for workspace operations)
RUN apt-get update && apt-get install -y --no-install-recommends git && \
    rm -rf /var/lib/apt/lists/*

# ── Copy dependencies (includes compiled better-sqlite3) ──
COPY --from=build /app/node_modules ./node_modules

# ── Copy npm workspace manifests (needed for package resolution) ──
COPY --from=build /app/package*.json ./
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/run-state/package.json ./packages/run-state/
COPY --from=build /app/packages/github-adapter/package.json ./packages/github-adapter/
COPY --from=build /app/packages/speckit-adapter/package.json ./packages/speckit-adapter/
COPY --from=build /app/packages/opencode-adapter/package.json ./packages/opencode-adapter/
COPY --from=build /app/packages/sandbox/package.json ./packages/sandbox/
COPY --from=build /app/packages/tool-gateway/package.json ./packages/tool-gateway/
COPY --from=build /app/apps/server/package.json ./apps/server/

# ── Copy built dist files ──
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/run-state/dist ./packages/run-state/dist
COPY --from=build /app/packages/github-adapter/dist ./packages/github-adapter/dist
COPY --from=build /app/packages/speckit-adapter/dist ./packages/speckit-adapter/dist
COPY --from=build /app/packages/opencode-adapter/dist ./packages/opencode-adapter/dist
COPY --from=build /app/packages/sandbox/dist ./packages/sandbox/dist
COPY --from=build /app/packages/tool-gateway/dist ./packages/tool-gateway/dist
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/web/dist ./apps/web/dist

# ── Non-root user + data directory ──
RUN groupadd -r positron && useradd -r -g positron -d /app positron && \
    mkdir -p /app/data && chown -R positron:positron /app

USER positron

# ── Safe environment defaults ───────────────────────────────
ENV NODE_ENV=production
ENV PORT=3000

# Data / SQLite
ENV POSITRON_DATA_DIR=/app/data
ENV POSITRON_DB_PATH=/app/data/positron.db
ENV POSITRON_INFRASTRUCTURE_STORE=sqlite
ENV POSITRON_WEB_DIST_PATH=/app/apps/web/dist

# Safe mode: fake adapters, no real runs
ENV POSITRON_MODE=fake
ENV POSITRON_GITHUB_MODE=fake
ENV POSITRON_SPECKIT_MODE=fake
ENV POSITRON_OPENCODE_MODE=fake
ENV POSITRON_ENABLE_REAL_RUN=false

# Tool Gateway: sealed/disabled by default
ENV POSITRON_ENABLE_TOOL_GATEWAY=false
ENV POSITRON_MCP_EXPOSE_ENABLED=false

# Merge safety: kill switch active, auto-merge disabled
ENV POSITRON_MERGE_KILL_SWITCH=true
ENV POSITRON_ENABLE_AUTO_MERGE=false
ENV POSITRON_ENABLE_MERGE=false
ENV POSITRON_MERGE_DRY_RUN=true

# Disable push, fix loops
ENV POSITRON_ENABLE_PUSH=false
ENV POSITRON_ENABLE_FIX_LOOP=false

# Demo repository defaults (Fake Mode — no real GitHub access)
ENV POSITRON_REPO_OWNER=positron-demo
ENV POSITRON_REPO_NAME=positron-demo
ENV POSITRON_REPO_DEFAULT_BRANCH=main

# Disable infrastructure state upserts
ENV POSITRON_ENABLE_INFRASTRUCTURE_STATE_UPSERT=false

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=5 --start-period=15s \
    CMD node -e "const http = require('http'); http.get('http://localhost:3000/api/health', (res) => { let d=''; res.on('data', c => d+=c); res.on('end', () => { try { const j=JSON.parse(d); process.exit(j.status==='ok' ? 0 : 1); } catch { process.exit(1); } }); }).on('error', () => process.exit(1));"

CMD ["node", "apps/server/dist/index.js"]
