# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Copy manifests first — Docker caches layers by content.
COPY package.json package-lock.json ./

# npm ci = clean install from lock file. Reproducible, faster than npm install.
# Installs ALL deps including devDependencies (we need tsc and ts types).
RUN npm ci

# Copy source after installing deps so code changes don't bust the npm cache.
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript → JavaScript into dist/
RUN npm run build

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

# Copy only the compiled output from the build stage — not the source.
COPY --from=build /app/dist ./dist

# Document which port the app listens on (informational — does not publish it).
EXPOSE 8080
EXPOSE 3001

ENV NODE_ENV=production

CMD ["npm", "start"]
