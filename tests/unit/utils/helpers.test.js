import { describe, it, expect } from 'vitest';
import {
  generateShapeId,
  isWithinBounds,
  constrainToBounds,
  generateUserColor,
} from '../../../src/utils/helpers';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../../src/utils/constants';

describe('Helper Functions', () => {
  describe('generateShapeId', () => {
    it('should generate a unique ID', () => {
      const id1 = generateShapeId();
      const id2 = generateShapeId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^shape-/);
    });

    it('should generate IDs with correct format', () => {
      const id = generateShapeId();
      expect(id).toMatch(/^shape-\d+-[a-z0-9]+$/);
    });
  });

  describe('isWithinBounds', () => {
    it('should return true for shape within bounds', () => {
      const result = isWithinBounds(100, 100, 100, 100, CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(result).toBe(true);
    });

    it('should return false for shape outside left boundary', () => {
      const result = isWithinBounds(-10, 100, 100, 100, CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(result).toBe(false);
    });

    it('should return false for shape outside right boundary', () => {
      const result = isWithinBounds(CANVAS_WIDTH - 50, 100, 100, 100, CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(result).toBe(false);
    });

    it('should return false for shape outside top boundary', () => {
      const result = isWithinBounds(100, -10, 100, 100, CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(result).toBe(false);
    });

    it('should return false for shape outside bottom boundary', () => {
      const result = isWithinBounds(100, CANVAS_HEIGHT - 50, 100, 100, CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(result).toBe(false);
    });

    it('should return true for shape at exact boundaries', () => {
      const result = isWithinBounds(0, 0, 100, 100, CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(result).toBe(true);
    });
  });

  describe('constrainToBounds', () => {
    it('should not modify position if within bounds', () => {
      const result = constrainToBounds(100, 100, 100, 100, CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(result).toEqual({ x: 100, y: 100 });
    });

    it('should constrain to left boundary', () => {
      const result = constrainToBounds(-50, 100, 100, 100, CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(result).toEqual({ x: 0, y: 100 });
    });

    it('should constrain to right boundary', () => {
      const result = constrainToBounds(CANVAS_WIDTH, 100, 100, 100, CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(result).toEqual({ x: CANVAS_WIDTH - 100, y: 100 });
    });

    it('should constrain to top boundary', () => {
      const result = constrainToBounds(100, -50, 100, 100, CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(result).toEqual({ x: 100, y: 0 });
    });

    it('should constrain to bottom boundary', () => {
      const result = constrainToBounds(100, CANVAS_HEIGHT, 100, 100, CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(result).toEqual({ x: 100, y: CANVAS_HEIGHT - 100 });
    });
  });

  describe('generateUserColor', () => {
    it('should generate a valid hex color', () => {
      const color = generateUserColor('user123');
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should return consistent color for same user', () => {
      const color1 = generateUserColor('user123');
      const color2 = generateUserColor('user123');
      expect(color1).toBe(color2);
    });

    it('should return different colors for different users', () => {
      const color1 = generateUserColor('user123');
      const color2 = generateUserColor('user456');
      // Note: This might occasionally fail due to hash collisions, but unlikely
      expect(color1).not.toBe(color2);
    });

    it('should handle empty userId', () => {
      const color = generateUserColor('');
      expect(color).toBeDefined();
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should handle null userId', () => {
      const color = generateUserColor(null);
      expect(color).toBeDefined();
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });
});

