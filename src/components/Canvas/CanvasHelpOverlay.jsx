import { useState } from 'react';
import { FiHelpCircle, FiX } from 'react-icons/fi';

const CanvasHelpOverlay = () => {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    // Floating help button
    return (
      <button
        onClick={() => setIsOpen(true)}
        title="Keyboard Shortcuts"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: '#6366f1',
          color: 'white',
          border: 'none',
          boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 12px 24px rgba(99, 102, 241, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 16px rgba(99, 102, 241, 0.3)';
        }}
      >
        <FiHelpCircle size={24} />
      </button>
    );
  }

  // Full help overlay
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1200,
        }}
      />
      
      {/* Help panel */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          maxHeight: '80vh',
          overflowY: 'auto',
          padding: '24px',
          borderRadius: '16px',
          backgroundColor: 'white',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          zIndex: 1201,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#f3f4f6',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
            }}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Shortcuts grid */}
        <div style={{ display: 'grid', gap: '20px' }}>
          {/* Tools */}
          <ShortcutSection title="Tools">
            <Shortcut keys="V" description="Select tool" />
            <Shortcut keys="R" description="Rectangle tool" />
            <Shortcut keys="C" description="Circle tool" />
            <Shortcut keys="L" description="Line tool" />
            <Shortcut keys="T" description="Text tool" />
            <Shortcut keys="Esc" description="Return to Select / Deselect" />
          </ShortcutSection>

          {/* Edit */}
          <ShortcutSection title="Edit">
            <Shortcut keys="⌘Z" description="Undo" />
            <Shortcut keys="⌘⇧Z" description="Redo" />
            <Shortcut keys="⌘C" description="Copy selected" />
            <Shortcut keys="⌘V" description="Paste" />
            <Shortcut keys="⌘D" description="Duplicate selected" />
            <Shortcut keys="⌘A" description="Select all" />
            <Shortcut keys="⌫" description="Delete selected" />
          </ShortcutSection>

          {/* Arrange */}
          <ShortcutSection title="Arrange">
            <Shortcut keys="⌘]" description="Bring to front" />
            <Shortcut keys="⌘[" description="Send to back" />
            <Shortcut keys="←→↑↓" description="Move selected (1px)" />
            <Shortcut keys="⇧ + ←→↑↓" description="Move selected (10px)" />
          </ShortcutSection>

          {/* View */}
          <ShortcutSection title="View">
            <Shortcut keys="⌘ + Scroll" description="Zoom in/out" />
            <Shortcut keys="Space + Drag" description="Pan canvas" />
            <Shortcut keys="⌘0" description="Reset view" />
          </ShortcutSection>

          {/* Selection */}
          <ShortcutSection title="Selection">
            <Shortcut keys="⇧ + Click" description="Toggle shape in selection" />
            <Shortcut keys="Click + Drag" description="Drag selection box" />
            <Shortcut keys="⇧ + Drag Box" description="Toggle multiple shapes" />
          </ShortcutSection>
        </div>
      </div>
    </>
  );
};

// Helper component for shortcut sections
const ShortcutSection = ({ title, children }) => (
  <div>
    <div style={{ 
      fontSize: '11px', 
      fontWeight: 700, 
      color: '#6b7280', 
      textTransform: 'uppercase', 
      letterSpacing: '0.5px',
      marginBottom: '10px' 
    }}>
      {title}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {children}
    </div>
  </div>
);

// Helper component for individual shortcuts
const Shortcut = ({ keys, description }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <span style={{ fontSize: '13px', color: '#374151' }}>{description}</span>
    <kbd style={{
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: '#f3f4f6',
      border: '1px solid #d1d5db',
      fontSize: '12px',
      fontWeight: 600,
      color: '#374151',
      fontFamily: 'monospace',
    }}>
      {keys}
    </kbd>
  </div>
);

export default CanvasHelpOverlay;
