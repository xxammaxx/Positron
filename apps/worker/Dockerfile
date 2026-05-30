FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci --ignore-scripts
RUN npm run build

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache git wget
COPY --from=builder /app/node_modules ./node_modules
# Workspace package manifests (npm needs these for resolution)
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/run-state/package.json ./packages/run-state/package.json
COPY --from=builder /app/packages/github-adapter/package.json ./packages/github-adapter/package.json
COPY --from=builder /app/packages/sandbox/package.json ./packages/sandbox/package.json
COPY --from=builder /app/packages/speckit-adapter/package.json ./packages/speckit-adapter/package.json
COPY --from=builder /app/packages/opencode-adapter/package.json ./packages/opencode-adapter/package.json
# Built dist files
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/run-state/dist ./packages/run-state/dist
COPY --from=builder /app/packages/github-adapter/dist ./packages/github-adapter/dist
COPY --from=builder /app/packages/sandbox/dist ./packages/sandbox/dist
COPY --from=builder /app/packages/speckit-adapter/dist ./packages/speckit-adapter/dist
COPY --from=builder /app/packages/opencode-adapter/dist ./packages/opencode-adapter/dist
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/package.json ./package.json
CMD ["node", "apps/worker/dist/index.js"]
