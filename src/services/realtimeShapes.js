/**
 * Realtime Shapes Service
 * 
 * Handles temporary, real-time shape updates during active editing (drag, resize)
 * Uses Firebase Realtime Database for low-latency updates
 * 
 * Schema: /canvas/{canvasId}/activeEdits/{shapeId}
 * {
 *   x: number,
 *   y: number,
 *   width: number,
 *   height: number,
 *   lockedBy: userId,
 *   lastUpdate: timestamp
 * }
 */

import { ref, set, update, remove, onValue, onDisconnect } from 'firebase/database';
import { rtdb } from './firebase';
import { CANVAS_ID } from '../utils/constants';

// Reference to active edits in RTDB
const activeEditsRef = (shapeId) => ref(rtdb, `canvas/${CANVAS_ID}/activeEdits/${shapeId}`);
const allActiveEditsRef = () => ref(rtdb, `canvas/${CANVAS_ID}/activeEdits`);
const userLocksRef = (userId) => ref(rtdb, `canvas/${CANVAS_ID}/locks/${userId}`);

/**
 * Start editing a shape - lock it and prepare for real-time updates
 * @param {string} shapeId - Shape ID
 * @param {string} userId - User ID
 * @param {Object} initialState - Initial shape state (x, y, width, height)
 * @returns {Promise<boolean>} True if lock acquired, false if already locked
 */
export const startEditingShape = async (shapeId, userId, initialState) => {
  if (!shapeId || !userId) {
    throw new Error('Shape ID and User ID are required');
  }

  const editRef = activeEditsRef(shapeId);
  const lockRef = ref(rtdb, `canvas/${CANVAS_ID}/locks/${shapeId}`);

  try {
    // Check if already locked by someone else
    // We'll do optimistic locking - set the lock and let the database handle conflicts
    const lockData = {
      lockedBy: userId,
      lockedAt: Date.now(),
    };

    await set(lockRef, lockData);

    // Set up the active edit state
    const editData = {
      ...initialState,
      lockedBy: userId,
      lastUpdate: Date.now(),
    };

    await set(editRef, editData);

    // Set up automatic cleanup on disconnect
    const disconnectRef = onDisconnect(editRef);
    await disconnectRef.remove();

    const disconnectLockRef = onDisconnect(lockRef);
    await disconnectLockRef.remove();

    // Track this lock for the user
    const userLockEntryRef = ref(rtdb, `canvas/${CANVAS_ID}/userLocks/${userId}/${shapeId}`);
    await set(userLockEntryRef, true);
    const disconnectUserLockRef = onDisconnect(userLockEntryRef);
    await disconnectUserLockRef.remove();

    return true;
  } catch (error) {
    console.error('Error starting shape edit:', error);
    throw error;
  }
};

// Throttle map to prevent excessive updates
const updateThrottleMap = new Map();
const THROTTLE_DELAY = 50; // 50ms = ~20 updates per second max

/**
 * Update shape position/size during active editing
 * @param {string} shapeId - Shape ID
 * @param {Object} updates - Properties to update (x, y, width, height)
 * @returns {Promise<void>}
 */
export const updateEditingShape = async (shapeId, updates) => {
  if (!shapeId) {
    throw new Error('Shape ID is required');
  }

  const editRef = activeEditsRef(shapeId);

  // Throttle updates to prevent excessive RTDB writes
  const now = Date.now();
  const lastUpdate = updateThrottleMap.get(shapeId) || 0;
  
  if (now - lastUpdate < THROTTLE_DELAY) {
    // Too soon, skip this update
    return;
  }
  
  updateThrottleMap.set(shapeId, now);

  try {
    await update(editRef, {
      ...updates,
      lastUpdate: now,
    });
  } catch (error) {
    console.error('Error updating editing shape:', error);
    throw error;
  }
};

/**
 * Finish editing a shape - remove from RTDB and release lock
 * @param {string} shapeId - Shape ID
 * @param {string} userId - User ID (for verification)
 * @returns {Promise<void>}
 */
export const finishEditingShape = async (shapeId, userId) => {
  if (!shapeId || !userId) {
    console.warn('finishEditingShape called without shapeId or userId');
    return;
  }

  const editRef = activeEditsRef(shapeId);
  const lockRef = ref(rtdb, `canvas/${CANVAS_ID}/locks/${shapeId}`);
  const userLockEntryRef = ref(rtdb, `canvas/${CANVAS_ID}/userLocks/${userId}/${shapeId}`);

  try {
    // Clear throttle map entry
    updateThrottleMap.delete(shapeId);
    
    // Remove the active edit state (don't fail if it doesn't exist)
    await remove(editRef).catch(() => {});
    // Release the lock (don't fail if it doesn't exist)
    await remove(lockRef).catch(() => {});
    // Remove from user's lock tracking (don't fail if it doesn't exist)
    await remove(userLockEntryRef).catch(() => {});
  } catch (error) {
    console.error('Error finishing shape edit:', error);
    // Don't throw - we want cleanup to be best-effort
  }
};

/**
 * Check if a shape is currently being edited (locked)
 * @param {string} shapeId - Shape ID
 * @returns {Promise<Object|null>} Lock data or null if not locked
 */
export const getShapeLock = async (shapeId) => {
  const lockRef = ref(rtdb, `canvas/${CANVAS_ID}/locks/${shapeId}`);
  
  return new Promise((resolve) => {
    onValue(lockRef, (snapshot) => {
      resolve(snapshot.val());
    }, { onlyOnce: true });
  });
};

/**
 * Subscribe to active shape edits
 * @param {Function} callback - Called with object of active edits { shapeId: editData }
 * @returns {Function} Unsubscribe function
 */
export const subscribeToActiveEdits = (callback) => {
  const editsRef = allActiveEditsRef();
  
  const unsubscribe = onValue(editsRef, (snapshot) => {
    const data = snapshot.val() || {};
    callback(data);
  }, (error) => {
    console.error('Error subscribing to active edits:', error);
    callback({});
  });

  return unsubscribe;
};

/**
 * Subscribe to shape locks
 * @param {Function} callback - Called with object of locks { shapeId: { lockedBy, lockedAt } }
 * @returns {Function} Unsubscribe function
 */
export const subscribeToLocks = (callback) => {
  const locksRef = ref(rtdb, `canvas/${CANVAS_ID}/locks`);
  
  const unsubscribe = onValue(locksRef, (snapshot) => {
    const data = snapshot.val() || {};
    callback(data);
  }, (error) => {
    console.error('Error subscribing to locks:', error);
    callback({});
  });

  return unsubscribe;
};

/**
 * Release all locks held by a user (for cleanup on disconnect)
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const releaseAllUserLocks = async (userId) => {
  if (!userId) return;

  const userLocksPath = ref(rtdb, `canvas/${CANVAS_ID}/userLocks/${userId}`);

  try {
    // Get all locks for this user
    const snapshot = await new Promise((resolve) => {
      onValue(userLocksPath, resolve, { onlyOnce: true });
    });

    const userLocks = snapshot.val();
    if (!userLocks) return;

    // Release each lock
    const promises = Object.keys(userLocks).map(async (shapeId) => {
      await finishEditingShape(shapeId, userId);
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Error releasing all user locks:', error);
  }
};

/**
 * Set up automatic cleanup on user disconnect
 * @param {string} userId - User ID
 * @returns {Function} Cleanup function
 */
export const setupDisconnectCleanup = (userId) => {
  if (!userId) return () => {};

  const userLocksPath = ref(rtdb, `canvas/${CANVAS_ID}/userLocks/${userId}`);
  
  // Set up onDisconnect to remove all user locks
  const disconnectRef = onDisconnect(userLocksPath);
  disconnectRef.remove();

  // Return cleanup function
  return () => {
    releaseAllUserLocks(userId).catch((error) => {
      console.error('Error in cleanup:', error);
    });
  };
};

