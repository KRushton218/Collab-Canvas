/**
 * Shapes Service - O(1) Performance
 * 
 * Uses 1 document per shape for true O(1) operations
 * No more reading/writing entire shape arrays!
 * 
 * Schema: /shapes/{shapeId}
 * {
 *   id: string,
 *   canvasId: string,
 *   x: number,
 *   y: number,
 *   width: number,
 *   height: number,
 *   fill: string,
 *   type: string,
 *   createdAt: ISO timestamp,
 *   updatedAt: ISO timestamp,
 *   createdBy: userId
 * }
 */

import { 
  doc, 
  getDoc, 
  setDoc,
  updateDoc, 
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot 
} from 'firebase/firestore';
import { CANVAS_ID } from '../utils/constants';
import { db } from './firebase';

// Collection reference
const shapesCollection = collection(db, 'shapes');

/**
 * Load all shapes for the current canvas
 * @returns {Promise<Array>} Array of shapes
 */
export const loadShapes = async () => {
  try {
    // Query all shapes for this canvas
    const q = query(shapesCollection, where('canvasId', '==', CANVAS_ID));
    
    return new Promise((resolve, reject) => {
      // Use onSnapshot with onlyOnce pattern for initial load
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const shapes = snapshot.docs.map(doc => {
            const data = doc.data();
            // Ensure fill is always a valid string (fix for old data or missing fill)
            return {
              ...data,
              fill: (typeof data.fill === 'string' && data.fill) ? data.fill : '#cccccc'
            };
          });
          unsubscribe(); // Clean up immediately
          resolve(shapes);
        },
        (error) => {
          console.error('Error loading shapes:', error);
          unsubscribe();
          reject(error);
        }
      );
    });
  } catch (error) {
    console.error('Error loading shapes:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time shape updates for the current canvas
 * @param {Function} callback - Called with updated shapes array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToShapes = (callback) => {
  const q = query(shapesCollection, where('canvasId', '==', CANVAS_ID));
  
  return onSnapshot(
    q,
    (snapshot) => {
      const shapes = snapshot.docs.map(doc => {
        const data = doc.data();
        // Ensure fill is always a valid string (fix for old data or missing fill)
        return {
          ...data,
          fill: (typeof data.fill === 'string' && data.fill) ? data.fill : '#cccccc'
        };
      });
      callback(shapes);
    },
    (error) => {
      console.error('Error subscribing to shapes:', error);
      callback([]);
    }
  );
};

/**
 * Create a new shape
 * O(1) operation - only creates one document!
 * @param {Object} shapeData - Shape properties (x, y, width, height, fill, type, createdBy)
 * @returns {Promise<string>} The new shape ID
 */
export const createShape = async (shapeData) => {
  try {
    const newShape = {
      id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      canvasId: CANVAS_ID,
      type: shapeData.type || 'rectangle',
      x: shapeData.x,
      y: shapeData.y,
      width: shapeData.width,
      height: shapeData.height,
      fill: shapeData.fill || '#cccccc', // Ensure fill is always a string
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: shapeData.createdBy || null,
    };

    // Create document with shape ID as document ID
    const shapeRef = doc(db, 'shapes', newShape.id);
    await setDoc(shapeRef, newShape);

    return newShape.id;
  } catch (error) {
    console.error('Error creating shape:', error);
    throw error;
  }
};

/**
 * Update an existing shape
 * O(1) operation - only touches one document!
 * @param {string} shapeId - Shape ID to update
 * @param {Object} updates - Properties to update
 * @returns {Promise<void>}
 */
export const updateShape = async (shapeId, updates) => {
  try {
    const shapeRef = doc(db, 'shapes', shapeId);
    
    // Check if document exists first (optional, for better error messages)
    const docSnap = await getDoc(shapeRef);
    if (!docSnap.exists()) {
      throw new Error(`Shape ${shapeId} does not exist`);
    }

    // Update only this shape - O(1) operation!
    await updateDoc(shapeRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating shape:', error);
    throw error;
  }
};

/**
 * Delete a shape
 * O(1) operation - only touches one document!
 * @param {string} shapeId - Shape ID to delete
 * @returns {Promise<void>}
 */
export const deleteShape = async (shapeId) => {
  try {
    const shapeRef = doc(db, 'shapes', shapeId);
    await deleteDoc(shapeRef);
  } catch (error) {
    console.error('Error deleting shape:', error);
    throw error;
  }
};

/**
 * Get a single shape by ID
 * @param {string} shapeId - Shape ID
 * @returns {Promise<Object|null>} Shape data or null if not found
 */
export const getShape = async (shapeId) => {
  try {
    const shapeRef = doc(db, 'shapes', shapeId);
    const docSnap = await getDoc(shapeRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting shape:', error);
    throw error;
  }
};

/**
 * DEPRECATED - Lock management has been moved to realtimeShapes.js
 * Locks are now managed in RTDB for real-time performance
 * Use startEditingShape/finishEditingShape from realtimeShapes.js instead
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
