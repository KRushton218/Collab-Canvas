# Handoff to Next Agent - Performance Fix Continuation

**Date**: October 18, 2025  
**Current Branch**: `fix/enable-selectiongroupnode-performance`  
**Latest Commit**: `f1d88ff` - "docs: Add test results - partial fix with new issues discovered"  
**Status**: ⚠️ **PARTIAL FIX - Needs Completion**

---

## 🎯 Quick Summary

**What Was Done**:
- Re-enabled SelectionGroupNode for O(1) multi-selection performance
- Added guard logic to prevent double-handling of shapes
- Successfully deployed to dev environment

**What's Broken**:
- ❌ Copy/paste → multi-selection workflow broken
- ❌ Drag-to-select (selection box) has issues

**Root Cause**: Guard logic is too aggressive - blocks handlers needed for selection acquisition

---

## 📋 Your Task

Fix the guard logic to restore selection workflows while maintaining performance optimization.

### Priority 1: Debug and Identify Root Cause

**Step 1**: Reproduce the issues
```bash
# Dev environment (already deployed with partial fix)
open https://collab-canvas-dev.web.app

# Test A: Copy/Paste Issue
1. Login
2. Create/select shapes
3. Copy (Cmd/Ctrl+C)
4. Paste (Cmd/Ctrl+V)
5. Try to multi-select pasted shapes
6. Document: What exactly doesn't work?

# Test B: Drag-to-Select Issue
1. Click and drag on empty canvas
2. Try to create selection box
3. Document: What exactly doesn't work?
```

**Step 2**: Add debug logging
```javascript
// In src/components/Canvas/Canvas.jsx

// Around line 1000 (onStartEdit)
const isPartOfGroup = selectedIds.size > 1 && selectedIds.has(shape.id);
console.log('[Guard Debug] onStartEdit:', {
  shapeId: shape.id,
  selectedIdsSize: selectedIds.size,
  hasShape: selectedIds.has(shape.id),
  isPartOfGroup,
  action: isPartOfGroup ? 'BLOCKED' : 'ALLOWED'
});
if (isPartOfGroup) return;

// Repeat for other guards at lines ~1037, 1089, 1168, 1247
```

### Priority 2: Implement Fix

**Option A: Refine Guard Logic (Recommended)**

The guards should only block drag/transform operations, not selection acquisition:

```javascript
// Current guard (TOO AGGRESSIVE):
const isPartOfGroup = selectedIds.size > 1 && selectedIds.has(shape.id);
if (isPartOfGroup) return;

// Better guard (MORE GRANULAR):
const shouldUseGroupHandler = selectedIds.size > 1 
                            && selectedIds.has(shape.id) 
                            && editingShapesRef.current.size > 1; // Only block if actively editing
if (shouldUseGroupHandler) return;
```

**Why This Works**:
- Allows individual handlers during selection acquisition
- Only blocks once group is actively being edited
- Prevents double-handling during drag/transform

**Option B: Add Selection State Flag**

Track selection state separately from multi-selection:

```javascript
const [isAcquiringSelection, setIsAcquiringSelection] = useState(false);

// In selection handlers:
setIsAcquiringSelection(true);
// ... perform selection ...
setIsAcquiringSelection(false);

// In guards:
const shouldUseGroupHandler = selectedIds.size > 1 
                            && !isAcquiringSelection
                            && selectedIds.has(shape.id);
if (shouldUseGroupHandler) return;
```

**Option C: Delay SelectionGroupNode Activation**

Don't render SelectionGroupNode until locks are acquired:

```javascript
// Line 1530 - current condition
{selectedIds.size > 1 && selectedShapes.length > 0 && (
  <SelectionGroupNode ... />
)}

// Better condition
{selectedIds.size > 1 
 && selectedShapes.length > 0 
 && editingShapesRef.current.size > 1  // Only after locks acquired
 && (
  <SelectionGroupNode ... />
)}
```

### Priority 3: Test Thoroughly

After implementing fix:

```bash
# Test checklist (all must pass):
- [ ] Single shape selection works
- [ ] Multi-shape selection (Shift+Click) works
- [ ] Select All (Cmd/Ctrl+A) works
- [ ] Copy/paste then select works
- [ ] Drag-to-select (selection box) works
- [ ] Drag 10 shapes - smooth
- [ ] Drag 100 shapes - smooth
- [ ] Drag 641 shapes - smooth (original performance issue)
- [ ] Positions persist after drag
- [ ] Multi-user updates work in real-time
```

---

## 📚 Key Files to Review

### Code Files
1. **`src/components/Canvas/Canvas.jsx`**
   - Lines 1000, 1037, 1089, 1168, 1247: Guard logic (MODIFY THESE)
   - Line 1530: SelectionGroupNode rendering (may need condition update)
   - Search for `isPartOfGroup` to find all guards

2. **`src/components/Canvas/SelectionGroupNode.jsx`**
   - Review to understand how group handles shapes
   - May need to handle edge cases

3. **`src/models/SelectionGroup.js`**
   - Check if it handles optimistic shapes correctly
   - May need null/undefined checks

### Documentation Files
1. **`docs/PERFORMANCE_FIX_TEST_RESULTS.md`** ⭐ START HERE
   - Detailed issue analysis
   - Debugging steps
   - 4 potential fix options
   - Success criteria

2. **`docs/PERFORMANCE_ISSUE_COMPREHENSIVE_SPEC.md`**
   - Original 760-line analysis
   - Theory 1 (95% confidence) was correct
   - Background on why SelectionGroupNode is needed

3. **`docs/PERFORMANCE_FIX_APPLIED.md`**
   - What was implemented
   - Testing strategy
   - Architecture explanation

4. **`PERFORMANCE_FIX_SUMMARY.md`**
   - Executive summary
   - Current status with test failures

---

## 🔧 Commands Reference

```bash
# Current state
git branch --show-current
# Should show: fix/enable-selectiongroupnode-performance

# View recent changes
git log --oneline -5

# Run dev server locally
npm run dev
# Open http://localhost:5173

# Deploy to dev
npm run firebase:deploy:dev
# Test at https://collab-canvas-dev.web.app

# After fix is working:
git add [modified-files]
git commit -m "fix: Refine guard logic to restore selection workflows

[Describe what you changed and why]"
git push origin fix/enable-selectiongroupnode-performance
```

---

## 🎓 Context You Need to Know

### The Original Problem
- SelectionGroupNode was created but disabled
- System fell back to 641 individual handlers per frame
- Result: 268K operations/second, browser freeze

### The First Fix (Partial)
- Re-enabled SelectionGroupNode ✅
- Added guards to prevent double-handling ✅
- **But**: Guards too aggressive, broke selection workflows ❌

### Why Guards Were Added
Without guards, both systems fire:
- Individual shape handlers (641×)
- SelectionGroupNode handler (1×)
- Result: 642 handlers instead of 1 - worse than before!

### The Challenge
Need guards that are **smart enough** to:
- ✅ Block individual handlers during group drag/transform
- ✅ Allow individual handlers during selection acquisition
- ✅ Prevent double-handling
- ✅ Not interfere with selection box logic

---

## ✅ Success Criteria

You've succeeded when:
1. ✅ All selection workflows work (single, multi, keyboard, drag-select)
2. ✅ Copy/paste then select works
3. ✅ Drag 641 shapes is smooth (original issue remains fixed)
4. ✅ No console errors
5. ✅ Multi-user collaboration works
6. ✅ Build compiles without errors

---

## 🆘 If You Get Stuck

### Quick Win: Temporarily Disable Guards

If you need to unblock testing:

```javascript
// In all 5 guard locations, comment out the guard:
// const isPartOfGroup = selectedIds.size > 1 && selectedIds.has(shape.id);
// if (isPartOfGroup) return;

// This will cause double-handling but let you test selection workflows
```

Then investigate why guards break selection and refine them.

### Alternative: Revert to Find Baseline

```bash
# See what worked before SelectionGroupNode
git log --oneline --all -- src/components/Canvas/Canvas.jsx

# Check specific commit
git show [commit-hash]
```

### Debug Console Commands

```javascript
// In browser console on dev site:
// Check current state
console.log('selectedIds:', window.__selectedIds)
console.log('editingShapes:', window.__editingShapes)

// You may need to expose these in Canvas.jsx:
window.__selectedIds = selectedIds;
window.__editingShapes = editingShapes;
```

---

## 📞 Commit Message for Next Agent

When you've fixed the issues:

```
fix: Refine guard logic to restore selection workflows

The guard logic added to prevent double-handling was too aggressive
and blocked handlers needed for selection acquisition and state management.

Changes:
- Refined guards to only block during active editing, not selection
- [OR: Added isAcquiringSelection state flag]
- [OR: Delayed SelectionGroupNode activation until locks acquired]
- [Describe your specific solution]

Testing:
- ✅ Copy/paste then select works
- ✅ Drag-to-select (selection box) works
- ✅ All keyboard selection shortcuts work
- ✅ Drag 641 shapes remains smooth (original fix preserved)
- ✅ Multi-user collaboration verified
- ✅ No console errors

Resolves: Performance optimization now complete without breaking workflows
```

---

## Orchestrator: cursor_flow (Time/Depth Envelope)

When starting a session, declare a cursor_flow envelope to control time budget and reasoning depth. Defaults apply if omitted, but explicit is better.

Example envelopes:

```yaml
cursor_flow:
  taskType: fix
  timeBudgetMinutes: 20
  reasoningDepth: standard
  maxParallelAttempts: 1
  stepTimeoutSeconds: 120
  checkpointFrequencyMinutes: 5
  riskPolicy: conservative
```

```yaml
cursor_flow:
  taskType: feature
  timeBudgetMinutes: 40
  reasoningDepth: deep
  maxParallelAttempts: 2
  stepTimeoutSeconds: 180
  checkpointFrequencyMinutes: 10
  riskPolicy: balanced
  notes: "Allow broader exploration; consolidate at T-5m"
```

Operational guidance:
- Echo the envelope once, then enforce it (status updates show remaining time)
- Parallelize safe read-only exploration; sequence edits
- Abort or fallback when a step exceeds `stepTimeoutSeconds`
- At T-2m, consolidate: summarize, commit WIP if safe, propose next steps

---

## 🚀 You've Got This!

The hard analysis work is done. You just need to refine the guards to be less aggressive. Start with Option A (refine guard logic) - it's the simplest and most likely to work.

Good luck! 🎉

---

**Questions? Check**:
- `docs/PERFORMANCE_FIX_TEST_RESULTS.md` for detailed analysis
- Canvas.jsx lines with `isPartOfGroup` for current guard implementations
- SelectionGroupNode.jsx to understand how grouping works

