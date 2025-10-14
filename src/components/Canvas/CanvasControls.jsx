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
        left: '20px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        padding: '8px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        zIndex: 1000,
      }}
    >
      {/* Zoom Out Button */}
      <button
        onClick={handleZoomOut}
        disabled={scale <= MIN_ZOOM}
        title="Zoom Out"
        style={{
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: scale <= MIN_ZOOM ? '#f3f4f6' : 'transparent',
          color: scale <= MIN_ZOOM ? '#9ca3af' : '#374151',
          border: 'none',
          borderRadius: '8px',
          cursor: scale <= MIN_ZOOM ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          fontSize: '18px',
          fontWeight: 'bold',
        }}
        onMouseEnter={(e) => {
          if (scale > MIN_ZOOM) {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }
        }}
        onMouseLeave={(e) => {
          if (scale > MIN_ZOOM) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35M8 11h6" />
        </svg>
      </button>

      {/* Zoom Display */}
      <div
        style={{
          padding: '0 12px',
          fontSize: '13px',
          fontWeight: 600,
          color: '#374151',
          minWidth: '60px',
          textAlign: 'center',
          userSelect: 'none',
        }}
      >
        {Math.round(scale * 100)}%
      </div>

      {/* Zoom In Button */}
      <button
        onClick={handleZoomIn}
        disabled={scale >= MAX_ZOOM}
        title="Zoom In"
        style={{
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: scale >= MAX_ZOOM ? '#f3f4f6' : 'transparent',
          color: scale >= MAX_ZOOM ? '#9ca3af' : '#374151',
          border: 'none',
          borderRadius: '8px',
          cursor: scale >= MAX_ZOOM ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          fontSize: '18px',
          fontWeight: 'bold',
        }}
        onMouseEnter={(e) => {
          if (scale < MAX_ZOOM) {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }
        }}
        onMouseLeave={(e) => {
          if (scale < MAX_ZOOM) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
        </svg>
      </button>

      {/* Divider */}
      <div style={{ 
        width: '1px', 
        height: '24px', 
        backgroundColor: 'rgba(0, 0, 0, 0.08)', 
        margin: '0 4px' 
      }} />

      {/* Reset View Button */}
      <button
        onClick={resetView}
        title="Reset View (Fit to Center)"
        style={{
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          color: '#374151',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f3f4f6';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
};

export default CanvasControls;
