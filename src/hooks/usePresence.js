/**
 * usePresence Hook - Manages user presence state
 * Tracks online users and maintains current user's online status
 */

import { useState, useEffect } from 'react';
import { setUserOnline, setUserOffline, subscribeToPresence } from '../services/presence';
import { generateUserColor } from '../utils/helpers';

/**
 * Hook to manage user presence
 * @param {string} userId - Current user ID
 * @param {string} displayName - Current user display name
 * @returns {Object} { onlineUsers, isConnected }
 */
export const usePresence = (userId, displayName) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    console.log('[usePresence] Hook called with:', { userId, displayName });
    
    if (!userId) {
      console.log('[usePresence] No userId, skipping initialization');
      return;
    }

    let unsubscribe = null;
    
    // Generate consistent color for this user
    const userColor = generateUserColor(userId);
    console.log('[usePresence] Generated color:', userColor);

    // Set user as online
    const initializePresence = async () => {
      try {
        console.log('[usePresence] Initializing presence...');
        await setUserOnline(userId, displayName, userColor);
        setIsConnected(true);
        console.log('[usePresence] User set online, subscribing to changes...');

        // Subscribe to presence changes
        unsubscribe = subscribeToPresence((users) => {
          console.log('[usePresence] Received users update:', users);
          setOnlineUsers(users);
        });
      } catch (error) {
        console.error('[usePresence] Error initializing presence:', error);
        setIsConnected(false);
      }
    };

    initializePresence();

    // Cleanup on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      
      // Set user offline when component unmounts
      setUserOffline(userId).catch((error) => {
        console.error('Error setting user offline:', error);
      });
    };
  }, [userId, displayName]);

  return {
    onlineUsers,
    isConnected,
  };
};

