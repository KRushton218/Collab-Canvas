/**
 * CursorColorPicker Component - Allows users to select their cursor color
 * Displays a palette of colors for the user to choose from
 */

import React from 'react';
import { CURSOR_COLORS } from '../../utils/helpers';

export const CursorColorPicker = ({ currentColor, onColorChange, onClose }) => {
  const handleColorSelect = (color) => {
    onColorChange(color);
  };

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        padding: '16px',
        width: '260px',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          paddingBottom: '10px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        <h4
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
            margin: 0,
          }}
        >
          Choose Cursor Color
        </h4>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            color: '#6b7280',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Current color preview */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '12px',
          padding: '8px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: currentColor,
            border: '3px solid white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          }}
        />
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>
            Current color
          </div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
            {CURSOR_COLORS.find(c => c.hex === currentColor)?.name || 'Custom'}
          </div>
        </div>
      </div>

      {/* Color palette grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '8px',
        }}
      >
        {CURSOR_COLORS.map((color) => (
          <button
            key={color.hex}
            onClick={() => handleColorSelect(color.hex)}
            title={color.name}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: color.hex,
              border: currentColor === color.hex
                ? '3px solid #374151'
                : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              position: 'relative',
              boxShadow: currentColor === color.hex
                ? '0 0 0 2px white, 0 2px 8px rgba(0, 0, 0, 0.2)'
                : '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
            onMouseEnter={(e) => {
              if (currentColor !== color.hex) {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentColor !== color.hex) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
              }
            }}
          >
            {currentColor === color.hex && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))',
                }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        ))}
      </div>

      <div
        style={{
          marginTop: '12px',
          fontSize: '11px',
          color: '#9ca3af',
          textAlign: 'center',
        }}
      >
        Your cursor color is visible to other collaborators
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
