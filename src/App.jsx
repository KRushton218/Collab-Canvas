import { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { CanvasProvider } from './contexts/CanvasContext';
import { useAuth } from './hooks/useAuth';
import { usePresence } from './hooks/usePresence';
import { Login } from './components/Auth/Login';
import { Navbar } from './components/Layout/Navbar';
import { PresenceList } from './components/Collaboration/PresenceList';
import Canvas from './components/Canvas/Canvas';

// Main App Content (after authentication)
const AppContent = () => {
  const { currentUser } = useAuth();
  const { onlineUsers } = usePresence(currentUser?.uid, currentUser?.displayName);
  const [showPresence, setShowPresence] = useState(false);

  if (!currentUser) {
    return <Login />;
  }

  // Find current user's color from the online users list
  const currentUserData = onlineUsers.find(u => u.userId === currentUser?.uid);
  const currentUserColor = currentUserData?.cursorColor || '#000000';

  const togglePresence = () => {
    setShowPresence(!showPresence);
  };

  return (
    <CanvasProvider>
      <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
        {/* Navbar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}>
          <Navbar 
            onlineUsersCount={onlineUsers.length} 
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
