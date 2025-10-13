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
  const [width, setWidth] = useState(DEFAULT_SHAPE_SIZE);
  const [height, setHeight] = useState(DEFAULT_SHAPE_SIZE);
  const [fill, setFill] = useState('#cccccc');

  const handleAddRectangle = () => {
    const stage = stageRef.current;
    if (!stage) return;

    const shapeWidth = clampSize(width);
    const shapeHeight = clampSize(height);

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
      type: 'rectangle',
      x: constrainedX,
      y: constrainedY,
      width: shapeWidth,
      height: shapeHeight,
      fill,
    });
  };

  const handleWidthChange = (e) => {
    setWidth(e.target.value);
  };

  const handleHeightChange = (e) => {
    setHeight(e.target.value);
  };

  const handleFillChange = (e) => {
    setFill(e.target.value);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '20px',
        transform: 'translateY(-50%)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '220px',
        zIndex: 1100,
      }}
    >
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>Toolbar</h2>
        <p style={{ fontSize: '12px', color: '#555555', margin: 0 }}>
          Configure shape properties before placing them on the canvas.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
          Width (px)
          <input
            type="number"
            min={MIN_SHAPE_SIZE}
            max={MAX_SHAPE_SIZE}
            value={width}
            onChange={handleWidthChange}
            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cccccc' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
          Height (px)
          <input
            type="number"
            min={MIN_SHAPE_SIZE}
            max={MAX_SHAPE_SIZE}
            value={height}
            onChange={handleHeightChange}
            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cccccc' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
          Fill Color
          <input
            type="color"
            value={fill}
            onChange={handleFillChange}
            style={{ height: '36px', border: 'none', background: 'transparent', padding: 0 }}
          />
        </label>
      </div>

      <button
        onClick={handleAddRectangle}
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 border border-blue-600 rounded shadow"
      >
        Add Rectangle
      </button>
    </div>
  );
};

export default CanvasToolbar;
