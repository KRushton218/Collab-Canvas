/**
 * PresenceList Component - Shows roster of active participants
 * Displays online users with their avatars and a count
 */

import React from 'react';
import { UserPresence } from './UserPresence';

export const PresenceList = ({ users = [], currentUserId }) => {
  const userCount = users.length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 min-w-[200px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800 text-sm">Active Users</h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {userCount} {userCount === 1 ? 'user' : 'users'}
        </span>
      </div>

      {/* User List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {users.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4">
            No users online
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.userId}
              className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 transition-colors"
            >
              <UserPresence user={user} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {user.displayName}
                  {user.userId === currentUserId && (
                    <span className="ml-2 text-xs text-gray-400">(you)</span>
                  )}
                </div>
              </div>
              {/* Online indicator */}
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

