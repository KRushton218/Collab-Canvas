/**
 * PresenceList Component - Shows roster of active participants
 * Displays online users with their avatars and a count
 * Allows current user to change their cursor color
 */

import React, { useState } from 'react';
import { CursorColorPicker } from './CursorColorPicker';

export const PresenceList = ({ users = [], currentUserId, currentColor, onColorChange }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleColorChange = async (newColor) => {
    if (onColorChange) {
      await onColorChange(newColor);
    }
    setShowColorPicker(false);
  };

  return (
  <div style={{
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    padding: '12px',
    minWidth: '240px',
    maxWidth: '280px',
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px',
      paddingBottom: '10px',
      borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
    }}>
      <h3 style={{
        fontSize: '14px',
        fontWeight: 600,
        color: '#374151',
        margin: 0,
      }}>
        Connected Sessions
      </h3>
      <span style={{
        fontSize: '12px',
        color: '#6b7280',
        backgroundColor: '#f3f4f6',
        padding: '4px 10px',
        borderRadius: '12px',
        fontWeight: 500,
      }}>
        {users.length} {users.length === 1 ? 'session' : 'sessions'}
      </span>
    </div>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      maxHeight: '320px',
      overflowY: 'auto',
    }}>
      {users.length === 0 ? (
        <div style={{
          fontSize: '13px',
          color: '#9ca3af',
          textAlign: 'center',
          padding: '20px 0',
        }}>
          No sessions connected
        </div>
      ) : (
        users.map(user => {
          const isCurrentUser = user.userId === currentUserId;
          const displayColor = isCurrentUser ? (currentColor || user.cursorColor) : user.cursorColor;

          return (
            <div
              key={user.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: isCurrentUser ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isCurrentUser) {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrentUser) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {/* Color indicator circle - clickable for current user */}
              <button
                onClick={isCurrentUser ? () => setShowColorPicker(!showColorPicker) : undefined}
                disabled={!isCurrentUser}
                title={isCurrentUser ? 'Click to change your cursor color' : undefined}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: displayColor || '#9ca3af',
                  border: isCurrentUser ? '2px solid #6366f1' : '2px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: isCurrentUser
                    ? '0 0 0 2px rgba(99, 102, 241, 0.3), 0 2px 8px rgba(0, 0, 0, 0.15)'
                    : '0 2px 8px rgba(0, 0, 0, 0.1)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'white',
                  opacity: user.isIdle ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                  cursor: isCurrentUser ? 'pointer' : 'default',
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  if (isCurrentUser) {
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isCurrentUser) {
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                {user.displayName?.charAt(0).toUpperCase() || '?'}
              </button>

              {/* User name */}
              <div style={{
                fontSize: '13px',
                fontWeight: 500,
                color: user.isIdle ? '#9ca3af' : '#374151',
                flex: 1,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user.displayName}
                {isCurrentUser && (
                  <span style={{
                    marginLeft: '6px',
                    fontSize: '11px',
                    color: '#6366f1',
                    fontWeight: 600,
                  }}>
                    (you)
                  </span>
                )}
                {user.isIdle && (
                  <span style={{
                    marginLeft: '6px',
                    fontSize: '11px',
                    color: '#9ca3af',
                    fontWeight: 400,
                    fontStyle: 'italic',
                  }}>
                    (idle)
                  </span>
                )}
              </div>

              {/* Edit color button for current user or online status dot */}
              {isCurrentUser ? (
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  title="Change cursor color"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    color: '#6366f1',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </button>
              ) : (
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: user.isIdle ? '#fbbf24' : '#10b981',
                  flexShrink: 0,
                  boxShadow: user.isIdle
                    ? '0 0 0 2px rgba(251, 191, 36, 0.2)'
                    : '0 0 0 2px rgba(16, 185, 129, 0.2)',
                }} />
              )}
            </div>
          );
        })
      )}
    </div>

    {/* Color picker popup */}
    {showColorPicker && (
      <>
        {/* Backdrop to close picker when clicking outside */}
        <div
          onClick={() => setShowColorPicker(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
          }}
        />
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          zIndex: 2,
        }}>
          <CursorColorPicker
            currentColor={currentColor}
            onColorChange={handleColorChange}
            onClose={() => setShowColorPicker(false)}
          />
        </div>
      </>
    )}
  </div>
);
};
