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
   - User presence tracking (`/presence/{userId}`)
   - Active shape edits during drag/resize (`/activeEdits/{shapeId}`)
   - Shape locks (`/locks/{shapeId}`)

### Key Technical Decisions

#### Shape Management
- **One document per shape** instead of array-based storage
- Enables true O(1) operations (no need to load/parse entire canvas)
- Each shape has unique ID: `shape-{timestamp}-{random}`

#### Edit Flow (Prevents Conflicts)
1. User starts dragging → `startEditingShape()` locks shape in RTDB
2. During drag → `updateShapeTemporary()` writes to RTDB (throttled)
3. End drag → `finishEditingShape()` commits to Firestore, clears RTDB

#### State Merging
- Canvas renders merged state: Firestore shapes + RTDB active edits
- Local user's edits bypass RTDB updates (prevents hitching)
- Other users' RTDB updates show in real-time

## Component Relationships

```
App.jsx
├── AuthProvider (context)
│   └── Provides: currentUser, signIn, signOut
├── CanvasProvider (context)
│   └── Provides: shapes, scale, position, add/update/delete functions
├── Navbar
│   ├── Profile dropdown (photo, logout)
│   └── Online users toggle
├── PresenceList (conditional)
│   └── Shows active users with colors
└── Canvas
    ├── Stage (Konva)
    │   ├── Background layer
    │   ├── Shapes layer (with locks/transforms)
    │   └── Cursors layer
    ├── CanvasToolbar (left side)
    ├── CanvasControls (bottom-left)
    └── CanvasHelpOverlay
```

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

