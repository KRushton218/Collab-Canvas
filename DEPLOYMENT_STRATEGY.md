# Deployment Strategy: Backend Separation & Safe Deployments

## Overview
CollabCanvas uses **separate Firebase backends** for production and development, ensuring complete isolation between live users and testing environments. This prevents any data conflicts or accidental interactions between production and development users.

## ✅ Backend Separation (COMPLETE)

### Firebase Projects - Fully Isolated
```
Production:  collab-canvas-ed2fc (514078057617)
├─ Hosting: https://collab-canvas-ed2fc.web.app
├─ Frontend: Built with .env.production
├─ Firestore: Production data ONLY
└─ Realtime DB: Production sessions ONLY

Development: collab-canvas-dev (975005302451)
├─ Hosting: https://collab-canvas-dev.web.app
├─ Frontend: Built with .env.development
├─ Firestore: Test data ONLY (completely separate)
└─ Realtime DB: Test sessions ONLY (completely separate)
```

**Result**: Production users and dev users NEVER interact with the same data! ✅

## Deployment Strategy

### 1. **Production Deployments** (Live Backend)

Deploy to production Firebase backend with live data:

```bash
# Deploy to production (master branch recommended)
npm run firebase:deploy:prod

# What happens:
# 1. Builds with .env.production (collab-canvas-ed2fc backend)
# 2. Deploys to: https://collab-canvas-ed2fc.web.app
# 3. Users connect to PRODUCTION Firestore + RTDB
```

### 2. **Development Deployments** (Dev Backend)

Deploy to development Firebase backend with test data:

```bash
# Deploy to dev (develop/feature branches)
npm run firebase:deploy:dev

# What happens:
# 1. Builds with .env.development (collab-canvas-dev backend)
# 2. Deploys to: https://collab-canvas-dev.web.app
# 3. Users connect to DEV Firestore + RTDB (completely separate!)
```

### 3. **Preview Channels** (Isolated Testing URLs)

Create temporary preview URLs for feature branches:

#### Production Backend (for production-ready features):
```bash
npm run firebase:channel:prod
# Creates: https://collab-canvas-ed2fc--[branch]-xxx.web.app
# Backend: Production (use with caution!)
```

#### Dev Backend (for testing features):
```bash
npm run firebase:channel:dev
# Creates: https://collab-canvas-dev--[branch]-xxx.web.app
# Backend: Development (safe for testing!)
# Expires in 7 days
```

### 3. **Channel Management**

#### Create a channel
```bash
# Auto-deploys to new channel
firebase hosting:channel:deploy feature-x --only hosting
```

#### List active channels
```bash
firebase hosting:channels:list collab-canvas-ed2fc
```

#### Extend channel expiration (7 → 30 days)
```bash
firebase hosting:channel:update feature-x --expires-in 30d
```

#### Delete a channel
```bash
firebase hosting:channel:delete feature-x
```

#### Finalize a channel (promote to production)
```bash
firebase hosting:channel:finalize feature-x
# Channel becomes main release; old main archived
```

## Recommended Workflow

### For Feature Development (Safest - Recommended!)
```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and test locally with DEV backend
npm run dev
# This uses .env.development (dev backend)

# 3. Deploy to dev preview channel for team testing
npm run firebase:channel:dev
# Creates: https://collab-canvas-dev--feature-new-feature-xxx.web.app
# Backend: Dev (safe!)

# 4. Share preview URL for testing
# Team can test without affecting production users!

# 5. After approval, merge to master
git checkout master
git merge feature/new-feature

# 6. Deploy to production
npm run firebase:deploy:prod
# Backend: Production (live users)
```

### For Quick Hotfixes (Production)
```bash
# 1. Fix directly on master
git checkout master
# ... make critical fixes ...

# 2. Test locally with PRODUCTION backend
npm run dev:prod

# 3. Deploy to production immediately
npm run firebase:deploy:prod
```

### For Multiple Concurrent Features
```bash
# Branch 1: Export feature (on dev backend)
git checkout -b feature/export
npm run firebase:channel:dev
# Share: https://collab-canvas-dev--feature-export-xxx.web.app

# Branch 2: New shapes feature (on dev backend)
git checkout -b feature/new-shapes
npm run firebase:channel:dev
# Share: https://collab-canvas-dev--feature-new-shapes-xxx.web.app

# Both test independently with separate backends!
# No risk to production data!
```

## Safety Guarantees

✅ **Complete Backend Separation**
- Production backend: `collab-canvas-ed2fc` (live data)
- Development backend: `collab-canvas-dev` (test data)
- **Zero chance of data conflicts** between prod and dev users!
- Production Firestore/RTDB completely isolated from dev

✅ **Channel Deployments are Isolated**
- Each channel has unique URL
- Choose backend per deployment (prod vs dev)
- 7-day auto-expiration (prevents accumulation)
- Safe for parallel feature testing

✅ **Production is Protected**
- Requires explicit `npm run firebase:deploy:prod`
- Must use `--mode production` to connect to prod backend
- Channel deployments never touch main URL
- Easy rollback by deploying previous version

✅ **Development Freedom**
- Test freely on dev backend without affecting live users
- Create/delete test data without consequences
- Multiple developers can test simultaneously
- No production data pollution

## Environment Configuration

### Environment Files (Vite Auto-Loading)
```
.env.production       → Production backend config (collab-canvas-ed2fc)
.env.development      → Dev backend config (collab-canvas-dev)
.env.local            → Local emulator (optional, overrides others)
.env.example          → Template (for new developers)
```

### How Vite Loads Env Files
Vite automatically loads the correct `.env` file based on the `--mode` flag:

```bash
# Uses .env.production
npm run dev:prod        # Local dev with PROD backend
npm run build           # Production build → PROD backend

# Uses .env.development
npm run dev             # Local dev with DEV backend (default)
npm run build:dev       # Dev build → DEV backend
```

### NPM Scripts Summary
```json
{
  "dev": "vite --mode development",           // Dev backend
  "dev:prod": "vite --mode production",       // Prod backend
  "build": "vite build --mode production",    // Prod backend
  "build:dev": "vite build --mode development", // Dev backend
  
  "firebase:deploy:prod": "npm run build && firebase deploy --only hosting --project collab-canvas-ed2fc",
  "firebase:deploy:dev": "npm run build:dev && firebase deploy --only hosting --project collab-canvas-dev",
  "firebase:channel:prod": "npm run build && firebase hosting:channel:deploy ... --project collab-canvas-ed2fc",
  "firebase:channel:dev": "npm run build:dev && firebase hosting:channel:deploy ... --project collab-canvas-dev"
}
```

## Common Tasks

### Deploy feature to preview
```bash
npm run build
firebase hosting:channel:deploy feature-$(git branch --show-current) --only hosting
```

### Promote feature to production
```bash
firebase hosting:channel:finalize feature-new-export
```

### Rollback to previous version
```bash
# Option 1: Redeploy from previous git commit
git checkout <previous-commit>
npm run build
npm run firebase:deploy:hosting

# Option 2: Deploy from backup
npm run build
npm run firebase:deploy:hosting
```

## Quick Reference: Deployment Commands

### Local Development
```bash
npm run dev          # Dev backend (default, safe for testing)
npm run dev:prod     # Prod backend (use with caution!)
```

### Deploy to Main Sites
```bash
npm run firebase:deploy:prod    # Deploy to production
npm run firebase:deploy:dev     # Deploy to dev
```

### Deploy to Preview Channels
```bash
npm run firebase:channel:prod   # Preview on prod backend
npm run firebase:channel:dev    # Preview on dev backend (recommended!)
```

### Manage Channels
```bash
npm run firebase:channels:list:prod    # List prod channels
npm run firebase:channels:list:dev     # List dev channels
```

## Monitoring Deployments

### Check deployment status
```bash
firebase hosting:sites --project collab-canvas-ed2fc
```

### View deployment history
```bash
firebase hosting:releases:list collab-canvas-ed2fc --limit 10
```

## Troubleshooting

### Channel deployment fails
```bash
# Clear dist and rebuild
rm -rf dist
npm run build
firebase hosting:channel:deploy feature-x --only hosting --force
```

### Channel URL not working
```bash
# Verify channel exists
firebase hosting:channels:list collab-canvas-ed2fc

# Check if expired (7 days auto-delete)
# Redeploy: firebase hosting:channel:deploy feature-x --only hosting
```

### Accidentally deployed to production
```bash
# Revert to previous version
git checkout HEAD~1
npm run build
npm run firebase:deploy:hosting

# Or manually restore from backup
```

## Best Practices

1. ✅ **Default to dev backend for testing** - Use `npm run dev` and `npm run firebase:channel:dev`
2. ✅ **Test features on dev backend first** - Never test unfinished features on prod backend
3. ✅ **Use channels for code review** - Deploy to dev preview, share URL in PR
4. ✅ **Clean up old channels** - Delete after merging to avoid clutter
5. ✅ **Production deploys from master only** - Protect production from untested code
6. ✅ **Document preview URLs** - Share with team via issue/PR
7. ✅ **Check which backend you're on** - Look at Firebase Console project ID

## Future Enhancements

- [ ] Automated channel creation on branch push (GitHub Actions)
- [ ] Automated testing on channel before promoting to production
- [ ] Slack notifications on deployment success/failure
- [ ] Performance metrics per deployment
