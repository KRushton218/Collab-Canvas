# CollabCanvas Quick Start Guide

## 🚀 Development

```bash
npm run dev                 # Start local dev server → http://localhost:5173
npm run build              # Build for production
npm run lint               # Check code quality
npm test -- --run          # Run all unit tests
npm test:coverage          # See test coverage report
```

## 🚢 Deployment

### To Production
```bash
npm run firebase:deploy:prod
# Or full: npm run build && firebase deploy --only hosting
```

### To Preview Channel (Safest for Features)
```bash
npm run firebase:deploy:channel
# Creates: https://collab-canvas-ed2fc--<branch-name>-xxx.web.app
```

### Management
```bash
npm run firebase:channels:list      # See active channels
npm run firebase:releases:list      # Deployment history
firebase hosting:channel:finalize <name>  # Promote channel to prod
firebase hosting:channel:delete <name>    # Clean up old channel
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
| `DEPLOYMENT_STRATEGY.md` | How to deploy safely |
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

## 💾 Firebase Projects

```
Production:  collab-canvas-ed2fc (514078057617)
├─ URL: https://collab-canvas-ed2fc.web.app
└─ Data: Real user data

Development: collab-canvas-dev (975005302451)
├─ URL: https://collab-canvas-dev.web.app
└─ Data: Test data
```

Switch projects: `firebase use collab-canvas-dev`

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
- Verify both users in same project
- Check Firebase Console → Realtime DB
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
