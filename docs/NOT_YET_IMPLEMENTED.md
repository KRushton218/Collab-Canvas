# Not-Yet-Implemented Features

**Date**: October 16, 2025  
**Purpose**: Track features with UI ready but backend logic pending  
**Status**: Documented with implementation specs

---

## 📋 Features with UI But No Backend

These features have:
- ✅ UI buttons in LeftPanel
- ✅ Keyboard shortcuts registered
- ✅ Context functions stubbed
- ❌ Backend logic not implemented (console.log only)

---

## 1. Undo/Redo System

### Current Status
**UI**: ✅ Ready (LeftPanel buttons + keyboard shortcuts)  
**Backend**: ❌ Stubbed with TODO  
**Rubric Value**: 2 points (Tier 1 feature)

### Where Documented

**Code Location:**
```javascript
// src/contexts/CanvasContext.jsx lines 623-640
const [history, setHistory] = useState([]);
const [historyIndex, setHistoryIndex] = useState(-1);

const undo = () => {
  if (!canUndo) return;
  // TODO: Implement undo logic
  console.log('[Undo] Not yet implemented');
};

const redo = () => {
  if (!canRedo) return;
  // TODO: Implement redo logic
  console.log('[Redo] Not yet implemented');
};
```

**Documentation:**
- `/docs/FIGMA_LAYOUT_AND_SHORTCUTS.md` - Lines 174-180, 254-256, 310-313, 384-388
- `/memory-bank/progress.md` - Line 111: "Undo/redo system" marked as TODO

**Keyboard Shortcuts:**
- `⌘Z` - Undo
- `⌘⇧Z` - Redo

**UI Locations:**
- LeftPanel: Undo/Redo buttons (top of Edit section)
- Disabled when `!canUndo` or `!canRedo`

### Implementation Spec

**Architecture:**
```javascript
// Action type definition
type Action = {
  type: 'CREATE' | 'UPDATE' | 'DELETE',
  timestamp: number,
  shapeIds: string[],
  beforeState: object[], // Shapes before change
  afterState: object[],  // Shapes after change
  inverse: () => Promise<void>, // Function to reverse the action
}

// History management
const [history, setHistory] = useState<Action[]>([]);
const [historyIndex, setHistoryIndex] = useState(-1);
const MAX_HISTORY = 50; // Limit memory usage
```

**Workflow:**
```javascript
// When user creates shape:
const addShape = async (shapeData) => {
  const id = await shapeService.createShape(shapeData);
  
  // Record action
  pushToHistory({
    type: 'CREATE',
    shapeIds: [id],
    beforeState: [],
    afterState: [{ id, ...shapeData }],
    inverse: () => deleteShape(id),
  });
  
  return id;
};

// Undo implementation:
const undo = async () => {
  if (historyIndex < 0) return;
  
  const action = history[historyIndex];
  await action.inverse(); // Execute reverse operation
  setHistoryIndex(historyIndex - 1);
};

// Redo implementation:
const redo = async () => {
  if (historyIndex >= history.length - 1) return;
  
  const action = history[historyIndex + 1];
  await action.inverse(); // Re-apply the action
  setHistoryIndex(historyIndex + 1);
};
```

**Complexity:** Medium  
**Estimated Time:** 6-8 hours  
**Dependencies:** None

**Challenges:**
1. Need to wrap ALL mutation operations (create/update/delete/move)
2. History must survive across collaborative edits
3. Inverse operations for transforms can be complex
4. Memory management (limit history size)

---

## 2. Z-Index Management (Bring to Front / Send to Back)

### Current Status
**UI**: ✅ Ready (LeftPanel buttons + keyboard shortcuts)  
**Backend**: ❌ Stubbed with TODO  
**Rubric Value**: 3 points (part of Tier 2 "Z-index management")

### Where Documented

**Code Location:**
```javascript
// src/contexts/CanvasContext.jsx lines 706-717
const bringToFront = async () => {
  if (selectedIds.size === 0) return;
  // TODO: Implement z-index management
  console.log('[BringToFront] Not yet implemented');
};

const sendToBack = async () => {
  if (selectedIds.size === 0) return;
  // TODO: Implement z-index management
  console.log('[SendToBack] Not yet implemented');
};
```

**Documentation:**
- `/docs/FIGMA_LAYOUT_AND_SHORTCUTS.md` - Lines 197-201, 256-257, 315-318, 389-393
- `/memory-bank/progress.md` - Line 110: "Layers/z-index control" marked as TODO

**Keyboard Shortcuts:**
- `⌘]` - Bring to Front
- `⌘[` - Send to Back

**UI Locations:**
- LeftPanel: Arrange section (Bring to Front / Send to Back buttons)
- Disabled when no selection

### Implementation Spec

**Database Schema Change:**
```javascript
// Add to shapes collection in Firestore
{
  id: string,
  type: string,
  x: number,
  y: number,
  // ... existing fields ...
  zIndex: number, // NEW FIELD (default: timestamp for creation order)
}
```

**Implementation:**
```javascript
// Add to CanvasObject model
export class CanvasObject {
  constructor({ 
    id, type, x, y, width, height, fill, rotation, 
    stroke, strokeWidth,
    zIndex = Date.now() // Default to creation timestamp
  }) {
    // ... existing props ...
    this.zIndex = zIndex;
  }

  toRecord(createdBy) {
    return {
      // ... existing fields ...
      zIndex: this.zIndex,
    };
  }
}
```

**Bring to Front Logic:**
```javascript
const bringToFront = async () => {
  if (selectedIds.size === 0) return;
  
  // Find max zIndex currently in use
  const maxZIndex = Math.max(...shapes.map(s => s.zIndex || 0));
  
  // Update all selected shapes to be above max
  const selectedShapeIds = Array.from(selectedIds);
  for (const id of selectedShapeIds) {
    await updateShape(id, { 
      zIndex: maxZIndex + 1 
    });
  }
};
```

**Send to Back Logic:**
```javascript
const sendToBack = async () => {
  if (selectedIds.size === 0) return;
  
  // Find min zIndex currently in use
  const minZIndex = Math.min(...shapes.map(s => s.zIndex || 0));
  
  // Update all selected shapes to be below min
  const selectedShapeIds = Array.from(selectedIds);
  for (const id of selectedShapeIds) {
    await updateShape(id, { 
      zIndex: minZIndex - 1 
    });
  }
};
```

**Rendering Order:**
```javascript
// In Canvas.jsx, sort shapes by zIndex before rendering
const sortedShapes = useMemo(() => {
  return [...shapes].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
}, [shapes]);

// Then render:
{sortedShapes.map(shape => <ShapeNode ... />)}
```

**Complexity:** Low-Medium  
**Estimated Time:** 3-4 hours  
**Dependencies:** Need to add `zIndex` field to all shapes (migration)

**Challenges:**
1. Existing shapes don't have zIndex (need default value)
2. Must update shapes.js to persist zIndex
3. Rendering order must respect zIndex
4. Multi-user conflicts (two users bring different shapes to front)

---

## 3. Full Action History for Undo/Redo

### Current Status
**UI**: ✅ Undo/Redo buttons exist  
**State**: ✅ `history` and `historyIndex` in CanvasContext  
**Backend**: ❌ No action tracking implemented

### Where Documented

**Code Location:**
```javascript
// src/contexts/CanvasContext.jsx lines 623-640
const [history, setHistory] = useState([]);
const [historyIndex, setHistoryIndex] = useState(-1);
```

**Documentation:**
- `/docs/FIGMA_LAYOUT_AND_SHORTCUTS.md` - Line 310-313

### Implementation Spec

**What Needs Tracking:**
1. **Create** - Shape creation (inverse: delete)
2. **Delete** - Shape deletion (inverse: recreate)
3. **Update** - Property changes (inverse: restore old values)
4. **Move** - Position changes (inverse: move back)
5. **Transform** - Resize/rotate (inverse: restore dimensions)
6. **Multi-op** - Batch operations (inverse: batch reverse)

**Action Structure:**
```javascript
{
  id: string,
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'BATCH',
  timestamp: number,
  userId: string,
  description: string, // Human-readable (for debugging)
  
  // For single shape operations
  shapeId?: string,
  beforeState?: object,
  afterState?: object,
  
  // For batch operations
  shapes?: Array<{
    shapeId: string,
    beforeState: object,
    afterState: object,
  }>,
  
  // Execution functions
  execute: () => Promise<void>,  // Apply the action
  inverse: () => Promise<void>,  // Reverse the action
}
```

**Wrapping Pattern:**
```javascript
// Every mutation function needs wrapping:

// Before:
const addShape = async (shapeData) => {
  const id = await shapeService.createShape(shapeData);
  return id;
};

// After:
const addShape = async (shapeData) => {
  const id = await shapeService.createShape(shapeData);
  
  // Record in history
  const action = {
    type: 'CREATE',
    shapeId: id,
    afterState: { id, ...shapeData },
    inverse: async () => {
      await shapeService.deleteShape(id);
    },
  };
  addToHistory(action);
  
  return id;
};
```

**Complexity:** High  
**Estimated Time:** 10-12 hours  
**Dependencies:** None

**Challenges:**
1. Must wrap ~10 different mutation functions
2. Collaborative undo (only undo YOUR actions? Or global undo?)
3. History size management
4. Complex inverse operations (multi-step transforms)
5. State consistency when undoing mid-collaboration

---

## 📊 Implementation Priority

### High Priority (For Rubric Points)
1. **Z-Index Management** (+3 pts, 3-4 hours)
   - Easier to implement
   - Clear requirements
   - Good rubric value

### Medium Priority (For Rubric Points)
2. **Undo/Redo** (+2 pts, 10-12 hours)
   - Complex implementation
   - Good rubric value
   - Industry-standard feature

### Low Priority (Nice to Have)
3. **Enhanced Layers Panel** (+3 pts, 8-10 hours)
   - Drag-to-reorder
   - Visibility toggles
   - Good for polish

---

## 🎯 Recommended Approach

### Option A: Quick Win (Z-Index Only)
**Time**: 3-4 hours  
**Rubric Gain**: +3 points  
**Effort/Reward**: Excellent

**Steps:**
1. Add `zIndex` field to CanvasObject models
2. Update shapes.js to persist zIndex
3. Implement bringToFront/sendToBack logic
4. Sort shapes by zIndex before rendering
5. Test with multi-user scenarios

**Result**: Section 3 score goes from 11 → 14 (Good → Excellent)

### Option B: Full Feature Set (Z-Index + Undo/Redo)
**Time**: 13-16 hours  
**Rubric Gain**: +5 points  
**Effort/Reward**: Good

**Steps:**
1. Implement Z-Index (3-4 hours)
2. Design action history system (2 hours)
3. Wrap all mutation functions (6 hours)
4. Test and debug (2 hours)

**Result**: Section 3 score goes from 11 → 16... but capped at 15 max

### Option C: Test First, Implement Later
**Time**: 0 hours now, defer implementation  
**Rubric Score**: Current 11-13 pts (Good)  
**Risk**: Lower score but focuses on testing existing features

---

## 📄 Where These Are Mentioned

### Documentation Files:
1. **`/docs/FIGMA_LAYOUT_AND_SHORTCUTS.md`** (Created today)
   - Lines 67-68: Undo/Redo marked as "⚠️ UI ready, logic TODO"
   - Lines 76-77: Bring to Front/Send to Back marked as "⚠️ UI ready, logic TODO"
   - Lines 174-180: Undo/Redo system prepared
   - Lines 197-201: Layer management prepared
   - Lines 310-318: Implementation notes

2. **`/memory-bank/progress.md`**
   - Line 91: "Copy/paste shapes" - Now ✅ (was TODO)
   - Line 92: "Duplicate shapes" - Now ✅ (was TODO)
   - Line 110: "Layers/z-index control" - Still ❌
   - Line 111: "Undo/redo system" - Still ❌

3. **`/docs/RUBRIC_TESTING_CHECKLIST.md`**
   - Section 3 analysis showing which Tier 1/2 features are missing

### Code Locations:
1. **`/src/contexts/CanvasContext.jsx`**
   - Lines 623-640: Undo/Redo stubs
   - Lines 706-717: Z-Index stubs

2. **`/src/components/Canvas/LeftPanel.jsx`**
   - Lines 42-56: Action buttons definitions (includes undo/redo/layers)
   - Lines 96-102: Layer action buttons

3. **`/src/hooks/useKeyboardShortcuts.js`**
   - Lines 68-80: Undo/Redo keyboard handlers
   - Lines 126-139: Bring to Front/Send to Back handlers

---

## 🔧 Detailed Implementation Specs

### SPEC 1: Undo/Redo System

**Requirements:**
- Track all user actions (create, update, delete, move, transform)
- Store inverse operations
- Support ⌘Z (undo) and ⌘⇧Z (redo)
- Max 50 actions in history
- Clear on page refresh (local only)

**Data Structure:**
```typescript
interface HistoryAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'BATCH';
  timestamp: number;
  userId: string;
  
  // Single shape operation
  shapeId?: string;
  beforeState?: ShapeData;
  afterState?: ShapeData;
  
  // Batch operation
  shapes?: Array<{
    shapeId: string;
    beforeState: ShapeData;
    afterState: ShapeData;
  }>;
  
  // Functions
  execute: () => Promise<void>;
  inverse: () => Promise<void>;
}

const [history, setHistory] = useState<HistoryAction[]>([]);
const [historyIndex, setHistoryIndex] = useState<number>(-1);
```

**Functions to Wrap:**
1. `addShape()` - CREATE action
2. `updateShape()` - UPDATE action
3. `deleteShape()` - DELETE action
4. `finishEditingShape()` - UPDATE action (transform)
5. `finishEditingMultipleShapes()` - BATCH action

**Helper Functions:**
```javascript
const addToHistory = (action) => {
  // Truncate history if we're not at the end
  const newHistory = history.slice(0, historyIndex + 1);
  
  // Add new action
  newHistory.push(action);
  
  // Limit history size
  if (newHistory.length > MAX_HISTORY) {
    newHistory.shift();
  } else {
    setHistoryIndex(historyIndex + 1);
  }
  
  setHistory(newHistory);
};

const undo = async () => {
  if (historyIndex < 0) return;
  
  const action = history[historyIndex];
  console.log('[Undo] Reversing:', action.type, action.shapeId);
  
  try {
    await action.inverse();
    setHistoryIndex(historyIndex - 1);
  } catch (error) {
    console.error('[Undo] Failed:', error);
  }
};

const redo = async () => {
  if (historyIndex >= history.length - 1) return;
  
  const nextAction = history[historyIndex + 1];
  console.log('[Redo] Re-applying:', nextAction.type, nextAction.shapeId);
  
  try {
    await nextAction.execute();
    setHistoryIndex(historyIndex + 1);
  } catch (error) {
    console.error('[Redo] Failed:', error);
  }
};
```

**Testing:**
1. Create shape → undo → shape disappears
2. Undo → redo → shape reappears
3. Create 3 shapes, undo all 3 → empty canvas
4. Redo all 3 → all shapes return
5. Move shape → undo → returns to original position
6. Change color → undo → color reverts

---

### SPEC 2: Z-Index Management

**Requirements:**
- Each shape has `zIndex` property
- Higher zIndex renders on top
- Bring to Front: Set zIndex above all others
- Send to Back: Set zIndex below all others
- Supports multi-selection (all selected shapes move together)
- Syncs across users via Firestore

**Database Changes:**
```javascript
// 1. Update CanvasObject model
export class CanvasObject {
  constructor({ 
    // ... existing params ...
    zIndex = null // Will default to timestamp if null
  }) {
    // ... existing assignments ...
    this.zIndex = zIndex ?? Date.now(); // Use timestamp if not provided
  }

  toRecord(createdBy) {
    return {
      // ... existing fields ...
      zIndex: this.zIndex,
    };
  }
}
```

```javascript
// 2. Update shapes.js createShape
export const createShape = async (shapeData) => {
  const baseShape = {
    // ... existing fields ...
    zIndex: shapeData.zIndex ?? Date.now(), // Auto-assign if not provided
  };
  // ... rest of function ...
};
```

```javascript
// 3. Update CanvasContext rendering
const sortedShapes = useMemo(() => {
  // Sort by zIndex (ascending = bottom to top)
  return [...shapes].sort((a, b) => {
    const aZ = a.zIndex ?? 0;
    const bZ = b.zIndex ?? 0;
    return aZ - bZ;
  });
}, [shapes]);

// Use sortedShapes instead of shapes in render
```

**Bring to Front Logic:**
```javascript
const bringToFront = async () => {
  if (selectedIds.size === 0) return;
  
  // Find current max zIndex
  const maxZIndex = Math.max(
    0, 
    ...shapes.map(s => s.zIndex ?? 0)
  );
  
  // Set selected shapes to max + 1
  // If multiple selected, maintain their relative order
  const selectedShapeIds = Array.from(selectedIds);
  const selectedShapesData = selectedShapeIds
    .map(id => shapes.find(s => s.id === id))
    .filter(Boolean)
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  
  // Assign new zIndex values
  for (let i = 0; i < selectedShapesData.length; i++) {
    await updateShape(selectedShapesData[i].id, {
      zIndex: maxZIndex + 1 + i,
    });
  }
};
```

**Send to Back Logic:**
```javascript
const sendToBack = async () => {
  if (selectedIds.size === 0) return;
  
  // Find current min zIndex
  const minZIndex = Math.min(
    0,
    ...shapes.map(s => s.zIndex ?? 0)
  );
  
  // Set selected shapes to min - N (where N = selection count)
  const selectedShapeIds = Array.from(selectedIds);
  const selectedShapesData = selectedShapeIds
    .map(id => shapes.find(s => s.id === id))
    .filter(Boolean)
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  
  // Assign new zIndex values
  for (let i = 0; i < selectedShapesData.length; i++) {
    await updateShape(selectedShapesData[i].id, {
      zIndex: minZIndex - selectedShapesData.length + i,
    });
  }
};
```

**Migration for Existing Shapes:**
```javascript
// One-time script to add zIndex to existing shapes
const migrateZIndex = async () => {
  const allShapes = await loadShapes();
  
  for (let i = 0; i < allShapes.length; i++) {
    const shape = allShapes[i];
    if (shape.zIndex === undefined) {
      // Use creation timestamp or index as default
      const defaultZIndex = new Date(shape.createdAt).getTime() || i;
      await updateShape(shape.id, { zIndex: defaultZIndex });
    }
  }
};
```

**Testing:**
1. Create 3 overlapping shapes (A, B, C in that order)
2. Select B → Bring to Front → B renders on top
3. Select C → Send to Back → C renders below all
4. Multi-select A & B → Bring to Front → both on top, maintain relative order
5. Multi-user: User A brings shape to front while User B edits → both changes persist

**Complexity:** Low-Medium  
**Estimated Time:** 3-4 hours  
**Dependencies:** Database schema change (add zIndex field)

---

## 📊 Summary Table

| Feature | UI Ready | Backend Status | Rubric Value | Complexity | Time | Priority |
|---------|----------|----------------|--------------|------------|------|----------|
| **Copy/Paste** | ✅ | ✅ Working | 2 pts | Low | DONE | ✅ |
| **Duplicate** | ✅ | ✅ Working | 2 pts | Low | DONE | ✅ |
| **Arrow Keys** | ✅ | ✅ Working | 1 pt | Low | DONE | ✅ |
| **Z-Index** | ✅ | ❌ Stubbed | 3 pts | Low-Med | 3-4h | **HIGH** |
| **Undo/Redo** | ✅ | ❌ Stubbed | 2 pts | High | 10-12h | MEDIUM |
| **Select All** | ✅ | ✅ Working | - | Low | DONE | ✅ |

---

## 🚀 Recommended Next Steps

### If You Have 4 Hours:
**Implement Z-Index** → +3 points → Score: 74/80 (93%)

### If You Have 15 Hours:
**Implement Z-Index + Undo/Redo** → +5 points → Score: 76/80 (95%)

### If You Have 0 Hours:
**Test current features thoroughly** → Solid 71/80 (89%) with great demo

---

## 📝 Current Implementation Status

**What Works Today:**
- ✅ Copy (⌘C) - Fully functional
- ✅ Paste (⌘V) - Fully functional
- ✅ Duplicate (⌘D) - Fully functional
- ✅ Select All (⌘A) - Fully functional
- ✅ Arrow key movement - Fully functional
- ✅ All tool shortcuts (V/R/C/L/T) - Fully functional
- ✅ Delete (⌫) - Fully functional
- ✅ ESC (smart deselect) - Fully functional

**What Needs Backend:**
- ⚠️ Undo (⌘Z) - Logs to console only
- ⚠️ Redo (⌘⇧Z) - Logs to console only
- ⚠️ Bring to Front (⌘]) - Logs to console only
- ⚠️ Send to Back (⌘[) - Logs to console only

**Users will see:**
- Buttons appear but clicking shows console log
- Keyboard shortcuts registered but no action
- No error or crash (graceful degradation)

---

**Want me to implement Z-Index management now (3-4 hours)?** Or would you prefer to test the current features first and decide later?
