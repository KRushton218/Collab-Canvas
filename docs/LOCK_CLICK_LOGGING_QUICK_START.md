# Lock Click Logging - Quick Start

## What's New?

When you click on a shape that's locked by another user, comprehensive lock details are automatically logged to your browser console.

## How to View Logs

1. **Open Browser Console**
   - Mac: `Cmd + Option + J`
   - Windows/Linux: `Ctrl + Shift + J`

2. **Look for 🔒 Locked Shape Events**
   - Search for "🔒" in the console
   - Or search for "LOCK_CLICK_EVENT"

## What Gets Logged

### Direct Click on Locked Shape

```
🔒 LOCKED SHAPE CLICK

Request Time: 2024-10-18T14:35:22.123Z

Shape: 
{
  id: "shape-123"
  type: "rectangle"
  x: 100
  y: 200
  width: 150
  height: 100
}

Locked By:
{
  user: "Alice"
  userId: "user-456"
  color: "#ff6b6b"
}

Lock Details:
{
  lockedAt: "2024-10-18T14:35:10.000Z"
  timeSinceLock: "12s"
  timeSinceLockMs: 12123
}
```

### What It Means

| Field | Meaning |
|-------|---------|
| **Request Time** | When you tried to click the shape |
| **shape.id** | Unique identifier for the shape |
| **shape.type** | Type of shape (rectangle, circle, line, text) |
| **shape.x, y** | Position on canvas |
| **shape.width, height** | Dimensions of shape |
| **Locked By** | Who is currently editing the shape |
| **lockedAt** | When they started editing |
| **timeSinceLock** | How long they've been editing (in seconds) |

## Example Scenarios

### Scenario 1: You want to edit a shape, but Alice is already editing it

**What happens:**
- You click on the shape
- Toast appears: "🔒 This shape is being edited by Alice"
- Console logs the lock details

**Log shows:**
- `lockedAt`: ~5 seconds ago
- `lockedBy`: Alice
- You can now see Alice's color and user ID

**Next steps:**
- Wait for Alice to finish (lock will be released when she does)
- Edit a different shape
- Ask Alice to finish

### Scenario 2: You try a rectangular selection over multiple shapes

**What happens:**
- You drag to select multiple shapes
- Some shapes are locked, so they're automatically excluded
- Console logs each locked shape encountered
- Event type: `rectangular_selection_attempted`

**Log shows:**
- Each locked shape separately
- Who locked each one
- When each lock was acquired

## Console Output Explained

### Styled Logs (with colors)
- **Red text** (🔒 header): The lock event itself
- **Indigo text** (labels): Context and metadata
- **Expandable objects**: Click to expand and see all details

### JSON Logs (for parsing)
- Format: `[LOCK_CLICK_EVENT] {...}`
- Machine-readable JSON format
- Good for log aggregation systems

## Practical Tips

### Finding Lock Issues

```javascript
// In console, filter for lock events:
// Go to console and type:
document.querySelectorAll('[role="gridcell"]') // to find logs in DevTools

// Or just search for "🔒" using Cmd+F in console
```

### Checking Lock Duration

When you see `timeSinceLock: "45s"`, it means the shape has been locked for 45 seconds. This helps you understand:
- Is someone just starting to edit (0-5s)?
- Are they in the middle of work (5-30s)?
- Have they forgotten about it (>30s)?

### User Colors

Each user has a unique color. The color shown in the lock log matches:
- The cursor color they see on canvas
- The lock border color on the shape
- Helps you identify who's working on what

## Common Questions

**Q: Why can't I click the shape?**  
A: Another user has it locked. Wait for them to finish editing.

**Q: How long will the lock last?**  
A: Check the `timeSinceLock` value. Locks auto-release after ~15 seconds of inactivity.

**Q: Who is Alice?**  
A: Look for that color on the canvas - you'll see their cursor with the lock color.

**Q: Can I force unlock?**  
A: No, for safety. But if they disconnect, their lock auto-releases.

**Q: Is this logged to a server?**  
A: Currently, no. Logs are only in your browser console. Future versions may include remote logging.

## For Developers

### Access Log Data Programmatically

```javascript
// In console:
window.lastLockLog = null;

// Intercept logs:
const originalLog = console.log;
console.log = function(...args) {
  if (typeof args[0] === 'string' && args[0].includes('LOCK_CLICK_EVENT')) {
    window.lastLockLog = JSON.parse(args[1].substring(18)); // Remove prefix
  }
  originalLog.apply(console, args);
};

// Then click a locked shape and:
console.log(window.lastLockLog); // See structured data
```

### Using the Logger Directly

```javascript
import { logLockedShapeClick } from '@/utils/lockClickLogger';

// Log a lock event manually:
logLockedShapeClick({
  shape: myShape,
  locks: currentLocks,
  lockOwnerInfo: {
    displayName: 'Alice',
    color: '#ff6b6b',
    uid: 'user-456',
  },
});
```

## Troubleshooting

### I don't see any logs

1. **Console not open?** Press Cmd+Option+J (Mac) or Ctrl+Shift+J (Windows)
2. **Nothing in console?** The shape might not actually be locked by someone else
3. **Still nothing?** Check:
   - Is the shape really locked? (Look for colored border)
   - Try clicking it again
   - Refresh the page and retry

### Logs are mixed with other messages

Use the console filter:
- Type "🔒" in the console filter box (top right)
- This shows only lock-related messages

## What's Logged

**Every time you click a locked shape:**
- ✅ Who locked it (name, ID, color)
- ✅ When it was locked (exact timestamp)
- ✅ How long it's been locked (duration)
- ✅ When you tried to click it (request time)
- ✅ What shape you clicked (ID, type, position, size)

**Every time you try rectangular selection with locked shapes:**
- ✅ Each locked shape encountered
- ✅ Who locked each one
- ✅ Lock timestamps for each

## Next Steps

- [Full Documentation](./LOCK_CLICK_LOGGING.md) - Complete API reference
- [System Patterns](../memory-bank/systemPatterns.md) - Architecture details
- [Lock Implementation](./SYNC_AND_PERFORMANCE_FIXES.md) - How locks work
