# Docker Deployment

## Build

```bash
source .env.local && docker build \
  --build-arg VITE_CONVEX_URL="$VITE_CONVEX_URL" \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY="$VITE_CLERK_PUBLISHABLE_KEY" \
  -t gold-dashboard:test \
  .
```

VITE_ variables must be passed as build args (embedded in client bundle at build time).

## Run

```bash
source .env.local && docker run -d \
  --name gold-dashboard-test \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e VITE_CONVEX_URL="$VITE_CONVEX_URL" \
  -e VITE_CLERK_PUBLISHABLE_KEY="$VITE_CLERK_PUBLISHABLE_KEY" \
  -e CONVEX_DEPLOYMENT="$CONVEX_DEPLOYMENT" \
  -e UNWRANGLE_API_KEY="$UNWRANGLE_API_KEY" \
  -e PURE_API_KEY="$PURE_API_KEY" \
  -e GOLD_API_KEY="$GOLD_API_KEY" \
  -e FMP_API_KEY="$FMP_API_KEY" \
  -e CLERK_SECRET_KEY="$CLERK_SECRET_KEY" \
  -e VITE_PUBLIC_POSTHOG_KEY="${VITE_PUBLIC_POSTHOG_KEY:-}" \
  -e VITE_PUBLIC_POSTHOG_HOST="${VITE_PUBLIC_POSTHOG_HOST:-}" \
  gold-dashboard:test
```

VITE_ vars needed at BOTH build and runtime (client bundle + server-side loaders).

## Test

```bash
docker logs gold-dashboard-test
# Should show: [react-router-serve] http://localhost:3000

curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000
# Should return: HTTP Status: 200
```

## Clean Up

```bash
docker stop gold-dashboard-test && docker rm gold-dashboard-test
docker rmi gold-dashboard:test  # optional
```

## Notes

- Build output: `./build/server/index.js` (React Router 7 changed the structure)
- If "Cannot find module" error: `docker run --rm gold-dashboard:test ls -la /app/build/server/`
