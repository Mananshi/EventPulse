# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
# --legacy-peer-deps: react-scripts@5 declares peer deps for React 17/18,
# but we're using React 19. This flag tells npm to ignore that conflict
# and install anyway -- the same way it works on your local machine.
RUN npm ci --legacy-peer-deps

COPY . .

# GENERATE_SOURCEMAP=false keeps the image smaller (no .map files in prod).
ENV GENERATE_SOURCEMAP=false
RUN npm run build

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM nginx:alpine AS runtime

# Replace the default Nginx config with ours.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the compiled React app from the build stage into Nginx's serve directory.
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
