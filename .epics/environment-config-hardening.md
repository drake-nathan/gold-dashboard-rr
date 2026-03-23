> **Status:** In Progress

# Environment Config Hardening

## Goal

Establish one canonical environment variable schema and use it to validate, document, and check configuration drift across the app, Convex, Docker, Railway, and CI.

## Plan

- Define the target env model and choose a single source of truth for schema, typing, and validation.
- Replace ad hoc env access with small runtime-specific env modules for app client, app server, and Convex.
- Add drift checks and maintenance workflows for local development, Docker builds, Railway, and Convex-hosted envs.

## Decisions

| Decision                                                                        | Status   | Notes                                                                                                          |
| ------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| Treat env management as a cross-runtime architecture task, not a validator swap | Accepted | Current issues are schema drift and duplicated manual validation across app, docs, Docker, Railway, and Convex |
| Keep this work out of `Now` until explicitly prioritized                        | Accepted | This touches many surfaces and should not displace current in-flight route/auth work without approval          |
| Prefer one canonical schema with thin runtime adapters                          | Accepted | App client, SSR/server, and Convex need different access patterns, but not different definitions               |

## Notes

- Repo state on March 22, 2026: `AGENTS.md` says envs are validated in `app/env.client.ts` and `app/env.server.ts`, but those files do not exist and envs are still read directly in app and Convex code.
- Current sources of drift include `.env.template`, `docs/environment-variables.md`, `README.md`, `Dockerfile`, Railway config, and Convex dashboard envs.
- Likely implementation direction: schema-driven env management with target-specific checks for Railway and Convex, plus generated or schema-backed docs.
