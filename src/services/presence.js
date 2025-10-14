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
 *   lastSeen: timestamp
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

  console.log('[Presence] Setting user online:', { userId, displayName, color });

  const userPresenceRef = ref(rtdb, `sessions/${CANVAS_ID}/${userId}`);
  
  const presenceData = {
    displayName: displayName || 'Anonymous',
    cursorColor: color,
    cursorX: 0,
    cursorY: 0,
    lastSeen: serverTimestamp(),
  };

  try {
    // Set user as online
    await set(userPresenceRef, presenceData);
    console.log('[Presence] User set online successfully');
    
    // Set up automatic cleanup on disconnect
    const disconnectRef = onDisconnect(userPresenceRef);
    await disconnectRef.remove();
    
    return true;
  } catch (error) {
    console.error('[Presence] Error setting user online:', error);
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
  
  console.log('[Presence] Subscribing to presence updates at:', `sessions/${CANVAS_ID}`);
  
  const unsubscribe = onValue(sessionsRef, (snapshot) => {
    const data = snapshot.val();
    
    console.log('[Presence] Received presence update:', data);
    
    if (!data) {
      console.log('[Presence] No users online');
      callback([]);
      return;
    }
    
    // Convert object to array of users
    const onlineUsers = Object.entries(data).map(([userId, userData]) => ({
      userId,
      displayName: userData.displayName || 'Anonymous',
      cursorColor: userData.cursorColor,
      cursorX: userData.cursorX || 0,
      cursorY: userData.cursorY || 0,
      lastSeen: userData.lastSeen,
    }));
    
    console.log('[Presence] Online users:', onlineUsers.length, onlineUsers);
    callback(onlineUsers);
  }, (error) => {
    console.error('[Presence] Error subscribing to presence:', error);
    callback([]);
  });
  
  return unsubscribe;
};

/**
 * Update cursor position for presence (also used by cursor tracking)
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
      lastSeen: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating cursor position:', error);
  }
};

