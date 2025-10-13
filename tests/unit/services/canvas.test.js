/**
 * Canvas Service Tests
 * 
 * Note: This file has been superseded by shapes.test.js
 * The canvas service now acts as a re-export wrapper for backward compatibility.
 * 
 * Tests have been moved to shapes.test.js to reflect the new architecture.
 */

import { describe, it, expect } from 'vitest';
import {
  loadShapes,
  createShape,
  updateShape,
  deleteShape,
  lockShape,
  unlockShape,
  unlockAllUserShapes,
  isShapeLockedByOther,
  getShapeLockOwner,
} from '../../../src/services/canvas';

describe('Canvas Service - Backward Compatibility', () => {
  it('should re-export shape operations for backward compatibility', () => {
    // Verify that all functions are available through canvas.js
    expect(typeof loadShapes).toBe('function');
    expect(typeof createShape).toBe('function');
    expect(typeof updateShape).toBe('function');
    expect(typeof deleteShape).toBe('function');
    expect(typeof lockShape).toBe('function');
    expect(typeof unlockShape).toBe('function');
    expect(typeof unlockAllUserShapes).toBe('function');
    expect(typeof isShapeLockedByOther).toBe('function');
    expect(typeof getShapeLockOwner).toBe('function');
  });
});
