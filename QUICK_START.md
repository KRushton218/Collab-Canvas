# CollabCanvas Quick Start Guide

## 🚀 Development

```bash
# Local Development (with backend selection)
npm run dev                 # Dev backend (default, safe) → http://localhost:5173
npm run dev:prod            # Prod backend (use with caution!)

# Build
npm run build               # Production build (prod backend)
npm run build:dev           # Dev build (dev backend)

# Quality
npm run lint                # Check code quality
npm test -- --run           # Run all unit tests
npm test:coverage           # See test coverage report
```

## 🚢 Deployment (Backend Separated!)

### To Main Sites
```bash
npm run firebase:deploy:prod    # Deploy to production (collab-canvas-ed2fc)
npm run firebase:deploy:dev     # Deploy to dev (collab-canvas-dev)
```

### To Preview Channels (Recommended for Features!)
```bash
# Dev backend (safe for testing!)
npm run firebase:channel:dev
# Creates: https://collab-canvas-dev--<branch-name>-xxx.web.app

# Prod backend (for production-ready features)
npm run firebase:channel:prod
# Creates: https://collab-canvas-ed2fc--<branch-name>-xxx.web.app
```

### Management
```bash
npm run firebase:channels:list:prod      # List prod channels
npm run firebase:channels:list:dev       # List dev channels
firebase hosting:channel:delete <name>   # Clean up old channel
```

## 🔍 Debugging

1. **Check health**: `npm run build && npm run lint && npm test -- --run`
2. **Chrome DevTools**: Performance tab for profiling
3. **Firebase Console**: Watch real-time updates
4. **See**: `docs/DEBUGGING_GUIDE.md` for detailed troubleshooting

## 📋 Test Checklist

Before deploying, verify:
- [ ] Build succeeds (`npm run build`)
- [ ] No linter errors (`npm run lint`)
- [ ] Tests pass (`npm test -- --run`)
- [ ] Can create shapes
- [ ] Can edit text
- [ ] Multi-selection works
- [ ] Real-time updates work (open in 2 browsers)
- [ ] No console errors

## 📚 Documentation

| Doc | Purpose |
|-----|---------|
| `BACKEND_SEPARATION_COMPLETE.md` | ✨ NEW: Backend isolation guide |
| `DEPLOYMENT_STRATEGY.md` | How to deploy safely with backend separation |
| `docs/DEBUGGING_GUIDE.md` | How to test & troubleshoot |
| `docs/current-todos.md` | What to build next |
| `SESSION_SUMMARY_OCT18.md` | What was done today |
| `memory-bank/` | Source of truth for project |

## 🎯 Next Priority

**V1.1.0**: Copy/Paste, Undo/Redo, Polish
- Copy/Paste: Most impactful, batch infrastructure ready
- Undo/Redo: Complex but professional
- Polish: Help overlay, font family, etc.

See `docs/current-todos.md` for full roadmap.

## 💾 Firebase Projects (Completely Isolated!)

```
Production:  collab-canvas-ed2fc (514078057617)
├─ URL: https://collab-canvas-ed2fc.web.app
├─ Firestore: Production data ONLY
├─ Realtime DB: Production sessions ONLY
└─ Built with: npm run build

Development: collab-canvas-dev (975005302451)
├─ URL: https://collab-canvas-dev.web.app
├─ Firestore: Test data ONLY (completely separate!)
├─ Realtime DB: Test sessions ONLY (completely separate!)
└─ Built with: npm run build:dev
```

**Zero data conflicts** - Prod and dev users never interact! ✅

## 🔐 Key Features Working

✅ Real-time collaboration (Firestore + RTDB)
✅ Multi-user cursor tracking
✅ Shape locking & conflict prevention
✅ Text editing with formatting
✅ Multi-selection & group transforms
✅ Batch operations (paste, duplicate)
✅ Viewport culling (1000+ shapes)
✅ Optimistic locking (zero-lag UI)
✅ Idle detection & session cleanup
✅ Keyboard shortcuts

## ⚠️ Known Limitations

❌ Mobile: Not touch-optimized
❌ Copy/Paste: Not yet implemented
❌ Undo/Redo: Not yet implemented
❌ Freehand drawing: Not yet implemented
❌ Export: Not yet implemented

## 📞 Quick Help

**App won't load?**
- Clear browser cache (Cmd+Shift+R)
- Check console for errors (F12)
- Verify Firebase connection

**Shapes not syncing?**
- Verify both users on same backend (dev vs prod)
- Check which backend: Look at Firebase project ID in console
- Dev: collab-canvas-dev | Prod: collab-canvas-ed2fc
- See `docs/DEBUGGING_GUIDE.md`

**Performance issues?**
- Check if 1000+ shapes (viewport culling engaged)
- Profile in Chrome DevTools Performance tab
- See `docs/DEBUGGING_GUIDE.md` for profiling guide

**Need to rollback?**
- `git checkout <previous-commit>`
- `npm run firebase:deploy:prod`

---

**Last Updated**: October 18, 2025
**Version**: V1.0.0
**Status**: 🟢 Production-Ready
