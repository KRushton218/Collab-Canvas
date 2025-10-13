// Auth Service Unit Tests
import { describe, it, expect } from 'vitest';
import { getDisplayNameFromEmail, truncateDisplayName } from '../../../src/services/auth';

describe('Auth Service', () => {
  describe('getDisplayNameFromEmail', () => {
    it('should extract prefix from email', () => {
      expect(getDisplayNameFromEmail('john.doe@example.com')).toBe('john.doe');
      expect(getDisplayNameFromEmail('user123@test.com')).toBe('user123');
    });

    it('should truncate to 20 characters if prefix is too long', () => {
      const longEmail = 'verylongemailaddressthatexceeds@example.com';
      const result = getDisplayNameFromEmail(longEmail);
      expect(result).toBe('verylongemailaddress');
      expect(result.length).toBe(20);
    });

    it('should handle empty or invalid email', () => {
      expect(getDisplayNameFromEmail('')).toBe('Anonymous');
      expect(getDisplayNameFromEmail(null)).toBe('Anonymous');
      expect(getDisplayNameFromEmail(undefined)).toBe('Anonymous');
    });

    it('should keep short email prefixes as-is', () => {
      expect(getDisplayNameFromEmail('bob@test.com')).toBe('bob');
      expect(getDisplayNameFromEmail('a@b.com')).toBe('a');
    });
  });

  describe('truncateDisplayName', () => {
    it('should truncate names longer than 20 characters', () => {
      const longName = 'ThisIsAVeryLongDisplayName';
      const result = truncateDisplayName(longName);
      expect(result).toBe('ThisIsAVeryLongDispl');
      expect(result.length).toBe(20);
    });

    it('should keep names 20 characters or less unchanged', () => {
      expect(truncateDisplayName('John Doe')).toBe('John Doe');
      expect(truncateDisplayName('12345678901234567890')).toBe('12345678901234567890');
      expect(truncateDisplayName('Short')).toBe('Short');
    });

    it('should handle empty or null names', () => {
      expect(truncateDisplayName('')).toBe('Anonymous');
      expect(truncateDisplayName(null)).toBe('Anonymous');
      expect(truncateDisplayName(undefined)).toBe('Anonymous');
    });

    it('should handle exactly 20 character names', () => {
      const exactly20 = '12345678901234567890';
      expect(truncateDisplayName(exactly20)).toBe(exactly20);
      expect(truncateDisplayName(exactly20).length).toBe(20);
    });
  });
});

