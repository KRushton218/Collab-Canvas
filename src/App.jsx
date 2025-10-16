import { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { CanvasProvider } from './contexts/CanvasContext';
import { useAuth } from './hooks/useAuth';
import { usePresence } from './hooks/usePresence';
import { Login } from './components/Auth/Login';
import { Navbar } from './components/Layout/Navbar';
import { PresenceList } from './components/Collaboration/PresenceList';
import { ReconnectModal } from './components/Collaboration/ReconnectModal';
import Canvas from './components/Canvas/Canvas';

// Main App Content (after authentication)
const AppContent = () => {
  const { currentUser } = useAuth();
  const { onlineUsers, isStale, sessionStart } = usePresence(currentUser?.uid, currentUser?.displayName);
  const [showPresence, setShowPresence] = useState(false);
  const [showReconnectModal, setShowReconnectModal] = useState(false);

  // Check for stale session and show modal on any interaction
  useEffect(() => {
    if (!isStale || !currentUser) return;

    const handleInteraction = () => {
      setShowReconnectModal(true);
    };

    // Listen for any user interaction
    window.addEventListener('mousedown', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [isStale, currentUser]);

  if (!currentUser) {
    return <Login />;
  }

  // Find current user's color from the online users list
  const currentUserData = onlineUsers.find(u => u.userId === currentUser?.uid);
  const currentUserColor = currentUserData?.cursorColor || '#000000';

  // Count only non-idle users as "active"
  const activeUsersCount = onlineUsers.filter(u => !u.isIdle).length;

  const togglePresence = () => {
    setShowPresence(!showPresence);
  };

  const handleReconnect = () => {
    // Force page reload to establish new session
    window.location.reload();
  };

  return (
    <CanvasProvider>
      <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
        {/* Navbar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}>
          <Navbar 
            activeUsersCount={activeUsersCount} 
            onTogglePresence={togglePresence}
            showPresence={showPresence}
          />
        </div>
        
        {/* Presence Roster - dropdown from navbar, only shown when toggled */}
        {showPresence && (
          <div style={{ 
            position: 'absolute', 
            top: '60px', 
            right: '16px', 
            zIndex: 999,
            animation: 'slideDown 0.2s ease-out',
          }}>
            <PresenceList users={onlineUsers} currentUserId={currentUser?.uid} />
          </div>
        )}
        
        <Canvas currentUserColor={currentUserColor} />

        {/* Reconnect Modal for stale sessions */}
        {showReconnectModal && <ReconnectModal onReconnect={handleReconnect} />}
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </CanvasProvider>
  );
};

// App component wrapped with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
