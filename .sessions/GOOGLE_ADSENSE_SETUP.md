# Google AdSense Setup Guide

## Overview

Google AdSense allows you to monetize your website by displaying ads. You earn money when visitors view or click on ads.

## Part 1: Sign Up for Google AdSense

### 1. Create AdSense Account

1. Go to https://www.google.com/adsense
2. Click **"Get started"**
3. Sign in with your Google account
4. Enter your website URL: `https://your-railway-url.up.railway.app`
5. Select your preferred language and location

### 2. Complete Application

**Required Information**:

- Website URL
- Content language (English)
- Payment address (where Google will send your earnings)
- Phone number for verification

**Important**: Your site will be reviewed by Google. Approval typically takes 1-2 weeks.

### 3. Add AdSense Code to Your Site

After applying, Google will provide you with:

- **AdSense Client ID**: Format `ca-pub-1234567890123456`
- **Ad code snippet**: A `<script>` tag to add to your site

The code has already been implemented in the app - you just need to add your client ID as an environment variable.

## Part 2: Configure Environment Variables

Add your AdSense client ID to `.env.local` and Railway:

```bash
VITE_ADSENSE_CLIENT_ID=ca-pub-1234567890123456
```

**Railway Setup**:

1. Go to Railway dashboard → Your project → Variables
2. Add `VITE_ADSENSE_CLIENT_ID` with your client ID
3. Redeploy your app

## Part 3: AdSense Review Process

### What Google Reviews

Google checks that your site meets their policies:

- ✅ **Original content**: Your price comparison data is unique
- ✅ **Sufficient content**: Dashboard with multiple products
- ✅ **Privacy Policy**: ✅ Already implemented
- ✅ **Easy navigation**: ✅ Dashboard is well-structured
- ✅ **No prohibited content**: ✅ You're good
- ⚠️ **Traffic**: Some minimum traffic may be required (varies by country)

### AdSense Program Policies

Your site must comply with:

1. **No invalid clicks**: Don't click your own ads or encourage others to
2. **Content quality**: Your comparison data is good
3. **Copyright**: All content must be original (✅ your data is)
4. **User experience**: Ads shouldn't be intrusive

Full policies: https://support.google.com/adsense/answer/48182

### Approval Timeline

- **Typical**: 1-2 weeks
- **May take longer**: 4-6 weeks in some cases
- **Check status**: AdSense dashboard → Account → Sites

## Part 4: Ad Placement Strategy

Once approved, you can place ads on your site. The component is already set up with auto ads, which let Google automatically place ads where they perform best.

### Auto Ads (Recommended for Beginners)

**Pros**:

- Google automatically places ads
- Optimizes for revenue
- No manual placement needed
- Less work for you

**Cons**:

- Less control over placement
- May place ads in unexpected locations

### Manual Ad Placement (Advanced)

If you want more control, you can manually place ad units:

**Strategic Locations**:

1. **Top of page** (header area) - High visibility
2. **Between product cards** - Native-looking
3. **Bottom of page** (before footer) - Exit intent
4. **Sidebar** (if you add one) - Persistent visibility

**Not recommended**:

- ❌ Inside product cards (confusing for users)
- ❌ Too many ads (bad UX, lower earnings per ad)
- ❌ Below the fold only (low visibility)

## Part 5: Revenue Expectations

### Realistic Earnings

**Important**: AdSense earnings depend heavily on traffic and niche.

**Typical RPM (Revenue per 1000 pageviews)**:

- **Finance niche** (gold/investing): $5-$20 RPM
- **Your site**: Likely $5-$15 RPM (finance-adjacent)

**Example Projections**:

| Daily Visitors | Monthly Pageviews\* | Estimated Monthly Revenue |
| -------------- | ------------------- | ------------------------- |
| 100            | 3,000               | $15-$45                   |
| 500            | 15,000              | $75-$225                  |
| 1,000          | 30,000              | $150-$450                 |
| 5,000          | 150,000             | $750-$2,250               |

\*Assuming 1 pageview per visitor (conservative)

**Payment Threshold**: $100 minimum (paid monthly once you reach threshold)

### Factors Affecting Earnings

1. **Traffic volume**: More visitors = more ad impressions
2. **Geographic location**: US/UK/Canada traffic pays more
3. **User engagement**: Time on site, pages per visit
4. **Ad placement**: Better placement = higher CTR
5. **Niche**: Finance-related = higher CPC (cost per click)

## Part 6: Optimization Tips

### Increase Revenue

1. **Drive more traffic**:
   - SEO optimization (✅ you have this)
   - Social media sharing
   - Reddit/HackerNews posts (if valuable)
   - Paid ads (if ROI is positive)

2. **Improve user engagement**:
   - Add historical price charts
   - Add email alerts (keeps users coming back)
   - Add comparison tools
   - Fresh content/updates

3. **Optimize ad placement** (manual ads):
   - Test different locations
   - Use heatmaps to see where users look
   - A/B test different placements

4. **Target high-value visitors**:
   - US traffic pays more than international
   - Desktop often pays more than mobile
   - Financial-interest users pay more

## Part 7: AdSense Policies to Follow

### Do's ✅

- ✅ Create original, valuable content
- ✅ Update prices regularly (you already do)
- ✅ Provide clear privacy policy (✅ you have this)
- ✅ Make ads clearly distinguishable from content
- ✅ Follow all Google guidelines

### Don'ts ❌

- ❌ Click your own ads
- ❌ Encourage others to click ads ("Please click ads to support us")
- ❌ Place ads on prohibited content
- ❌ Mislead users about ads
- ❌ Use deceptive practices to drive traffic
- ❌ Modify ad code

**Violation = Account suspension** (very hard to reinstate)

## Part 8: Payment Setup

Once you start earning:

1. **Verify address** (Google sends a PIN by mail)
2. **Add payment method**:
   - Direct deposit (recommended)
   - Check
   - Wire transfer
3. **Tax information** (required for US, optional for some countries)

**First payment**: When you reach $100 threshold

## Part 9: Alternative Monetization

If AdSense doesn't work for you:

### Other Ad Networks

1. **Media.net** (Yahoo/Bing ads) - Good alternative
2. **PropellerAds** - Lower quality, easier approval
3. **Ezoic** - Higher revenue but requires more traffic (10k+ visits/month)
4. **AdThrive/Mediavine** - Premium, requires 50k-100k+ sessions/month

### Non-Ad Monetization

1. **Affiliate links**:
   - Contact Collect Pure for referral program
   - Costco doesn't have public affiliate program

2. **Premium features** (subscription):
   - Price alerts
   - Historical charts
   - Email notifications
   - Advanced calculator

3. **Sponsored content**:
   - Bullion dealers might pay for featured placement
   - Disclaimer: Must clearly mark as sponsored

4. **Donations/Tips**:
   - Buy Me a Coffee
   - Patreon
   - Ko-fi

## Part 10: Monitoring Performance

### AdSense Dashboard Metrics

Track these metrics:

1. **Pageviews**: How many pages loaded with ads
2. **Impressions**: How many ads were shown
3. **Clicks**: How many times ads were clicked
4. **CTR** (Click-Through Rate): Clicks ÷ Impressions (aim for 1-3%)
5. **CPC** (Cost Per Click): Revenue ÷ Clicks
6. **RPM** (Revenue Per Mille): Revenue per 1000 impressions
7. **Earnings**: Total revenue

### Optimization Workflow

1. **Week 1-2**: Let auto ads run, gather data
2. **Week 3-4**: Analyze which pages/positions perform best
3. **Month 2**: Test manual ad placements if auto ads underperform
4. **Ongoing**: Monitor for policy violations, optimize for revenue

## Part 11: Common Issues

### Low Earnings

**Causes**:

- Low traffic
- Poor ad placement
- Low-value traffic (non-US, mobile)
- Ad blockers (30-40% of users)

**Solutions**:

- Increase traffic (SEO, social, paid ads)
- Try manual ad placement
- Improve content quality
- Add more pages (blog posts about gold investing)

### Policy Violations

**Common violations**:

- Accidental self-clicks
- Too many ads on page
- Misleading content
- Prohibited content

**If flagged**:

- Review policy violation email carefully
- Fix issue immediately
- Request review (can take weeks)

### Account Suspended

**Very hard to reinstate**. Prevention is key:

- Never click your own ads
- Follow all policies strictly
- Don't use bots or click farms
- Keep traffic legitimate

## Summary Checklist

- [ ] Apply for Google AdSense
- [ ] Wait for approval (1-2 weeks)
- [ ] Get AdSense client ID
- [ ] Add `VITE_ADSENSE_CLIENT_ID` to Railway env vars
- [ ] Redeploy app
- [ ] Verify ads are showing
- [ ] Monitor performance in AdSense dashboard
- [ ] Optimize placement after 2-4 weeks

## Resources

- **AdSense Help**: https://support.google.com/adsense
- **Program Policies**: https://support.google.com/adsense/answer/48182
- **Optimization Tips**: https://support.google.com/adsense/topic/1261918

## Expected Timeline

- **Month 1**: Apply, get approved, start showing ads
- **Month 2-3**: Gather data, optimize placement
- **Month 4+**: Stable revenue based on traffic

---

**Important**: AdSense requires **real organic traffic**. Don't use bots, click farms, or other prohibited methods. Build genuine traffic through SEO and valuable content.
