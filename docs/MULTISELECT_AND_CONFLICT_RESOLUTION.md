# Multiselect & Conflict Resolution Design

## Overview
This document defines the design and conflict resolution strategies for multiselect functionality in CollabCanvas, ensuring seamless collaboration when multiple users edit shapes simultaneously.

## Multiselect Implementation

### Selection Methods

#### 1. **Shift + Click** (Toggle Selection)
- Toggles selection state of the clicked shape
- If unselected → adds to selection
- If already selected → removes from selection
- Use case: Building and refining a selection one shape at a time

#### 2. **Ctrl/⌘ + Click** (Toggle Selection)
- Same behavior as Shift+Click (toggle)
- Both modifiers provide the same functionality for simplicity
- Use case: Same as Shift+Click (user preference for which modifier to use)

#### 3. **Click + Drag Selection Box** (Lasso/Marquee)
- Without modifiers: Creates new selection of all shapes within box
- With Shift or Ctrl/⌘: Toggles all shapes in box (adds unselected, removes selected)
- Visual: Semi-transparent blue rectangle while dragging
- Use case: Selecting multiple shapes in an area

### Visual Feedback

#### Selection Indicators
- **Single Selection**: Blue transformer with resize/rotate handles
- **Multi-Selection**: 
  - Thin blue outline on each selected shape (2px at 100% zoom)
  - Unified bounding box with resize/rotate handles
  - Handle count shows in UI: "3 shapes selected"

#### Group Transform Handle
When multiple shapes are selected:
- Unified bounding box encompasses all selected shapes
- 8 resize handles (corners + midpoints)
- Rotation handle above bounding box
- All transformations apply proportionally to all shapes

## Conflict Resolution Strategy

### Edit Type Classification

We categorize edits into three types based on their conflict potential and coordination requirements:

#### 1. **Transformational Edits** (REQUIRES LOCK)
Operations that change spatial properties and require coordination between multiple clients to prevent conflicting state.

**Operations:**
- Drag (position changes)
- Rotate (rotation changes)
- Resize/Scale (dimension changes)

**Locking Behavior:**
- Acquires exclusive lock on ALL shapes in selection when operation starts
- Lock applies to each individual shape
- Other users cannot perform transformational edits on locked shapes
- Lock releases when operation completes (mouseup/touch end)
- If any shape in selection is locked by another user, entire operation is blocked

**Rationale:**
- Position/rotation/size changes require atomic updates across multiple properties
- Simultaneous transforms from multiple users create race conditions
- Final state would be unpredictable (whose drag wins?)
- Aligns with industry standards (Figma, Miro, FigJam)

**Multi-User Scenario:**
```
User A: Starts dragging Shape 1 → Acquires lock
User B: Tries to drag Shape 1 → Blocked, sees toast: "🔒 This shape is being edited by Alice"
User A: Releases → Shape 1 commits to Firestore, lock released
User B: Can now edit Shape 1
```

#### 2. **Property Edits** (NO LOCK REQUIRED)
Operations that change visual properties without spatial impact. These can be applied concurrently.

**Operations:**
- Fill color changes
- Stroke color changes
- Opacity changes
- Text formatting (bold, italic, underline) on selected text shape
- Alignment changes

**Locking Behavior:**
- NO lock acquired
- Changes apply immediately to Firestore
- Last write wins (LWW) conflict resolution
- Real-time sync via RTDB shows changes instantly

**Rationale:**
- Non-spatial changes don't create geometric conflicts
- Users expect immediate feedback when changing colors
- LWW is acceptable for aesthetic properties (no "correct" state)
- Reduces lock contention and improves perceived performance

**Performance Optimization:**
- Color picker updates throttled to 100ms during continuous changes
- RTDB updates batched for rapid changes
- Firestore commit happens on picker close or 500ms after last change

**Multi-User Scenario:**
```
User A: Changes Shape 1 color to red (no lock)
User B: Changes Shape 1 color to blue (no lock, overwrites)
Result: Shape 1 is blue (last write wins)
Note: Both users see real-time updates via RTDB
```

#### 3. **Content Edits** (EXCLUSIVE SINGLE-SHAPE LOCK)
Operations that modify text content. Only applies to text shapes.

**Operations:**
- Double-click to edit text content
- Text input/deletion inside shape

**Locking Behavior:**
- Acquires exclusive lock on the text shape
- Multi-selection disabled during text editing
- Only one user can edit text content at a time
- Lock releases on blur or Ctrl/Cmd+Enter

**Rationale:**
- Text editing requires focused, uninterrupted input
- Concurrent text editing (Operational Transform/CRDT) is complex
- Single-lock model is simpler and sufficient for MVP
- Aligns with Google Docs' paragraph-level locking

**Multi-User Scenario:**
```
User A: Double-clicks text shape → Enters edit mode, acquires lock
User B: Tries to double-click same shape → Blocked, sees toast
User A: Finishes editing (Ctrl+Enter) → Commits, lock released
User B: Can now edit
```

### Detailed Locking Rules

#### Lock Acquisition
```javascript
// Pseudo-code for lock acquisition
async function startTransformOperation(selectedShapeIds, userId) {
  // Check if ANY shape is locked by another user
  for (const shapeId of selectedShapeIds) {
    const lock = await getShapeLock(shapeId);
    if (lock && lock.lockedBy !== userId) {
      showToast(`🔒 Some shapes are being edited by ${lock.displayName}`);
      return false; // Block entire operation
    }
  }
  
  // Acquire locks on ALL shapes
  const lockPromises = selectedShapeIds.map(shapeId => 
    acquireLock(shapeId, userId)
  );
  await Promise.all(lockPromises);
  return true;
}
```

#### Lock Visual Indicators
- **Own Lock**: Blue border (matches your cursor color)
- **Other User's Lock**: Colored border (matches their cursor color)
- **Lock Icon**: Padlock icon with user's color (top-left corner)
- **Opacity**: Locked shapes at 80% opacity when locked by others

#### Lock Release
- **Automatic**: On mouse/touch release
- **Automatic**: On disconnect (Firebase onDisconnect)
- **Manual**: Cancel operation (Escape key)
- **Timeout**: After 30 seconds of inactivity (prevents stuck locks)

### Edge Cases & Error Handling

#### Case 1: Partial Lock Acquisition
**Scenario:** User selects 5 shapes, 2 are locked by others  
**Behavior:** 
- Show toast: "🔒 2 shapes are locked and cannot be edited"
- Highlight which shapes are locked (pulse animation)
- Allow operation on unlocked shapes only (future enhancement)
- **MVP**: Block entire operation if any shape is locked

#### Case 2: Lock Stolen During Operation
**Scenario:** User is dragging, but lock expires or network issue  
**Behavior:**
- Detect lock loss via RTDB listener
- Show toast: "⚠️ Lost connection, changes may not save"
- Continue local preview but don't commit to Firestore
- On reconnect, check if shape was modified by others

#### Case 3: Simultaneous Property Changes
**Scenario:** Two users change color of same shape at same time  
**Behavior:**
- Both write to Firestore (LWW)
- RTDB shows changes in real-time
- No conflict warning (expected behavior)
- Final color is from last write

#### Case 4: Multi-Select with Mixed Locks
**Scenario:** User selects 3 shapes, one is locked  
**Behavior:**
- Visual: Locked shape shows lock icon
- Attempt drag: Blocked with toast
- Attempt color change: Succeeds for all shapes (no lock needed)
- Attempt resize: Blocked (needs lock on all shapes)

#### Case 5: Network Latency
**Scenario:** User drags shape, but lock acquisition is slow (500ms+)  
**Behavior:**
- Optimistic lock: Assume success, start drag immediately
- If lock fails (250ms timeout), cancel drag and revert
- Show visual "acquiring lock" indicator if >100ms

### Performance Optimizations

#### Throttling Strategy
| Operation | Throttle Rate | Rationale |
|-----------|--------------|-----------|
| Drag Updates (RTDB) | 33ms (~30 FPS) | Balance smoothness vs bandwidth |
| Rotation Updates (RTDB) | 33ms | Same as drag |
| Resize Updates (RTDB) | 33ms | Same as drag |
| Color Changes (RTDB) | 100ms | Reduce writes during color picker dragging |
| Firestore Commits | On operation end | Avoid excessive writes |

#### Batch Updates
- Group multiple property changes into single Firestore write
- Example: Changing fill color on 10 shapes → 1 batch write, not 10 individual writes

#### Local-First Rendering
- Always render local user's changes immediately (0ms latency)
- Sync to RTDB in background (throttled)
- Commit to Firestore on completion

### Comparison with Industry Tools

| Feature | CollabCanvas | Figma | Miro | Google Docs |
|---------|--------------|-------|------|-------------|
| Multiselect | Shift+Click, Drag | ✅ Same | ✅ Same | N/A |
| Drag Locking | ✅ Exclusive | ✅ Exclusive | ✅ Exclusive | N/A |
| Color Changes | ✅ No lock (LWW) | ✅ No lock | ⚠️ Lock | N/A |
| Text Editing | ✅ Single lock | ✅ Single lock | ✅ Single lock | ✅ Paragraph lock |
| Resize Locking | ✅ Exclusive | ✅ Exclusive | ✅ Exclusive | N/A |
| Visual Lock Indicators | ✅ Border + Icon | ✅ Avatar | ✅ Border + Avatar | ✅ Cursor |

**Key Differences:**
- **Figma**: Uses last-write-wins for all property changes (no locks)
- **Miro**: More conservative, locks on most operations
- **CollabCanvas**: Hybrid approach - locks for transforms, LWW for properties

## Implementation Phases

### Phase 1: Core Multiselect (MVP)
- [ ] Shift+Click to toggle selection
- [ ] Ctrl/⌘+Click to toggle selection (same behavior)
- [ ] Track multiple selected IDs in state
- [ ] Render selection indicators on all selected shapes
- [ ] Unified bounding box for multi-selection

### Phase 2: Multi-Transform
- [ ] Group drag (move all selected shapes)
- [ ] Group resize (scale all selected shapes)
- [ ] Group rotate (rotate all selected shapes around center)
- [ ] Lock acquisition for all shapes in selection
- [ ] Visual feedback for failed locks

### Phase 3: Drag Selection
- [ ] Click+drag on empty canvas to create selection box
- [ ] Visual marquee rectangle
- [ ] Select all shapes within box on release
- [ ] Support Shift/Ctrl modifiers

### Phase 4: Property Editing
- [ ] Color change applies to all selected shapes
- [ ] Rotation input applies to all selected shapes
- [ ] Batch Firestore writes for efficiency

### Phase 5: Advanced Features
- [ ] Copy/paste multiple shapes
- [ ] Align tools (align left, center, right, top, middle, bottom)
- [ ] Distribute tools (space evenly)
- [ ] Group/ungroup shapes (create logical groups)

## Testing Strategy

### Unit Tests
- [ ] Selection state management
- [ ] Lock acquisition logic
- [ ] Conflict detection
- [ ] Throttling behavior

### Integration Tests
- [ ] Multi-user scenarios (2-5 concurrent users)
- [ ] Lock expiration and cleanup
- [ ] Network failure scenarios
- [ ] Race condition tests

### User Testing
- [ ] Task: Two users try to drag same shape
- [ ] Task: Two users change color of same shape
- [ ] Task: One user drags while another rotates
- [ ] Task: Select 10 shapes and change color

## Open Questions & Future Considerations

### 1. Should we allow partial operations?
**Current**: If any shape is locked, block entire multi-select operation  
**Alternative**: Allow operation on unlocked shapes only  
**Decision**: Start with blocking (simpler), consider partial ops in v1.2

### 2. What's the max multi-select count?
**Current**: No limit  
**Consideration**: Performance degrades with 100+ shapes  
**Decision**: Implement soft limit of 50 shapes, show warning above

### 3. Should we persist multi-selections?
**Current**: Selection clears on deselect/page refresh  
**Alternative**: Store selection state in RTDB for cross-device  
**Decision**: Not needed for MVP

### 4. How to handle delete on multi-select?
**Current**: Not specified  
**Proposal**: Delete key removes all selected shapes (with confirmation if >5)  
**Decision**: Implement in Phase 2

### 5. What about z-index with multi-select?
**Current**: Not specified  
**Proposal**: Bring to front / Send to back applies to all selected  
**Decision**: Defer to v1.3 (layer management feature)

## Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Lock acquisition | <100ms | Users don't notice delay |
| Drag latency (local) | <16ms (60 FPS) | Smooth dragging |
| Color change (local) | <16ms | Instant visual feedback |
| RTDB sync | <200ms | Real-time feels responsive |
| Multi-select (50 shapes) | <100ms | Acceptable delay for bulk selection |

## API Changes

### Canvas Context
```typescript
// Before (single selection)
const [selectedId, setSelectedId] = useState<string | null>(null);

// After (multi selection)
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// Helper methods
addToSelection(shapeId: string): void
removeFromSelection(shapeId: string): void
toggleSelection(shapeId: string): void
selectAll(): void
deselectAll(): void
```

### Shape Lock Service
```typescript
// New methods for multi-shape locking
acquireMultiLock(shapeIds: string[], userId: string): Promise<boolean>
releaseMultiLock(shapeIds: string[], userId: string): Promise<void>
checkMultiLockAvailability(shapeIds: string[], userId: string): Promise<{
  available: boolean;
  lockedShapes: string[];
  lockOwners: Record<string, string>;
}>
```

## Summary

This design provides:
1. ✅ **Intuitive multiselect** via Shift+Click, Ctrl+Click, and drag selection
2. ✅ **Clear locking rules** based on edit type (transformational vs property)
3. ✅ **Optimal performance** through selective locking and throttling
4. ✅ **Industry alignment** with tools like Figma and Miro
5. ✅ **Graceful conflict handling** with clear visual feedback
6. ✅ **Scalable architecture** for future enhancements

**Key Decision**: Lock transformations (drag/rotate/resize), allow concurrent property edits (color/style).

This balances collaboration (multiple users can work simultaneously) with data integrity (no race conditions on critical operations).

