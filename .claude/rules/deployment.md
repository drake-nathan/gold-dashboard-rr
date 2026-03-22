---
globs:
  - "Dockerfile"
  - "railway.*"
  - ".env*"
  - "docker-compose*"
---

## Deployment

- See `docs/environment-variables.md` for the full env var reference
- VITE\_ vars must be passed as BOTH Docker build args AND runtime env vars (embedded in client bundle at build time, used by server-side loaders at runtime)
- Clerk and Stripe have separate test/prod API keys
- Crons only run in Convex prod (`ENABLE_CRONS=true`)
- PostHog SSR requires `noExternal: ["posthog-js/react"]` in vite.config.ts (NOT `@posthog/react`)
- Build output path: `./build/server/index.js` (not in a runtime-specific subdirectory)
