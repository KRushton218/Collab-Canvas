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
  const { addShape, stageRef, scale } = useContext(CanvasContext);
  const [activeTool, setActiveTool] = useState('select');
  const [fill, setFill] = useState('#6366f1');
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
      tooltip: 'Click & Drag (Space)',
    },
    {
      id: 'rectangle',
      name: 'Rectangle',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="6" width="16" height="12" rx="2" />
        </svg>
      ),
      tooltip: 'Rectangle',
    },
    {
      id: 'circle',
      name: 'Circle',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="8" />
        </svg>
      ),
      tooltip: 'Circle',
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
      tooltip: 'Arrow / Line',
    },
    {
      id: 'text',
      name: 'Text',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7V4h16v3M9 20h6M12 4v16" />
        </svg>
      ),
      tooltip: 'Text Box',
    },
  ];

  const handleToolClick = (toolId) => {
    setActiveTool(toolId);
    
    // If not select tool, add the corresponding shape
    if (toolId !== 'select') {
      addShapeToCanvas(toolId);
    }
  };

  const addShapeToCanvas = (shapeType) => {
    const stage = stageRef.current;
    if (!stage) return;

    const shapeWidth = DEFAULT_SHAPE_SIZE;
    const shapeHeight = DEFAULT_SHAPE_SIZE;

    const centerX = (window.innerWidth / 2 - stage.x()) / scale;
    const centerY = (window.innerHeight / 2 - stage.y()) / scale;

    const constrainedX = Math.max(
      0,
      Math.min(centerX - shapeWidth / 2, CANVAS_WIDTH - shapeWidth),
    );
    const constrainedY = Math.max(
      0,
      Math.min(centerY - shapeHeight / 2, CANVAS_HEIGHT - shapeHeight),
    );

    addShape({
      type: shapeType,
      x: constrainedX,
      y: constrainedY,
      width: shapeWidth,
      height: shapeHeight,
      fill,
    });

    // Return to select tool after adding shape
    setActiveTool('select');
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
          </button>
        ))}

        {/* Divider */}
        <div style={{ 
          height: '1px', 
          backgroundColor: 'rgba(0, 0, 0, 0.08)', 
          margin: '4px 0' 
        }} />

        {/* Color Picker Button */}
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Fill Color"
          style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: showColorPicker ? '#f3f4f6' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            if (!showColorPicker) {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }
          }}
          onMouseLeave={(e) => {
            if (!showColorPicker) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              backgroundColor: fill,
              border: '2px solid rgba(0, 0, 0, 0.1)',
            }}
          />
        </button>
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
            value={fill}
            onChange={(e) => setFill(e.target.value)}
            style={{
              width: '180px',
              height: '48px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          />
          <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'].map((color) => (
              <button
                key={color}
                onClick={() => setFill(color)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: color,
                  border: fill === color ? '3px solid #374151' : '2px solid rgba(0, 0, 0, 0.1)',
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
