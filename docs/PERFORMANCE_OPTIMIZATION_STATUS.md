# Performance Optimization Status - October 16, 2025

## User Report
**Issue**: With 641 shapes on canvas, Cmd+A (Select All) causes page to become unresponsive, and cannot drag selected shapes.

## Root Cause Analysis

### Problem 1: Selection Freeze
- **641 individual `setInterval` timers** created (one per shape for lock heartbeat)
- **641 RTDB writes every 4 seconds** (one per shape)
- **Result**: Browser overwhelmed with timer management

### Problem 2: Drag Unresponsive  
- **`startEditingMultipleShapes()` made 1,282 RTDB operations** (641 reads + 641 writes)
- **Each drag frame processed 641 individual shapes**
- **Result**: Too many operations to start drag, browser hangs

## Solutions Implemented

### ✅ Phase 1: Batch RTDB Operations (COMPLETE)

**1. Shared Heartbeat System**
```javascript
// Before: 641 timers
for (const shape of shapes) {
  setInterval(() => heartbeat(shape), 4000); // 641 timers!
}

// After: 1 timer for ALL shapes
const activeLocks = new Set(allShapeIds);
setInterval(() => {
  const batchUpdate = {};
  for (const id of activeLocks) {
    batchUpdate[`${id}/lockedAt`] = now;
  }
  await update(locksRef, batchUpdate); // 1 write for ALL
}, 4000);
```

**Impact**: 641 timers → 1 timer = **99.8% reduction**

**2. Batch Lock Acquisition**
```javascript
// Before: 641 individual reads and writes
for (const id of shapeIds) {
  const lock = await read(lockRef(id)); // 641 reads!
  await write(lockRef(id), {lockedBy: userId}); // 641 writes!
}

// After: 1 batch operation
const existingLocks = await readAll(); // 1 read
const batchUpdate = { /* all locks */ };
await update(locksRef, batchUpdate); // 1 write
```

**Impact**: 1,282 ops → 2 ops = **99.8% reduction**

**3. Batch Lock Release**
```javascript
// Before: 641 individual deletes
for (const id of shapeIds) {
  await remove(lockRef(id)); // 641 operations!
}

// After: 1 batch operation
const batchRemove = {};
for (const id of shapeIds) {
  batchRemove[id] = null;
}
await update(locksRef, batchRemove); // 1 write
```

**Impact**: 641 ops → 2 ops = **99.7% reduction**

**4. Batch Active Edit Operations**
- `startEditingMultipleShapes()`: 1,282 ops → 2 ops
- `finishEditingMultipleShapes()`: 641 ops → 1 op
- `clearActiveEdits()`: N ops → 1 op

**Files Modified**:
- ✅ `src/services/realtimeShapes.js`
- ✅ `src/contexts/CanvasContext.jsx`

**Status**: ✅ DEPLOYED - Should be testable now

### 📐 Phase 2: SelectionGroup Architecture (IN PROGRESS)

**Concept**: Treat multi-selection as a single logical entity

**Components Created**:
- ✅ `src/models/SelectionGroup.js` - Data model
- ✅ `src/components/Canvas/SelectionGroupNode.jsx` - Konva component

**What This Provides**:
```javascript
// Instead of 641 drag handlers
shapes.forEach(shape => {
  shape.onDragMove(); // Called 641 times per frame!
});

// Use 1 group handler
<SelectionGroupNode
  shapes={selectedShapes}
  onDragMove={(finalStates) => {
    // Single callback with all 641 final states
    updateShapesTemporaryBatch(finalStates);
  }}
/>
```

**Impact**: 641 handlers → 1 handler = **99.97% reduction in per-frame operations**

**Integration Required**: Canvas.jsx needs refactoring to use SelectionGroupNode

**Status**: 🚧 Components ready, integration pending

## Current State

### What Should Work Now (Phase 1)
✅ Select 641 shapes - should complete in <100ms  
✅ Locks acquired in batch - 2 RTDB ops instead of 1,282  
✅ Heartbeat uses 1 timer instead of 641  
✅ Release locks in batch - 2 RTDB ops instead of 641  

### What May Still Lag (Needs Phase 2)
⚠️ Dragging 641 shapes - individual handlers still process each shape  
⚠️ Transform641 shapes - individual transform calculations  

### Why Phase 1 Helps But Isn't Complete
Phase 1 optimizes the **RTDB operations** (99.8% reduction), but the **Konva rendering** still treats 641 shapes individually. Phase 2 optimizes the **rendering layer** by using a single Group.

## Testing Instructions

### Test Phase 1 Improvements
1. Open localhost with 641 shapes
2. **Cmd+A** to select all
   - **Expected**: <100ms, no freeze
   - **Check console**: Should see "Selecting 641 shapes" → "Acquired 641 locks"
3. Try to drag the selection
   - **Expected**: May still lag (needs Phase 2)
   - **Check console**: Look for batch operation logs

### Debug Logging
Check browser console for:
```
[SelectMultiple] Attempting to select 641 shapes
[SelectMultiple] 641 candidates after filtering locked shapes
[acquireLocks] (in realtimeShapes.js) - should use batch operation
[SELECT] 641 shapes selected
```

## Next Steps

### Option A: Test Phase 1 First
1. User tests with 641 shapes
2. Verify batch operations work
3. Then integrate Phase 2 if drag still lags

### Option B: Complete Phase 2 Now
1. Integrate SelectionGroupNode into Canvas.jsx
2. Refactor multi-selection rendering
3. Test complete solution

## Recommendation

**Test Phase 1 now** to verify the batch optimizations resolved the selection freeze. If drag is still unresponsive, proceed with Phase 2 integration.

The batch optimizations should have eliminated the **selection freeze** and made **starting the drag** fast. If **during the drag** it still lags, that confirms we need Phase 2 (SelectionGroup).

## Performance Expectations

### With Phase 1 Only
- Select 641 shapes: ✅ **Fast** (<100ms)
- Start drag: ✅ **Fast** (<100ms)  
- During drag: ⚠️ **May lag** (641 individual updates per frame)
- End drag: ✅ **Fast** (batched commit)

### With Phase 1 + Phase 2
- Select 641 shapes: ✅ **Fast** (<100ms)
- Start drag: ✅ **Fast** (<100ms)
- During drag: ✅ **Smooth** (1 group update per frame)
- End drag: ✅ **Fast** (batched commit)

**Phase 2 is the proper architectural solution** and should be integrated once Phase 1 is verified working.


