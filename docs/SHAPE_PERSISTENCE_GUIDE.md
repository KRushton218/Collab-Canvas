# Shape Persistence & Locking - Implementation Guide

## Overview

Shapes are now fully persistent in Firestore and include a collaborative locking system. This ensures:
- ✅ Shapes persist across page refreshes
- ✅ Shapes persist even when all users leave
- ✅ Real-time synchronization across multiple users
- ✅ Shape locking prevents conflicts when editing
- ✅ Auto-unlock when users disconnect

## Architecture

### Data Flow

```
User Action → CanvasContext → Canvas Service → Firestore
                    ↓                              ↓
                Updates                    Real-time Listener
                    ↓                              ↓
              Local State ← ← ← ← ← ← ← Updates All Clients
```

### Storage Structure

**Firestore (Persistent Data)**
- Collection: `canvas`
- Document: `global-canvas-v1`
- Structure:
  ```javascript
  {
    shapes: [
      {
        id: "shape-1234567890-abc123",
        type: "rectangle",
        x: 100,
        y: 200,
        width: 150,
        height: 100,
        fill: "#cccccc",
        lockedBy: null, // or userId when locked
        createdAt: "2025-10-13T12:00:00.000Z"
      }
    ],
    lastModified: "2025-10-13T12:00:00.000Z"
  }
  ```

**Realtime Database (Presence Data)**
- Path: `/sessions/global-canvas-v1/{userId}/connected`
- Used for disconnect detection

## Key Features

### 1. Shape Persistence

**How it works:**
- When you create a shape via the toolbar, it's saved to Firestore immediately
- All connected users see the shape in real-time via `onSnapshot` listener
- Shapes remain in Firestore even after all users disconnect
- On page load, shapes are loaded from Firestore

**API:**
```javascript
// Create a shape
await addShape({
  type: 'rectangle',
  x: 100,
  y: 200,
  width: 150,
  height: 100,
  fill: '#cccccc'
});

// Update a shape (e.g., after drag)
await updateShape(shapeId, { x: 150, y: 250 });

// Delete a shape
await deleteShape(shapeId);
```

### 2. Shape Locking

**How it works:**
- When a user clicks a shape, it automatically locks for that user
- Other users cannot edit locked shapes (dragging/resizing disabled)
- Locked shapes show a red dashed border to other users
- Selected shapes show a blue solid border to the owner

**Visual Indicators:**
- **Your selected shape**: Blue solid border
- **Shape locked by another user**: Red dashed border, 50% opacity
- **Unlocked shape**: No border

**Locking Rules:**
- Only one user can lock a shape at a time
- Locks are released when:
  - User deselects the shape (clicks background)
  - User selects a different shape
  - User closes the tab/browser
  - User's connection drops

### 3. Auto-Unlock on Disconnect

**Mechanisms:**
1. **beforeunload event**: Unlocks shapes when tab closes normally
2. **onDisconnect callback**: Firebase RTDB detects network failures
3. **Cleanup on unmount**: React cleanup functions handle component unmounting

**Code:**
```javascript
// Set up in CanvasContext
useEffect(() => {
  if (!currentUser) return;
  
  const cleanup = canvasService.setupDisconnectHandler(currentUser.uid);
  
  return () => {
    cleanup(); // Unlocks all user's shapes
  };
}, [currentUser]);
```

## Testing Checklist

### Basic Persistence
- [ ] Create a shape
- [ ] Refresh the page
- [ ] Verify the shape is still there
- [ ] Close all browser tabs
- [ ] Open the app again
- [ ] Verify the shape persists

### Multi-User Sync
- [ ] Open app in two browser windows (or incognito + regular)
- [ ] Log in as different users in each window
- [ ] Create a shape in window 1
- [ ] Verify it appears in window 2 immediately
- [ ] Drag the shape in window 1
- [ ] Verify position updates in window 2

### Shape Locking
- [ ] Open app in two windows with different users
- [ ] In window 1, click a shape to select it
- [ ] In window 2, try to click/drag that same shape
- [ ] Verify window 2 cannot interact with the locked shape
- [ ] Verify window 2 sees a red dashed border
- [ ] In window 1, click the background to deselect
- [ ] Verify window 2 can now interact with the shape

### Auto-Unlock
- [ ] Open app in two windows
- [ ] In window 1, select a shape (locks it)
- [ ] Close window 1 (without deselecting)
- [ ] In window 2, verify the shape is unlocked
- [ ] Verify window 2 can now interact with the shape

### Edge Cases
- [ ] Try to delete a shape locked by another user
- [ ] Verify you cannot delete it (console warning appears)
- [ ] Select shape A, then select shape B
- [ ] Verify shape A is automatically unlocked
- [ ] Create 10+ shapes
- [ ] Verify all sync correctly across users

## Implementation Details

### Files Modified/Created

**New Files:**
- `src/services/canvas.js` - Firestore CRUD operations and locking
- `tests/unit/services/canvas.test.js` - Unit tests for canvas service

**Modified Files:**
- `src/contexts/CanvasContext.jsx` - Integrated canvas service, added locking logic
- `src/components/Canvas/Canvas.jsx` - Added visual indicators for locked shapes

### Key Functions

**Canvas Service (`src/services/canvas.js`):**
- `loadShapes()` - Load initial shapes from Firestore
- `subscribeToShapes(callback)` - Real-time listener
- `createShape(shapeData)` - Create new shape
- `updateShape(shapeId, updates)` - Update existing shape
- `deleteShape(shapeId)` - Delete shape
- `lockShape(shapeId, userId)` - Lock shape for editing
- `unlockShape(shapeId, userId)` - Unlock shape
- `unlockAllUserShapes(userId)` - Unlock all of a user's shapes
- `setupDisconnectHandler(userId)` - Auto-unlock on disconnect
- `isShapeLockedByOther(shape, userId)` - Check lock status

**Canvas Context:**
- `selectShape(id)` - Select and lock a shape
- `deselectShape()` - Deselect and unlock current shape
- `addShape(shapeData)` - Create shape (now async)
- `updateShape(id, updates)` - Update shape (now async)
- `deleteShape(id)` - Delete shape (now async, checks lock)

## Performance Considerations

### Firestore Writes
- Shapes update on `onDragEnd`, not during drag (avoids excessive writes)
- Typical latency: ~100ms per operation
- Cost: Billed per document write (see Firestore pricing)

### Real-time Updates
- `onSnapshot` provides instant updates to all clients
- No polling required - true push notifications
- Bandwidth: Minimal, only changed data is transferred

### Optimization Tips
1. **Batch operations**: Group multiple shape updates when possible
2. **Debounce updates**: Consider debouncing rapid position changes
3. **Local optimistic updates**: Update UI immediately, sync to Firestore after

## Troubleshooting

### Shapes don't persist
- Check Firebase console: Firestore > canvas collection
- Verify environment variables in `.env` are correct
- Check browser console for Firestore errors
- Ensure Firestore rules allow reads/writes

### Locking doesn't work
- Verify both users are logged in
- Check that `currentUser.uid` is available
- Look for console errors about lock failures
- Verify Firestore rules allow updates to `lockedBy` field

### Shapes don't unlock on disconnect
- Check RTDB presence in Firebase console
- Verify `beforeunload` event is firing (add console.log)
- Check browser console for unlock errors
- Test with actual network disconnect (not just tab close)

## Future Enhancements

Potential improvements for the locking system:
1. **Lock timeout**: Auto-unlock after 5 minutes of inactivity
2. **Lock stealing**: Allow users to force-unlock after confirmation
3. **Lock indicators**: Show which user has locked a shape (name/color)
4. **Optimistic locking**: Use Firestore transactions for race condition handling
5. **Lock queue**: Allow users to request lock when shape becomes available

## Security Considerations

### Firestore Security Rules (Recommended)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Canvas documents
    match /canvas/{canvasId} {
      // Allow authenticated users to read
      allow read: if request.auth != null;
      
      // Allow authenticated users to write
      allow write: if request.auth != null;
      
      // TODO: Add more granular rules for shape locking
      // - Verify lockedBy matches request.auth.uid when updating
      // - Prevent users from unlocking other users' shapes
    }
  }
}
```

### RTDB Security Rules (Recommended)

```json
{
  "rules": {
    "sessions": {
      "$canvasId": {
        "$userId": {
          ".read": true,
          ".write": "$userId === auth.uid"
        }
      }
    }
  }
}
```

## Summary

The shape persistence and locking system is now fully functional. Shapes are stored in Firestore for permanent persistence, with real-time synchronization across all connected users. The locking system prevents editing conflicts and automatically releases locks when users disconnect.

All basic tests pass, and the implementation follows the architecture outlined in `architecture.md`.

