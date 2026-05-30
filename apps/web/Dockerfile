# Positron Web UI — Vite/React
FROM node:22-alpine AS base

WORKDIR /app
ENV NODE_ENV=production

# Install dependencies
COPY apps/web/package*.json ./
RUN npm install --omit=dev

# Copy source
COPY apps/web/index.html ./
COPY apps/web/src ./src
COPY apps/web/vite.config.ts ./
COPY apps/web/tailwind.config.js ./
COPY apps/web/postcss.config.js ./
COPY apps/web/tsconfig.json ./

# Build
RUN npm install && npx vite build

# Serve via lightweight HTTP server
FROM node:22-alpine
WORKDIR /app
COPY --from=base /app/dist ./dist
RUN npm install -g serve
EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:5173 | grep -q 'Positron' || exit 1

CMD ["serve", "-s", "dist", "-l", "5173"]
