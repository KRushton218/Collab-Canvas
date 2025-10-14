/**
 * UserPresence Component - Individual user badge/avatar
 * Shows user initial with their color and name on hover
 */

import React from 'react';

export const UserPresence = ({ user }) => {
  // Get first letter of display name for avatar
  const initial = user.displayName ? user.displayName.charAt(0).toUpperCase() : '?';

  return (
    <div
      className="group relative flex items-center justify-center w-8 h-8 rounded-full text-white font-semibold text-sm cursor-default transition-transform hover:scale-110"
      style={{ backgroundColor: user.cursorColor }}
      title={user.displayName}
    >
      {initial}
      

    </div>
  );
};

