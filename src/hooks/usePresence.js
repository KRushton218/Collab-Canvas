/**
 * usePresence Hook - Manages user presence state
 * Tracks online users and maintains current user's online status
 * Implements heartbeat system and stale session detection
 * Supports user-selectable cursor colors with persistence
 */

import { useState, useEffect, useCallback } from 'react';
import {
  setUserOnline,
  setUserOffline,
  subscribeToPresence,
  sendHeartbeat,
  updateCursorColor as updateCursorColorService,
  isSessionStale,
  HEARTBEAT_INTERVAL_MS,
} from '../services/presence';
import { getSavedCursorColor, saveCursorColor } from '../utils/helpers';

/**
 * Hook to manage user presence
 * @param {string} userId - Current user ID
 * @param {string} displayName - Current user display name
 * @returns {Object} { onlineUsers, isConnected, sessionStart, isStale, currentColor, changeCursorColor }
 */
export const usePresence = (userId, displayName) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionStart, setSessionStart] = useState(null);
  const [currentColor, setCurrentColor] = useState(() => getSavedCursorColor(userId));

  // Function to change cursor color
  const changeCursorColor = useCallback(async (newColor) => {
    if (!userId || !newColor) return false;

    // Optimistic update
    setCurrentColor(newColor);
    saveCursorColor(newColor);

    // Update in Firebase
    const success = await updateCursorColorService(userId, newColor);
    if (!success) {
      // Rollback on failure
      const savedColor = getSavedCursorColor(userId);
      setCurrentColor(savedColor);
    }
    return success;
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      console.log('[usePresence] No userId, skipping initialization');
      return;
    }

    let unsubscribe = null;
    let heartbeatInterval = null;

    // Get saved color or generate one for this user
    const userColor = getSavedCursorColor(userId);
    setCurrentColor(userColor);
    console.log('[usePresence] Using cursor color:', userColor);

    // Set user as online
    const initializePresence = async () => {
      try {
        console.log('[usePresence] Initializing presence...');
        const sessionStartTime = Date.now();
        setSessionStart(sessionStartTime);

        await setUserOnline(userId, displayName, userColor);
        setIsConnected(true);
        console.log('[usePresence] User set online, subscribing to changes...');

        // Subscribe to presence changes
        unsubscribe = subscribeToPresence((users) => {
          setOnlineUsers(users);
        });

        // Start heartbeat (only when tab is visible)
        const startHeartbeat = () => {
          // Clear any existing interval
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }

          // Send heartbeat every 30s while tab is visible
          heartbeatInterval = setInterval(() => {
            if (!document.hidden) {
              sendHeartbeat(userId);
            }
          }, HEARTBEAT_INTERVAL_MS);
        };

        startHeartbeat();

        // Handle visibility changes
        const handleVisibilityChange = () => {
          if (!document.hidden) {
            // Tab became visible - send immediate heartbeat and restart interval
            sendHeartbeat(userId);
            startHeartbeat();
          } else {
            // Tab hidden - stop heartbeat
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval);
              heartbeatInterval = null;
            }
          }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Store cleanup function
        return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
        };

      } catch (error) {
        console.error('[usePresence] Error initializing presence:', error);
        setIsConnected(false);
      }
    };

    const cleanupPromise = initializePresence();

    // Cleanup on unmount
    return () => {
      // Wait for cleanup function from initializePresence
      if (cleanupPromise && typeof cleanupPromise.then === 'function') {
        cleanupPromise.then((cleanup) => {
          if (cleanup) cleanup();
        });
      }

      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }

      if (unsubscribe) {
        unsubscribe();
      }

      // Set user offline when component unmounts
      setUserOffline(userId).catch((error) => {
        console.error('Error setting user offline:', error);
      });
    };
  }, [userId, displayName]);

  // Check if session is stale
  const isStale = sessionStart ? isSessionStale(sessionStart) : false;

  return {
    onlineUsers,
    isConnected,
    sessionStart,
    isStale,
    currentColor,
    changeCursorColor,
  };
};

