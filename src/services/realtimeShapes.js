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
const lockRefFor = (shapeId) => ref(rtdb, `canvas/${CANVAS_ID}/locks/${shapeId}`);
const userLockEntryRefFor = (userId, shapeId) => ref(rtdb, `canvas/${CANVAS_ID}/userLocks/${userId}/${shapeId}`);

// Lock TTL/Heartbeat settings
const LOCK_MAX_LIFE_MS = 30000; // Locks auto-expire after 30s without heartbeat (increased from 15s)
const LOCK_HEARTBEAT_INTERVAL_MS = 10000; // Heartbeat every 10s while editing (reduced frequency from 4s)

// Track lock heartbeat intervals per-shape to clear on finish
const lockHeartbeatIntervals = new Map();

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
  const lockRef = lockRefFor(shapeId);

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
    const userLockEntryRef = userLockEntryRefFor(userId, shapeId);
    await set(userLockEntryRef, true);
    const disconnectUserLockRef = onDisconnect(userLockEntryRef);
    await disconnectUserLockRef.remove();

    // Start heartbeat to keep lock alive while editing
    if (lockHeartbeatIntervals.has(shapeId)) {
      clearInterval(lockHeartbeatIntervals.get(shapeId));
    }
    const intervalId = setInterval(async () => {
      try {
        await update(lockRef, { lockedAt: Date.now() });
      } catch (_) {
        // Best-effort heartbeat
      }
    }, LOCK_HEARTBEAT_INTERVAL_MS);
    lockHeartbeatIntervals.set(shapeId, intervalId);

    return true;
  } catch (error) {
    console.error('Error starting shape edit:', error);
    throw error;
  }
};

// Throttle map to prevent excessive updates
const updateThrottleMap = new Map();
const THROTTLE_DELAY = 16; // 16ms = ~60 updates per second for smoother viewing

/**
 * Update shape position/size during active editing
 * @param {string} shapeId - Shape ID
 * @param {Object} updates - Properties to update (x, y, width, height)
 * @param {boolean} forceUpdate - If true, bypass throttle (for final updates)
 * @returns {Promise<void>}
 */
export const updateEditingShape = async (shapeId, updates, forceUpdate = false) => {
  if (!shapeId) {
    throw new Error('Shape ID is required');
  }

  const editRef = activeEditsRef(shapeId);

  // Throttle updates to prevent excessive RTDB writes (unless forced)
  if (!forceUpdate) {
    const now = Date.now();
    const lastUpdate = updateThrottleMap.get(shapeId) || 0;
    
    if (now - lastUpdate < THROTTLE_DELAY) {
      // Too soon, skip this update
      return;
    }
    
    updateThrottleMap.set(shapeId, now);
  }

  try {
    await update(editRef, {
      ...updates,
      lastUpdate: Date.now(),
    });
    // Refresh lock heartbeat timestamp on any edit
    const lockRef = lockRefFor(shapeId);
    await update(lockRef, { lockedAt: Date.now() }).catch(() => {});
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
  const lockRef = lockRefFor(shapeId);
  const userLockEntryRef = userLockEntryRefFor(userId, shapeId);

  try {
    // Clear throttle map entry
    updateThrottleMap.delete(shapeId);
    
    // Release the lock first so other clients stop showing lock UI
    // Keep activeEdits briefly so they continue to see final RTDB position
    await remove(lockRef).catch(() => {});
    // Now remove the active edit state (don't fail if it doesn't exist)
    await remove(editRef).catch(() => {});
    // Remove from user's lock tracking (don't fail if it doesn't exist)
    await remove(userLockEntryRef).catch(() => {});

    // Stop heartbeat interval if running
    if (lockHeartbeatIntervals.has(shapeId)) {
      clearInterval(lockHeartbeatIntervals.get(shapeId));
      lockHeartbeatIntervals.delete(shapeId);
    }
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
  const lockRef = lockRefFor(shapeId);
  
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
    const now = Date.now();
    const valid = {};
    const expiredIds = [];
    for (const [shapeId, lock] of Object.entries(data)) {
      const lockedAt = typeof lock?.lockedAt === 'number' ? lock.lockedAt : 0;
      if (now - lockedAt <= LOCK_MAX_LIFE_MS) {
        valid[shapeId] = lock;
      } else {
        expiredIds.push(shapeId);
      }
    }
    // Best-effort cleanup of expired locks
    expiredIds.forEach((shapeId) => {
      const lRef = ref(rtdb, `canvas/${CANVAS_ID}/locks/${shapeId}`);
      remove(lRef).catch(() => {});
    });
    callback(valid);
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

/**
 * Acquire a lock for a shape WITHOUT creating an active edit entry.
 * Used for selection-based locking. Maintains heartbeat to keep TTL alive.
 * @param {string} shapeId
 * @param {string} userId
 * @returns {Promise<boolean>} true if acquired, false if locked by someone else
 */
export const acquireLock = async (shapeId, userId) => {
  if (!shapeId || !userId) return false;
  const lRef = lockRefFor(shapeId);
  const userEntryRef = userLockEntryRefFor(userId, shapeId);
  try {
    const snapshot = await new Promise((resolve) => {
      onValue(lRef, resolve, { onlyOnce: true });
    });
    const existing = snapshot.val();
    if (existing && existing.lockedBy && existing.lockedBy !== userId) {
      return false;
    }
    await set(lRef, { lockedBy: userId, lockedAt: Date.now() });
    const disconnectLockRef = onDisconnect(lRef);
    await disconnectLockRef.remove();
    await set(userEntryRef, true);
    const disconnectUserLockRef = onDisconnect(userEntryRef);
    await disconnectUserLockRef.remove();
    if (lockHeartbeatIntervals.has(shapeId)) {
      clearInterval(lockHeartbeatIntervals.get(shapeId));
    }
    const intervalId = setInterval(async () => {
      try {
        await update(lRef, { lockedAt: Date.now() });
      } catch (_) {}
    }, LOCK_HEARTBEAT_INTERVAL_MS);
    lockHeartbeatIntervals.set(shapeId, intervalId);
    return true;
  } catch (e) {
    console.error('Error acquiring lock:', e);
    return false;
  }
};

// Shared heartbeat interval for ALL locks (instead of one per shape)
let sharedHeartbeatInterval = null;
const activeLocks = new Set(); // Track all active locks

/**
 * Start shared heartbeat interval if not already running
 * This is much more efficient than one interval per shape
 */
const startSharedHeartbeat = () => {
  if (sharedHeartbeatInterval) return; // Already running
  
  sharedHeartbeatInterval = setInterval(async () => {
    if (activeLocks.size === 0) {
      // No locks, stop heartbeat
      clearInterval(sharedHeartbeatInterval);
      sharedHeartbeatInterval = null;
      return;
    }
    
    try {
      // Batch update all lock timestamps in ONE RTDB write
      const lockHeartbeatUpdate = {};
      const now = Date.now();
      for (const shapeId of activeLocks) {
        lockHeartbeatUpdate[`${shapeId}/lockedAt`] = now;
      }
      const locksRef = ref(rtdb, `canvas/${CANVAS_ID}/locks`);
      await update(locksRef, lockHeartbeatUpdate).catch(() => {});
    } catch (error) {
      // Best-effort heartbeat
      console.error('Heartbeat error:', error);
    }
  }, LOCK_HEARTBEAT_INTERVAL_MS);
};

/**
 * Acquire locks for multiple shapes - OPTIMIZED for large selections
 * @param {string[]} shapeIds
 * @param {string} userId
 * @returns {Promise<{acquired: string[], failed: string[]}>}
 */
export const acquireLocks = async (shapeIds, userId) => {
  if (!shapeIds || shapeIds.length === 0) {
    return { acquired: [], failed: [] };
  }
  
  const acquired = [];
  const failed = [];
  const now = Date.now();
  
  // OPTIMIZATION: Batch read all existing locks in ONE query
  const locksRef = ref(rtdb, `canvas/${CANVAS_ID}/locks`);
  const locksSnapshot = await new Promise((resolve) => {
    onValue(locksRef, resolve, { onlyOnce: true });
  });
  const existingLocks = locksSnapshot.val() || {};
  
  // Check which shapes can be locked
  const lockableShapes = [];
  for (const id of shapeIds) {
    const existing = existingLocks[id];
    if (existing && existing.lockedBy && existing.lockedBy !== userId) {
      failed.push(id); // Locked by someone else
    } else {
      lockableShapes.push(id);
    }
  }
  
  if (lockableShapes.length === 0) {
    return { acquired, failed };
  }
  
  // OPTIMIZATION: Batch write all locks in ONE multi-path update
  const batchLockUpdate = {};
  const batchUserLockUpdate = {};
  
  for (const id of lockableShapes) {
    batchLockUpdate[`${id}/lockedBy`] = userId;
    batchLockUpdate[`${id}/lockedAt`] = now;
    batchUserLockUpdate[`${id}`] = true;
  }
  
  try {
    // Single RTDB write for all locks
    await update(locksRef, batchLockUpdate);
    
    // Single RTDB write for all user lock entries
    const userLocksPath = ref(rtdb, `canvas/${CANVAS_ID}/userLocks/${userId}`);
    await update(userLocksPath, batchUserLockUpdate);
    
    // Set up onDisconnect for batch (one per user, not per shape)
    const disconnectLocksRef = onDisconnect(locksRef);
    for (const id of lockableShapes) {
      disconnectLocksRef.update({ [id]: null }).catch(() => {});
    }
    
    const disconnectUserLocksRef = onDisconnect(userLocksPath);
    disconnectUserLocksRef.remove().catch(() => {});
    
    // Add to active locks for shared heartbeat
    for (const id of lockableShapes) {
      activeLocks.add(id);
      // Stop individual intervals if they exist
      if (lockHeartbeatIntervals.has(id)) {
        clearInterval(lockHeartbeatIntervals.get(id));
        lockHeartbeatIntervals.delete(id);
      }
    }
    
    // Start shared heartbeat
    startSharedHeartbeat();
    
    acquired.push(...lockableShapes);
  } catch (error) {
    console.error('Error acquiring locks in batch:', error);
    failed.push(...lockableShapes);
  }
  
  return { acquired, failed };
};

/**
 * Release a selection-based lock for a shape (does not touch active edits).
 * @param {string} shapeId
 * @param {string} userId
 */
export const releaseLock = async (shapeId, userId) => {
  if (!shapeId || !userId) return;
  const lRef = lockRefFor(shapeId);
  const userEntryRef = userLockEntryRefFor(userId, shapeId);
  try {
    await remove(lRef).catch(() => {});
    await remove(userEntryRef).catch(() => {});
  } finally {
    // Remove from shared heartbeat tracking
    activeLocks.delete(shapeId);
    
    // Clean up individual interval if it exists (legacy)
    if (lockHeartbeatIntervals.has(shapeId)) {
      clearInterval(lockHeartbeatIntervals.get(shapeId));
      lockHeartbeatIntervals.delete(shapeId);
    }
  }
};

/**
 * Release locks for multiple shapes - OPTIMIZED for large batches
 * @param {string[]} shapeIds
 * @param {string} userId
 */
export const releaseLocks = async (shapeIds, userId) => {
  if (!shapeIds || shapeIds.length === 0) return;
  
  // OPTIMIZATION: Batch remove all locks in ONE multi-path update
  const locksRef = ref(rtdb, `canvas/${CANVAS_ID}/locks`);
  const userLocksPath = ref(rtdb, `canvas/${CANVAS_ID}/userLocks/${userId}`);
  
  const batchLockRemove = {};
  const batchUserLockRemove = {};
  
  for (const id of shapeIds) {
    batchLockRemove[id] = null; // Setting to null removes the key
    batchUserLockRemove[id] = null;
    
    // Remove from shared heartbeat tracking
    activeLocks.delete(id);
    
    // Clean up individual interval if it exists (legacy)
    if (lockHeartbeatIntervals.has(id)) {
      clearInterval(lockHeartbeatIntervals.get(id));
      lockHeartbeatIntervals.delete(id);
    }
  }
  
  try {
    // Single RTDB write to remove all locks
    await update(locksRef, batchLockRemove).catch(() => {});
    await update(userLocksPath, batchUserLockRemove).catch(() => {});
  } catch (error) {
    console.error('Error releasing locks in batch:', error);
  }
};

/**
 * Clear activeEdit entry for a shape (keep its lock).
 * @param {string} shapeId
 */
export const clearActiveEdit = async (shapeId) => {
  if (!shapeId) return;
  const editRef = activeEditsRef(shapeId);
  try {
    updateThrottleMap.delete(shapeId);
    await remove(editRef).catch(() => {});
  } catch (e) {
    console.error('Error clearing active edit:', e);
  }
};

/**
 * Clear activeEdit entries for multiple shapes (keep their locks) - OPTIMIZED
 * @param {string[]} shapeIds
 */
export const clearActiveEdits = async (shapeIds) => {
  if (!shapeIds || shapeIds.length === 0) return;
  
  // OPTIMIZATION: Batch clear all active edits in ONE multi-path update
  const editsRef = allActiveEditsRef();
  const batchClearEdits = {};
  
  for (const id of shapeIds) {
    batchClearEdits[id] = null; // Setting to null removes the key
    updateThrottleMap.delete(id); // Clean up throttle map
  }
  
  try {
    await update(editsRef, batchClearEdits).catch(() => {});
  } catch (error) {
    console.error('Error clearing active edits in batch:', error);
  }
};

/**
 * Start editing multiple shapes (acquire locks on all) - OPTIMIZED for large selections
 * Used for multi-selection transforms
 * @param {string[]} shapeIds - Array of shape IDs
 * @param {string} userId - User ID
 * @param {Object} initialStates - Map of shapeId to initial state
 * @returns {Promise<{success: boolean, lockedShapes: string[], failedShapes: string[]}>}
 */
export const startEditingMultipleShapes = async (shapeIds, userId, initialStates) => {
  if (!shapeIds || shapeIds.length === 0 || !userId) {
    throw new Error('Shape IDs and User ID are required');
  }

  try {
    // OPTIMIZATION: Single RTDB read to check ALL locks at once
    const locksRef = ref(rtdb, `canvas/${CANVAS_ID}/locks`);
    const locksSnapshot = await new Promise((resolve) => {
      onValue(locksRef, resolve, { onlyOnce: true });
    });
    const existingLocks = locksSnapshot.val() || {};

    // Check if any shapes are locked by another user
    const failedShapes = [];
    const editableShapes = [];
    
    for (const shapeId of shapeIds) {
      const existingLock = existingLocks[shapeId];
      if (existingLock && existingLock.lockedBy && existingLock.lockedBy !== userId) {
        failedShapes.push(shapeId);
      } else {
        editableShapes.push(shapeId);
      }
    }

    // If ANY shape is locked by another user, fail the entire operation
    if (failedShapes.length > 0) {
      return {
        success: false,
        lockedShapes: [],
        failedShapes,
      };
    }

    // OPTIMIZATION: Batch create ALL active edits in ONE multi-path update
    const now = Date.now();
    const batchActiveEdits = {};
    
    for (const shapeId of editableShapes) {
      const initialState = initialStates[shapeId] || {};
      batchActiveEdits[`${shapeId}/x`] = initialState.x;
      batchActiveEdits[`${shapeId}/y`] = initialState.y;
      batchActiveEdits[`${shapeId}/width`] = initialState.width;
      batchActiveEdits[`${shapeId}/height`] = initialState.height;
      batchActiveEdits[`${shapeId}/lockedBy`] = userId;
      batchActiveEdits[`${shapeId}/lastUpdate`] = now;
    }

    // Single RTDB write for all active edits
    const editsRef = allActiveEditsRef();
    await update(editsRef, batchActiveEdits);

    // Set up onDisconnect for all active edits (batch per user, not per shape)
    const disconnectRef = onDisconnect(editsRef);
    for (const shapeId of editableShapes) {
      disconnectRef.update({ [shapeId]: null }).catch(() => {});
    }

    return {
      success: true,
      lockedShapes: editableShapes,
      failedShapes: [],
    };
  } catch (error) {
    console.error('Error starting multi-shape edit:', error);
    throw error;
  }
};

/**
 * Update multiple shapes in RTDB with a single batched write
 * @param {Object} updates - Map of shapeId to update object { x, y, width, height, etc }
 * @param {boolean} forceUpdate - If true, bypass throttle
 * @returns {Promise<void>}
 */
export const updateEditingShapesBatch = async (updates, forceUpdate = false) => {
  if (!updates || Object.keys(updates).length === 0) {
    return;
  }

  const now = Date.now();
  
  // Throttle check - use 'batch' as the key
  if (!forceUpdate) {
    const lastUpdate = updateThrottleMap.get('batch') || 0;
    if (now - lastUpdate < THROTTLE_DELAY) {
      return; // Too soon, skip this update
    }
    updateThrottleMap.set('batch', now);
  }

  try {
    // Build multi-path update object for RTDB
    // This allows us to update multiple shapes in ONE write operation
    const multiPathUpdate = {};
    
    for (const [shapeId, shapeUpdates] of Object.entries(updates)) {
      for (const [key, value] of Object.entries(shapeUpdates)) {
        multiPathUpdate[`${shapeId}/${key}`] = value;
      }
      // Add timestamp to each shape
      multiPathUpdate[`${shapeId}/lastUpdate`] = now;
    }

    // Single RTDB write for all shapes
    const editsRef = allActiveEditsRef();
    await update(editsRef, multiPathUpdate);

    // Heartbeat for all corresponding locks in one write
    const lockHeartbeatUpdate = {};
    for (const shapeId of Object.keys(updates)) {
      lockHeartbeatUpdate[`${shapeId}/lockedAt`] = now;
    }
    const locksRef = ref(rtdb, `canvas/${CANVAS_ID}/locks`);
    await update(locksRef, lockHeartbeatUpdate).catch(() => {});
  } catch (error) {
    console.error('Error batch updating editing shapes:', error);
    throw error;
  }
};

/**
 * Finish editing multiple shapes (commit to Firestore and release locks) - OPTIMIZED
 * @param {string[]} shapeIds - Array of shape IDs
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const finishEditingMultipleShapes = async (shapeIds, userId) => {
  if (!shapeIds || shapeIds.length === 0 || !userId) {
    return;
  }

  // Clear batch throttle entry
  updateThrottleMap.delete('batch');
  
  // Clear individual throttle entries
  for (const shapeId of shapeIds) {
    updateThrottleMap.delete(shapeId);
  }

  // OPTIMIZATION: Batch clear all active edits in ONE multi-path update
  const editsRef = allActiveEditsRef();
  const batchClearEdits = {};
  
  for (const shapeId of shapeIds) {
    batchClearEdits[shapeId] = null; // Setting to null removes the key
  }

  try {
    // Single RTDB write to remove all active edits
    await update(editsRef, batchClearEdits).catch(() => {});
  } catch (error) {
    console.error('Error clearing active edits in batch:', error);
  }
  
  // Note: Locks are NOT released here - that's handled by releaseLocks() separately
  // This allows shapes to stay selected (with locks) after drag completes
};

