import { doc, getDoc, updateDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { CANVAS_ID } from '../utils/constants';
import { db } from './firebase';

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
 * DEPRECATED - Lock management has been moved to realtimeShapes.js
 * Locks are now managed in RTDB for real-time performance
 * Use startEditingShape/finishEditingShape from realtimeShapes.js instead
 * 
 * These functions are kept for backward compatibility but will be removed
 */

/**
 * Check if a shape is locked by another user
 * @param {Object} locks - Lock state from RTDB
 * @param {string} shapeId - Shape ID
 * @param {string} currentUserId - Current user's ID
 * @returns {boolean} True if locked by another user
 */
export const isShapeLockedByOther = (locks, shapeId, currentUserId) => {
  const lock = locks[shapeId];
  return !!(lock && lock.lockedBy && lock.lockedBy !== currentUserId);
};

/**
 * Get the user who has locked a shape
 * @param {Object} locks - Lock state from RTDB
 * @param {string} shapeId - Shape ID
 * @returns {string|null} User ID or null if not locked
 */
export const getShapeLockOwner = (locks, shapeId) => {
  const lock = locks[shapeId];
  return lock?.lockedBy || null;
};
