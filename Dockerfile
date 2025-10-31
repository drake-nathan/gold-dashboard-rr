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

ENV VITE_CONVEX_URL=$VITE_CONVEX_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

RUN bun run build

# Production stage
FROM base AS production
WORKDIR /app

# Copy only production dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy build artifacts
COPY --from=build /app/build ./build

# Server-side env vars will be passed at runtime
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "run", "start"]