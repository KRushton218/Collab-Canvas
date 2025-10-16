# Multiselect User Scenarios

## Visual Guide to Conflict Resolution

This document illustrates specific user scenarios to clarify how multiselect and conflict resolution work in practice.

---

## Scenario 1: Basic Multiselect

### Selection Building (Toggle Behavior)
```
Initial State:
┌────────┐  ┌────────┐  ┌────────┐
│ Rect A │  │ Rect B │  │ Rect C │
└────────┘  └────────┘  └────────┘

User Action: Click Rect A
┌────────┐  ┌────────┐  ┌────────┐
│░Rect A░│  │ Rect B │  │ Rect C │  ← A is selected (blue outline)
└────────┘  └────────┘  └────────┘

User Action: Shift + Click Rect B (toggle on)
┌────────┐  ┌────────┐  ┌────────┐
│░Rect A░│  │░Rect B░│  │ Rect C │  ← Both A and B selected
└────────┘  └────────┘  └────────┘

User Action: Shift + Click Rect A (toggle off)
┌────────┐  ┌────────┐  ┌────────┐
│ Rect A │  │░Rect B░│  │ Rect C │  ← Only B selected now
└────────┘  └────────┘  └────────┘

User Action: Ctrl/⌘ + Click Rect C (toggle on)
┌────────┐  ┌────────┐  ┌────────┐
│ Rect A │  │░Rect B░│  │░Rect C░│  ← Both B and C selected
└────────┘  └────────┘  └────────┘

User Action: Ctrl/⌘ + Click Rect B (toggle off)
┌────────┐  ┌────────┐  ┌────────┐
│ Rect A │  │ Rect B │  │░Rect C░│  ← Only C selected now
└────────┘  └────────┘  └────────┘
```

**Result**: Simple toggle behavior - both Shift and Ctrl/⌘ work the same way

---

## Scenario 2: Drag Selection (Marquee)

### Lasso Selection
```
Initial State:
┌────────┐  ┌────────┐
│ Rect A │  │ Rect B │
└────────┘  └────────┘
              ┌────────┐
              │ Rect C │
              └────────┘

User Action: Click + Drag from top-left
┏━━━━━━━━━━━━━━━━━━┓ ← Drag selection box (dashed blue)
┃ ┌────────┐  ┌────┃───┐
┃ │ Rect A │  │ Rec┃ B │
┃ └────────┘  └────┃───┘
┗━━━━━━━━━━━━━━━━━━┛
                ┌────────┐
                │ Rect C │
                └────────┘

On Release:
┌────────┐  ┌────────┐
│░Rect A░│  │░Rect B░│  ← A and B selected (inside box)
└────────┘  └────────┘
              ┌────────┐
              │ Rect C │
              └────────┘
```

**Result**: Fast selection of multiple shapes in a region

---

## Scenario 3: Simultaneous Drag (WITH LOCK)

### Two Users Try to Drag Same Shape

```
Timeline:

t=0: Both users have shape visible
     Alice's View          Bob's View
     ┌────────┐           ┌────────┐
     │ Rect A │           │ Rect A │
     └────────┘           └────────┘

t=1: Alice starts dragging (grabs lock)
     Alice's View          Bob's View
     ┌────────┐           ┌────────┐
     │░Rect A░│           │🔒Rect A│ ← Bob sees lock indicator
     │ (blue) │           │(alice's│   (Alice's cursor color)
     └────────┘           │ color) │
     dragging...          └────────┘

t=2: Bob tries to click Rect A
     Alice's View          Bob's View
     ┌────────┐           ┌────────┐
     │░Rect A░│           │🔒Rect A│
     │ (blue) │           │(alice's│
     └────────┘           │ color) │
     dragging...          └────────┘
                          🔔 Toast: "🔒 This shape is being 
                             edited by Alice"

t=3: Alice releases (commits to Firestore, releases lock)
     Alice's View          Bob's View
     ┌────────┐           ┌────────┐
     │ Rect A │           │ Rect A │ ← Lock released, both see
     │  (new  │           │  (new  │   new position
     │  pos)  │           │  pos)  │
     └────────┘           └────────┘

t=4: Bob can now drag it
     Alice's View          Bob's View
     ┌────────┐           ┌────────┐
     │🔒Rect A│           │░Rect A░│
     │ (bob's │           │ (blue) │
     │ color) │           └────────┘
     └────────┘           dragging...
```

**Result**: Clear ownership, no race conditions, visual feedback

---

## Scenario 4: Simultaneous Color Change (NO LOCK)

### Two Users Change Color at Same Time

```
Timeline:

t=0: Both users see same shape
     Alice's View          Bob's View
     ┌────────┐           ┌────────┐
     │ Rect A │           │ Rect A │
     │ (gray) │           │ (gray) │
     └────────┘           └────────┘

t=1: Alice changes color to RED (no lock acquired)
     Alice's View          Bob's View
     ┌────────┐           ┌────────┐
     │ Rect A │           │ Rect A │ ← RTDB sync starts,
     │  (red) │           │(gray→  │   Bob sees transition
     └────────┘           │  red)  │
                          └────────┘
     ✅ Firestore write   ⏳ Syncing...

t=2: Bob changes color to BLUE (no lock acquired)
     Alice's View          Bob's View
     ┌────────┐           ┌────────┐
     │ Rect A │           │ Rect A │
     │(red→   │ ← RTDB sync,│ (blue)│
     │ blue)  │   Alice sees│        │
     └────────┘   transition└────────┘
     ⏳ Syncing...         ✅ Firestore write

t=3: Both see final state (Bob's write wins)
     Alice's View          Bob's View
     ┌────────┐           ┌────────┐
     │ Rect A │           │ Rect A │
     │ (blue) │           │ (blue) │
     └────────┘           └────────┘
     ✅ Last write wins    ✅ Last write wins
```

**Result**: Last write wins (LWW), acceptable for color changes

**Note**: No toast notification - this is expected behavior for property edits

---

## Scenario 5: Mixed Operations (Drag + Color)

### One User Drags, Another Changes Color

```
Timeline:

t=0: Both users see same shape
     Alice's View          Bob's View
     ┌────────┐           ┌────────┐
     │ Rect A │           │ Rect A │
     │ (gray) │           │ (gray) │
     └────────┘           └────────┘

t=1: Alice starts dragging (acquires lock)
     Alice's View          Bob's View
     ┌────────┐           ┌────────┐
     │░Rect A░│           │🔒Rect A│
     │ (blue) │           │(alice's│
     └────────┘           │ color) │
     dragging...          └────────┘

t=2: Bob changes color to RED (no lock needed!)
     Alice's View          Bob's View
     ┌────────┐           ┌────────┐
     │░Rect A░│ ← Color   │🔒Rect A│
     │ (blue) │   updates │ (red,  │
     │ (red!) │   live    │alice's │
     └────────┘           │ color) │
     dragging...          └────────┘
                          ✅ Color changed successfully

t=3: Alice releases drag
     Alice's View          Bob's View
     ┌────────┐           ┌────────┐
     │ Rect A │           │ Rect A │
     │ (new   │           │ (new   │
     │  pos,  │           │  pos,  │
     │  red)  │           │  red)  │
     └────────┘           └────────┘
```

**Result**: Transformational and property edits can happen concurrently! ✅

---

## Scenario 6: Multi-Select Group Drag

### Dragging Multiple Shapes Together

```
Initial State (Alice's View):
┌────────┐  ┌────────┐  ┌────────┐
│ Rect A │  │ Rect B │  │ Rect C │
└────────┘  └────────┘  └────────┘

Alice: Shift+Click to select A, B, C
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ┌────────┐  ┌────────┐  ┌────────┐ ┃
┃ │░Rect A░│  │░Rect B░│  │░Rect C░│ ┃ ← Unified bounding box
┃ └────────┘  └────────┘  └────────┘ ┃   with handles
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Alice: Drags the group
  → Attempts to acquire locks on A, B, C
  → If ALL locks succeed: Drag proceeds
  → If ANY lock fails: Show toast, block drag

Bob's View (while Alice drags):
┌────────┐  ┌────────┐  ┌────────┐
│🔒Rect A│  │🔒Rect B│  │🔒Rect C│ ← All show lock indicators
│(alice) │  │(alice) │  │(alice) │
└────────┘  └────────┘  └────────┘

After Alice releases:
┌────────┐  ┌────────┐  ┌────────┐
│ Rect A │  │ Rect B │  │ Rect C │ ← All moved together
│ (new   │  │ (new   │  │ (new   │   locks released
│  pos)  │  │  pos)  │  │  pos)  │
└────────┘  └────────┘  └────────┘
```

**Result**: Multi-select transforms all shapes atomically

---

## Scenario 7: Partial Lock Conflict (Multi-Select)

### Some Shapes Locked, Some Not

```
Initial State:
Bob is dragging Rect B (has lock)

Alice's View                    Bob's View
┌────────┐  ┌────────┐         ┌────────┐  ┌────────┐
│ Rect A │  │🔒Rect B│         │ Rect A │  │░Rect B░│
│        │  │ (bob)  │         │        │  │ (blue) │
└────────┘  └────────┘         └────────┘  └────────┘
            (locked)                        dragging...

Alice: Shift+Click to select both A and B
┌────────┐  ┌────────┐
│░Rect A░│  │🔒Rect B│ ← A selected, B shows lock
└────────┘  │ (bob)  │
            └────────┘

Alice: Tries to drag the group
┌────────┐  ┌────────┐
│░Rect A░│  │🔒Rect B│ 
└────────┘  │ (bob)  │
            └────────┘
🔔 Toast: "🔒 Some shapes are being edited by Bob"
❌ Drag operation blocked

Alice: Changes color of both to RED (property edit)
┌────────┐  ┌────────┐
│░Rect A░│  │🔒Rect B│ 
│ (red!) │  │(red!,  │ ← Color change succeeds!
└────────┘  │ bob)   │   No lock needed
            └────────┘
✅ Color change successful on BOTH shapes
```

**Result**: Transform blocked, but property edits work ✅

**MVP Decision**: Block entire transform if ANY shape is locked  
**Future Enhancement**: Allow transform on unlocked shapes only

---

## Scenario 8: Text Editing During Multi-Select

### Special Case: Text Requires Exclusive Focus

```
Initial State:
┌────────┐  ┌────────┐  ┌────────┐
│ Rect A │  │ Text B │  │ Rect C │
└────────┘  └────────┘  └────────┘

User: Shift+Click to select all three
┌────────┐  ┌────────┐  ┌────────┐
│░Rect A░│  │░Text B░│  │░Rect C░│
└────────┘  └────────┘  └────────┘

User: Double-clicks Text B to edit
┌────────┐  ┌────────┐  ┌────────┐
│ Rect A │  │📝Text B│  │ Rect C │ ← Selection cleared
└────────┘  └────────┘  └────────┘
            ┃ cursor  ┃
            ┗━━━━━━━━┛
            (edit mode)

Other User's View:
┌────────┐  ┌────────┐  ┌────────┐
│ Rect A │  │🔒Text B│  │ Rect C │
└────────┘  │(alice) │  └────────┘
            └────────┘
            (locked for editing)
```

**Result**: Text editing always requires exclusive single-shape focus

**Rationale**: Text input is fundamentally different from shape transforms

---

## Scenario 9: Performance - Color Picker Lag

### Problem: Rapid Color Changes Cause Lag

```
Current Behavior (❌ Not Optimal):

User drags color picker slider rapidly:
t=0ms:   Red    → Firestore write → RTDB update
t=10ms:  Orange → Firestore write → RTDB update
t=20ms:  Yellow → Firestore write → RTDB update
t=30ms:  Green  → Firestore write → RTDB update
...
100 writes in 1 second! 😱

Problem: 
- Firestore quota exceeded
- RTDB bandwidth wasted
- UI feels sluggish (writes block)
```

```
Optimized Behavior (✅ Better):

User drags color picker slider rapidly:
t=0ms:   Red    → Local preview (instant)
t=10ms:  Orange → Local preview (instant)
t=20ms:  Yellow → Local preview (instant)
t=100ms: (throttle) → RTDB update: Yellow
t=200ms: Green  → Local preview (instant)
t=300ms: (throttle) → RTDB update: Green
t=500ms: (debounce, no more changes) → Firestore write: Green

Result:
- Instant local feedback
- Only 3 RTDB updates (100ms throttle)
- Only 1 Firestore write (500ms debounce)
- Smooth, responsive UI ✅
```

**Solution**: 
1. **Local-first rendering**: Show color change instantly (0ms)
2. **Throttle RTDB**: Update every 100ms during drag
3. **Debounce Firestore**: Write 500ms after last change
4. **On close**: Immediately commit final value

---

## Scenario 10: Lock Timeout Recovery

### Problem: User Disconnects While Holding Lock

```
Timeline:

t=0: Alice starts dragging Rect A (acquires lock)
     Alice's View          Bob's View
     ┌────────┐           ┌────────┐
     │░Rect A░│           │🔒Rect A│
     └────────┘           └────────┘
     dragging...          (locked)

t=5: Alice's laptop lid closes (network disconnects)
     Alice: Offline       Bob's View
                          ┌────────┐
                          │🔒Rect A│ ← Still locked!
                          └────────┘
                          (stuck?)

t=35: Firebase onDisconnect fires (30s later)
     Alice: Offline       Bob's View
                          ┌────────┐
                          │ Rect A │ ← Lock released!
                          └────────┘
                          ✅ Can edit now
```

**Firebase Behavior**:
- `onDisconnect()` triggers when client loses connection
- Automatically removes lock from RTDB
- Prevents permanent "stuck locks"

**Alternative - Manual Timeout**:
```javascript
// Check lock age before showing "locked by" message
const lock = getLock(shapeId);
const lockAge = Date.now() - lock.lockedAt;

if (lockAge > 30000) { // 30 seconds
  // Lock is stale, show option to "steal" it
  showToast("🔒 This shape may be stuck. Click to unlock", {
    action: () => forceReleaseLock(shapeId)
  });
}
```

---

## Summary Table

| Scenario | Lock Required? | Behavior | Notification |
|----------|---------------|----------|--------------|
| Drag single shape | ✅ Yes | Block if locked by other | Toast: "🔒 Locked by [User]" |
| Drag multi-select | ✅ Yes (all) | Block if ANY locked | Toast: "🔒 Some shapes locked" |
| Rotate shape | ✅ Yes | Block if locked by other | Toast: "🔒 Locked by [User]" |
| Resize shape | ✅ Yes | Block if locked by other | Toast: "🔒 Locked by [User]" |
| Change color | ❌ No | Last write wins | None (expected) |
| Change opacity | ❌ No | Last write wins | None (expected) |
| Edit text | ✅ Yes (exclusive) | Block if locked, clear multi-select | Toast: "🔒 Locked by [User]" |
| Drag + Color (concurrent) | Partial | Drag locks, color writes through | None (both succeed) |
| Network disconnect | Auto-release | onDisconnect releases lock | None |
| Stuck lock (>30s) | Auto-release | Timeout or manual steal | Option to force unlock |

---

## User Testing Checklist

Use this checklist to validate behavior:

### Multi-Select
- [ ] Shift+Click adds to selection
- [ ] Ctrl/⌘+Click toggles selection
- [ ] Drag selection box works
- [ ] Visual feedback clear (blue outlines)
- [ ] Unified bounding box for transforms

### Locking - Transformations
- [ ] Two users can't drag same shape simultaneously
- [ ] Lock indicator shows during drag
- [ ] Toast notification on conflict
- [ ] Lock releases on mouse up
- [ ] onDisconnect releases lock

### Property Edits (No Lock)
- [ ] Two users can change color simultaneously
- [ ] Last write wins (expected)
- [ ] No error/toast for concurrent changes
- [ ] Real-time sync via RTDB

### Performance
- [ ] Color picker feels responsive (<100ms perceived)
- [ ] Drag feels smooth (60 FPS)
- [ ] No lag with 10 shapes multi-selected
- [ ] No quota errors during rapid changes

### Edge Cases
- [ ] Multi-select with partial locks handled
- [ ] Text editing clears multi-select
- [ ] Network disconnect releases locks
- [ ] Stuck locks (>30s) can be recovered
- [ ] Mixed operations (drag + color) work

---

**Next Step**: Review these scenarios with the team, validate decisions, then proceed with implementation.

