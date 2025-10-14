import { useContext } from 'react';
import { CanvasContext } from '../../contexts/CanvasContext';

const StylePanel = () => {
  const { selectedId, shapes, updateShape } = useContext(CanvasContext);
  const selected = shapes.find(s => s.id === selectedId);

  if (!selected) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        right: '20px',
        transform: 'translateY(-50%)',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        width: '260px',
        zIndex: 1100,
        border: '1px solid rgba(0, 0, 0, 0.08)',
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>
        Style
      </div>

      {/* Fill */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Fill</div>
        <input
          type="color"
          value={selected.fill || '#cccccc'}
          onChange={(e) => updateShape(selected.id, { fill: e.target.value })}
          style={{ width: '100%', height: '40px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px' }}
        />
      </div>

      {/* Rotation */}
      <div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Rotation</div>
        <input
          type="range"
          min="0"
          max="359"
          value={selected.rotation || 0}
          onChange={(e) => updateShape(selected.id, { rotation: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};

export default StylePanel;


