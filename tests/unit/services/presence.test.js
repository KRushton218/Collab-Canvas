/**
 * Presence Service Tests
 * Tests for user presence and online status management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase/database functions
vi.mock('firebase/database', () => ({
  ref: vi.fn((db, path) => ({ path })),
  set: vi.fn(() => Promise.resolve()),
  onValue: vi.fn((ref, callback) => vi.fn()),
  onDisconnect: vi.fn((ref) => ({
    remove: vi.fn(() => Promise.resolve()),
  })),
  serverTimestamp: vi.fn(() => Date.now()),
  remove: vi.fn(() => Promise.resolve()),
}));

// Mock Firebase Realtime Database
vi.mock('../../../src/services/firebase', () => ({
  rtdb: {},
}));

// Import after mocking
import { setUserOnline, setUserOffline, subscribeToPresence } from '../../../src/services/presence';
import { set, onValue, onDisconnect, remove } from 'firebase/database';

describe('Presence Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setUserOnline', () => {
    it('should set user as online with correct data structure', async () => {
      const userId = 'user123';
      const displayName = 'Test User';
      const color = '#FF6B6B';

      const result = await setUserOnline(userId, displayName, color);

      expect(result).toBe(true);
      expect(set).toHaveBeenCalled();
    });

    it('should throw error if userId is not provided', async () => {
      await expect(setUserOnline(null, 'Test', '#FF6B6B')).rejects.toThrow('User ID is required');
    });

    it('should use "Anonymous" as default display name', async () => {
      const userId = 'user123';
      const color = '#FF6B6B';

      const result = await setUserOnline(userId, null, color);

      expect(result).toBe(true);
      const presenceData = vi.mocked(set).mock.calls[0][1];
      expect(presenceData.displayName).toBe('Anonymous');
    });

    it('should set up disconnect handler', async () => {
      const userId = 'user123';
      const displayName = 'Test User';
      const color = '#FF6B6B';

      await setUserOnline(userId, displayName, color);

      // Verify onDisconnect was called
      expect(onDisconnect).toHaveBeenCalled();
    });

    it('should include all required fields in presence data', async () => {
      const userId = 'user123';
      const displayName = 'Test User';
      const color = '#FF6B6B';

      await setUserOnline(userId, displayName, color);

      expect(set).toHaveBeenCalled();
      const presenceData = vi.mocked(set).mock.calls[0][1];
      
      expect(presenceData).toHaveProperty('displayName', displayName);
      expect(presenceData).toHaveProperty('cursorColor', color);
      expect(presenceData).toHaveProperty('cursorX');
      expect(presenceData).toHaveProperty('cursorY');
      expect(presenceData).toHaveProperty('lastSeen');
    });
  });

  describe('setUserOffline', () => {
    it('should remove user from presence', async () => {
      const userId = 'user123';

      const result = await setUserOffline(userId);

      expect(result).toBe(true);
      expect(remove).toHaveBeenCalled();
    });

    it('should throw error if userId is not provided', async () => {
      await expect(setUserOffline(null)).rejects.toThrow('User ID is required');
    });
  });

  describe('subscribeToPresence', () => {
    it('should return unsubscribe function', () => {
      const callback = vi.fn();

      const unsubscribe = subscribeToPresence(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should call callback with empty array when no users online', () => {
      const callback = vi.fn();

      // Mock onValue to call callback with null data
      vi.mocked(onValue).mockImplementation((ref, cb) => {
        cb({ val: () => null });
        return vi.fn();
      });

      subscribeToPresence(callback);

      expect(callback).toHaveBeenCalledWith([]);
    });

    it('should convert presence data to array of users', () => {
      const callback = vi.fn();

      const mockPresenceData = {
        user1: {
          displayName: 'User One',
          cursorColor: '#FF6B6B',
          cursorX: 100,
          cursorY: 200,
          lastSeen: Date.now(),
        },
        user2: {
          displayName: 'User Two',
          cursorColor: '#4ECDC4',
          cursorX: 300,
          cursorY: 400,
          lastSeen: Date.now(),
        },
      };

      // Mock onValue to call callback with mock data
      vi.mocked(onValue).mockImplementation((ref, cb) => {
        cb({ val: () => mockPresenceData });
        return vi.fn();
      });

      subscribeToPresence(callback);

      expect(callback).toHaveBeenCalled();
      const callArgs = callback.mock.calls[0][0];
      expect(Array.isArray(callArgs)).toBe(true);
      expect(callArgs).toHaveLength(2);
      expect(callArgs[0]).toHaveProperty('userId', 'user1');
      expect(callArgs[0]).toHaveProperty('displayName', 'User One');
      expect(callArgs[1]).toHaveProperty('userId', 'user2');
      expect(callArgs[1]).toHaveProperty('displayName', 'User Two');
    });

    it('should handle users with missing cursor positions', () => {
      const callback = vi.fn();

      const mockPresenceData = {
        user1: {
          displayName: 'User One',
          cursorColor: '#FF6B6B',
          lastSeen: Date.now(),
        },
      };

      // Mock onValue to call callback with mock data
      vi.mocked(onValue).mockImplementation((ref, cb) => {
        cb({ val: () => mockPresenceData });
        return vi.fn();
      });

      subscribeToPresence(callback);

      const callArgs = callback.mock.calls[0][0];
      expect(callArgs[0]).toHaveProperty('cursorX', 0);
      expect(callArgs[0]).toHaveProperty('cursorY', 0);
    });

    it('should handle errors gracefully', () => {
      const callback = vi.fn();

      // Mock onValue to call error callback
      vi.mocked(onValue).mockImplementation((ref, successCb, errorCb) => {
        errorCb(new Error('Connection error'));
        return vi.fn();
      });

      subscribeToPresence(callback);

      expect(callback).toHaveBeenCalledWith([]);
    });
  });
});
