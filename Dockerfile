# Multi-stage build for Node.js backend + Frontend
FROM node:22-alpine3.20 AS frontend-builder

WORKDIR /app/frontend

# Copy frontend files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend ./

# Build-time environment variables for Vite
ARG VITE_API_BASE_URL
ARG VITE_NODE_ENV
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_UPLOAD_MAX_SIZE
ARG VITE_SUPPORTED_FORMATS
ARG VITE_ENABLE_VCONSOLE

# Set environment variables for build process
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_NODE_ENV=$VITE_NODE_ENV
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_UPLOAD_MAX_SIZE=$VITE_UPLOAD_MAX_SIZE
ENV VITE_SUPPORTED_FORMATS=$VITE_SUPPORTED_FORMATS
ENV VITE_ENABLE_VCONSOLE=$VITE_ENABLE_VCONSOLE

# Build frontend
RUN npm run build

# Node.js backend builder
FROM node:22-alpine3.20 AS backend-builder

WORKDIR /app/backend

# Copy backend files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci

# Copy backend source
COPY backend ./

# Build-time environment variables
ARG NODE_ENV
ARG MONOBANK_TOKEN
ARG MONOBANK_CALLBACK_URL
ARG MONOBANK_RESULT_URL
ARG MONOBANK_WEBHOOK_SECRET
ARG SUPABASE_URL
ARG SUPABASE_SERVICE_ROLE_KEY
ARG TELEGRAM_BOT_TOKEN
ARG TELEGRAM_CHAT_ID
ARG JWT_SECRET

# Set environment variables for build
ENV NODE_ENV=$NODE_ENV
ENV MONOBANK_TOKEN=$MONOBANK_TOKEN
ENV MONOBANK_CALLBACK_URL=$MONOBANK_CALLBACK_URL
ENV MONOBANK_RESULT_URL=$MONOBANK_RESULT_URL
ENV MONOBANK_WEBHOOK_SECRET=$MONOBANK_WEBHOOK_SECRET

ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
ENV TELEGRAM_CHAT_ID=$TELEGRAM_CHAT_ID
ENV JWT_SECRET=$JWT_SECRET

# Build backend
RUN npm run build

# Final stage
FROM node:22-alpine3.20

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copy package.json for production dependencies
COPY backend/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy compiled backend from builder
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/dist ./dist

# Copy frontend build from frontend builder
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/dist ./static

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# Create .env file for runtime
RUN echo "NODE_ENV=production" > .env

# Set environment variables with defaults
ENV PORT=8080
ENV NODE_ENV=production

# Change to app user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run the application
CMD ["node", "dist/index.js"]
