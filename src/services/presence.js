/**
 * Presence Service - Manages user presence and online status
 * Uses Firebase Realtime Database for real-time presence tracking
 * 
 * Schema: /sessions/{canvasId}/{userId}
 * {
 *   displayName: string,
 *   cursorColor: string,
 *   cursorX: number,
 *   cursorY: number,
 *   lastSeen: timestamp (heartbeat, tab-focused),
 *   lastActivity: timestamp (mouse movement),
 *   sessionStart: timestamp (for 1-hour timeout detection)
 * }
 */

import { rtdb } from './firebase';
import { 
  ref, 
  set, 
  update,
  onValue, 
  onDisconnect, 
  serverTimestamp,
  remove 
} from 'firebase/database';

const CANVAS_ID = 'global-canvas-v1';

// Timeout thresholds
export const IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
export const STALE_SESSION_MS = 60 * 60 * 1000; // 1 hour
export const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 seconds

/**
 * Set user as online and establish presence
 * @param {string} userId - User ID
 * @param {string} displayName - User display name
 * @param {string} color - User color for cursor and presence
 */
export const setUserOnline = async (userId, displayName, color) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  // presence logs removed

  const userPresenceRef = ref(rtdb, `sessions/${CANVAS_ID}/${userId}`);
  
  const now = Date.now();
  const presenceData = {
    displayName: displayName || 'Anonymous',
    cursorColor: color,
    cursorX: 0,
    cursorY: 0,
    lastSeen: serverTimestamp(),
    lastActivity: now,
    sessionStart: now,
  };

  try {
    // Set user as online
    await set(userPresenceRef, presenceData);
    // presence logs removed
    
    // Set up automatic cleanup on disconnect
    const disconnectRef = onDisconnect(userPresenceRef);
    await disconnectRef.remove();
    
    return true;
  } catch (error) {
    // silence presence error logs
    throw error;
  }
};

/**
 * Set user as offline (manual)
 * @param {string} userId - User ID
 */
export const setUserOffline = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const userPresenceRef = ref(rtdb, `sessions/${CANVAS_ID}/${userId}`);
  
  try {
    await remove(userPresenceRef);
    return true;
  } catch (error) {
    console.error('Error setting user offline:', error);
    throw error;
  }
};

/**
 * Subscribe to presence changes
 * @param {Function} callback - Called with array of online users
 * @returns {Function} Unsubscribe function
 */
export const subscribeToPresence = (callback) => {
  const sessionsRef = ref(rtdb, `sessions/${CANVAS_ID}`);
  
  // presence logs removed
  
  const unsubscribe = onValue(sessionsRef, (snapshot) => {
    const data = snapshot.val();
    
    // presence logs removed
    
    if (!data) {
      // presence logs removed
      callback([]);
      return;
    }
    
    const now = Date.now();
    
    // Convert object to array of users
    const onlineUsers = Object.entries(data).map(([userId, userData]) => {
      const lastActivity = userData.lastActivity || userData.lastSeen || 0;
      const timeSinceActivity = now - lastActivity;
      const isIdle = timeSinceActivity > IDLE_THRESHOLD_MS;
      
      return {
        userId,
        displayName: userData.displayName || 'Anonymous',
        cursorColor: userData.cursorColor,
        cursorX: userData.cursorX || 0,
        cursorY: userData.cursorY || 0,
        lastSeen: userData.lastSeen,
        lastActivity: userData.lastActivity,
        sessionStart: userData.sessionStart,
        isIdle, // Flag for UI to show idle state
      };
    });
    
    // presence logs removed
    callback(onlineUsers);
  }, (error) => {
    // silence presence error logs
    callback([]);
  });
  
  return unsubscribe;
};

/**
 * Update cursor position for presence (also used by cursor tracking)
 * Also updates lastActivity to track mouse movement for idle detection
 * @param {string} userId - User ID
 * @param {number} x - Cursor X position
 * @param {number} y - Cursor Y position
 */
export const updateCursorPosition = async (userId, x, y) => {
  if (!userId) return;

  const userPresenceRef = ref(rtdb, `sessions/${CANVAS_ID}/${userId}`);
  
  try {
    // Use update() instead of set() to only update specific fields
    await update(userPresenceRef, {
      cursorX: x,
      cursorY: y,
      lastActivity: Date.now(), // Track mouse movement for idle detection
      lastSeen: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating cursor position:', error);
  }
};

/**
 * Send heartbeat to keep session alive (tab-focused)
 * Updates lastSeen without changing lastActivity
 * @param {string} userId - User ID
 */
export const sendHeartbeat = async (userId) => {
  if (!userId) return;

  const userPresenceRef = ref(rtdb, `sessions/${CANVAS_ID}/${userId}`);
  
  try {
    await update(userPresenceRef, {
      lastSeen: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error sending heartbeat:', error);
  }
};

/**
 * Check if current session is stale (older than 1 hour)
 * @param {number} sessionStart - Session start timestamp
 * @returns {boolean} True if session is stale
 */
export const isSessionStale = (sessionStart) => {
  if (!sessionStart) return false;
  const now = Date.now();
  return (now - sessionStart) > STALE_SESSION_MS;
};

