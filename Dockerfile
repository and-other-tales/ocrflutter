# Multi-stage Dockerfile for Next.js on Google Cloud Run

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies needed for node-gyp and Prisma
RUN apk add --no-cache libc6-compat openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Build the application with extended timeout
RUN npm run build --prefer-offline --no-audit

# Ensure public directory exists (create if missing)
RUN mkdir -p /app/public

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/prisma ./prisma/

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy startup script
COPY --from=builder /app/scripts/startup.sh ./scripts/
RUN chmod +x ./scripts/startup.sh

# Install production dependencies only
COPY --from=deps /app/node_modules ./node_modules

# Switch to non-root user
USER nextjs

# Expose ports (8080 for Cloud Run, 3000 for local)
EXPOSE 8080
EXPOSE 3000

# Set environment variable for port (can be overridden)
ENV PORT 8080
ENV HOSTNAME "0.0.0.0"

# Use the startup script if it exists, otherwise start directly
CMD ["sh", "-c", "if [ -f ./scripts/startup.sh ]; then ./scripts/startup.sh; else node server.js; fi"]
