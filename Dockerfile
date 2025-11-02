FROM oven/bun:1 AS base

# Install dependencies stage
FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build stage
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args for VITE_ environment variables (embedded in client bundle)
ARG VITE_CONVEX_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_PUBLIC_POSTHOG_KEY
ARG VITE_PUBLIC_POSTHOG_HOST

ENV VITE_CONVEX_URL=$VITE_CONVEX_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_PUBLIC_POSTHOG_KEY=$VITE_PUBLIC_POSTHOG_KEY
ENV VITE_PUBLIC_POSTHOG_HOST=$VITE_PUBLIC_POSTHOG_HOST

RUN bun run build

# Production stage - using Node.js v22 LTS for runtime with Bun for package management
FROM node:24-alpine AS production
WORKDIR /app

# Install Bun binary directly for faster package installation
RUN apk add --no-cache unzip curl bash && \
    curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun && \
    apk del bash

# Copy package files and install production dependencies with Bun
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy build artifacts
COPY --from=build /app/build ./build

# Server-side env vars will be passed at runtime
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# React Router 7 build output
# Using node (not bun) to run react-router-serve for compatibility
CMD ["npx", "react-router-serve", "./build/server/index.js"]