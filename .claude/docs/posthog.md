# PostHog Analytics

## Setup

- **Provider**: `PostHogProvider` wraps the app in `app/root.tsx`
- **Package**: `posthog-js` with `posthog-js/react`
- **Auto-tracking**: SPA navigation via `defaults: '2025-05-24'` config
- **Debug mode**: Enabled in dev via `debug: import.meta.env.MODE === "development"`

## Environment Variables

```bash
VITE_PUBLIC_POSTHOG_KEY=phc_xxxx
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

These must be present in:
1. `.env.local` (dev)
2. Railway env vars (prod)
3. Dockerfile build args (lines 18-19, 23-24)

## SSR Configuration

In `vite.config.ts`:
```typescript
ssr: {
  noExternal: ["posthog-js/react"],  // NOT @posthog/react
}
```

## Troubleshooting

**PostHog not tracking in production**: Missing env vars in Railway/Docker build. Check build logs for "VITE_PUBLIC_POSTHOG_KEY is not set".

**SSR errors**: Wrong package in `noExternal`. Must be `posthog-js/react`, not `@posthog/react`.
