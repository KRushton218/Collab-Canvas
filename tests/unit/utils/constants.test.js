import { describe, it, expect } from 'vitest';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  INITIAL_CANVAS_X,
  INITIAL_CANVAS_Y,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
} from '../../../src/utils/constants';

describe('Canvas Constants', () => {
  it('should have correct canvas dimensions', () => {
    expect(CANVAS_WIDTH).toBe(5000);
    expect(CANVAS_HEIGHT).toBe(5000);
  });

  it('should have initial canvas position at center', () => {
    expect(INITIAL_CANVAS_X).toBe(CANVAS_WIDTH / 2);
    expect(INITIAL_CANVAS_Y).toBe(CANVAS_HEIGHT / 2);
    expect(INITIAL_CANVAS_X).toBe(2500);
    expect(INITIAL_CANVAS_Y).toBe(2500);
  });

  it('should have correct zoom limits', () => {
    expect(MIN_ZOOM).toBe(0.1);
    expect(MAX_ZOOM).toBe(3);
  });

  it('should have reasonable zoom step', () => {
    expect(ZOOM_STEP).toBe(0.1);
    expect(ZOOM_STEP).toBeGreaterThan(0);
    expect(ZOOM_STEP).toBeLessThan(1);
  });

  it('should have zoom limits that make sense', () => {
    expect(MIN_ZOOM).toBeGreaterThan(0);
    expect(MAX_ZOOM).toBeGreaterThan(MIN_ZOOM);
  });
});

