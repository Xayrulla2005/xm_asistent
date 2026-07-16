# Build stage
FROM node:22-alpine AS builder
WORKDIR /workspace

# Copy root package files for npm workspaces
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

RUN npm ci --ignore-scripts

# Copy source
COPY tsconfig*.json ./
COPY apps/api ./apps/api
COPY migrations ./migrations

# Build the API bundle
RUN npx webpack-cli build --config apps/api/webpack.standalone.js --mode production

# ─── Production image ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built bundle
COPY --from=builder /workspace/apps/api/dist ./dist

# Create uploads directory
RUN mkdir -p uploads

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main.js"]
