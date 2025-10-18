# Lock Click Logging

## Overview

When users click on locked objects in CollabCanvas, detailed logging is automatically triggered. This captures:
- **Who** locked the shape (user name, ID, color)
- **When** the shape was locked (timestamp with duration since lock)
- **When** the click was attempted (request timestamp)
- **What** shape was clicked (ID, type, coordinates, dimensions)

## Features

### 1. Direct Click on Locked Shape

When a user clicks on a shape that's currently locked by another user:

**Console Output**:
```
🔒 LOCKED SHAPE CLICK
  Request Time: 2024-10-18T14:35:22.123Z
  Shape: { id: 'shape-123', type: 'rectangle', x: 100, y: 200, width: 150, height: 100 }
  Locked By: 
    user: "Alice"
    userId: "user-456"
    color: "#ff6b6b"
  Lock Details:
    lockedAt: 2024-10-18T14:35:10.000Z
    timeSinceLock: 12s
    timeSinceLockMs: 12123
```

**JSON Log** (for aggregation):
```json
[LOCK_CLICK_EVENT] {
  "eventType": "click",
  "timestamp": 1729252522123,
  "requestTime": "2024-10-18T14:35:22.123Z",
  "shape": {
    "id": "shape-123",
    "type": "rectangle",
    "x": 100,
    "y": 200,
    "width": 150,
    "height": 100
  },
  "lock": {
    "lockedBy": "user-456",
    "lockedByUser": "Alice",
    "lockedByColor": "#ff6b6b",
    "lockedAt": "2024-10-18T14:35:10.000Z",
    "timeSinceLock": "12s",
    "timeSinceLockMs": 12123
  },
  "request": {
    "timestamp": 1729252522123,
    "iso": "2024-10-18T14:35:22.123Z"
  }
}
```

### 2. Rectangular Selection with Locked Shapes

When a user performs a rectangular selection and encounters locked shapes:

**Console Output**:
```
🔒 LOCKED SHAPE RECTANGULAR_SELECTION_ATTEMPTED
  Request Time: 2024-10-18T14:35:25.456Z
  Shape: { id: 'shape-789', type: 'circle', x: 300, y: 400, width: 100, height: 100 }
  Locked By: 
    user: "Bob"
    userId: "user-789"
    color: "#4ecdc4"
  Lock Details:
    lockedAt: 2024-10-18T14:34:50.000Z
    timeSinceLock: 35s
    timeSinceLockMs: 35456
```

Locked shapes are automatically filtered out and not included in the selection, but all attempts are logged for audit purposes.

## Log Data Structure

### Lock Details Object
```javascript
{
  timestamp: number,              // Unix timestamp in milliseconds
  requestTime: string,            // ISO format of request timestamp
  shape: {
    id: string,                   // Shape ID
    type: string,                 // Shape type (rectangle, circle, line, text)
    x: number,                    // X coordinate
    y: number,                    // Y coordinate
    width: number,                // Shape width
    height: number,               // Shape height
  },
  lock: {
    lockedBy: string,             // User ID who locked it
    lockedByUser: string,         // Display name of lock owner
    lockedByColor: string,        // Color associated with lock owner
    lockedAt: string,             // ISO format of when lock was acquired
    timeSinceLock: string,        // Human-readable duration (e.g., "12s")
    timeSinceLockMs: number,      // Milliseconds since lock
  },
  request: {
    timestamp: number,            // Unix milliseconds of click
    iso: string,                  // ISO format of click time
  }
}
```

## API Reference

### `logLockedShapeClick(params)`

Main function for logging a single locked shape click event.

**Parameters**:
```javascript
{
  shape: Object,                  // Shape object being clicked
  locks: Object,                  // Lock state from RTDB
  lockOwnerInfo: {               // Info about lock owner
    displayName: string,          // User's display name
    color: string,                // User's cursor color
    uid: string,                  // User's UID
  },
  eventType: string,              // Event type (default: 'click')
}
```

**Returns**: Log entry object or `null` if validation fails

**Example**:
```javascript
import { logLockedShapeClick } from '../../utils/lockClickLogger';

logLockedShapeClick({
  shape: {
    id: 'shape-123',
    type: 'rectangle',
    x: 100,
    y: 200,
    width: 150,
    height: 100,
  },
  locks: {
    'shape-123': {
      lockedBy: 'user-456',
      lockedAt: 1729252510000,
    }
  },
  lockOwnerInfo: {
    displayName: 'Alice',
    color: '#ff6b6b',
    uid: 'user-456',
  },
  eventType: 'click',
});
```

### `logMultipleLockedShapeClicks(params)`

Logs multiple locked shape click events in a single call.

**Parameters**:
```javascript
{
  shapeIds: Array<string>,        // Array of shape IDs clicked
  shapes: Object,                 // Map of shape ID to shape data
  locks: Object,                  // Lock state from RTDB
  usersInfo: Object,              // Map of user ID to user info
}
```

**Returns**: Array of log entries

### `logBatchLockedShapesAttempt(lockedShapes)`

Creates a summary log for batch lock operations.

**Parameters**:
```javascript
lockedShapes: Array<{
  shape: Object,                  // Shape object
  lockData: Object,               // Lock data
  lockOwner: Object,              // User info
}>
```

**Returns**: Summary object with grouped locks by user

**Example Output**:
```javascript
{
  timestamp: "2024-10-18T14:35:25.456Z",
  totalAttempted: 3,
  locksByUser: {
    "user-456": {
      userName: "Alice",
      shapeCount: 2,
      shapes: [
        { id: "shape-123", type: "rectangle" },
        { id: "shape-456", type: "circle" }
      ]
    },
    "user-789": {
      userName: "Bob",
      shapeCount: 1,
      shapes: [
        { id: "shape-789", type: "line" }
      ]
    }
  }
}
```

## Implementation Details

### Integration Points

1. **Direct Click** (`Canvas.jsx` - `onSelect` handler)
   - Triggered when user clicks on a locked shape
   - Logs immediately before showing toast notification
   - Event type: `'click'`

2. **Rectangular Selection** (`Canvas.jsx` - `handleMouseUp`)
   - Triggered after drag-to-select on canvas
   - Only logs locked shapes that were filtered out
   - Event type: `'rectangular_selection_attempted'`

### Console Styling

- Uses CSS styling in console.group/log for visual distinction
- Lock-related logs appear in red (`#ff6b6b`)
- Metadata appears in indigo (`#6366f1`)
- Lock icon emoji (🔒) for easy identification

### JSON Logging

In addition to styled console output, all locks are also logged as JSON strings with the prefix `[LOCK_CLICK_EVENT]` for potential log aggregation systems to parse programmatically.

## Use Cases

### Debugging
- Understand why a shape isn't selectable
- Identify lock conflicts in multi-user scenarios
- Track lock duration and lifecycle

### Auditing
- Monitor which shapes users attempt to interact with
- Track collaboration patterns
- Identify frequently contested shapes

### Analytics
- Measure lock conflict frequency
- Analyze user interaction patterns
- Identify UX pain points (frequently locked shapes)

### Performance Monitoring
- Track time spent waiting for locks to release
- Identify bottlenecks in collaborative workflows

## Future Enhancements

1. **Remote Logging**: Send log events to server for centralized audit trail
2. **Log Filtering**: Add debug level configuration
3. **Performance Metrics**: Include Firestore/RTDB latency
4. **User Notifications**: Optional in-app notifications for lock conflicts
5. **Lock Visualization**: Timeline/graph of lock activity

## Example Workflow

```
User Alice is editing shape-123 (acquired lock)
↓
User Bob clicks on shape-123 (while locked)
↓
Logger detects lock by "user-456" (Alice)
↓
Logs to console with timestamp
↓
Toast notification: "🔒 This shape is being edited by Alice"
↓
Bob is prevented from selecting
↓
Lock details available in browser console for debugging
```

## Troubleshooting

### Log not appearing?

1. Check browser DevTools console (Cmd+Option+J on Mac)
2. Ensure developer tools are open (some browsers lazy-load logs)
3. Search for "🔒" or "LOCK_CLICK_EVENT" in console
4. Check that the shape is actually locked by another user

### Information missing?

- Verify `lockOwnerInfo` includes `displayName`, `color`, and `uid`
- Check that `shape` object has all required fields
- Ensure `locks` state is up to date from RTDB subscription

## Related Files

- `src/utils/lockClickLogger.js` - Logger implementation
- `src/components/Canvas/Canvas.jsx` - Integration points
- `docs/SYNC_AND_PERFORMANCE_FIXES.md` - Lock mechanics
- `memory-bank/systemPatterns.md` - Architecture overview
