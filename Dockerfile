# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# build — Astro renders the whole site to static files
# ---------------------------------------------------------------------------
# Node 24 is the floor, not a preference: Astro 7 needs >= 22.23.4, and the
# 22.x alpine tag still resolves below that.
FROM node:24-alpine AS build

WORKDIR /app
ENV ASTRO_TELEMETRY_DISABLED=1

# Dependencies first, on their own layer: editing a post must not reinstall them.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# `npm run build` runs scripts/scope-skins.mjs first, then astro build. The
# scoper is not optional — it is what keeps two skins' CSS from colliding.
RUN npm run build

# ---------------------------------------------------------------------------
# serve — nginx, because the output is 19 static files and nothing else
# ---------------------------------------------------------------------------
FROM nginx:alpine AS serve

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
