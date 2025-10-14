import { useContext, useState } from 'react';
import { CanvasContext } from '../../contexts/CanvasContext';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT,
  MIN_SHAPE_SIZE,
  MAX_SHAPE_SIZE,
  DEFAULT_SHAPE_SIZE,
} from '../../utils/constants';

const clampSize = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return MIN_SHAPE_SIZE;
  }
  return Math.min(Math.max(numeric, MIN_SHAPE_SIZE), MAX_SHAPE_SIZE);
};

const CanvasToolbar = () => {
  const { activeTool, setActiveTool, currentFill, setCurrentFill } = useContext(CanvasContext);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const tools = [
    {
      id: 'select',
      name: 'Select',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        </svg>
      ),
      tooltip: 'Select (V) · Pan (Space)',
      shortcut: 'V',
    },
    {
      id: 'rectangle',
      name: 'Rectangle',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="6" width="16" height="12" rx="2" />
        </svg>
      ),
      tooltip: 'Rectangle (R)',
      shortcut: 'R',
    },
    {
      id: 'circle',
      name: 'Circle',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="8" />
        </svg>
      ),
      tooltip: 'Circle (C)',
      shortcut: 'C',
    },
    {
      id: 'line',
      name: 'Line',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="19" x2="19" y2="5" />
          <path d="M19 5l-2 2m0-2l2 2" />
        </svg>
      ),
      tooltip: 'Line (L)',
      shortcut: 'L',
    },
    {
      id: 'text',
      name: 'Text',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7V4h16v3M9 20h6M12 4v16" />
        </svg>
      ),
      tooltip: 'Text (T)',
      shortcut: 'T',
    },
  ];

  const handleToolClick = (toolId) => {
    setActiveTool(toolId);
  };

  return (
    <>
      {/* Main Toolbar */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '20px',
          transform: 'translateY(-50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          padding: '8px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          width: '56px',
          zIndex: 1100,
          border: '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            title={tool.tooltip}
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: activeTool === tool.id ? '#6366f1' : 'transparent',
              color: activeTool === tool.id ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (activeTool !== tool.id) {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTool !== tool.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {tool.icon}
            {tool.shortcut && (
              <span
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '6px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: activeTool === tool.id ? 'white' : '#6b7280',
                  opacity: 0.9,
                }}
              >
                {tool.shortcut}
              </span>
            )}
          </button>
        ))}

        {/* Divider */}
        <div style={{ 
          height: '1px', 
          backgroundColor: 'rgba(0, 0, 0, 0.08)', 
          margin: '4px 0' 
        }} />

        {/* Color Picker removed from main toolbar; moved to style panel */}
      </div>

      {/* Color Picker Popover */}
      {showColorPicker && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '92px',
            transform: 'translateY(-50%)',
            backgroundColor: 'white',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            zIndex: 1101,
            border: '1px solid rgba(0, 0, 0, 0.08)',
          }}
        >
          <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
            Fill Color
          </div>
          <input
            type="color"
            value={currentFill}
            onChange={(e) => setCurrentFill(e.target.value)}
            style={{
              width: '180px',
              height: '48px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
            onBlur={async (e) => {
              // Apply fill to selected shape when color picker loses focus
              if (selectedId) {
                await updateShape(selectedId, { fill: e.target.value });
              }
            }}
          />
          <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'].map((color) => (
              <button
                key={color}
                onClick={async () => {
                  setCurrentFill(color);
                  if (selectedId) {
                    await updateShape(selectedId, { fill: color });
                  }
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: color,
                  border: currentFill === color ? '3px solid #374151' : '2px solid rgba(0, 0, 0, 0.1)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Click outside to close color picker */}
      {showColorPicker && (
        <div
          onClick={() => setShowColorPicker(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1099,
          }}
        />
      )}
    </>
  );
};

export default CanvasToolbar;
