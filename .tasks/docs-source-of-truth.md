> **Status:** Ready

# Docs Source Of Truth

## Goal

Make the repo instructions internally consistent so a cold-start contributor or agent can trust the documented setup, tooling, and architecture.

## Scope

- Reconcile `AGENTS.md`, `README.md`, `docs/environment-variables.md`, `convex/AGENTS.md`, and `.claude/docs/market-prices.md`.
- Align docs with the current codebase for deployments, env validation, CI behavior, formatter/linter, and market-price file names.

## Non-goals

- Changing runtime behavior or deployment topology as part of the docs pass.
- Broad documentation rewrites unrelated to current drift.

## Acceptance Criteria

- Deployment guidance is consistent across repo docs.
- Tooling docs reference OXLint/oxfmt and the actual CI behavior.
- Market-price docs stop pointing at nonexistent or legacy-primary files when a better current reference exists.
- `AGENTS.md` no longer references missing env validation files without explanation.

## Key Files

- `AGENTS.md`
- `README.md`
- `docs/environment-variables.md`
- `convex/AGENTS.md`
- `.claude/docs/market-prices.md`
- `scripts/ci.ts`
- `app/root.tsx`

## Notes

- Current contradictions include dev/prod Convex deployment strategy, `twelve.ts` references, ESLint/Prettier mentions, and “parallel/Turbo” CI claims.
