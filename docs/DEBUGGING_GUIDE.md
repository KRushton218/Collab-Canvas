# Debugging & Testing Guide for CollabCanvas

## Quick Health Check

### Build Status
```bash
npm run build
# Expected: ✓ built in ~3s, bundle ~350KB gzipped
# Note: Size warning is normal (Konva + Firebase = large)
```

### Lint Check
```bash
npm run lint
# Expected: Clean with no errors (warnings OK)
```

### Unit Tests
```bash
npm test -- --run
# Expected: All tests pass
```

### Development Server
```bash
npm run dev
# Expected: App loads at http://localhost:5173
```

---

## Manual Testing Checklist

### Prerequisites
1. **Be logged in** (email or Google)
2. **Have another browser/window** for multi-user testing
3. **Firebase console** open for real-time DB inspection

### Core Functionality Tests

#### 1. Shape Creation & Basic Operations ✓
- [ ] Create rectangle: Click Rectangle tool → click/drag on canvas
- [ ] Create circle: Click Circle tool → click/drag on canvas
- [ ] Create line: Click Line tool → click/drag on canvas
- [ ] Create text: Click Text tool → click canvas
- [ ] All shapes appear instantly
- [ ] Shapes are selectable (click to highlight)

#### 2. Single Shape Operations ✓
- [ ] **Move**: Click + drag shape → moves smoothly
- [ ] **Resize**: Drag resize handles → changes size
- [ ] **Rotate**: Use rotation handle → rotates around center
- [ ] **Delete**: Select shape + press Delete → gone
- [ ] **Lock indicator**: When dragging, blue lock border appears
- [ ] **Color**: Fill picker changes color → updates instantly

#### 3. Multi-Selection ✓
- [ ] **Click + Shift**: Select multiple shapes
- [ ] **Click + Cmd/Ctrl**: Toggle individual selections
- [ ] **Drag selection box**: Click empty area + drag box → selects all in box
- [ ] **Move group**: Drag multiple selected → all move together
- [ ] **Resize group**: Handle drag → all scale proportionally
- [ ] **Rotate group**: Rotation handle → all rotate together

#### 4. Real-Time Collaboration ✓
- [ ] **Open in 2nd browser**: Same canvas loads for both users
- [ ] **Cursor tracking**: See other user's cursor moving
- [ ] **Shape updates**: When one user moves shape, other sees it in real-time
- [ ] **Presence list**: Shows who's online
- [ ] **Lock conflicts**: When user 2 tries to move locked shape, gets toast notification

#### 5. Text Editing ✓
- [ ] **Create text**: Text tool → click → editor opens automatically
- [ ] **Edit text**: Double-click text shape → editor opens
- [ ] **Format text**: Bold, Italic, Underline buttons work
- [ ] **Font size**: Slider changes size → preview updates
- [ ] **Alignment**: L/C/R buttons change alignment
- [ ] **Save**: Click outside or Ctrl+Enter → saves to Firestore
- [ ] **Cancel**: Esc key → cancels edit without saving
- [ ] **Empty delete**: If save with empty text → shape auto-deletes

#### 6. Performance Tests ✓
- [ ] **50 shapes**: Create 50 shapes → still responsive
- [ ] **Rapid operations**: Click 50 times fast → no lag
- [ ] **Large selection**: Select 50 shapes → no freeze
- [ ] **Drag 50 shapes**: Multi-select + drag → smooth
- [ ] **Batch paste**: Paste 50 shapes → appears instantly (with loading indicator)

#### 7. Presence & Idle ✓
- [ ] **Idle user**: Stop moving mouse for 5 min → "idle" indicator appears
- [ ] **Re-activate**: Move mouse → "idle" disappears
- [ ] **Online count**: Navbar shows correct count of active users
- [ ] **Presence list**: Shows all connected sessions

#### 8. Zoom & Pan ✓
- [ ] **Zoom buttons**: +/- buttons work correctly
- [ ] **Wheel zoom**: Ctrl/Cmd + scroll → zooms in/out
- [ ] **Pan (Space)**: Hold Space → cursor changes to hand
- [ ] **While panning**: Shapes are non-interactive (can't drag)
- [ ] **Release Space**: Back to normal mode
- [ ] **Reset view**: Button resets zoom and position

#### 9. Keyboard Shortcuts ✓
- [ ] **Select tool**: V key
- [ ] **Rectangle tool**: R key
- [ ] **Circle tool**: C key
- [ ] **Line tool**: L key
- [ ] **Text tool**: T key
- [ ] **Delete**: Delete or Backspace
- [ ] **Arrow keys**: Move selected shapes (single or multi)
- [ ] **Escape**: Exit tool mode, return to select

#### 10. Data Persistence ✓
- [ ] **Create shape**: Appears in both Firestore and RTDB
- [ ] **Close/reopen**: Shape still there after page reload
- [ ] **Multi-user**: User A creates shape → User B reloads → sees it
- [ ] **Real-time sync**: User B sees changes without reloading

---

## Common Issues & Solutions

### Issue: "Shapes not appearing"
**Diagnosis**:
```bash
# Check browser console for errors
# Check Firebase connection
firebase console → Database → Rules
# Verify Firestore has data
```

**Solutions**:
1. Refresh page (F5 or Cmd+R)
2. Check console for auth errors
3. Verify Firebase project is active: `firebase use`
4. Check network tab for failed requests

---

### Issue: "Real-time updates not showing"
**Diagnosis**:
```bash
# Open Firebase Console
# Watch RTDB /activeEdits when dragging
# Should update in real-time for other users
```

**Solutions**:
1. RTDB listener may not be active
2. Check Firestore listener subscriptions
3. Verify both users in same Firebase project
4. Check browser console for errors

---

### Issue: "Performance sluggish with 50+ shapes"
**Diagnosis**:
```bash
# Open DevTools Performance tab
# Record while dragging 50 shapes
# Check:
# - Are all 641 shapes rendering? (should be viewport-culled)
# - How many listeners active?
# - Memory usage
```

**Solutions**:
1. Viewport culling should reduce renders
2. Check if optimistic locking is active
3. Verify batch operations working
4. Profile in Chrome DevTools

---

### Issue: "Can't drag shapes"
**Diagnosis**:
```bash
# Check if shapes are locked
# Look for colored border (indicates lock)
# Check Firebase RTDB /locks
```

**Solutions**:
1. If locked by other user → release and try again
2. If locked by you → check for multiple selections
3. Release locks: Deselect or reload
4. Check console for lock errors

---

### Issue: "Text not saving"
**Diagnosis**:
```bash
# Open text editor
# Type text and click save
# Check browser console for errors
# Check Firestore for shape entry
```

**Solutions**:
1. Verify text field not empty
2. Check Firestore rules allow writes
3. Verify shape has valid ID
4. Check auth status

---

## Advanced Debugging

### Enable Debug Logging

Add to `src/services/realtimeShapes.js`:
```javascript
const DEBUG = true;

if (DEBUG) console.log('Lock acquired for:', shapeId);
```

### Firebase Console Inspection

1. **Firestore**:
   - Go to Firebase Console → Firestore
   - Collection → `shapes`
   - View shape documents
   - Check `x`, `y`, `width`, `height`, `rotation`

2. **Realtime Database**:
   - Firebase Console → Realtime Database
   - Check `/activeEdits/` (current drags)
   - Check `/locks/` (locked shapes)
   - Check `/cursors/` (user cursors)
   - Check `/sessions/` (user presence)

3. **Security Rules**:
   - Verify rules in Firebase Console
   - Rules in: `/firestore.rules`
   - Rules in: `/database.rules.json`

### Chrome DevTools

#### Console Tab
```javascript
// Check if auth user
console.log(Firebase user if available);

// Check Firestore listener status
// Look for "Listening to shapes..."

// Check RTDB listener status
// Look for "Subscribing to..."
```

#### Network Tab
- Filter by XHR requests
- Watch for `/firestore` and `/database` calls
- Should see batched operations (fewer calls = better)

#### Performance Tab
1. Click Record
2. Perform action (e.g., drag 50 shapes)
3. Click Stop
4. Look for:
   - Blue = rendering
   - Yellow = scripting
   - Purple = layout/reflow
5. Aim for < 50ms per frame (60 FPS = 16.67ms)

#### Memory Tab
1. Take heap snapshot
2. Perform operations (paste 100 shapes, etc.)
3. Take another snapshot
4. Compare: should not grow unbounded
5. Check for detached DOM nodes

---

## Testing Different Scenarios

### Scenario 1: High Concurrency (5+ Users)
```bash
# Open app in 5 different windows/machines
# Each user creates different shapes
# All users drag shapes simultaneously
# Verify:
# - No conflicting locks
# - All shapes update in real-time
# - No ghost shapes
# - Performance acceptable
```

### Scenario 2: Large Canvas (500+ Shapes)
```bash
# Create many shapes (or load existing large canvas)
# Verify:
# - Viewport culling reduces renders
# - Panning/zooming responsive
# - Selection works smoothly
# - Multi-drag doesn't freeze
```

### Scenario 3: Poor Network (Simulate in DevTools)
```bash
# Open DevTools → Network tab
# Set throttling to "3G" or "Slow 4G"
# Perform operations:
# - Paste shapes
# - Drag shapes
# - Edit text
# Verify:
# - No UI freezing (uses optimistic updates)
# - Updates still reach backend
# - Eventually consistent
```

### Scenario 4: Disconnection Recovery
```bash
# Drag a shape
# Simulate disconnection: DevTools → Network → Offline
# Stop dragging
# Turn connection back on
# Verify:
# - Shape position recovered
# - No orphaned locks
# - Reconnect works automatically
```

### Scenario 5: Tab Visibility
```bash
# Switch tabs away (hide app)
# 30 seconds pass
# Switch back to app
# Verify:
# - Heartbeat paused while hidden (saves bandwidth)
# - Resumed when visible
# - Presence still active
```

---

## Performance Benchmarks

### Expected Performance

| Operation | Before Optimization | After | Target |
|-----------|-------------------|-------|--------|
| Select 641 shapes | Freezes | <100ms | ✓ |
| Drag 641 shapes | Freezes | Smooth | ✓ |
| Paste 50 shapes | 2-3s lag | Instant | ✓ |
| Move 20 shapes | 20 RTDB writes | 1 write | ✓ |
| Render 641 shapes | All 641 | ~50 visible | ✓ |

### How to Measure

```javascript
// In console
performance.mark('start');
// ... perform action ...
performance.mark('end');
performance.measure('action', 'start', 'end');
console.log(performance.getEntriesByName('action')[0].duration);
```

---

## Known Working Features ✅

- ✅ Real-time shape sync (Firestore + RTDB)
- ✅ Multi-user cursor tracking
- ✅ Shape locking with TTL
- ✅ Batch operations (paste, duplicate)
- ✅ Text editing with formatting
- ✅ Viewport culling
- ✅ Optimistic locking
- ✅ Idle detection (5 min timeout)
- ✅ Session cleanup (1 hour timeout)
- ✅ Performance with 641 shapes

---

## Known Limitations

- ❌ Mobile: Not optimized for touch
- ❌ Performance untested above 1000 shapes
- ❌ Concurrent users > 10 untested
- ❌ Copy/Paste not yet implemented
- ❌ Undo/Redo not yet implemented

---

## Deployment Testing

### Before Deploying

1. **Build successful**: `npm run build` ✓
2. **Linter clean**: `npm run lint` ✓
3. **Tests pass**: `npm test` ✓
4. **Manual testing**: Complete checklist above
5. **Memory leaks**: Use Chrome DevTools Memory tab
6. **Performance**: No jank during normal use

### Deploy to Channel

```bash
npm run build
firebase hosting:channel:deploy feature-test --only hosting
# Test at: https://collab-canvas-ed2fc--feature-test-xxx.web.app
```

### Promote to Production

```bash
firebase hosting:channel:finalize feature-test
# Now live at: https://collab-canvas-ed2fc.web.app
```

---

## Troubleshooting Deployment

### Channel deployment fails
```bash
rm -rf dist node_modules/.vite
npm run build
firebase hosting:channel:deploy feature-x --only hosting --force
```

### Production deployment issues
```bash
# Rollback to previous version
git log --oneline | head -5
git checkout <previous-commit>
npm run build
npm run firebase:deploy:prod
```

---

## Resources

- [Firebase Console](https://console.firebase.google.com/)
- [Konva Documentation](https://konvajs.org/)
- [React-Konva API](https://github.com/konvajs/react-konva)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
