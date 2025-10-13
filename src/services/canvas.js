/**
 * Canvas Service
 * 
 * This file serves as a lightweight wrapper and re-export for canvas-related functionality.
 * The actual shape operations have been moved to shapes.js for better separation of concerns.
 * 
 * This file is kept for backward compatibility and may contain canvas-specific utilities
 * in the future (e.g., canvas settings, viewport management, etc.)
 */

// Re-export all shape operations for backward compatibility
export {
  loadShapes,
  subscribeToShapes,
  createShape,
  updateShape,
  deleteShape,
  lockShape,
  unlockShape,
  unlockAllUserShapes,
  setupDisconnectHandler,
  isShapeLockedByOther,
  getShapeLockOwner,
} from './shapes';
