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

  if (!currentUser) {
    return <Login />;
  }

  // Find current user's color from the online users list
  const currentUserData = onlineUsers.find(u => u.userId === currentUser?.uid);
  const currentUserColor = currentUserData?.cursorColor || '#000000';

  return (
    <CanvasProvider>
      <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
        {/* Navbar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}>
          <Navbar onlineUsersCount={onlineUsers.length} />
        </div>
        
        {/* Presence Roster - positioned on right side below navbar */}
        <div style={{ 
          position: 'absolute', 
          top: '60px', 
          right: '16px', 
          zIndex: 999 
        }}>
          <PresenceList users={onlineUsers} currentUserId={currentUser?.uid} />
        </div>
        
        <Canvas currentUserColor={currentUserColor} />
      </div>
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
