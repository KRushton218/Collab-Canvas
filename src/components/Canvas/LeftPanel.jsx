import { useContext } from 'react';
import { CanvasContext } from '../../contexts/CanvasContext';
import { 
  FiMousePointer, 
  FiSquare, 
  FiCircle, 
  FiMinus, 
  FiType,
  FiCopy,
  FiTrash2,
  FiLayers,
  FiArrowUp,
  FiArrowDown
} from 'react-icons/fi';
import { BiUndo, BiRedo } from 'react-icons/bi';

/**
 * Left Panel - Figma-inspired tools and actions panel
 * Combines tools, editing actions, and layer management
 */
const LeftPanel = () => {
  const { 
    activeTool, 
    setActiveTool, 
    selectedIds, 
    shapes,
    deleteShape,
    deselectAll,
    // These will be implemented
    undo,
    redo,
    canUndo,
    canRedo,
    copySelected,
    pasteFromClipboard,
    hasClipboard,
    duplicateSelected,
    bringToFront,
    sendToBack,
  } = useContext(CanvasContext);

  const selectedCount = selectedIds?.size || 0;
  const hasSelection = selectedCount > 0;

  // Tool definitions
  const tools = [
    { id: 'select', name: 'Select', icon: FiMousePointer, shortcut: 'V' },
    { id: 'rectangle', name: 'Rectangle', icon: FiSquare, shortcut: 'R' },
    { id: 'circle', name: 'Circle', icon: FiCircle, shortcut: 'C' },
    { id: 'line', name: 'Line', icon: FiMinus, shortcut: 'L' },
    { id: 'text', name: 'Text', icon: FiType, shortcut: 'T' },
  ];

  // Action definitions
  const actions = [
    {
      id: 'undo',
      name: 'Undo',
      icon: BiUndo,
      shortcut: '⌘Z',
      onClick: undo,
      disabled: !canUndo,
      tooltip: 'Undo (⌘Z)',
    },
    {
      id: 'redo',
      name: 'Redo',
      icon: BiRedo,
      shortcut: '⌘⇧Z',
      onClick: redo,
      disabled: !canRedo,
      tooltip: 'Redo (⌘⇧Z)',
    },
    {
      id: 'copy',
      name: 'Copy',
      icon: FiCopy,
      shortcut: '⌘C',
      onClick: copySelected,
      disabled: !hasSelection,
      tooltip: 'Copy (⌘C)',
    },
    {
      id: 'paste',
      name: 'Paste',
      icon: FiCopy,
      shortcut: '⌘V',
      onClick: pasteFromClipboard,
      disabled: !hasClipboard,
      tooltip: 'Paste (⌘V)',
      style: { transform: 'scaleX(-1)' }, // Mirror icon for paste
    },
    {
      id: 'delete',
      name: 'Delete',
      icon: FiTrash2,
      shortcut: '⌫',
      onClick: () => {
        const idsToDelete = Array.from(selectedIds);
        deselectAll();
        idsToDelete.forEach(id => deleteShape(id));
      },
      disabled: !hasSelection,
      tooltip: 'Delete (⌫)',
    },
  ];

  const layerActions = [
    {
      id: 'front',
      name: 'Bring to Front',
      icon: FiArrowUp,
      shortcut: '⌘]',
      onClick: bringToFront,
      disabled: !hasSelection,
      tooltip: 'Bring to Front (⌘])',
    },
    {
      id: 'back',
      name: 'Send to Back',
      icon: FiArrowDown,
      shortcut: '⌘[',
      onClick: sendToBack,
      disabled: !hasSelection,
      tooltip: 'Send to Back (⌘[)',
    },
  ];

  const buttonStyle = (active = false, disabled = false) => ({
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: active ? '#6366f1' : 'transparent',
    color: disabled ? '#d1d5db' : (active ? 'white' : '#374151'),
    border: 'none',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    opacity: disabled ? 0.4 : 1,
  });

  const shortcutBadgeStyle = (active = false) => ({
    position: 'absolute',
    bottom: '4px',
    right: '4px',
    fontSize: '9px',
    fontWeight: 700,
    color: active ? 'rgba(255,255,255,0.8)' : '#9ca3af',
    backgroundColor: active ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
    padding: '2px 4px',
    borderRadius: '3px',
  });

  return (
    <div
      style={{
        position: 'fixed',
        top: '64px', // Below navbar
        left: 0,
        bottom: 0,
        width: '240px',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRight: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '4px 0 12px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 12px',
        gap: '20px',
        zIndex: 900,
        overflowY: 'auto',
      }}
    >
      {/* TOOLS SECTION */}
      <div>
        <div style={{ 
          fontSize: '11px', 
          fontWeight: 700, 
          color: '#6b7280', 
          textTransform: 'uppercase', 
          letterSpacing: '0.5px',
          marginBottom: '8px',
          paddingLeft: '4px',
        }}>
          Tools
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            const isDisabled = tool.id !== 'select' && hasSelection;
            
            return (
              <button
                key={tool.id}
                onClick={() => !isDisabled && setActiveTool(tool.id)}
                disabled={isDisabled}
                title={`${tool.name} (${tool.shortcut})`}
                style={buttonStyle(isActive, isDisabled)}
                onMouseEnter={(e) => {
                  if (!isActive && !isDisabled) {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Icon size={20} />
                <span style={shortcutBadgeStyle(isActive)}>{tool.shortcut}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: 'rgba(0, 0, 0, 0.08)' }} />

      {/* EDIT ACTIONS SECTION */}
      <div>
        <div style={{ 
          fontSize: '11px', 
          fontWeight: 700, 
          color: '#6b7280', 
          textTransform: 'uppercase', 
          letterSpacing: '0.5px',
          marginBottom: '8px',
          paddingLeft: '4px',
        }}>
          Edit
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {actions.map((action) => {
            const Icon = action.icon;
            const isDisabled = action.disabled;
            
            return (
              <button
                key={action.id}
                onClick={() => !isDisabled && action.onClick?.()}
                disabled={isDisabled}
                title={action.tooltip}
                style={{
                  ...buttonStyle(false, isDisabled),
                  ...(action.style || {}),
                }}
                onMouseEnter={(e) => {
                  if (!isDisabled) {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>
        
        {/* Duplicate button (wider, below other actions) */}
        <button
          onClick={() => duplicateSelected?.()}
          disabled={!hasSelection}
          title="Duplicate (⌘D)"
          style={{
            marginTop: '6px',
            width: '100%',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: hasSelection ? '#6366f1' : '#f3f4f6',
            color: hasSelection ? 'white' : '#9ca3af',
            border: 'none',
            borderRadius: '8px',
            cursor: hasSelection ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'all 0.2s ease',
            opacity: hasSelection ? 1 : 0.5,
          }}
          onMouseEnter={(e) => {
            if (hasSelection) {
              e.currentTarget.style.backgroundColor = '#5558e8';
            }
          }}
          onMouseLeave={(e) => {
            if (hasSelection) {
              e.currentTarget.style.backgroundColor = '#6366f1';
            }
          }}
        >
          <FiCopy size={16} />
          Duplicate {selectedCount > 1 && `(${selectedCount})`}
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: 'rgba(0, 0, 0, 0.08)' }} />

      {/* ARRANGE SECTION */}
      <div>
        <div style={{ 
          fontSize: '11px', 
          fontWeight: 700, 
          color: '#6b7280', 
          textTransform: 'uppercase', 
          letterSpacing: '0.5px',
          marginBottom: '8px',
          paddingLeft: '4px',
        }}>
          Arrange
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {layerActions.map((action) => {
            const Icon = action.icon;
            const isDisabled = action.disabled;
            
            return (
              <button
                key={action.id}
                onClick={() => !isDisabled && action.onClick?.()}
                disabled={isDisabled}
                title={action.tooltip}
                style={{
                  width: '100%',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  paddingLeft: '12px',
                  backgroundColor: 'transparent',
                  color: isDisabled ? '#d1d5db' : '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'all 0.15s ease',
                  opacity: isDisabled ? 0.4 : 1,
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!isDisabled) {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Icon size={16} />
                <span style={{ flex: 1 }}>{action.name}</span>
                <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600 }}>
                  {action.shortcut}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: 'rgba(0, 0, 0, 0.08)' }} />

      {/* LAYERS SECTION (Placeholder for future) */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <div style={{ 
          fontSize: '11px', 
          fontWeight: 700, 
          color: '#6b7280', 
          textTransform: 'uppercase', 
          letterSpacing: '0.5px',
          marginBottom: '8px',
          paddingLeft: '4px',
        }}>
          Layers {shapes && `(${shapes.length})`}
        </div>
        
        {/* Layers list - simple version */}
        <div style={{ 
          fontSize: '12px', 
          color: '#9ca3af', 
          padding: '12px 8px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          {shapes && shapes.length > 0 ? (
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              {shapes.slice().reverse().map((shape) => {
                const isSelected = selectedIds?.has(shape.id);
                return (
                  <div
                    key={shape.id}
                    style={{
                      padding: '8px',
                      backgroundColor: isSelected ? '#eff6ff' : 'white',
                      border: `1px solid ${isSelected ? '#6366f1' : '#e5e7eb'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => {
                      // Will implement selection from layers
                      console.log('Layer clicked:', shape.id);
                    }}
                  >
                    {/* Shape type icon */}
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '16px',
                    }}>
                      {shape.type === 'rectangle' && '⬜'}
                      {shape.type === 'circle' && '⚪'}
                      {shape.type === 'line' && '➖'}
                      {shape.type === 'text' && '📝'}
                    </div>
                    
                    {/* Shape info */}
                    <div style={{ flex: 1, textAlign: 'left', fontSize: '12px', color: '#374151' }}>
                      <div style={{ fontWeight: 600 }}>
                        {shape.type.charAt(0).toUpperCase() + shape.type.slice(1)}
                      </div>
                      {shape.text && (
                        <div style={{ fontSize: '11px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {shape.text}
                        </div>
                      )}
                    </div>
                    
                    {/* Color indicator */}
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        backgroundColor: shape.type === 'line' ? (shape.stroke || '#374151') : (shape.fill || '#cccccc'),
                        border: '1px solid rgba(0,0,0,0.1)',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div>No shapes yet</div>
          )}
        </div>
      </div>

      {/* Selection info at bottom */}
      {hasSelection && (
        <div style={{
          padding: '12px',
          backgroundColor: '#eff6ff',
          borderRadius: '8px',
          border: '1px solid #bfdbfe',
        }}>
          <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600 }}>
            {selectedCount} shape{selectedCount !== 1 ? 's' : ''} selected
          </div>
        </div>
      )}
    </div>
  );
};

export default LeftPanel;

