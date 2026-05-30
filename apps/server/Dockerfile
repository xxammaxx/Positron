# Positron Server — Node.js/TypeScript via tsx
FROM node:22-slim AS base

WORKDIR /app
ENV NODE_ENV=production

# Systemabhängigkeiten
RUN apt-get update && apt-get install -y --no-install-recommends git wget python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/run-state/package.json ./packages/run-state/
COPY packages/github-adapter/package.json ./packages/github-adapter/
COPY packages/speckit-adapter/package.json ./packages/speckit-adapter/
COPY packages/opencode-adapter/package.json ./packages/opencode-adapter/
COPY packages/sandbox/package.json ./packages/sandbox/
COPY apps/server/package.json ./apps/server/

RUN npm install --omit=dev && npm install -g tsx

# Copy built packages and server source
COPY packages/shared/dist ./packages/shared/dist
COPY packages/run-state/dist ./packages/run-state/dist
COPY packages/github-adapter/dist ./packages/github-adapter/dist
COPY packages/speckit-adapter/dist ./packages/speckit-adapter/dist
COPY packages/opencode-adapter/dist ./packages/opencode-adapter/dist
COPY packages/sandbox/dist ./packages/sandbox/dist
COPY apps/server/src ./apps/server/src

WORKDIR /app/apps/server
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health | grep -q '"status"' || exit 1

CMD ["npx", "tsx", "src/index.ts"]
