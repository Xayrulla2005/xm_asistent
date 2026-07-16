# Build stage
FROM node:22-alpine AS builder
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/admin/package.json ./apps/admin/ 2>/dev/null || true

RUN npm ci --ignore-scripts

COPY tsconfig*.json ./
COPY apps/admin ./apps/admin

RUN npx vite build --config apps/admin/vite.config.mts

# ─── Nginx serve ──────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

COPY --from=builder /workspace/apps/admin/dist /usr/share/nginx/html
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
