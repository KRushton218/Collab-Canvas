/**
 * ReconnectModal Component - Prompts user to reconnect after stale session
 * Shows when user's session is older than 24 hours
 */

import React from 'react';

export const ReconnectModal = ({ onReconnect }) => (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
    }}
    onClick={(e) => {
      // Prevent clicking background from closing
      e.stopPropagation();
    }}
  >
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        padding: '32px',
        maxWidth: '440px',
        width: '90%',
        textAlign: 'center',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Icon */}
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#fef3c7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '32px',
        }}
      >
        ⚠️
      </div>

      {/* Title */}
      <h2
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#111827',
          margin: '0 0 12px 0',
        }}
      >
        Session Expired
      </h2>

      {/* Message */}
      <p
        style={{
          fontSize: '15px',
          color: '#6b7280',
          lineHeight: '1.6',
          margin: '0 0 28px 0',
        }}
      >
        Your session has been inactive for more than 1 hour. Please refresh the page to reconnect and continue collaborating.
      </p>

      {/* Reconnect button */}
      <button
        onClick={onReconnect}
        style={{
          width: '100%',
          padding: '14px 24px',
          backgroundColor: '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#4f46e5';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#6366f1';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
        }}
      >
        Refresh & Reconnect
      </button>

      {/* Info text */}
      <p
        style={{
          fontSize: '13px',
          color: '#9ca3af',
          margin: '16px 0 0 0',
          lineHeight: '1.5',
        }}
      >
        All your work is saved. Refreshing will restore your connection.
      </p>
    </div>
  </div>
);

