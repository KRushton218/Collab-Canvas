# Presence Idle Detection & Session Cleanup

## Overview
Implemented a comprehensive "clean-up crew" system to handle idle users and stale sessions, preventing ghost users from appearing perpetually online.

## The Problem
Users who leave their tab open (especially on mobile) stay connected to Firebase indefinitely. The automatic `onDisconnect()` cleanup doesn't trigger if the tab remains open but inactive, causing them to appear online forever.

## The Solution

### Three-Tiered Timeout Strategy

#### Tier 1: Idle Detection (5 minutes no mouse movement)
- **Threshold**: 5 minutes without mouse movement
- **Behavior**: User appears as "idle" in presence list
- **Visual Indicators**:
  - Status dot changes from green to yellow/amber
  - Name text grayed out
  - Avatar opacity reduced to 50%
  - "(idle)" label displayed
- **Still tracked**: Yes, user remains in presence list
- **Cursor updates**: Stopped (saves bandwidth)

#### Tier 2: Extended Idle (15 minutes - future enhancement)
*Note: Currently not implemented separately - tab visibility already handles this*
- Would remove from presence list entirely if needed
- Current implementation relies on tab visibility + heartbeat

#### Tier 3: Stale Session (1 hour)
- **Threshold**: 1 hour since session start
- **Trigger**: User tries to interact (mouse/keyboard/touch)
- **Behavior**: Modal dialog forces reconnection
- **Action**: Page reload to establish fresh session

## Technical Implementation

### 1. Presence Service Updates (`presence.js`)

#### New Schema Fields
```javascript
{
  displayName: string,
  cursorColor: string,
  cursorX: number,
  cursorY: number,
  lastSeen: timestamp,      // Heartbeat (tab-focused)
  lastActivity: timestamp,  // Mouse movement
  sessionStart: timestamp   // For 24-hour timeout
}
```

#### New Constants
```javascript
IDLE_THRESHOLD_MS = 5 * 60 * 1000;        // 5 minutes
STALE_SESSION_MS = 60 * 60 * 1000;        // 1 hour
HEARTBEAT_INTERVAL_MS = 30 * 1000;        // 30 seconds
```

#### New Functions
- `sendHeartbeat(userId)`: Updates `lastSeen` while tab is focused
- `isSessionStale(sessionStart)`: Checks if session > 24 hours old
- Updated `updateCursorPosition()`: Now also updates `lastActivity`
- Updated `subscribeToPresence()`: Calculates `isIdle` flag for each user

### 2. Heartbeat System (`usePresence.js`)

#### Tab-Focused Heartbeat
```javascript
// Sends heartbeat every 30s while tab is visible
setInterval(() => {
  if (!document.hidden) {
    sendHeartbeat(userId);
  }
}, HEARTBEAT_INTERVAL_MS);
```

#### Visibility Change Handling
- Tab becomes visible → Immediate heartbeat + restart interval
- Tab becomes hidden → Stop heartbeat (save bandwidth)

#### Session Tracking
- Records `sessionStart` timestamp on initialization
- Exposes `isStale` boolean to detect 24-hour timeout

### 3. UI Components

#### PresenceList Updates
- **Idle users**: Yellow dot, grayed text, 50% opacity avatar
- **Active users**: Green dot, normal appearance
- **"(idle)" label**: Shown next to idle user names
- **Smooth transitions**: 0.3s opacity fade

#### ReconnectModal (new component)
- **Modern design**: Centered modal with backdrop blur
- **Warning icon**: Yellow circle with ⚠️ emoji
- **Clear message**: Explains 24-hour timeout
- **Single action**: "Refresh & Reconnect" button
- **Non-dismissible**: Must reconnect to continue
- **Reassuring**: "All your work is saved" message

### 4. App Integration

#### Stale Session Detection
```javascript
useEffect(() => {
  if (!isStale || !currentUser) return;

  const handleInteraction = () => {
    setShowReconnectModal(true);
  };

  // Listen for ANY interaction
  window.addEventListener('mousedown', handleInteraction);
  window.addEventListener('keydown', handleInteraction);
  window.addEventListener('touchstart', handleInteraction);
  
  // ... cleanup
}, [isStale, currentUser]);
```

#### Reconnection Handler
```javascript
const handleReconnect = () => {
  window.location.reload(); // Fresh session
};
```

## Benefits

### 1. Self-Healing
- No manual intervention needed
- Stale connections automatically filtered
- Works across all clients

### 2. Bandwidth Efficient
- Heartbeat stops when tab is hidden
- Idle users don't send cursor updates
- Minimal database writes (1 per 30s per active user)

### 3. User-Friendly
- Clear visual feedback for idle state
- Gentle reminder after 24 hours
- Non-disruptive for active users

### 4. Consistent with Lock TTL
- Uses same pattern as shape locks
- Familiar architecture
- Reuses constants and utilities

## Edge Cases Handled

### Mobile Browser Tab Switching
- Heartbeat stops when tab loses focus
- Restarts when user returns
- Prevents false "active" status

### Browser Sleep/Suspend
- No heartbeat during sleep = appears idle
- Automatic recovery on wake
- Session timeout after 1 hour

### Network Interruptions
- Firebase's `onDisconnect()` still works
- Heartbeat failures naturally lead to idle state
- Reconnect modal appears on interaction

### Multiple Tabs/Devices
- Each session tracked independently
- Separate `sessionStart` timestamps
- No interference between devices

## Testing the Feature

### Testing Idle State (5 min)
1. Open app and log in
2. Don't move mouse for 5+ minutes
3. Check presence list from another device
4. Should see "(idle)" label and yellow dot

### Testing Heartbeat
1. Open browser dev tools → Network tab
2. Filter for Firebase Realtime Database requests
3. Should see heartbeat updates every 30 seconds
4. Switch to another tab → heartbeat stops
5. Return to tab → heartbeat resumes immediately

### Testing 1-Hour Timeout
*Note: For quick testing, temporarily change `STALE_SESSION_MS` to 10 seconds*

```javascript
// In presence.js (temporary)
export const STALE_SESSION_MS = 10 * 1000; // 10 seconds for testing
```

1. Open app and wait 10 seconds
2. Click anywhere on canvas
3. Modal should appear
4. Click "Refresh & Reconnect"
5. Page reloads with fresh session

## Performance Impact

### Database Writes
- **Before**: Cursor updates only (varies by activity)
- **After**: +1 write per 30s per user (low overhead)
- **Idle users**: No cursor updates (saves writes)

### Memory
- Negligible: 1 interval timer + 3 event listeners per user
- Properly cleaned up on unmount

### UI Rendering
- Idle calculation done once per presence update
- Simple timestamp comparison (O(1))
- Smooth CSS transitions

## Future Enhancements

### Possible Additions
1. **Configurable thresholds**: Admin settings for timeout durations
2. **"Away" status**: Auto-status based on idle time
3. **Last seen timestamp**: Show "Last active 2 hours ago"
4. **Activity indicators**: Show what each user is doing
5. **Presence history**: Track who was online when

### Mobile Optimization
- Touch gestures for waking from idle
- More aggressive timeout on mobile networks
- "Wake on notification" system

## Files Modified

### New Files
- `src/components/Collaboration/ReconnectModal.jsx`
- `docs/PRESENCE_IDLE_AND_CLEANUP.md` (this file)

### Modified Files
- `src/services/presence.js` - Added heartbeat, timestamps, idle detection
- `src/hooks/usePresence.js` - Heartbeat system, visibility handling
- `src/components/Collaboration/PresenceList.jsx` - Idle visual indicators
- `src/App.jsx` - Stale session detection and modal integration

## Configuration

All timeout constants are exported from `presence.js` and can be adjusted:

```javascript
import { 
  IDLE_THRESHOLD_MS,      // 5 minutes
  STALE_SESSION_MS,       // 1 hour
  HEARTBEAT_INTERVAL_MS   // 30 seconds
} from './services/presence';
```

To change thresholds, edit these constants in `src/services/presence.js`.

