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

      {/* Text-specific controls */}
      {selected.type === 'text' && (
        <>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Font Size</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                min="8"
                max="512"
                step="1"
                value={selected.fontSize || 18}
                onChange={(e) => {
                  const next = Math.max(8, Math.min(512, Number(e.target.value) || 0));
                  updateShape(selected.id, { fontSize: next });
                }}
                style={{
                  flex: 1,
                  height: '36px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '6px',
                  padding: '0 10px',
                }}
              />
              <button
                onClick={() => {
                  // Calculate optimal font size based on text length and box size
                  const text = selected.text || 'Text';
                  const width = selected.width || 160;
                  const height = selected.height || 40;
                  
                  // More accurate estimates for typical fonts:
                  // Average character width is roughly 0.5-0.55 * fontSize for proportional fonts
                  // Line height is typically 1.2 * fontSize
                  // Add some padding (10px on each side)
                  const usableWidth = width - 20;
                  const usableHeight = height - 10;
                  
                  // For multi-line text, we need to estimate wrapping
                  // Start with a reasonable guess and iterate
                  let bestFit = 8;
                  for (let testSize = 8; testSize <= 512; testSize += 2) {
                    const charWidth = testSize * 0.55; // More accurate estimate
                    const lineHeight = testSize * 1.2;
                    const charsPerLine = Math.floor(usableWidth / charWidth);
                    const estimatedLines = Math.ceil(text.length / charsPerLine);
                    const totalHeight = estimatedLines * lineHeight;
                    
                    if (totalHeight <= usableHeight && charsPerLine * charWidth <= usableWidth) {
                      bestFit = testSize;
                    } else {
                      break; // Font too large, use previous
                    }
                  }
                  
                  updateShape(selected.id, { fontSize: bestFit });
                }}
                style={{
                  height: '36px',
                  padding: '0 12px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#6366f1',
                  whiteSpace: 'nowrap',
                }}
                title="Auto-fit font size to box"
              >
                Auto
              </button>
            </div>
          </div>

          {/* Text Alignment */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Alignment</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['left', 'center', 'right'].map((align) => (
                <button
                  key={align}
                  onClick={() => updateShape(selected.id, { align })}
                  style={{
                    flex: 1,
                    height: '32px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '6px',
                    backgroundColor: (selected.align || 'left') === align ? '#6366f1' : 'white',
                    color: (selected.align || 'left') === align ? 'white' : '#374151',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>

          {/* Text Formatting */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Format</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => {
                  const current = selected.fontStyle || 'normal';
                  const isBold = current.includes('bold');
                  const isItalic = current.includes('italic');
                  let next = '';
                  if (!isBold) next += 'bold';
                  if (isItalic) next += (next ? ' ' : '') + 'italic';
                  updateShape(selected.id, { fontStyle: next || 'normal' });
                }}
                style={{
                  flex: 1,
                  height: '32px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '6px',
                  backgroundColor: (selected.fontStyle || 'normal').includes('bold') ? '#6366f1' : 'white',
                  color: (selected.fontStyle || 'normal').includes('bold') ? 'white' : '#374151',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
                title="Bold"
              >
                B
              </button>
              <button
                onClick={() => {
                  const current = selected.fontStyle || 'normal';
                  const isBold = current.includes('bold');
                  const isItalic = current.includes('italic');
                  let next = '';
                  if (isBold) next += 'bold';
                  if (!isItalic) next += (next ? ' ' : '') + 'italic';
                  updateShape(selected.id, { fontStyle: next || 'normal' });
                }}
                style={{
                  flex: 1,
                  height: '32px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '6px',
                  backgroundColor: (selected.fontStyle || 'normal').includes('italic') ? '#6366f1' : 'white',
                  color: (selected.fontStyle || 'normal').includes('italic') ? 'white' : '#374151',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontStyle: 'italic',
                }}
                title="Italic"
              >
                I
              </button>
              <button
                onClick={() => {
                  const current = selected.textDecoration || '';
                  updateShape(selected.id, { textDecoration: current === 'underline' ? '' : 'underline' });
                }}
                style={{
                  flex: 1,
                  height: '32px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '6px',
                  backgroundColor: (selected.textDecoration || '') === 'underline' ? '#6366f1' : 'white',
                  color: (selected.textDecoration || '') === 'underline' ? 'white' : '#374151',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textDecoration: 'underline',
                }}
                title="Underline"
              >
                U
              </button>
            </div>
          </div>
        </>
      )}

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


