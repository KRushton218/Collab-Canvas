# Deployment Strategy: Safe Multi-Branch Deployments

## Overview
CollabCanvas uses **Firebase Hosting Channels** to enable safe, isolated deployments for different branches and features without affecting production users.

## Current Setup

### Firebase Projects
```
Production:  collab-canvas-ed2fc (514078057617)
├─ Hosting URL: https://collab-canvas-ed2fc.web.app
├─ Live users: ✅ Yes
└─ Database: Firestore + Realtime DB (production data)

Development: collab-canvas-dev (975005302451)
├─ Hosting URL: https://collab-canvas-dev.web.app
├─ Live users: For testing only
└─ Database: Separate Firestore + Realtime DB (test data)
```

## Deployment Strategy

### 1. **Main Branches** (Direct Deployments)

#### Production (`master` branch)
```bash
npm run firebase:deploy:hosting
# Deploys to: https://collab-canvas-ed2fc.web.app
# Audience: All users
# Frequency: After full testing, on demand
```

#### Development (`develop` branch)
```bash
firebase use collab-canvas-dev
npm run firebase:deploy:hosting
firebase use collab-canvas-ed2fc  # Switch back to prod
```

### 2. **Feature Branches** (Channel Deployments - RECOMMENDED)

Feature branches get isolated, temporary preview URLs:

```bash
# Feature branch: feature/new-export
firebase hosting:channel:deploy feature-new-export --only hosting

# Result:
✔ Deploy complete! Temporary URL:
  https://collab-canvas-ed2fc--feature-new-export-abc123.web.app
  
# Expires in 7 days unless extended
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

### For Feature Development (Safest Option)
```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and test locally
npm run dev

# 3. Build and deploy to unique preview URL
npm run build
firebase hosting:channel:deploy feature-new-feature --only hosting

# 4. Share preview URL for testing
# https://collab-canvas-ed2fc--feature-new-feature-xxx.web.app

# 5. After approval, merge and deploy to production
git checkout master
git merge feature/new-feature
npm run firebase:deploy:hosting
```

### For Bug Fixes (Quick Deploy)
```bash
# 1. For quick fixes, deploy directly from develop to production
git checkout master
# ... make fixes ...
npm run firebase:deploy:hosting
```

### For Multiple Concurrent Features
```bash
# Branch 1: Export feature
git checkout -b feature/export
npm run build
firebase hosting:channel:deploy feature-export --only hosting
# Share: https://collab-canvas-ed2fc--feature-export-xxx.web.app

# Branch 2: New shapes feature
git checkout -b feature/new-shapes
npm run build
firebase hosting:channel:deploy feature-new-shapes --only hosting
# Share: https://collab-canvas-ed2fc--feature-new-shapes-xxx.web.app

# Both can be tested independently!
```

## Safety Guarantees

✅ **Channel Deployments are Isolated**
- Each channel has unique URL
- No impact on production users
- Separate session storage (RTDB/Firestore still shared - use test data)
- 7-day auto-expiration (prevents accumulation)

✅ **Production is Protected**
- Only explicit `firebase deploy` to main affects production
- Channel deployments never touch main URL
- Easy rollback by deploying previous version

✅ **Data Safety**
- All channels use same Firestore/RTDB databases
- Use separate canvas IDs for testing to avoid data mix
- Or switch to `collab-canvas-dev` project for complete isolation

## Environment Configuration

### Current Build Modes
```json
{
  "scripts": {
    "build": "vite build",                    // Production (default)
    "build:public": "vite build --mode public",
    "build:dev": "vite build --mode dev"
  }
}
```

### Using Build Modes
```bash
# Production build (optimized)
npm run build && firebase hosting:channel:deploy prod-test --only hosting

# Dev build (with debug info)
npm run build:dev && firebase hosting:channel:deploy dev-test --only hosting
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

## Scripts to Add to package.json

Consider adding convenience scripts:

```json
{
  "scripts": {
    "firebase:deploy:prod": "npm run build && firebase deploy --only hosting",
    "firebase:deploy:channel": "npm run build && firebase hosting:channel:deploy $(git branch --show-current) --only hosting",
    "firebase:list-channels": "firebase hosting:channels:list collab-canvas-ed2fc",
    "firebase:delete-channel": "firebase hosting:channel:delete $(git branch --show-current)"
  }
}
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

1. ✅ **Always use channels for features** - Never merge directly to master without testing
2. ✅ **Test in channel before promoting** - Share preview URL, get feedback
3. ✅ **Name channels after branches** - Makes tracking easier
4. ✅ **Clean up old channels** - Delete after merging to avoid clutter
5. ✅ **Document preview URLs** - Share with team via issue/PR
6. ✅ **Use separate canvas IDs for testing** - Avoid polluting user data

## Future Enhancements

- [ ] Automated channel creation on branch push (GitHub Actions)
- [ ] Automated testing on channel before promoting to production
- [ ] Slack notifications on deployment success/failure
- [ ] Performance metrics per deployment
