import { useContext } from 'react';
import { CanvasContext } from '../../contexts/CanvasContext';
import { ZOOM_STEP, MIN_ZOOM, MAX_ZOOM } from '../../utils/constants';

const CanvasControls = () => {
  const { scale, setScale, resetView } = useContext(CanvasContext);

  const handleZoomIn = () => {
    setScale(scale + ZOOM_STEP);
  };

  const handleZoomOut = () => {
    setScale(scale - ZOOM_STEP);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid #d1d5db',
          textAlign: 'center',
          fontSize: '12px',
          lineHeight: 1.4,
        }}
      >
        <div style={{ fontWeight: 600 }}>Zoom</div>
        <div>{Math.round(scale * 100)}%</div>
        <div style={{ color: '#6b7280', marginTop: '4px' }}>
          {Math.round(MIN_ZOOM * 100)}% - {Math.round(MAX_ZOOM * 100)}%
        </div>
      </div>
      <button
        onClick={handleZoomIn}
        className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-300 rounded shadow"
      >
        Zoom In
      </button>
      <button
        onClick={handleZoomOut}
        className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-300 rounded shadow"
      >
        Zoom Out
      </button>
      <button
        onClick={resetView}
        className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-300 rounded shadow"
      >
        Reset View
      </button>
    </div>
  );
};

export default CanvasControls;
