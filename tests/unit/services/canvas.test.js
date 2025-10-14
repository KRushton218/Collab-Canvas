/**
 * Canvas Service Tests
 * 
 * Note: The canvas service now acts as a re-export wrapper.
 * - Persistent operations (Firestore): shapes.js
 * - Real-time operations (RTDB): realtimeShapes.js
 * 
 * Detailed tests are in shapes.test.js for Firestore operations.
 */

import { describe, it, expect } from 'vitest';
import {
  loadShapes,
  createShape,
  updateShape,
  deleteShape,
  isShapeLockedByOther,
  getShapeLockOwner,
  startEditingShape,
  updateEditingShape,
  finishEditingShape,
  subscribeToActiveEdits,
  subscribeToLocks,
  setupDisconnectCleanup,
} from '../../../src/services/canvas';

describe('Canvas Service - Re-exports', () => {
  it('should re-export Firestore shape operations', () => {
    // Verify that Firestore operations are available
    expect(typeof loadShapes).toBe('function');
    expect(typeof createShape).toBe('function');
    expect(typeof updateShape).toBe('function');
    expect(typeof deleteShape).toBe('function');
    expect(typeof isShapeLockedByOther).toBe('function');
    expect(typeof getShapeLockOwner).toBe('function');
  });

  it('should re-export RTDB real-time operations', () => {
    // Verify that RTDB operations are available
    expect(typeof startEditingShape).toBe('function');
    expect(typeof updateEditingShape).toBe('function');
    expect(typeof finishEditingShape).toBe('function');
    expect(typeof subscribeToActiveEdits).toBe('function');
    expect(typeof subscribeToLocks).toBe('function');
    expect(typeof setupDisconnectCleanup).toBe('function');
  });
});
