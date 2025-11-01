# Open Graph Image TODO

## What You Need

An Open Graph (OG) image is displayed when your site is shared on social media (Facebook, Twitter, LinkedIn, etc.).

**Recommended size**: 1200 x 630 pixels (16:9 aspect ratio)

## Design Suggestions

### Option 1: Screenshot-Based

1. Take a screenshot of your dashboard showing:
   - Header with "Gold Dashboard" title
   - Market prices (Gold, Silver, Bitcoin, S&P 500)
   - 2-3 product cards with good profit spreads
2. Add overlay text:
   - "Compare Costco Gold & Silver Prices"
   - "Live Market Data • Updated Every 5 Minutes"
3. Use gold accent color (#D4AF37) for branding

### Option 2: Custom Design

Create a branded image with:

- **Background**: Dark gradient or gold-themed
- **Main Text**: "Gold Dashboard"
- **Subtext**: "Costco vs Collect Pure Price Comparison"
- **Visual**: Gold/silver bar icons or price chart graphic
- **Footer**: "Updated Every 5 Minutes"

## Tools to Create OG Image

### Free Options

1. **Canva**: https://www.canva.com
   - Template: "Facebook Post" (1200x630)
   - Easy drag-and-drop interface
   - Free tier available

2. **Figma**: https://www.figma.com
   - More design control
   - Free tier available

3. **Photopea**: https://www.photopea.com
   - Free online Photoshop alternative
   - No account needed

### Automated Options (Code)

If you want to generate OG images dynamically:

1. **Vercel OG Image** (https://vercel.com/docs/functions/og-image-generation)
   - Generate images at build time or on-demand
   - React-based templates

2. **Satori** (https://github.com/vercel/satori)
   - Convert HTML/CSS to PNG
   - Works with React Router

## Where to Save It

Once you create the image:

1. Save as `og-image.png` (1200x630 pixels)
2. Place in `/public/og-image.png`
3. The meta tags are already configured to use it

## Testing Your OG Image

After deploying with the image:

1. **Facebook Debugger**: https://developers.facebook.com/tools/debug/
   - Enter your URL
   - Click "Scrape Again" to refresh cache

2. **Twitter Card Validator**: https://cards-dev.twitter.com/validator
   - Enter your URL
   - Preview how it looks

3. **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/
   - Enter your URL
   - Check preview

## Current Status

- ✅ Meta tags configured (app/routes/dashboard.tsx:27)
- ❌ OG image not created yet
- ❌ Image path set to `/og-image.png` (placeholder)

**Next Step**: Create and add `public/og-image.png`

## Quick Win

For a quick MVP launch, you can:

1. Take a screenshot of your dashboard
2. Crop to 1200x630
3. Add simple text overlay in Canva
4. Save as `og-image.png`
5. Done in 10-15 minutes!
