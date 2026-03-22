---
alwaysApply: true
---

## Convex Safety

Dev and prod share the same Convex deployment. Be cautious with:

- Schema changes (test carefully before deploying)
- Mutations that modify production data
- Cron jobs (ensure they don't run multiple times)

Always read `convex/_generated/ai/guidelines.md` before writing Convex code.
