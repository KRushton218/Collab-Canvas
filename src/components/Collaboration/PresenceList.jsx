/**
 * PresenceList Component - Shows roster of active participants
 * Displays online users with their avatars and a count
 */

import React from 'react';

export const PresenceList = ({ users = [], currentUserId }) => (
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
        users.map(user => (
          <div
            key={user.userId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: user.userId === currentUserId ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (user.userId !== currentUserId) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }
            }}
            onMouseLeave={(e) => {
              if (user.userId !== currentUserId) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {/* Color indicator circle */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: user.cursorColor || '#9ca3af',
              border: '2px solid rgba(255, 255, 255, 0.8)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 600,
              color: 'white',
              opacity: user.isIdle ? 0.5 : 1,
              transition: 'opacity 0.3s ease',
            }}>
              {user.displayName?.charAt(0).toUpperCase() || '?'}
            </div>
            
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
              {user.userId === currentUserId && (
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
            
            {/* Online status dot */}
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
          </div>
        ))
      )}
    </div>
  </div>
);
