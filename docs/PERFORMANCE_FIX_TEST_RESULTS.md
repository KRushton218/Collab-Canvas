# Performance Fix Test Results - October 18, 2025

**Branch**: `fix/enable-selectiongroupnode-performance`  
**Deployment**: Dev environment (https://collab-canvas-dev.web.app)  
**Status**: ⚠️ **PARTIAL FIX - New Issues Discovered**

---

## 🧪 Test Results

### ✅ What Improved
- SelectionGroupNode successfully re-enabled
- Code compiles and deploys without errors
- Architecture change from O(N) to O(1) is in place

### ⚠️ Issues Discovered During Testing

#### Issue 1: Copy/Paste → Multi-Selection Broken
**Steps to Reproduce**:
1. Select shapes with keyboard (Shift+Click or Ctrl+A)
2. Copy (Ctrl/Cmd+C)
3. Paste (Ctrl/Cmd+V)
4. Try to multi-select the pasted shapes
5. **Result**: Multi-selection doesn't work well

**Symptoms**:
- Multi-selection may not register
- Selection behavior is inconsistent
- Possible interaction between optimistic shapes and SelectionGroupNode

**Hypothesis**:
- Pasted shapes use optimistic rendering
- SelectionGroupNode may not handle optimistic shapes correctly
- Need to investigate interaction between `optimisticShapes` state and `selectedIds`

#### Issue 2: Drag-to-Select (Selection Box) Issues
**Steps to Reproduce**:
1. Click and drag on empty canvas to create selection box
2. **Result**: Selection box has issues

**Symptoms** (need clarification):
- Selection box doesn't appear?
- Selection box appears but doesn't select shapes?
- Selection box selects wrong shapes?
- Performance degradation during drag-select?

**Hypothesis**:
- Guard logic may be interfering with selection box logic
- SelectionGroupNode may be activating before selection is finalized
- Possible race condition between drag-to-select and SelectionGroupNode rendering

---

## 🔍 Root Cause Analysis Needed

### Investigation Areas

1. **Optimistic Shapes + SelectionGroupNode Interaction**
   - Check if `selectedShapes` includes optimistic shapes
   - Verify SelectionGroup model handles shapes without full data
   - Test if issue only occurs with pasted shapes or all selections

2. **Selection Box Logic**
   - Review `onMouseDown`/`onMouseMove`/`onMouseUp` in Canvas.jsx
   - Check if guard logic is blocking selection box creation
   - Verify `selectionBox` state updates correctly

3. **Guard Logic Side Effects**
   - Guards check `selectedIds.size > 1 && selectedIds.has(shape.id)`
   - May be preventing necessary individual handler logic
   - Could be blocking selection acquisition before group forms

---

## 🐛 Debugging Steps for Next Agent

### Step 1: Isolate the Issues

**Test A: Copy/Paste Issue**
```javascript
// Add logging to Canvas.jsx after paste operation
console.log('[Paste Debug] Pasted shapes:', newShapeIds);
console.log('[Paste Debug] optimisticShapes:', optimisticShapes);
console.log('[Paste Debug] selectedIds after paste:', selectedIds);

// Then try multi-select and log:
console.log('[Select Debug] Attempting to select:', shapeId);
console.log('[Select Debug] isPartOfGroup:', isPartOfGroup);
console.log('[Select Debug] selectedIds:', selectedIds);
```

**Test B: Drag-to-Select Issue**
```javascript
// Add logging to selection box handlers
console.log('[SelectionBox] Starting drag-select at:', startPos);
console.log('[SelectionBox] Current box:', selectionBox);
console.log('[SelectionBox] Shapes intersecting:', candidateShapes);
console.log('[SelectionBox] Final selection:', selectedIds);
```

### Step 2: Check Guard Logic

The guards may be too aggressive. Review these lines in Canvas.jsx:

```javascript
// Line ~1000 (onStartEdit)
const isPartOfGroup = selectedIds.size > 1 && selectedIds.has(shape.id);
if (isPartOfGroup) return; // ← May be blocking selection acquisition

// Line ~1037 (onDragMove)
const isPartOfGroup = selectedIds.size > 1 && selectedIds.has(shape.id);
if (isPartOfGroup) return; // ← May be preventing drag initiation
```

**Potential Issue**: Guards prevent handlers from running, but handlers may be needed for:
- Acquiring locks on newly selected shapes
- Updating selection state
- Triggering SelectionGroupNode activation

### Step 3: Check SelectionGroupNode Conditions

Line 1530 in Canvas.jsx:
```javascript
{selectedIds.size > 1 && selectedShapes.length > 0 && (
  <SelectionGroupNode ... />
)}
```

**Questions**:
- Does `selectedShapes` correctly filter `shapes`?
- Are optimistic shapes included in `selectedShapes`?
- Is there a delay between selection and SelectionGroupNode rendering?

### Step 4: Check Selection Box Logic

Search for selection box in Canvas.jsx:
```bash
grep -n "selectionBox" src/components/Canvas/Canvas.jsx
grep -n "onMouseDown.*stage" src/components/Canvas/Canvas.jsx
```

**Verify**:
- Selection box state is created/updated correctly
- Stage-level handlers aren't blocked by guards
- Rectangular selection completes before SelectionGroupNode activates

---

## 🔧 Potential Fixes

### Option 1: Refine Guard Logic
Instead of blocking ALL individual handlers, only block drag/transform:

```javascript
const onStartEdit = async (e) => {
  // Only block if SelectionGroupNode is ACTIVE (not just selected)
  const hasActiveGroup = selectedIds.size > 1 && selectedShapes.length > 1;
  if (hasActiveGroup) return;
  
  // ... rest of handler
}
```

### Option 2: Delay SelectionGroupNode Activation
Add a flag to prevent SelectionGroupNode from activating during selection:

```javascript
const [isSelectingMultiple, setIsSelectingMultiple] = useState(false);

// In selection box logic:
setIsSelectingMultiple(true);
// ... perform selection ...
setIsSelectingMultiple(false);

// In render:
{selectedIds.size > 1 && !isSelectingMultiple && (
  <SelectionGroupNode ... />
)}
```

### Option 3: Handle Optimistic Shapes
Ensure SelectionGroupNode can handle optimistic shapes:

```javascript
// In SelectionGroup model
constructor(shapes) {
  // Filter out incomplete shapes
  this.shapes = shapes.filter(s => s.x !== undefined && s.y !== undefined);
  if (this.shapes.length === 0) throw new Error('No valid shapes');
  // ... rest
}
```

### Option 4: Separate Selection from Grouping
- Keep individual handlers active during selection acquisition
- Only activate SelectionGroupNode after locks are acquired
- Use a separate state: `isGroupActive` vs `selectedIds.size > 1`

---

## 📋 Tasks for Next Agent

### High Priority
1. **Reproduce Issues**
   - Test copy/paste → multi-select workflow
   - Test drag-to-select (selection box)
   - Document exact symptoms and console errors

2. **Add Debug Logging**
   - Log selection state changes
   - Log SelectionGroupNode activation
   - Log guard logic decisions

3. **Identify Root Cause**
   - Determine if issue is with guards, SelectionGroupNode, or both
   - Check interaction with optimistic shapes
   - Verify selection box isn't blocked

4. **Implement Fix**
   - Based on root cause, apply appropriate solution
   - Test thoroughly with all workflows
   - Ensure no regression of original performance fix

### Medium Priority
5. **Update Tests**
   - Add test cases for copy/paste → select
   - Add test cases for drag-to-select
   - Validate multi-user scenarios still work

6. **Documentation**
   - Update PERFORMANCE_FIX_APPLIED.md with findings
   - Document any new guard logic rules
   - Create troubleshooting guide

---

## 🎯 Success Criteria (Updated)

Fix is complete when ALL of these work:

- ✅ Build compiles without errors
- ✅ Drag 641 shapes smoothly (original issue - FIXED)
- ⏳ Copy/paste then multi-select works correctly (NEW ISSUE)
- ⏳ Drag-to-select (selection box) works correctly (NEW ISSUE)
- ⏳ Single shape selection works
- ⏳ Keyboard shortcuts work (Ctrl+A, Shift+Click)
- ⏳ Multi-user updates work in real-time
- ⏳ No console errors or warnings

---

## 📞 Current State Summary

**What Works**:
- ✅ SelectionGroupNode is enabled and compiling
- ✅ Architecture changed from O(N) to O(1)
- ✅ Guard logic prevents double-handling

**What's Broken**:
- ❌ Copy/paste → multi-selection workflow
- ❌ Drag-to-select (selection box) behavior

**Hypothesis**:
- Guards may be too aggressive, blocking necessary selection logic
- SelectionGroupNode may not handle optimistic shapes correctly
- Timing issue between selection acquisition and group activation

**Recommendation**: 
Investigate guard logic first - likely the guards are preventing handlers needed for selection state management. May need more granular guards that only block drag/transform, not selection acquisition.

---

**Next Agent**: Start with debugging copy/paste workflow. Add console logs to track selection state changes and identify where the flow breaks.

