# How CollabCanvas Real-Time Sync Works

## The Two-Database Architecture

Your system uses **two Firebase databases** working together:

```
┌─────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  React Components (Canvas.jsx)                              │
│         ↕                                                    │
│  CanvasContext (state management)                           │
│         ↕                                                    │
│  ┌─────────────────────┐     ┌────────────────────────┐   │
│  │  shapes.js          │     │  realtimeShapes.js     │   │
│  │  (Firestore)        │     │  (RTDB)                │   │
│  └──────────┬──────────┘     └──────────┬─────────────┘   │
└─────────────┼───────────────────────────┼──────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────┐  ┌──────────────────────────┐
│   FIRESTORE             │  │   RTDB                   │
│   (Document Database)   │  │   (Real-time Database)   │
├─────────────────────────┤  ├──────────────────────────┤
│ /shapes/                │  │ /canvas/global/          │
│   ├─ shape-123          │  │   ├─ activeEdits/        │
│   │   ├─ id            │  │   │   └─ shape-123        │
│   │   ├─ x: 100        │  │   │       ├─ x: 105       │
│   │   ├─ y: 200        │  │   │       ├─ y: 205       │
│   │   └─ ...           │  │   │       └─ lockedBy     │
│   ├─ shape-456          │  │   ├─ locks/              │
│   └─ ... (500 shapes)   │  │   │   └─ shape-123       │
│                         │  │   │       └─ lockedBy     │
│ PERSISTENT STORAGE ✓    │  │   └─ /sessions/          │
│ O(1) operations ✓       │  │       └─ user-xyz        │
│ Scales infinitely ✓     │  │           ├─ cursorX     │
└─────────────────────────┘  │           └─ cursorY     │
                             │                          │
                             │ TEMPORARY DATA ✓         │
                             │ Live updates (30 FPS) ✓  │
                             │ Delta syncing ✓          │
                             └──────────────────────────┘
```

---

## Why Two Databases?

### Firestore (shapes.js)
**Purpose:** Persistent storage of all shapes  
**When used:** 
- ✅ Initial canvas load
- ✅ Creating new shapes
- ✅ Final position after drag/resize
- ✅ Deleting shapes

**Characteristics:**
- O(1) operations (1 doc per shape)
- Slower sync (~100-200ms)
- Perfect for persistence
- Cheaper for infrequent updates

### RTDB (realtimeShapes.js)
**Purpose:** Live collaborative features  
**When used:**
- ✅ During active drag/resize
- ✅ Locking shapes
- ✅ Cursor tracking
- ✅ User presence

**Characteristics:**
- Delta-based updates (only changes)
- Ultra-fast sync (~20-50ms)
- Perfect for real-time
- Cheaper for frequent updates

---

## Complete Lifecycle: Creating a Shape

### Step 1: User Creates Shape

```javascript
// User clicks "Add Rectangle" button
// → Canvas.jsx calls addShape()

addShape({
  x: 100,
  y: 200,
  width: 100,
  height: 50,
  fill: '#cccccc'
})
```

### Step 2: Write to Firestore

```javascript
// CanvasContext.jsx → shapes.js

createShape({
  id: 'shape-abc123',          // Generated
  canvasId: 'global-canvas-v1',
  x: 100,
  y: 200,
  width: 100,
  height: 50,
  fill: '#cccccc',
  createdAt: '2025-10-14T...',
  updatedAt: '2025-10-14T...',
  createdBy: 'user-xyz'        // Current user
})

// Creates: /shapes/shape-abc123 in Firestore
```

### Step 3: Firestore Notifies All Clients

```javascript
// All browsers have subscribed to Firestore:
subscribeToShapes(callback)
  → onSnapshot fires when new shape added
  → callback receives updated shapes array
  → React re-renders
  → Shape appears on canvas ✨

Timeline:
T=0ms    User A creates shape
T=50ms   Firestore write complete
T=150ms  Firestore sync to User B
T=151ms  User B sees new shape ✨
```

---

## Complete Lifecycle: Dragging a Shape

This is where BOTH databases work together!

### Phase 1: Drag Start (Lock Acquisition)

```
T=0ms: User A clicks shape-123 and starts dragging

Canvas.jsx onDragStart() fires:
  ↓
CanvasContext.startEditingShape('shape-123'):
  1. Check if already locked by someone else
     → Query RTDB: /canvas/global/locks/shape-123
     → If locked by User B: Return false, cancel drag ❌
  
  2. Acquire lock
     → Write RTDB: /canvas/global/locks/shape-123
        { lockedBy: 'user-A', lockedAt: 1234567890 }
  
  3. Copy shape to RTDB for live updates
     → Read Firestore: /shapes/shape-123 (get current position)
     → Write RTDB: /canvas/global/activeEdits/shape-123
        { x: 100, y: 200, width: 100, height: 50, lockedBy: 'user-A' }
  
  4. Set up disconnect handler (auto-cleanup if user crashes)
     → onDisconnect() will clear lock and activeEdit

Result: Shape is locked ✅
        RTDB has initial position ✅
```

**Other users see:**
```
T=20ms: RTDB lock syncs to User B
        → subscribeToLocks() callback fires
        → locks state updated
        → Shape shows colored border (User A's color)
        → Shape becomes non-draggable for User B
```

### Phase 2: Active Dragging (Live Updates)

```
User A drags shape-123 across canvas (2 seconds)

T=33ms:  onDragMove fires (first update)
         → updateShapeTemporary('shape-123', { x: 105, y: 202 })
         → Throttle check: First update, send it!
         → RTDB update: /canvas/global/activeEdits/shape-123
            { x: 105, y: 202, lastUpdate: T }
         
T=50ms:  onDragMove fires
         → updateShapeTemporary({ x: 110, y: 204 })
         → Throttle check: Only 17ms since last, SKIP ❌

T=66ms:  onDragMove fires
         → updateShapeTemporary({ x: 115, y: 206 })
         → Throttle check: 33ms since last, SEND ✅
         → RTDB update

T=99ms:  onDragMove fires
         → Send update (33ms passed) ✅

... continues every 33ms (30 FPS)

T=2000ms: User releases mouse
```

**Other users see (User B's timeline):**
```
T=33ms:  RTDB sync: Shape moves to (105, 202)
         → subscribeToActiveEdits() callback fires
         → activeEdits state updated
         → Merge logic: Apply RTDB position since locked by User A
         → React re-renders
         → Shape appears at new position on User B's screen ✨

T=66ms:  RTDB sync: Shape moves to (115, 206)
         → Same process, shape moves smoothly

T=99ms:  Update...
T=132ms: Update...
... smooth 30 FPS animation of User A's drag ✨
```

### Phase 3: Drag End (Commit & Cleanup)

```
T=2000ms: User A releases mouse (onDragEnd fires)

Final position: { x: 500, y: 600 }

CanvasContext.finishEditingShape('shape-123', { x: 500, y: 600 }):

  Step 1: Force final RTDB update (bypass throttle)
    → updateEditingShape('shape-123', { x: 500, y: 600 }, forceUpdate=true)
    → RTDB immediate write (no throttle)
    → Other users see final position via RTDB ✅

  Step 2: Start Firestore update (parallel)
    → updateShape('shape-123', { x: 500, y: 600 })
    → Firestore write begins (takes ~100ms)

  Step 3: Wait for RTDB to propagate
    → await delay(150ms)
    → Ensures User B sees RTDB update

  Step 4: Wait for Firestore to complete
    → await firestorePromise
    → Firestore write done

  Step 5: Wait for Firestore to propagate
    → await delay(100ms)
    → Ensures User B receives Firestore update

  Step 6: Clear RTDB and release lock
    → Delete: /canvas/global/activeEdits/shape-123
    → Delete: /canvas/global/locks/shape-123
    → Shape no longer locked ✅
```

**Timeline of handoff:**
```
T=2000ms  User A releases
T=2001ms  RTDB gets final position (forceUpdate)
T=2020ms  User B sees RTDB update (x: 500, y: 600) ✨
T=2002ms  Firestore write starts
T=2150ms  Wait 150ms
T=2180ms  Firestore write completes
T=2280ms  Wait 100ms more
T=2300ms  User B receives Firestore update
T=2301ms  RTDB cleared

Result: Smooth handoff from RTDB → Firestore
        No gap where User B sees stale data ✅
```

---

## How Other Users See Updates

### User B's Perspective (Watching User A Drag)

**CanvasContext.jsx merge logic (lines 99-126):**

```javascript
// User B has:
// - firestoreShapes: [{ id: 'shape-123', x: 100, y: 200, ... }]
// - activeEdits: { 'shape-123': { x: 500, y: 600, lockedBy: 'user-A' } }
// - locks: { 'shape-123': { lockedBy: 'user-A' } }

// Merge function runs:
const mergedShapes = firestoreShapes.map((shape) => {
  const activeEdit = activeEdits[shape.id];  // RTDB data
  const lock = locks[shape.id];
  
  // Is someone ELSE editing this shape?
  if (activeEdit && activeEdit.lockedBy !== currentUser.uid) {
    // YES! Use RTDB position (live updates)
    return {
      ...shape,                    // Base from Firestore
      x: activeEdit.x,             // Override with RTDB ✨
      y: activeEdit.y,
      width: activeEdit.width,
      height: activeEdit.height,
      lockedBy: activeEdit.lockedBy
    };
  }
  
  // Not actively edited, use Firestore position
  return {
    ...shape,
    lockedBy: lock?.lockedBy || null
  };
});

// User B renders merged shapes
// → shape-123 shows at RTDB position (500, 600)
// → with colored lock border
// → non-draggable
```

**Key insight:** User B sees RTDB data during active edit, automatically falls back to Firestore after edit finishes!

---

## Data Flow Diagram: Complete Picture

```
USER A DRAGS SHAPE-123
══════════════════════════════════════════════════════════════

                     [User A's Browser]
                            │
                    ┌───────▼────────┐
                    │  Canvas.jsx    │
                    │  (Konva drag)  │
                    └───────┬────────┘
                            │ onDragMove (every frame)
                    ┌───────▼────────┐
                    │ CanvasContext  │
                    │ updateShape    │
                    │ Temporary()    │
                    └───────┬────────┘
                            │ throttled to 33ms
                    ┌───────▼────────┐
                    │ realtimeShapes │
                    │ .updateEditing │
                    │ Shape()        │
                    └───────┬────────┘
                            │
                            ▼
                    ┌────────────────┐
                    │      RTDB      │
                    │  /activeEdits/ │
                    │   shape-123    │
                    │  x:500, y:600  │
                    └────────┬───────┘
                             │
          ┌──────────────────┼──────────────────┐
          │ Delta sync       │                  │
          │ (only changes)   │                  │
          │ ~20-50ms         │                  │
          ▼                  ▼                  ▼
   [User B Browser]   [User C Browser]   [User D Browser]
          │                  │                  │
   ┌──────▼────────┐  ┌──────▼────────┐ ┌──────▼────────┐
   │subscribeToAct │  │subscribeToAct │ │subscribeToAct │
   │iveEdits()     │  │iveEdits()     │ │iveEdits()     │
   │ callback fires│  │ callback fires│ │ callback fires│
   └──────┬────────┘  └──────┬────────┘ └──────┬────────┘
          │                  │                  │
   ┌──────▼────────┐  ┌──────▼────────┐ ┌──────▼────────┐
   │ Merge logic   │  │ Merge logic   │ │ Merge logic   │
   │ applies RTDB  │  │ applies RTDB  │ │ applies RTDB  │
   │ position      │  │ position      │ │ position      │
   └──────┬────────┘  └──────┬────────┘ └──────┬────────┘
          │                  │                  │
   ┌──────▼────────┐  ┌──────▼────────┐ ┌──────▼────────┐
   │ React renders │  │ React renders │ │ React renders │
   │ shape at      │  │ shape at      │ │ shape at      │
   │ (500, 600) ✨ │  │ (500, 600) ✨ │ │ (500, 600) ✨ │
   └───────────────┘  └───────────────┘ └───────────────┘

═══════════════════════════════════════════════════════════
USER A RELEASES MOUSE (onDragEnd)
═══════════════════════════════════════════════════════════

        [User A's Browser]
               │
       ┌───────▼────────┐
       │ finishEditing  │
       │ Shape()        │
       └───┬────────┬───┘
           │        │
           │        └──────────────────────┐
           │                               │
           ▼                               ▼
   ┌────────────────┐            ┌─────────────────┐
   │ RTDB           │            │ FIRESTORE       │
   │ Final update   │            │ /shapes/        │
   │ (forceUpdate)  │            │  shape-123      │
   │ x:500, y:600   │            │  x:500, y:600   │
   └────┬───────────┘            └────┬────────────┘
        │                             │
        │ ~20-50ms                    │ ~100-200ms
        │                             │
        ▼                             ▼
   [All Users]                   [All Users]
   See RTDB update ✅            See Firestore update ✅
        │                             │
        │ Wait 250ms...               │
        ▼                             │
   ┌────────────────┐                 │
   │ RTDB cleared   │                 │
   └────────────────┘                 │
        │                             │
        │ Users now see Firestore ───┘
        ▼
   No gap! Smooth handoff ✨
```

---

## Why This Architecture Works

### 1. Speed Where It Matters
```
Live drag updates:  RTDB (20-50ms) ✨ Fast!
Final persistence:  Firestore (100-200ms) → Don't care, drag is done
```

### 2. Efficiency
```
RTDB: Only 1-5 active edits at a time (~1 KB)
Firestore: All 500 shapes, but O(1) updates (200 bytes per update)
```

### 3. Reliability
```
RTDB: Temporary, auto-cleanup on disconnect
Firestore: Persistent, survives crashes/refreshes
```

### 4. Scalability
```
RTDB: Optimized for frequent small updates (30 FPS)
Firestore: Optimized for infrequent large queries (load all shapes once)
```

---

## Common Scenarios

### Scenario 1: User Refreshes During Drag
```
User A is dragging shape-123...
User A's browser crashes/refreshes

RTDB onDisconnect() fires:
  → Clears /activeEdits/shape-123
  → Releases lock on shape-123

Other users see:
  → activeEdits callback fires (shape-123 removed)
  → Lock released
  → Shape snaps to last Firestore position
  → Shape becomes draggable again ✅

No orphaned locks! ✨
```

### Scenario 2: Two Users Grab Same Shape
```
T=0ms:   User A clicks shape-123
T=10ms:  User B clicks shape-123 (race condition!)

User A:
  startEditingShape('shape-123')
  → Check RTDB lock: None yet
  → Acquire lock ✅
  → Start dragging

User B (10ms later):
  startEditingShape('shape-123')
  → Check RTDB lock: Locked by User A!
  → Return false
  → Cancel drag (e.target.stopDrag())
  → Shape is non-draggable ✅

Result: First user wins! ✨
```

### Scenario 3: Network Lag
```
User A is on slow 3G network
User B is on fast wifi

User A drags shape-123:
  → RTDB updates every 33ms
  → But slow network: takes 200ms to reach server
  → Server broadcasts to other clients

User B sees:
  → Updates arrive every 200ms (instead of 33ms)
  → Drag appears "choppy" but still works
  → Final position syncs correctly

Result: Degrades gracefully! ✨
```

---

## Summary: The Full Stack

```
┌─────────────────────────────────────────────────────┐
│                    REACT UI                         │
│  Canvas.jsx renders shapes with Konva              │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│              CANVASCONTEXT                          │
│  • Merges Firestore + RTDB data                    │
│  • Manages shape state                             │
│  • Orchestrates create/update/delete               │
└──────┬─────────────────────────────────┬───────────┘
       │                                 │
       │ Persistent ops                  │ Real-time ops
       │ (create/final                   │ (drag/lock/
       │  update/delete)                 │  cursor/presence)
       │                                 │
┌──────▼──────────┐           ┌─────────▼──────────┐
│  FIRESTORE      │           │       RTDB         │
│  shapes.js      │           │  realtimeShapes.js │
│                 │           │  cursors.js        │
│  • O(1) ops     │           │  presence.js       │
│  • 1 doc/shape  │           │                    │
│  • Persistent   │           │  • Delta updates   │
│  • Scales ∞     │           │  • Temporary       │
└─────────────────┘           │  • 20-50ms sync    │
                              └────────────────────┘
```

**Everything works together to give you:**
- ✅ Instant real-time collaboration (30 FPS live updates)
- ✅ Reliable persistence (Firestore backup)
- ✅ O(1) scalability (no bottlenecks)
- ✅ Automatic conflict resolution (first-to-lock wins)
- ✅ Clean state management (React handles rendering)

That's how it all works! 🎉

