# Build stage
FROM node:22-alpine AS builder
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/crm/package.json ./apps/crm/ 2>/dev/null || true

RUN npm ci --ignore-scripts

COPY tsconfig*.json ./
COPY apps/crm ./apps/crm

RUN npx vite build --config apps/crm/vite.config.mts

# ─── Nginx serve ──────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

COPY --from=builder /workspace/apps/crm/dist /usr/share/nginx/html
COPY apps/crm/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
