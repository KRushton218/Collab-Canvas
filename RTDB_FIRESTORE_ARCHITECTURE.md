# RTDB + Firestore Hybrid Architecture

## Overview

This document describes the hybrid architecture implemented for the Collab-Canvas application, where Firebase Realtime Database (RTDB) handles temporary, real-time updates during active editing, and Firestore serves as the persistent storage layer.

## Architecture Goals

1. **Lower latency** for real-time collaboration during drag/resize operations
2. **Reduced Firestore costs** by minimizing writes during active editing
3. **Better separation of concerns** between ephemeral and persistent data
4. **Smoother user experience** with real-time position updates

## Data Storage Strategy

### Firestore (Persistent Storage)

**Path**: `/canvas/{canvasId}`

**Purpose**: Persistent, committed canvas state

**Contains**:
- Final shape positions and properties
- Shape metadata (createdAt, type, fill color, etc.)
- Only written when editing is complete (drag/transform end)

**Schema**:
```javascript
{
  shapes: [
    {
      id: "shape-123",
      type: "rectangle",
      x: 100,
      y: 200,
      width: 150,
      height: 100,
      fill: "#cccccc",
      createdAt: "2025-10-13T..."
    }
  ],
  lastModified: "2025-10-13T..."
}
```

### RTDB (Temporary Storage)

**Paths**:
- `/canvas/{canvasId}/activeEdits/{shapeId}` - Temporary shape positions during editing
- `/canvas/{canvasId}/locks/{shapeId}` - Shape locks
- `/canvas/{canvasId}/userLocks/{userId}` - Track which shapes each user has locked

**Purpose**: Real-time, temporary state during active editing

**Contains**:
- Live position/size updates during drag/resize
- Shape locks (who has what locked)
- Cleared automatically when editing completes or user disconnects

**Schema**:
```javascript
// Active edits
{
  "shape-123": {
    x: 105,
    y: 207,
    width: 150,
    height: 100,
    lockedBy: "user-456",
    lastUpdate: 1697207000000
  }
}

// Locks
{
  "shape-123": {
    lockedBy: "user-456",
    lockedAt: 1697207000000
  }
}

// User locks (for cleanup)
{
  "user-456": {
    "shape-123": true,
    "shape-789": true
  }
}
```

## User Flow

### Starting to Edit a Shape (Drag/Transform Start)

1. User starts dragging or transforming a shape
2. `startEditingShape()` is called:
   - Attempts to acquire lock in RTDB at `/locks/{shapeId}`
   - Copies current shape state from Firestore to RTDB at `/activeEdits/{shapeId}`
   - Sets up automatic cleanup on disconnect
   - Returns success/failure

### During Active Editing (Drag/Transform Move)

1. User continues dragging/resizing
2. `updateShapeTemporary()` is called frequently:
   - Updates only RTDB at `/activeEdits/{shapeId}`
   - Low latency updates for real-time collaboration
   - No Firestore writes

### Finishing Edit (Drag/Transform End)

1. User releases mouse (ends drag/transform)
2. `finishEditingShape()` is called:
   - Commits final state to Firestore (persistent)
   - Removes data from RTDB `/activeEdits/{shapeId}`
   - Releases lock from RTDB `/locks/{shapeId}`
   - Cleans up user's lock tracking

## Rendering Strategy

The `CanvasContext` subscribes to both Firestore and RTDB, then merges the data:

```javascript
// Firestore base data (persistent)
const firestoreShapes = [{ id: "shape-123", x: 100, y: 200, ... }];

// RTDB temporary edits
const activeEdits = { "shape-123": { x: 105, y: 207 } };

// RTDB locks
const locks = { "shape-123": { lockedBy: "user-456" } };

// Merged result for rendering
const shapes = firestoreShapes.map(shape => {
  const activeEdit = activeEdits[shape.id];
  
  // If being actively edited, use RTDB data
  if (activeEdit) {
    return { ...shape, ...activeEdit };
  }
  
  // Otherwise use Firestore data + lock state
  const lock = locks[shape.id];
  return { ...shape, lockedBy: lock?.lockedBy || null };
});
```

## Cleanup Mechanisms

### 1. User Disconnect (Automatic)

Firebase RTDB's `onDisconnect()` automatically removes:
- Active edits at `/activeEdits/{shapeId}`
- Locks at `/locks/{shapeId}`
- User's lock tracking at `/userLocks/{userId}`

### 2. Component Unmount

Canvas component cleanup effect finishes any active editing sessions:
```javascript
useEffect(() => {
  return () => {
    editingShapes.forEach(shapeId => {
      finishEditingShape(shapeId);
    });
  };
}, [editingShapes]);
```

### 3. Deselect Shape

When user clicks away or presses Escape:
```javascript
const deselectShape = async () => {
  if (selectedId) {
    await finishEditingShape(selectedId);
  }
  setSelectedId(null);
};
```

## Security Rules

### RTDB Rules (`database.rules.json`)

```json
{
  "rules": {
    "canvas": {
      "$canvasId": {
        ".read": "auth != null",
        "activeEdits": {
          "$shapeId": {
            ".write": "auth != null"
          }
        },
        "locks": {
          "$shapeId": {
            ".write": "auth != null"
          }
        },
        "userLocks": {
          "$userId": {
            ".write": "auth != null && auth.uid == $userId"
          }
        }
      }
    }
  }
}
```

## Key Files

### Services

- **`src/services/realtimeShapes.js`** - NEW: RTDB operations for temporary data
  - `startEditingShape()` - Lock and copy to RTDB
  - `updateEditingShape()` - Update position/size in RTDB
  - `finishEditingShape()` - Commit to Firestore and clear RTDB
  - `subscribeToActiveEdits()` - Listen to RTDB edits
  - `subscribeToLocks()` - Listen to RTDB locks
  - `setupDisconnectCleanup()` - Auto-cleanup on disconnect

- **`src/services/shapes.js`** - UPDATED: Firestore operations (persistent)
  - Removed lock-related Firestore operations
  - Updated helper functions to work with RTDB lock data
  - `loadShapes()` - Load from Firestore
  - `subscribeToShapes()` - Listen to Firestore changes
  - `createShape()`, `updateShape()`, `deleteShape()` - Firestore CRUD

- **`src/services/canvas.js`** - UPDATED: Re-exports both services

### Contexts

- **`src/contexts/CanvasContext.jsx`** - UPDATED: Manages data merging
  - Subscribes to both Firestore and RTDB
  - Merges data for rendering
  - Provides editing functions to components

### Components

- **`src/components/Canvas/Canvas.jsx`** - UPDATED: Uses new flow
  - `onDragStart` → `startEditingShape()`
  - `onDragMove` → `updateShapeTemporary()`
  - `onDragEnd` → `finishEditingShape()`
  - Similar pattern for transform operations

## Benefits

✅ **Performance**: Lower latency for real-time updates (RTDB is faster than Firestore)

✅ **Cost**: Reduced Firestore writes (only one write per edit session vs. continuous writes)

✅ **UX**: Smoother real-time collaboration with instant position updates

✅ **Reliability**: Automatic cleanup on disconnect prevents stale locks

✅ **Scalability**: RTDB handles high-frequency updates better than Firestore

## Trade-offs

⚠️ **Complexity**: More moving parts to manage and debug

⚠️ **Consistency**: Temporary state in RTDB needs careful synchronization

⚠️ **Testing**: Requires mocking both Firestore and RTDB

## Future Improvements

1. **Throttling**: Add throttling to `updateShapeTemporary()` to reduce RTDB writes
2. **Conflict Resolution**: Handle edge cases where multiple users try to edit simultaneously
3. **Offline Support**: Handle network disconnects more gracefully
4. **Performance Monitoring**: Add metrics to track Firestore vs RTDB performance
5. **Batch Operations**: Batch multiple shape updates for efficiency

## Testing

Run tests with:
```bash
npm test
```

Tests updated:
- `tests/unit/services/shapes.test.js` - Updated for new lock signature

Integration testing should use Firebase emulators to test both Firestore and RTDB.

## Deployment Notes

1. Deploy new RTDB security rules: `firebase deploy --only database`
2. Existing Firestore data is compatible (lockedBy field is simply ignored)
3. No data migration required

