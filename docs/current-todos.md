# Current TODOs - October 18, 2025

## Priority Matrix

### P0: Critical (Blocking/Broken)
None known! ✨

### P1: High Priority (Major Features, Performance)

#### 1. Copy/Paste & Duplicate Shapes
- Status: **READY TO IMPLEMENT** ✅
- Impact: Major UX improvement
- Technical: Uses batch operations already built
- Tasks:
  - [x] Batch create infrastructure exists
  - [ ] Keyboard shortcuts (Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+D)
  - [ ] Clipboard management (in-memory storage)
  - [ ] Offset pasting (don't paste directly on top)
  - [ ] Notification on successful paste
  - [ ] Test with multi-selection

#### 2. Undo/Redo System
- Status: **Architecture needed**
- Impact: Professional app feature
- Technical: Track all actions in history stack
- Tasks:
  - [ ] Define action history schema
  - [ ] Implement action recording (create, delete, move, etc.)
  - [ ] Stack management with memory limits
  - [ ] UI: Keyboard shortcuts + buttons
  - [ ] Test with multi-user scenarios (tricky!)

#### 3. Arrow Keys for Shape Movement
- Status: **PARTIALLY DONE** (only supports multi-selection)
- Impact: Improved precision editing
- Technical: Already implemented for multi-drag
- Tasks:
  - [ ] Verify single shape movement works
  - [ ] Add configurable move distance (1px, 5px, 10px)
  - [ ] Document keyboard shortcuts in help overlay
  - [ ] Test with rotated shapes (movement direction)

### P2: Medium Priority (Polish, Quality of Life)

#### 1. Shape Type Validation
- Status: **NEEDED**
- Impact: Data consistency
- Tasks:
  - [ ] Validate shape types on creation
  - [ ] Prevent invalid type storage
  - [ ] Migration for any existing invalid data

#### 2. Stroke/Border Options
- Status: **UI needed**
- Impact: More shape customization
- Tasks:
  - [ ] Add stroke width control to StylePanel
  - [ ] Add stroke color picker
  - [ ] Stroke style (solid, dashed, dotted)
  - [ ] Preview in canvas

#### 3. Font Family Selector
- Status: **UI needed**
- Impact: Text formatting completeness
- Tasks:
  - [ ] Add font family dropdown to StylePanel
  - [ ] Support web-safe fonts (Arial, Helvetica, etc.)
  - [ ] Persist font family to Firestore
  - [ ] Sync via RTDB for live editing

#### 4. Advanced Text Features
- Status: **Future**
- Impact: Rich text support
- Tasks:
  - [ ] Multi-line text with mixed formatting
  - [ ] Rich text editor (optional dependency)
  - [ ] Export to formatted text

#### 5. Visual Improvements
- Status: **READY FOR POLISH**
- Tasks:
  - [ ] Keyboard shortcuts help overlay (press '?' key)
  - [ ] Loading states for slow networks
  - [ ] Error boundaries for resilience
  - [ ] Better empty canvas experience

### P3: Lower Priority (Future Releases)

#### 1. Group Shapes (Logical)
- Status: **Architecture exists (SelectionGroup)**
- Impact: Better organization for complex canvases
- Tasks:
  - [ ] Persist grouping to Firestore
  - [ ] Visual group indicators
  - [ ] Group operations (move, delete, lock)

#### 2. Layers/Z-Index Control
- Status: **Basic implementation exists** (bring-to-front/send-to-back)
- Impact: Better shape management
- Tasks:
  - [ ] Add layers panel
  - [ ] Show all shapes with visual hierarchy
  - [ ] Direct layer reordering UI
  - [ ] Layer names/labels

#### 3. Canvas Export
- Status: **Not started**
- Impact: Share work outside CollabCanvas
- Tasks:
  - [ ] Export as PNG (canvas snapshot)
  - [ ] Export as SVG (vector)
  - [ ] Export as JSON (data backup)

#### 4. Freehand Drawing
- Status: **Not started**
- Impact: More flexible creation
- Tasks:
  - [ ] Draw tool using Konva Line
  - [ ] Pressure sensitivity (if mouse supports)
  - [ ] Stroke smoothing
  - [ ] Performance optimization for long strokes

#### 5. Mobile Optimization
- Status: **Not started**
- Impact: Wider audience
- Tasks:
  - [ ] Touch gesture support (pinch zoom, two-finger pan)
  - [ ] Responsive UI layout
  - [ ] Mobile-friendly toolbar
  - [ ] Test on iOS/Android

#### 6. Collaboration Features
- Status: **Core features done, nice-to-haves remain**
- Tasks:
  - [ ] Comments on shapes
  - [ ] Chat/messaging
  - [ ] Activity history/timeline
  - [ ] User permissions (owner/editor/viewer)
  - [ ] Canvas sharing/invites

#### 7. Advanced Features
- Status: **Future vision**
- Tasks:
  - [ ] Grid/snap-to-grid
  - [ ] Ruler/guides
  - [ ] Shape templates/library
  - [ ] Multiple canvases per user (projects/workspaces)

## Quick Reference by Feature Area

### Canvas Core
- [x] Panning and zooming
- [x] Shape creation (rectangle, circle, line, text)
- [x] Shape editing (move, resize, rotate)
- [ ] Shape grouping (logical)
- [ ] Layers panel
- [ ] Grid/guides

### Shape Editing
- [x] Fill color
- [ ] Stroke/border
- [x] Rotation
- [x] Font size & family (size done, family pending)
- [x] Text alignment & formatting
- [x] Multi-selection transform

### Collaboration
- [x] Real-time cursor tracking
- [x] User presence
- [x] Shape locking
- [x] Idle detection
- [ ] Comments
- [ ] Chat
- [ ] User permissions

### Operations
- [ ] Copy/Paste
- [ ] Duplicate
- [ ] Undo/Redo
- [x] Delete
- [x] Bring to Front/Send to Back
- [ ] Group operations

### Advanced
- [ ] Freehand drawing
- [ ] Canvas export
- [ ] Mobile optimization
- [ ] Multiple canvases

## Known Limitations

1. **Mobile**: Not optimized for touch/mobile
2. **Scale**: Performance with 1000+ shapes (ready to test)
3. **Concurrent Users**: Tested with 5-10, higher load untested
4. **Text Wrapping**: Basic (Konva default), no custom wrapping modes
5. **Performance**: Large operations (>500 shapes) may still need optimization

## Completed in V1.0

✅ Basic shape creation and editing
✅ Real-time collaboration
✅ User presence & cursors
✅ Shape locking & conflict prevention
✅ Text editing with formatting
✅ Multi-selection transform
✅ Batch operations (paste, duplicate ready)
✅ Performance optimizations (viewport culling, shared heartbeat)
✅ Idle detection & session cleanup
✅ Optimistic UI & locking

## Next Milestone: V1.1.0

**Focus**: Copy/Paste, Undo/Redo, Polish

1. ✅ Copy/Paste shapes (keyboard shortcuts)
2. ✅ Duplicate shapes (Ctrl/Cmd+D)
3. ✅ Undo/Redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z)
4. ✅ Shape type validation
5. ✅ Keyboard shortcuts help overlay
6. ✅ Font family selector
7. ✅ Stroke/border customization

## Development Notes

- All infrastructure for batch operations is ready
- SelectionGroup model enables future grouped operations
- Deployment channels ready for safe feature testing
- Firebase has 2 projects (prod + dev) for isolated testing
- Performance tested with 641 shapes - no freezing

