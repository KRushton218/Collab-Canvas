/**
 * useCursors Hook - Manages cursor tracking and display
 * Tracks mouse movements and shows other users' cursors
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToPresence, updateCursorPosition } from '../services/presence';

/**
 * Hook to manage cursor tracking
 * @param {string} userId - Current user ID
 * @param {Object} stageRef - Konva stage reference
 * @returns {Object} { cursors, updateMyCursor }
 */
export const useCursors = (userId, stageRef) => {
  const [cursors, setCursors] = useState({});
  const lastUpdateTime = useRef(0);
  const lastPosition = useRef({ x: 0, y: 0 });
  
  // Throttle delay in milliseconds (60 FPS = ~16ms, 30 FPS = ~33ms)
  // Using 60 FPS for smoother cursor tracking
  const THROTTLE_MS = 16;
  
  // Minimum movement threshold in pixels
  const MIN_MOVEMENT = 2;

  // Subscribe to cursor updates from all users
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToPresence((users) => {
      // Convert users array to cursors object, excluding current user
      const cursorsData = {};
      
      users.forEach((user) => {
        if (user.userId !== userId) {
          cursorsData[user.userId] = {
            x: user.cursorX || 0,
            y: user.cursorY || 0,
            color: user.cursorColor,
            displayName: user.displayName,
          };
        }
      });
      
      setCursors(cursorsData);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId]);

  // Update current user's cursor position
  const updateMyCursor = useCallback(
    (x, y) => {
      if (!userId) return;

      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTime.current;
      
      // Calculate distance moved
      const dx = x - lastPosition.current.x;
      const dy = y - lastPosition.current.y;
      const distanceMoved = Math.sqrt(dx * dx + dy * dy);

      // Only update if enough time has passed AND cursor moved significantly
      if (
        timeSinceLastUpdate >= THROTTLE_MS &&
        distanceMoved >= MIN_MOVEMENT
      ) {
        updateCursorPosition(userId, x, y);
        lastUpdateTime.current = now;
        lastPosition.current = { x, y };
      }
    },
    [userId]
  );

  return {
    cursors,
    updateMyCursor,
  };
};

