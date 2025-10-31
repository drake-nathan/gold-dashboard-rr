# Railway Deployment Guide

## Overview

This guide covers deploying the Gold Dashboard to Railway using Docker.

## Prerequisites

- Railway account (sign up at https://railway.app)
- Railway CLI installed (optional, for local testing)
- Your environment variables from `.env.local`

## Deployment Steps

### 1. Create New Project on Railway

1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account if not already connected
5. Select your `gold-dashboard-rr` repository
6. Railway will auto-detect the Dockerfile

### 2. Configure Environment Variables

Railway needs your environment variables set in two places:

#### Build-Time Variables (VITE_* vars - embedded in client bundle)

In Railway dashboard:
1. Go to your project → Service → Variables
2. Click "New Variable"
3. Add these as **build-time variables**:

```
VITE_CONVEX_URL=https://effervescent-dog-80.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=<your-clerk-key>
```

**Important**: These need to be passed as Docker build args. Railway should automatically detect ARG declarations in your Dockerfile.

#### Runtime Variables (Server-side only)

Add these as regular environment variables:

```
NODE_ENV=production
PORT=3000
CONVEX_DEPLOYMENT=prod:effervescent-dog-80
UNWRANGLE_API_KEY=<your-key>
PURE_API_KEY=<your-key>
GOLD_API_KEY=<your-key>
FMP_API_KEY=<your-key>
CLERK_SECRET_KEY=<your-key>
```

**Note**: Railway automatically sets `PORT` if you don't, but we expose 3000 in the Dockerfile.

### 3. Configure Build Settings

Railway should auto-detect the Dockerfile, but verify:

1. Go to Settings → Build
2. Ensure "Builder" is set to "Dockerfile"
3. Dockerfile path should be `Dockerfile` (default)

### 4. Deploy

1. Railway will automatically deploy on every push to `main`
2. Monitor deployment in the "Deployments" tab
3. First deployment may take 3-5 minutes

### 5. Get Your Public URL

1. Go to Settings → Networking
2. Click "Generate Domain" to get a Railway subdomain (e.g., `your-app.up.railway.app`)
3. Or add a custom domain

## Environment Variable Management

### Which Variables Go Where?

**Build Args (VITE_* prefix)**:
- `VITE_CONVEX_URL` - Convex endpoint URL
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk public key

These are **embedded in the client JavaScript bundle** during build time.

**Runtime Env Vars** (all others):
- Server-side API keys (UNWRANGLE_API_KEY, PURE_API_KEY, etc.)
- CONVEX_DEPLOYMENT
- CLERK_SECRET_KEY

These are **available to the server at runtime** only.

### How to Set Build Args in Railway

Railway should automatically pass environment variables as Docker build args if they match ARG declarations in your Dockerfile. If not:

1. Go to Settings → Variables
2. For each VITE_* variable, ensure it's available during build
3. Railway v2 should handle this automatically

## Verifying Deployment

### Health Check

Once deployed, visit your Railway URL:
```
https://your-app.up.railway.app
```

You should see the dashboard with:
- Market prices loading (Gold, Silver, Bitcoin, S&P 500)
- Costco products displayed
- No console errors about missing Convex connection

### Troubleshooting

**Issue**: "Convex client not configured"
- **Fix**: Verify `VITE_CONVEX_URL` was passed as build arg
- **Check**: View build logs in Railway to see if ARG was received

**Issue**: API data not loading
- **Fix**: Check server-side env vars are set (UNWRANGLE_API_KEY, etc.)
- **Check**: View runtime logs for errors

**Issue**: Build fails with "bun: not found"
- **Fix**: Ensure Railway is using the Dockerfile (not auto-detected buildpack)
- **Check**: Settings → Build → Builder should be "Dockerfile"

**Issue**: Port mismatch errors
- **Fix**: Railway sets PORT dynamically; our Dockerfile uses 3000
- **Check**: Ensure you're not overriding PORT or use Railway's PORT variable

## Local Docker Testing (Optional)

Test your Docker build locally before deploying:

```bash
# Build with required build args
docker build \
  --build-arg VITE_CONVEX_URL=https://effervescent-dog-80.convex.cloud \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY=your-clerk-key \
  -t gold-dashboard .

# Run with runtime env vars
docker run -p 3000:3000 \
  -e CONVEX_DEPLOYMENT=prod:effervescent-dog-80 \
  -e UNWRANGLE_API_KEY=your-key \
  -e PURE_API_KEY=your-key \
  -e GOLD_API_KEY=your-key \
  -e FMP_API_KEY=your-key \
  -e CLERK_SECRET_KEY=your-key \
  gold-dashboard
```

Visit `http://localhost:3000` to test.

## Railway CLI Alternative

You can also deploy using Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

## Continuous Deployment

Railway automatically deploys on every push to `main`. To customize:

1. Go to Settings → Deployment
2. Configure:
   - Branch to deploy from (default: main)
   - Auto-deploy on/off
   - Deploy triggers

## Monitoring

Railway provides:
- **Logs**: Real-time server logs in the Deployments tab
- **Metrics**: CPU, memory, network usage
- **Alerts**: Configure in Settings → Alerts

## Cost Estimate

Railway pricing (as of 2025):
- **Hobby Plan**: $5/month includes $5 credit
- **Usage**: Charged for:
  - Memory (GB-hour)
  - CPU (vCPU-hour)
  - Network egress

For a dashboard like this (low traffic, SSR):
- Estimated: ~$1-3/month on Hobby plan
- Scales automatically with traffic

## Next Steps

After successful deployment:
1. Test all functionality (price updates, product display, etc.)
2. Set up custom domain (if needed)
3. Configure Railway alerts for downtime
4. Monitor logs for errors
5. Consider adding health check endpoint for Railway monitoring

## Rollback

If deployment fails:
1. Go to Deployments tab
2. Find previous successful deployment
3. Click three dots → "Redeploy"

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Project Issues: https://github.com/anthropics/claude-code/issues
