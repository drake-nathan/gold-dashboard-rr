# PostHog Analytics

Canonical observability guidance now lives in `docs/observability.md`.

Use this file only as a compatibility pointer for older references.

## Remaining PostHog-Specific Note

In `vite.config.ts`, SSR must keep `posthog-js/react` bundled:

```typescript
ssr: {
  noExternal: ["posthog-js/react"],
}
```

Environment-variable requirements and runtime conventions are documented in:

- `docs/observability.md`
- `docs/environment-variables.md`
