import { useContext } from 'react';
import { CanvasContext } from '../../contexts/CanvasContext';

const BatchOperationIndicator = () => {
  const { batchOperationLoading, batchOperationProgress } = useContext(CanvasContext);

  if (!batchOperationLoading) return null;

  const { total, operation } = batchOperationProgress;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(255, 255, 255, 0.98)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '16px',
        padding: '32px 48px',
        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.15)',
        zIndex: 10000,
        pointerEvents: 'none',
        minWidth: '280px',
        textAlign: 'center',
      }}
    >
      {/* Spinner */}
      <div
        style={{
          width: '48px',
          height: '48px',
          border: '4px solid rgba(99, 102, 241, 0.2)',
          borderTop: '4px solid #6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 20px',
        }}
      />
      
      {/* Operation text */}
      <div
        style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '8px',
        }}
      >
        {operation} {total} shape{total !== 1 ? 's' : ''}...
      </div>
      
      {/* Subtext */}
      <div
        style={{
          fontSize: '14px',
          color: '#6b7280',
        }}
      >
        This will only take a moment
      </div>

      {/* Inject keyframes for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default BatchOperationIndicator;


