# Session Documentation Archive

This directory contains session notes, guides, and historical documentation from the development of Dashboard.Gold.

## Directory Structure

```
.sessions/
├── README.md (this file)
├── active/              # Current, actively referenced documents
│   ├── GOOGLE_ADSENSE_SETUP.md
│   ├── OG_IMAGE_TODO.md
│   └── RAILWAY_DEPLOYMENT.md
└── archive/             # Historical documentation and audits
    ├── CONVEX.md
    ├── FRONTEND_AUDIT_2025-10-30.md
    ├── MVP_LAUNCH_CHECKLIST.md
    ├── PROJECT_AUDIT_2025-11-02.md
    └── SESSION_SUMMARY.md
```

## Active Documents (`active/`)

These documents are still relevant and actively referenced:

### Deployment & Setup
- **`RAILWAY_DEPLOYMENT.md`** - Comprehensive Railway deployment guide with Docker and environment variable configuration

### Monetization & Marketing
- **`GOOGLE_ADSENSE_SETUP.md`** - Complete Google AdSense setup guide (not yet implemented, awaiting approval)
- **`OG_IMAGE_TODO.md`** - Guide for creating Open Graph images for social media sharing (pending creation)

## Historical Archives (`archive/`)

These documents provide valuable historical context and audit findings:

### Backend Architecture
- **`CONVEX.md`** (Oct 26, 2025) - Comprehensive Convex backend audit, refactoring summary, and performance improvements
  - Documents major refactoring: Pure product matching, schema optimization, performance gains
  - Shows evolution from ~300-400 docs/query to ~50-100 docs/query (75% reduction)

### Frontend & UX
- **`FRONTEND_AUDIT_2025-10-30.md`** (Oct 30, 2025) - Frontend audit with accessibility improvements
  - All action items completed: accessibility fixes, mobile optimization, URL state management
  - Historical record of October 30 accessibility work

### Project Planning
- **`MVP_LAUNCH_CHECKLIST.md`** (Oct 2025) - MVP launch preparation checklist
  - Most items completed: Analytics (PostHog), SEO, Privacy/Terms pages, Footer
  - Pending items: Google Ads setup (optional), OG image creation

- **`PROJECT_AUDIT_2025-11-02.md`** (Nov 2, 2025) - Comprehensive project audit
  - File organization analysis, component architecture review, testability assessment
  - Note: Test coverage section outdated (now have 44 tests passing, not 0)
  - Architecture patterns and recommendations remain valuable

### Development History
- **`SESSION_SUMMARY.md`** (Oct 26, 2025) - Session-by-session development summary
  - Session 1: Major refactoring (Pure products, matching system)
  - Session 2: Product matching improvements (conservative algorithm, manual match protection)
  - Session 3: Gold API integration (market prices with 24h trends)

## Quick Reference

### When to Use These Docs

- **Deploying to Railway?** → Start with `active/RAILWAY_DEPLOYMENT.md`
- **Setting up AdSense?** → See `active/GOOGLE_ADSENSE_SETUP.md`
- **Creating social sharing images?** → Check `active/OG_IMAGE_TODO.md`
- **Understanding backend architecture?** → Read `archive/CONVEX.md`
- **Need project history?** → Review `archive/SESSION_SUMMARY.md` or audit files

### Primary Documentation

For comprehensive project documentation, see:
- **`../CLAUDE.md`** - Complete project documentation (tech stack, database schema, API integrations, UI implementation)
- **`../README.md`** - Getting started guide
- **`../TODO.md`** - Planned features and improvements

## Notes

- All dates reference 2025 calendar year
- Historical audits may contain outdated information (e.g., test coverage)
- For current state, always refer to primary docs in root directory
