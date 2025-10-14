/**
 * Canvas Service
 * 
 * This file serves as a lightweight wrapper and re-export for canvas-related functionality.
 * 
 * - Persistent operations (Firestore): shapes.js
 * - Real-time operations (RTDB): realtimeShapes.js
 * 
 * This file is kept for backward compatibility and may contain canvas-specific utilities
 * in the future (e.g., canvas settings, viewport management, etc.)
 */

// Re-export persistent shape operations (Firestore)
export {
  loadShapes,
  subscribeToShapes,
  createShape,
  updateShape,
  deleteShape,
  isShapeLockedByOther,
  getShapeLockOwner,
} from './shapes';

// Re-export real-time shape operations (RTDB)
export {
  startEditingShape,
  updateEditingShape,
  finishEditingShape,
  subscribeToActiveEdits,
  subscribeToLocks,
  setupDisconnectCleanup,
} from './realtimeShapes';
