const CanvasHelpOverlay = () => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        left: '20px',
        maxWidth: '260px',
        padding: '14px 16px',
        borderRadius: '8px',
        backgroundColor: 'rgba(17, 24, 39, 0.85)',
        color: '#f9fafb',
        fontSize: '12px',
        lineHeight: 1.6,
        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.35)',
        backdropFilter: 'blur(6px)',
        zIndex: 1090,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>
        Quick Tips
      </div>
      <ul style={{ margin: 0, paddingLeft: '16px', listStyleType: 'disc' }}>
        <li>Scroll to zoom in and out.</li>
        <li>Hold the spacebar and drag to pan the canvas.</li>
        <li>Click a shape to select it, then drag its handles to resize.</li>
        <li>Press Delete or Backspace to remove the selected shape.</li>
      </ul>
    </div>
  );
};

export default CanvasHelpOverlay;
