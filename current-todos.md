# Current Development Tasks

> **Active Work Items for CollabCanvas**  
> **Last Updated**: October 14, 2025  
> **Status**: Core MVP complete, working on shape type extensions

For overall project status and completed features, see `memory-bank/progress.md`.

---

## 🎯 High Priority Tasks

### 1. Implement Additional Shape Types
**Goal**: Add Circle, Line, and Text shape rendering support

**Current State**:
- ✅ UI toolbar has buttons for all shape types
- ✅ Backend creates shapes with `type` field
- ❌ Canvas only renders Rectangle shapes (needs Circle/Line/Text components)

**Tasks**:
- [ ] **1.1: Add Circle Shape Rendering**
  - File: `src/components/Canvas/Canvas.jsx`
  - Add conditional in `shapes.map()` to render `<Circle>` from react-konva
  - Props: `x`, `y`, `radius` (calculate from width/height)
  - Test: Create circle via toolbar → renders correctly

- [ ] **1.2: Add Line/Arrow Shape Rendering**
  - File: `src/components/Canvas/Canvas.jsx`
  - Add conditional for type === 'line'
  - Render `<Arrow>` or `<Line>` from react-konva
  - Props: `points` array [x1, y1, x2, y2]
  - Handle transform for line endpoints
  - Test: Create line via toolbar → renders correctly

- [ ] **1.3: Add Text Shape Rendering**
  - File: `src/components/Canvas/Canvas.jsx`
  - Add conditional for type === 'text'
  - Render `<Text>` from react-konva
  - Props: `x`, `y`, `text`, `fontSize`, `width`
  - Handle text editing on double-click (future enhancement)
  - Test: Create text via toolbar → renders correctly

- [ ] **1.4: Update Shape Creation Defaults**
  - File: `src/contexts/CanvasContext.jsx` or `src/components/Canvas/CanvasToolbar.jsx`
  - Define appropriate default dimensions for each type:
    - Circle: radius based on DEFAULT_SHAPE_SIZE
    - Line: default length and direction
    - Text: default text, fontSize, width
  - Test: Each tool creates shape with sensible defaults

- [ ] **1.5: Add Shape Type Validation**
  - File: `src/services/shapes.js`
  - Validate shape type on creation
  - Ensure all required fields for each type exist
  - Test: Invalid shape types rejected gracefully

**Dependencies**: None - can start immediately

**Estimated Effort**: 4-6 hours

**Success Criteria**:
- All four shape types (Rectangle, Circle, Line, Text) render correctly
- Shapes can be dragged, resized, and deleted regardless of type
- Locking works for all shape types
- Real-time sync works for all shape types
- Manual testing with multiple users successful

---

## 🔧 Medium Priority Enhancements

### 2. Improve Tool Mode Interaction
**Goal**: Stay in tool mode after creating a shape (don't auto-switch back to Select)

**Current Behavior**:
- Click Rectangle → shape appears → tool switches back to Select
- User must click Rectangle again for each new shape

**Desired Behavior**:
- Click Rectangle → stays in Rectangle mode
- Each click on canvas creates a new rectangle at that position
- Press Escape or click Select to exit tool mode

**Tasks**:
- [ ] **2.1: Add Tool Mode State**
  - Track "draw mode" vs "select mode"
  - Don't auto-switch back to Select after shape creation
  
- [ ] **2.2: Click-to-Create Interaction**
  - When in tool mode (Rectangle/Circle/etc), click canvas to create shape at cursor
  - Shape appears at click position instead of viewport center

- [ ] **2.3: Escape to Exit Tool Mode**
  - Add keyboard handler for Escape key
  - Returns to Select mode from any tool mode

**Estimated Effort**: 2-3 hours

---

### 3. Shape Property Panel
**Goal**: Edit shape properties after creation (color, size, etc.)

**Tasks**:
- [ ] **3.1: Create PropertyPanel Component**
  - Show when shape is selected
  - Display: Fill color, Width, Height, X/Y position
  - Allow editing via inputs

- [ ] **3.2: Integrate with CanvasContext**
  - Update shape properties in real-time
  - Sync changes to Firebase
  - Lock shape during property edits

**Estimated Effort**: 3-4 hours

---

## 📋 Low Priority / Future Work

### 4. Mobile Responsiveness
- Touch gesture support for pan/zoom
- Mobile-friendly toolbar layout
- Virtual keyboard handling for text input

### 5. Additional Features (Phase 2)
- Freehand drawing tool
- Undo/redo system
- Canvas export (PNG/SVG)
- Comments and annotations
- User permissions (viewer/editor roles)
- Multiple canvas projects

---

## 🐛 Known Issues

### Active Bugs

#### 1. Lock Border Persistence (Medium Priority) 🐛
**Discovered**: October 14, 2025  
**Symptom**: When dragging multiple shapes in rapid sequence, lock borders persist on all previously dragged shapes  
**Expected**: Only the currently locked shape should show lock border  
**Reproduction**:
1. Create multiple rectangles
2. Quickly drag one shape, release
3. Immediately drag another shape
4. Observe: Previous shape still has lock border

**Impact**: Visual clutter, confusing lock state indication (doesn't affect functionality)  
**Location**: `Canvas.jsx` - `editingShapes` state management, line ~45  
**Root Cause**: `editingShapes` Set not being cleared when drag ends  
**Priority**: Medium - Visual bug, doesn't block functionality  
**Target Fix**: V1.1.0

### Limitations
1. **Shape Type Rendering**: Only rectangles render (in progress above)
2. **Mobile**: Desktop-only, no touch optimization
3. **Performance**: Untested with 1000+ shapes
4. **Text Editing**: No double-click to edit text content yet

---

## 📊 Testing Status

**Current Coverage**:
- Unit Tests: 62/62 passing ✅
  - Auth: 8 tests
  - Presence: 12 tests
  - Canvas/Helpers: 42 tests
- Integration Tests: Manual testing approach ✅
- E2E Tests: Not implemented (deferred)

**Testing Strategy**: See `testing-strategy.md` for details and user story test suite.

---

## 🚀 Deployment Status

**Current State**: 
- Development: Running locally
- Production: Not yet deployed
- Firebase Hosting: Configured but not deployed

**Next Steps for Deployment** (PR #9 from tasks.md):
- [ ] Run final test suite
- [ ] Build production bundle
- [ ] Deploy to Firebase Hosting
- [ ] Configure Firestore/RTDB security rules for production
- [ ] Test with 5+ concurrent users

---

## 📝 Notes

**Development Approach**:
- Manual testing preferred for visual/interactive features
- Unit tests for service layer and utilities
- Integration tests deferred due to complexity of mocking Firebase

**Architecture Decisions**:
- O(1) shape operations (one doc per shape)
- RTDB for temporary data (cursors, active edits, locks)
- Firestore for persistent data (committed shapes)
- Throttled updates (150ms) to prevent rate limiting

**Design System**:
- Primary color: Indigo (#6366f1)
- Border radius: 12px (containers), 8px (buttons)
- Consistent hover/active states
- Responsive to zoom level (stroke widths, icons)

