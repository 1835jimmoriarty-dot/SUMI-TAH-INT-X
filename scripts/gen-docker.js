const { write } = require('./writer');

// Dockerfile
write('Dockerfile', `# Multi-Stage Production Dockerfile for SUMI-TAH
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

# 1. Dependencies Stage
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# 2. Builder Stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# 3. Runner Stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
`);

// docker-compose.yml
write('docker-compose.yml', `version: '3.8'

services:
  # SUMI-TAH SOC Application
  sumi-tah:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: sumi-tah-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://sumitah_admin:SecureDBPass2026!@postgres:5432/sumitah_prod?sslmode=disable
      - JWT_SECRET=615725888698d3b84b992c8bd0dc9c31e249a2062d0b3c775be7988a07cd8951928677865d2ff3aaaa063eaac8b05bdd
      - ENCRYPTION_KEY=ef0b61e794f941c78adf8b1ed9bbd2045e215d0fff47b8f5af19da8f84ced437
      - AI_PROVIDER=mock
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - sumitah-net

  # PostgreSQL 16 Database
  postgres:
    image: postgres:16-alpine
    container_name: sumitah-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: sumitah_admin
      POSTGRES_PASSWORD: SecureDBPass2026!
      POSTGRES_DB: sumitah_prod
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sumitah_admin -d sumitah_prod"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - sumitah-net

  # Redis Cache for High-Throughput Telemetry
  redis:
    image: redis:7-alpine
    container_name: sumitah-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - sumitah-net

volumes:
  postgres_data:
  redis_data:

networks:
  sumitah-net:
    driver: bridge
`);

// .dockerignore
write('.dockerignore', `
node_modules
.next
.git
.env
prisma/dev.db*
*.log
`);