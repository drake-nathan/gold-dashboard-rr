# MVP Launch Checklist

## ✅ Week 1 - Completed Tasks

All critical MVP features have been implemented! Here's what was done:

### 1. ✅ Hide Auth UI in Production (5 mins)

**Status**: Complete

**What was done**:

- Added `VITE_ENABLE_AUTH` feature flag
- Auth UI hidden by default in production
- Shows in development mode automatically
- Can be enabled in production by setting `VITE_ENABLE_AUTH=true`

**Files**:

- `app/components/header/auth-buttons.tsx`
- `.env.template`
- `.sessions/RAILWAY_DEPLOYMENT.md`

---

### 2. ✅ Add Analytics (30 mins)

**Status**: Complete - PostHog implemented

**What was done**:

- PostHog provider added to root app
- Tracks page views, user interactions, and sessions
- Automatic exception tracking (replaces Sentry!)
- Debug mode enabled in development only
- Gracefully handles missing configuration

**Files**:

- `app/root.tsx` (lines 73-105)
- `.env.template` (PostHog env vars)
- `.sessions/RAILWAY_DEPLOYMENT.md`

**PostHog features**:

- ✅ Analytics & event tracking
- ✅ Session replay
- ✅ Exception tracking
- ✅ Feature flags (available if needed)

**Environment Variables**:

```bash
VITE_PUBLIC_POSTHOG_KEY=phc_xxxxx
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

---

### 3. ✅ Add Google AdSense (30 mins)

**Status**: Complete - Code ready, awaiting AdSense approval

**What was done**:

- Created comprehensive Google AdSense setup guide
- Implemented AdSense Auto Ads component
- Made optional (won't break if not configured)
- Uses Auto Ads for automatic optimization

**Files**:

- `.sessions/GOOGLE_ADSENSE_SETUP.md` (full setup guide)
- `app/components/adsense.tsx`
- `app/root.tsx` (AdSense component in head)

**Environment Variables** (add after AdSense approval):

```bash
VITE_ADSENSE_CLIENT_ID=ca-pub-1234567890123456
```

**Next Steps**:

1. Apply for Google AdSense at https://www.google.com/adsense
2. Wait for approval (1-2 weeks)
3. Get your AdSense client ID
4. Add to Railway env vars
5. Redeploy

**Revenue Expectations**:

- Finance niche: $5-$15 RPM (revenue per 1000 pageviews)
- 1000 daily visitors = ~$150-450/month
- Payment threshold: $100 minimum

---

### 4. ✅ Add SEO Meta Tags and Open Graph (1-2 hours)

**Status**: Complete

**What was done**:

- Enhanced meta tags with comprehensive SEO
- Added Open Graph tags for social sharing (Facebook, LinkedIn)
- Added Twitter Card tags
- Created `robots.txt` for search engines
- Created `sitemap.xml` for search engine indexing
- Added web app manifest for PWA support
- Added favicon links to root layout

**Files**:

- `app/routes/dashboard.tsx` (meta tags)
- `public/robots.txt`
- `public/sitemap.xml`
- `public/manifest.json`
- `app/root.tsx` (favicon links)
- `.sessions/OG_IMAGE_TODO.md` (guide for creating OG image)

**Meta Tags Include**:

- Title, description, keywords
- Open Graph (og:title, og:description, og:image, etc.)
- Twitter Card (twitter:card, twitter:title, etc.)
- Theme color, robots, author

**TODO**:

- [ ] Create `public/og-image.png` (1200x630) - see `.sessions/OG_IMAGE_TODO.md`
- [ ] Update URL in `app/routes/dashboard.tsx:13` when you have custom domain

---

### 5. ✅ Add Privacy Policy Page (1 hour)

**Status**: Complete

**What was done**:

- Created comprehensive Privacy Policy page
- Covers all required sections for Google Ads compliance
- Documents PostHog and Google Ads data collection
- Explains cookies and third-party services
- Added route: `/privacy`

**Files**:

- `app/routes/privacy.tsx`

**Coverage**:

- ✅ Information collection
- ✅ How data is used
- ✅ Analytics (PostHog)
- ✅ Google Ads tracking
- ✅ Cookies
- ✅ Third-party services
- ✅ Data security
- ✅ User rights

---

### 6. ✅ Add Terms of Service Page (1 hour)

**Status**: Complete

**What was done**:

- Created comprehensive Terms of Service page
- Strong disclaimers about financial advice
- Covers accuracy of information
- Liability limitations
- Added route: `/terms`

**Files**:

- `app/routes/terms.tsx`

**Key Sections**:

- ✅ No financial advice disclaimer
- ✅ Data accuracy disclaimers
- ✅ Third-party links
- ✅ Intellectual property
- ✅ Limitation of liability
- ✅ User responsibilities

---

### 7. ✅ Add Footer with Legal Links

**Status**: Complete

**What was done**:

- Created footer component with links to Privacy & Terms
- Added copyright and disclaimer
- Added footer to dashboard

**Files**:

- `app/components/footer.tsx`
- `app/components/dashboard/index.tsx`

---

## 🚀 Ready to Launch!

All Week 1 critical features are complete. Your app now has:

1. ✅ Analytics tracking (PostHog)
2. ✅ Google Ads conversion tracking (ready to use)
3. ✅ SEO optimization (meta tags, sitemap, robots.txt)
4. ✅ Legal compliance (Privacy Policy, Terms of Service)
5. ✅ Auth hidden in production
6. ✅ Footer with legal links

---

## 📝 Pre-Launch Checklist

Before going live with ads, make sure:

### Railway Environment Variables

```bash
# Required (already set)
VITE_CONVEX_URL=https://effervescent-dog-80.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=<your-key>
CONVEX_DEPLOYMENT=prod:effervescent-dog-80
NODE_ENV=production
UNWRANGLE_API_KEY=<your-key>
PURE_API_KEY=<your-key>
GOLD_API_KEY=<your-key>
FMP_API_KEY=<your-key>
CLERK_SECRET_KEY=<your-key>

# Analytics (add these!)
VITE_PUBLIC_POSTHOG_KEY=<your-posthog-key>
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Google Ads (add after account setup)
VITE_GOOGLE_ADS_ID=AW-XXXXXXXXXX
VITE_GOOGLE_ADS_COSTCO_LABEL=<label>
VITE_GOOGLE_ADS_PURE_LABEL=<label>
```

### Deployment Steps

1. **Add PostHog env vars to Railway**:
   - Go to Railway dashboard → Variables
   - Add `VITE_PUBLIC_POSTHOG_KEY` and `VITE_PUBLIC_POSTHOG_HOST`
   - Redeploy

2. **Create OG Image** (optional but recommended):
   - Follow `.sessions/OG_IMAGE_TODO.md`
   - Create 1200x630 image
   - Save as `public/og-image.png`
   - Commit and push

3. **Set up Google Ads** (when ready):
   - Follow `.sessions/GOOGLE_ADS_SETUP.md`
   - Get conversion IDs
   - Add to Railway env vars
   - Redeploy

4. **Test Everything**:
   - Visit your Railway URL
   - Check PostHog dashboard for events
   - Test Privacy/Terms pages: `/privacy` and `/terms`
   - Verify meta tags with view-source
   - Test social sharing with Facebook Debugger

5. **Submit to Search Engines** (optional):
   - Google Search Console: https://search.google.com/search-console
   - Bing Webmaster Tools: https://www.bing.com/webmasters
   - Submit your sitemap URL

---

## 🎯 Next Steps (Post-Launch)

After launching, monitor:

1. **PostHog Dashboard**:
   - Track daily visitors
   - See which filters are used most
   - Monitor error rates
   - View session replays

2. **Google Ads** (if running):
   - Monitor conversion rates (link clicks)
   - Adjust bids based on performance
   - Add negative keywords
   - A/B test ad copy

3. **SEO**:
   - Monitor search console for impressions/clicks
   - See what keywords people search
   - Improve meta descriptions based on CTR

4. **Feature Roadmap**:
   - Enable auth when ready for subscriptions
   - Add price alerts feature (paid)
   - Add email notifications
   - Add historical price charts

---

## 📚 Reference Documents

- **Deployment**: `.sessions/RAILWAY_DEPLOYMENT.md`
- **Google Ads Setup**: `.sessions/GOOGLE_ADS_SETUP.md`
- **OG Image Guide**: `.sessions/OG_IMAGE_TODO.md`

---

## ✨ You're Ready to Launch!

Total time invested: ~4-5 hours
All critical MVP features: ✅ Complete

**Next**: Add PostHog keys to Railway, redeploy, and you're live! 🚀
