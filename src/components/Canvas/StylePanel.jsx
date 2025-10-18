import { useContext, useState, useRef, useEffect } from 'react';
import { CanvasContext } from '../../contexts/CanvasContext';

const StylePanel = () => {
  const { selectedIds, shapes, updateShape } = useContext(CanvasContext);

  // Local UI state must be declared unconditionally (Rules of Hooks)
  const [localColor, setLocalColor] = useState('#cccccc');
  const colorUpdateTimerRef = useRef(null);

  // Show style panel for first selected shape (represents the selection)
  const firstSelectedId = selectedIds.size > 0 ? Array.from(selectedIds)[0] : null;
  const selected = shapes.find(s => s.id === firstSelectedId);

  // Derived selection metadata
  const selectionCount = selectedIds.size;
  const isMultiSelect = selectionCount > 1;
  const selectedShapes = shapes.filter(s => selectedIds.has(s.id));
  const selectedTypes = new Set(selectedShapes.map(s => s.type));
  const allText = selectedTypes.size > 0 && selectedTypes.size === 1 && selectedTypes.has('text');

  // Helper: apply property to all selected shapes
  const updateAllSelected = (property) => {
    const selectedShapeIds = Array.from(selectedIds);
    selectedShapeIds.forEach(id => {
      updateShape(id, property);
    });
  };
  
  // Update local color when selection changes
  // For lines, use stroke instead of fill
  useEffect(() => {
    if (selected) {
      const isLine = selected.type === 'line';
      setLocalColor(isLine ? (selected.stroke || '#374151') : (selected.fill || '#cccccc'));
    }
  }, [selected?.id, selected?.fill, selected?.stroke, selected?.type]);
  
  // Throttled color update handler
  const handleColorChange = (newColor) => {
    // Update local state immediately (instant visual feedback)
    setLocalColor(newColor);
    
    // Clear existing timer
    if (colorUpdateTimerRef.current) {
      clearTimeout(colorUpdateTimerRef.current);
    }
    
    // Debounce Firestore write (100ms after last change)
    colorUpdateTimerRef.current = setTimeout(() => {
      const isLine = selected.type === 'line';
      const colorProp = isLine ? { stroke: newColor } : { fill: newColor };
      if (isMultiSelect) {
        updateAllSelected(colorProp);
      } else {
        updateShape(selected.id, colorProp);
      }
    }, 100); // 100ms debounce for responsive feel
  };
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (colorUpdateTimerRef.current) {
        clearTimeout(colorUpdateTimerRef.current);
      }
    };
  }, []);

  // If nothing is selected, don't render panel
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
        Style {selectionCount > 1 && <span style={{ color: '#6366f1', fontWeight: 600 }}>({selectionCount} shapes)</span>}
      </div>

      {/* Text-specific controls: only when all selected are text */}
      {allText && (
        <>
          {/* Auto-fit height toggle & wrapping */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Text Box</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#374151' }}>
                <input
                  type="checkbox"
                  checked={!!selected.autoFitHeight}
                  onChange={(e) => {
                    const autoFitHeight = e.target.checked;
                    if (isMultiSelect) updateAllSelected({ autoFitHeight }); else updateShape(selected.id, { autoFitHeight });
                  }}
                />
                Auto-fit font to height
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={selected.wrap || 'word'}
                  onChange={(e) => {
                    const wrap = e.target.value;
                    if (isMultiSelect) updateAllSelected({ wrap }); else updateShape(selected.id, { wrap });
                  }}
                  style={{ flex: 1, height: '32px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', padding: '0 10px' }}
                >
                  <option value="none">No wrap</option>
                  <option value="word">Word wrap</option>
                  <option value="char">Character wrap</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  min="0"
                  max="64"
                  step="1"
                  value={selected.padding ?? 4}
                  onChange={(e) => {
                    const padding = Math.max(0, Math.min(64, Number(e.target.value) || 0));
                    if (isMultiSelect) updateAllSelected({ padding }); else updateShape(selected.id, { padding });
                  }}
                  style={{ flex: 1, height: '32px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', padding: '0 10px' }}
                  placeholder="Padding"
                  title="Padding (px)"
                />
                <input
                  type="number"
                  min="1"
                  max="2"
                  step="0.05"
                  value={selected.lineHeight ?? 1.2}
                  onChange={(e) => {
                    const lineHeight = Math.max(1, Math.min(2, Number(e.target.value) || 1.2));
                    if (isMultiSelect) updateAllSelected({ lineHeight }); else updateShape(selected.id, { lineHeight });
                  }}
                  style={{ flex: 1, height: '32px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', padding: '0 10px' }}
                  placeholder="Line height"
                  title="Line height (multiplier)"
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="color"
                  value={selected.boxFill || '#00000000'}
                  onChange={(e) => {
                    const boxFill = e.target.value;
                    if (isMultiSelect) updateAllSelected({ boxFill }); else updateShape(selected.id, { boxFill });
                  }}
                  style={{ flex: 1, height: '32px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px' }}
                  title="Text box fill (use transparent if desired)"
                />
                <input
                  type="color"
                  value={selected.boxStroke || '#00000000'}
                  onChange={(e) => {
                    const boxStroke = e.target.value;
                    if (isMultiSelect) updateAllSelected({ boxStroke }); else updateShape(selected.id, { boxStroke });
                  }}
                  style={{ width: '48px', height: '32px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px' }}
                  title="Text box border color"
                />
                <input
                  type="number"
                  min="0"
                  max="16"
                  step="1"
                  value={selected.boxStrokeWidth ?? 0}
                  onChange={(e) => {
                    const boxStrokeWidth = Math.max(0, Math.min(16, Number(e.target.value) || 0));
                    if (isMultiSelect) updateAllSelected({ boxStrokeWidth }); else updateShape(selected.id, { boxStrokeWidth });
                  }}
                  style={{ width: '72px', height: '32px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', padding: '0 10px' }}
                  placeholder="Border px"
                  title="Text box border width (px)"
                />
              </div>
            </div>
          </div>
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
                  if (isMultiSelect) {
                    updateAllSelected({ fontSize: next });
                  } else {
                    updateShape(selected.id, { fontSize: next });
                  }
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
                  
                  if (isMultiSelect) {
                    updateAllSelected({ fontSize: bestFit });
                  } else {
                    updateShape(selected.id, { fontSize: bestFit });
                  }
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
                  onClick={() => {
                    if (isMultiSelect) {
                      updateAllSelected({ align });
                    } else {
                      updateShape(selected.id, { align });
                    }
                  }}
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
                  if (isMultiSelect) {
                    updateAllSelected({ fontStyle: next || 'normal' });
                  } else {
                    updateShape(selected.id, { fontStyle: next || 'normal' });
                  }
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
                  if (isMultiSelect) {
                    updateAllSelected({ fontStyle: next || 'normal' });
                  } else {
                    updateShape(selected.id, { fontStyle: next || 'normal' });
                  }
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
                  const nextValue = current === 'underline' ? '' : 'underline';
                  if (isMultiSelect) {
                    updateAllSelected({ textDecoration: nextValue });
                  } else {
                    updateShape(selected.id, { textDecoration: nextValue });
                  }
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

      {/* Color (Fill for shapes, Stroke for lines) */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
          {selected.type === 'line' ? 'Line Color' : 'Fill'}
        </div>
        <input
          type="color"
          value={localColor}
          onChange={(e) => handleColorChange(e.target.value)}
          style={{ width: '100%', height: '40px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px' }}
        />
      </div>

      {/* Border color and thickness for rectangles and circles */}
      {(selected.type === 'rectangle' || selected.type === 'circle') && (
        <>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Border Color</div>
            <input
              type="color"
              value={selected.stroke || '#e5e7eb'}
              onChange={(e) => {
                const stroke = e.target.value;
                if (isMultiSelect) {
                  updateAllSelected({ stroke });
                } else {
                  updateShape(selected.id, { stroke });
                }
              }}
              style={{
                width: '100%',
                height: '40px',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '6px',
              }}
              title="Border color"
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Border Thickness</div>
            <input
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={selected.strokeWidth ?? 1}
              onChange={(e) => {
                const strokeWidth = Math.max(0, Math.min(20, Number(e.target.value) || 1));
                if (isMultiSelect) {
                  updateAllSelected({ strokeWidth });
                } else {
                  updateShape(selected.id, { strokeWidth });
                }
              }}
              style={{
                width: '100%',
                height: '32px',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '6px',
                padding: '0 10px',
              }}
              placeholder="Border width (px)"
              title="Border thickness in pixels"
            />
          </div>
        </>
      )}

      {/* Line thickness for lines */}
      {selected.type === 'line' && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Line Thickness</div>
          <input
            type="number"
            min="1"
            max="20"
            step="0.5"
            value={selected.strokeWidth ?? 2}
            onChange={(e) => {
              const strokeWidth = Math.max(1, Math.min(20, Number(e.target.value) || 2));
              if (isMultiSelect) {
                updateAllSelected({ strokeWidth });
              } else {
                updateShape(selected.id, { strokeWidth });
              }
            }}
            style={{
              width: '100%',
              height: '32px',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '6px',
              padding: '0 10px',
            }}
            placeholder="Line width (px)"
            title="Line thickness in pixels"
          />
        </div>
      )}

      {/* Rotation */}
      <div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Rotation</div>
        <input
          type="number"
          min="0"
          max="359"
          step="0.01"
          value={Math.round((selected.rotation || 0) * 100) / 100}
          onChange={(e) => {
            const value = Number(e.target.value);
            // Normalize to 0-359 range
            const normalized = ((value % 360) + 360) % 360;
            if (isMultiSelect) {
              updateAllSelected({ rotation: normalized });
            } else {
              updateShape(selected.id, { rotation: normalized });
            }
          }}
          style={{
            width: '100%',
            height: '36px',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '6px',
            padding: '0 10px',
          }}
        />
      </div>
    </div>
  );
};

export default StylePanel;


