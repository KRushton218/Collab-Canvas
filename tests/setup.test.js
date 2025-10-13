import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should have access to environment variables', () => {
    expect(import.meta.env.VITE_FIREBASE_API_KEY).toBeDefined();
  });
});

