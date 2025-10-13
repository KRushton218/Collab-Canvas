import { doc, getDoc, updateDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, onDisconnect, set } from 'firebase/database';
import { CANVAS_ID } from '../utils/constants';
import { db, rtdb } from './firebase';

// Canvas document reference - single shared canvas for MVP
const canvasDocRef = doc(db, 'canvas', CANVAS_ID);

/**
 * Load shapes from Firestore
 * @returns {Promise<Array>} Array of shapes
 */
export const loadShapes = async () => {
  try {
    const docSnap = await getDoc(canvasDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.shapes || [];
    } else {
      // Initialize empty canvas if it doesn't exist
      await setDoc(canvasDocRef, {
        shapes: [],
        lastModified: new Date().toISOString(),
      });
      return [];
    }
  } catch (error) {
    console.error('Error loading shapes:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time shape updates
 * @param {Function} callback - Called with updated shapes array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToShapes = (callback) => {
  return onSnapshot(
    canvasDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback(data.shapes || []);
      } else {
        callback([]);
      }
    },
    (error) => {
      console.error('Error subscribing to shapes:', error);
    }
  );
};

/**
 * Create a new shape in Firestore
 * @param {Object} shapeData - Shape properties (x, y, width, height, fill, type)
 * @returns {Promise<string>} The new shape ID
 */
export const createShape = async (shapeData) => {
  try {
    const newShape = {
      id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: shapeData.type || 'rectangle',
      x: shapeData.x,
      y: shapeData.y,
      width: shapeData.width,
      height: shapeData.height,
      fill: shapeData.fill,
      lockedBy: null,
      createdAt: new Date().toISOString(),
    };

    // Get current shapes and add the new one
    const docSnap = await getDoc(canvasDocRef);
    const currentShapes = docSnap.exists() ? (docSnap.data().shapes || []) : [];

    await updateDoc(canvasDocRef, {
      shapes: [...currentShapes, newShape],
      lastModified: new Date().toISOString(),
    });

    return newShape.id;
  } catch (error) {
    console.error('Error creating shape:', error);
    throw error;
  }
};

/**
 * Update an existing shape in Firestore
 * @param {string} shapeId - Shape ID to update
 * @param {Object} updates - Properties to update
 * @returns {Promise<void>}
 */
export const updateShape = async (shapeId, updates) => {
  try {
    const docSnap = await getDoc(canvasDocRef);
    if (!docSnap.exists()) {
      throw new Error('Canvas document does not exist');
    }

    const currentShapes = docSnap.data().shapes || [];
    const updatedShapes = currentShapes.map((shape) =>
      shape.id === shapeId ? { ...shape, ...updates } : shape
    );

    await updateDoc(canvasDocRef, {
      shapes: updatedShapes,
      lastModified: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating shape:', error);
    throw error;
  }
};

/**
 * Delete a shape from Firestore
 * @param {string} shapeId - Shape ID to delete
 * @returns {Promise<void>}
 */
export const deleteShape = async (shapeId) => {
  try {
    const docSnap = await getDoc(canvasDocRef);
    if (!docSnap.exists()) {
      throw new Error('Canvas document does not exist');
    }

    const currentShapes = docSnap.data().shapes || [];
    const filteredShapes = currentShapes.filter((shape) => shape.id !== shapeId);

    await updateDoc(canvasDocRef, {
      shapes: filteredShapes,
      lastModified: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error deleting shape:', error);
    throw error;
  }
};

/**
 * Lock a shape for exclusive editing
 * @param {string} shapeId - Shape ID to lock
 * @param {string} userId - User ID who is locking the shape
 * @returns {Promise<boolean>} True if lock was successful, false if already locked
 */
export const lockShape = async (shapeId, userId) => {
  try {
    const docSnap = await getDoc(canvasDocRef);
    if (!docSnap.exists()) {
      throw new Error('Canvas document does not exist');
    }

    const currentShapes = docSnap.data().shapes || [];
    const shape = currentShapes.find((s) => s.id === shapeId);

    if (!shape) {
      throw new Error('Shape not found');
    }

    // Check if already locked by someone else
    if (shape.lockedBy && shape.lockedBy !== userId) {
      return false; // Already locked by another user
    }

    // Lock the shape
    const updatedShapes = currentShapes.map((s) =>
      s.id === shapeId ? { ...s, lockedBy: userId } : s
    );

    await updateDoc(canvasDocRef, {
      shapes: updatedShapes,
      lastModified: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error('Error locking shape:', error);
    throw error;
  }
};

/**
 * Unlock a shape
 * @param {string} shapeId - Shape ID to unlock
 * @param {string} userId - User ID who is unlocking (must match lockedBy)
 * @returns {Promise<void>}
 */
export const unlockShape = async (shapeId, userId) => {
  try {
    const docSnap = await getDoc(canvasDocRef);
    if (!docSnap.exists()) {
      throw new Error('Canvas document does not exist');
    }

    const currentShapes = docSnap.data().shapes || [];
    const updatedShapes = currentShapes.map((s) => {
      // Only unlock if it's locked by this user
      if (s.id === shapeId && s.lockedBy === userId) {
        return { ...s, lockedBy: null };
      }
      return s;
    });

    await updateDoc(canvasDocRef, {
      shapes: updatedShapes,
      lastModified: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error unlocking shape:', error);
    throw error;
  }
};

/**
 * Unlock all shapes locked by a specific user (for disconnect handling)
 * @param {string} userId - User ID whose locks should be released
 * @returns {Promise<void>}
 */
export const unlockAllUserShapes = async (userId) => {
  try {
    const docSnap = await getDoc(canvasDocRef);
    if (!docSnap.exists()) {
      return;
    }

    const currentShapes = docSnap.data().shapes || [];
    const updatedShapes = currentShapes.map((shape) => {
      if (shape.lockedBy === userId) {
        return { ...shape, lockedBy: null };
      }
      return shape;
    });

    await updateDoc(canvasDocRef, {
      shapes: updatedShapes,
      lastModified: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error unlocking all user shapes:', error);
    throw error;
  }
};

/**
 * Set up automatic unlock on disconnect for a user
 * Uses Realtime Database to track when user disconnects
 * @param {string} userId - User ID
 * @returns {Function} Cleanup function
 */
export const setupDisconnectHandler = (userId) => {
  if (!userId) return () => {};

  const userPresenceRef = ref(rtdb, `sessions/${CANVAS_ID}/${userId}/connected`);
  
  // Set user as connected
  set(userPresenceRef, true);

  // Set up onDisconnect to mark user as disconnected
  const disconnectRef = onDisconnect(userPresenceRef);
  disconnectRef.set(false);

  // Handle page unload/close
  const handleBeforeUnload = () => {
    // Synchronously unlock all shapes (best effort)
    unlockAllUserShapes(userId).catch((error) => {
      console.error('Error unlocking shapes on unload:', error);
    });
    // Set presence to false
    set(userPresenceRef, false).catch((error) => {
      console.error('Error setting presence on unload:', error);
    });
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  // Return cleanup function
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    set(userPresenceRef, false).catch((error) => {
      console.error('Error setting presence:', error);
    });
    unlockAllUserShapes(userId).catch((error) => {
      console.error('Error unlocking shapes:', error);
    });
  };
};

/**
 * Check if a shape is locked by another user
 * @param {Object} shape - Shape object
 * @param {string} currentUserId - Current user's ID
 * @returns {boolean} True if locked by another user
 */
export const isShapeLockedByOther = (shape, currentUserId) => {
  return !!(shape.lockedBy && shape.lockedBy !== currentUserId);
};

/**
 * Get the user who has locked a shape
 * @param {Object} shape - Shape object
 * @returns {string|null} User ID or null if not locked
 */
export const getShapeLockOwner = (shape) => {
  return shape.lockedBy || null;
};
