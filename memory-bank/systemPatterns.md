# System Patterns

## Architecture Overview

### Two-Database Architecture
The app uses a hybrid database approach for optimal performance:

1. **Firestore** (Persistent Storage)
   - Stores committed shape data
   - Source of truth for canvas state
   - Schema: One document per shape at `/shapes/{shapeId}`
   - O(1) read/write operations

2. **Realtime Database** (Temporary Data)
   - Live cursor positions (`/cursors/{userId}`)
   - User presence tracking (`/sessions/{canvasId}/{userId}`)
   - Active shape edits during drag/resize (`/activeEdits/{shapeId}`)
   - Shape locks with TTL (`/locks/{shapeId}`)

### Key Technical Decisions

#### Shape Management
- **One document per shape** instead of array-based storage
- Enables true O(1) operations (no need to load/parse entire canvas)
- Each shape has unique ID: `shape-{timestamp}-{random}`

#### Edit Flow (Prevents Conflicts)
1. User starts dragging → `startEditingShape()` locks shape in RTDB
2. During drag → `updateShapeTemporary()` writes to RTDB (throttled)
3. End drag → `finishEditingShape()` commits to Firestore, clears RTDB

#### Lock TTL & Heartbeat
- Locks store `lockedBy` and `lockedAt`
- Heartbeat updates `lockedAt` every ~4s while editing
- Client prunes locks older than 15s when receiving lock snapshots

#### State Merging
- Canvas renders merged state: Firestore shapes + RTDB active edits
- Local user's edits bypass RTDB updates (prevents hitching)
- Other users' RTDB updates show in real-time

#### Batch Operations (Performance Optimization)
Firestore batch commits dramatically improve performance for bulk operations:

**Batch Create Pattern**:
- Used for: paste, duplicate, bulk add operations
- Collects all shapes into array → single `batchCreateShapes()` call
- Firestore `writeBatch()` commits all creates in 1 transaction
- Limit: 500 operations per batch (auto-chunks if needed)
- Result: 1 network call instead of N individual calls

**Batch Update Pattern**:
- Used for: multi-drag completion, arrow keys, layer management
- Collects all updates as `{id, updates}` array → single `batchUpdateShapes()` call
- Firestore `writeBatch()` commits all updates in 1 transaction
- Limit: 500 operations per batch (auto-chunks if needed)
- Result: 1 network call instead of N individual calls

**Combined RTDB + Firestore Batching**:
- Multi-selection transforms use both:
  1. RTDB batch update (live preview for other users)
  2. Firestore batch update (persistent storage)
  3. Total: 2 network calls instead of 2N calls

**Performance Gains**:
- 50 shapes pasted: 50 calls → 1 call = **98% reduction**
- 20 shapes moved: 40 calls → 2 calls = **95% reduction**
- Sub-200ms operations instead of multi-second lag

#### Optimistic UI Pattern
Eliminates perceived lag by showing changes immediately before server confirmation:

**Pattern Flow**:
1. User action (paste/duplicate)
2. Generate shape IDs immediately
3. Add to `optimisticShapes` state → **instant render**
4. Send batch to Firestore in background
5. Firestore confirms → shapes added to `firestoreShapes`
6. Merge logic filters out confirmed optimistic shapes
7. User sees seamless transition (optimistic → confirmed)

**Benefits**:
- Zero perceived lag (shapes appear instantly)
- Firestore confirmation happens in background
- Automatic sync when confirmed
- Graceful handling of failures (optimistic shapes persist until confirmed)

**Used For**:
- Paste operations (any size)
- Duplicate operations (any size)

**Not Used For** (intentionally):
- Multi-drag completion (needs real-time preview via RTDB)
- Single shape edits (fast enough without optimization)
- Deletes (instant via Firestore listener)

#### Loading Indicators
Smart loading state for large batch operations:

**When Shown**:
- Operations with > 20 shapes
- Paste, duplicate, future bulk operations

**UI Details**:
- Centered modal with spinner
- Operation name and count
- "This will only take a moment" subtext
- Non-blocking (user can still see canvas)
- Auto-dismisses on completion

**Combined with Optimistic UI**:
- Shapes appear instantly (optimistic)
- Loading indicator shows while Firestore confirms
- Best of both worlds: instant feedback + progress awareness

## Component Relationships

```
App.jsx
├── AuthProvider (context)
│   └── Provides: currentUser, signIn, signOut
│   └── AppContent
│       ├── Navbar
│       │   ├── Profile dropdown (photo, logout)
│       │   └── Online users toggle
│       ├── PresenceList (conditional)
│       │   └── Shows active users with colors
│       ├── CanvasProvider (context) ← ONLY wraps Canvas component
│       │   └── Provides: shapes, scale, position, add/update/delete functions
│       │   └── Canvas
│       │       ├── Stage (Konva)
│       │       │   ├── Background layer
│       │       │   ├── Shapes layer (viewport culled, with locks/transforms)
│       │       │   └── Cursors layer
│       │       ├── CanvasToolbar (left side)
│       │       ├── StylePanel (right side)
│       │       ├── CanvasControls (bottom-left)
│       │       ├── CanvasHelpOverlay
│       │       └── BatchOperationIndicator
│       └── ReconnectModal (conditional)
```

### Architecture Principles

**1. Context Scoping**:
- `AuthProvider` wraps entire app (auth needed everywhere)
- `CanvasProvider` wraps **ONLY Canvas component** (shapes only needed in canvas)
- Prevents unnecessary initialization of canvas data for navbar/modals

**2. Component Isolation**:
- Canvas is self-contained and reusable
- Navbar/modals independent of canvas state
- Clean separation enables multiple canvases pattern

**3. Lazy Initialization**:
- Canvas data loads only when Canvas component mounts
- Navbar renders immediately (no waiting for Firestore)
- Progressive enhancement: UI first, heavy data second

## Design Patterns in Use

### Context Pattern
- `AuthContext`: Manages authentication state globally
- `CanvasContext`: Manages canvas state, shapes, and operations

### Custom Hooks
- `useAuth`: Wraps AuthContext for components
- `usePresence`: Manages user presence and online status
- `useCursors`: Tracks and updates cursor positions

### Service Layer
All Firebase operations isolated in service files:
- `auth.js`: Sign in/out, profile updates
- `shapes.js`: Firestore shape CRUD
- `realtimeShapes.js`: RTDB operations (cursors, locks, active edits)
- `presence.js`: User presence tracking

### Optimistic UI Updates
- Konva handles local drag immediately (no network lag)
- RTDB sends throttled updates to other users
- Firestore commit happens on drag end

### Interaction Rules
- Space + drag always pans; while held, shapes are non-interactive (no drag/transform)
- Zoom requires Ctrl/⌘ + scroll to avoid accidental zooming
- Hand cursor (grab/grabbing) displays when holding Space for visual feedback

### Text Editing Pattern
**Creation Flow**:
1. Click text tool → click canvas → empty text shape created
2. Text editor opens immediately (styled textarea overlay)
3. User types content
4. Save (blur/Ctrl+Enter) → persists to Firestore → switches to select tool
5. Cancel (Esc) or empty → shape auto-deletes

**Editing Flow**:
1. Double-click text shape → opens inline editor
2. Textarea matches all formatting (font, alignment, bold, italic, underline)
3. Delete/Backspace keys edit text (don't delete shape)
4. Save or cancel → returns to canvas view

**Formatting Storage**:
- `fontSize`: number (8-512)
- `fontStyle`: 'normal' | 'bold' | 'italic' | 'bold italic'
- `textDecoration`: '' | 'underline'
- `align`: 'left' | 'center' | 'right'
- All persist to Firestore and sync via RTDB during edits

### Text Resizing Policy
- Font size changes derive from height (scaleY) during transforms
- Konva Text uses `wrap="word"`, `lineHeight=1.2`, small `padding`
- HTML textarea overlay uses stage absolute transform for screen mapping and rotates around center for alignment

### Rotation Sync Pattern
- **Pure rotation** (no scale): Only `rotation` sent to RTDB
- **Resize**: Sends x, y, width, height, rotation
- Prevents coordinate "jumps" for remote viewers during rotation
- Rotation merges from RTDB for live collaboration

### Presence & Idle Detection Pattern
**Session Tracking**:
- Each user has presence record at `/sessions/{canvasId}/{userId}`
- Schema includes: `displayName`, `cursorColor`, `cursorX`, `cursorY`, `lastSeen`, `lastActivity`, `sessionStart`

**Three-Tiered Timeout Strategy**:
1. **Idle Detection** (5 minutes no mouse movement)
   - Calculates `timeSinceActivity` from `lastActivity` timestamp
   - Sets `isIdle` flag for UI rendering
   - Visual indicators: yellow dot, grayed text, reduced opacity
   - User remains in session list

2. **Tab-Focused Heartbeat** (30 seconds)
   - Updates `lastSeen` while tab is visible
   - Uses Visibility API to detect tab focus
   - Stops when hidden (bandwidth optimization)
   - Restarts immediately on focus

3. **Stale Session** (1 hour)
   - Compares current time with `sessionStart`
   - Triggers reconnect modal on interaction
   - Forces page reload for fresh session

**Presence Terminology**:
- **Active**: Users with mouse activity in last 5 minutes (navbar count)
- **Connected Sessions**: All users including idle (presence list total)
- Distinguishes between active participation and open connections

