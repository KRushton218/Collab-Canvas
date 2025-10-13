import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/Auth/Login';
import { Navbar } from './components/Layout/Navbar';

// Placeholder Canvas component for now
const CanvasPlaceholder = () => {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Canvas Area</h2>
      <p className="text-gray-600">Canvas will be implemented in PR #3</p>
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p className="text-sm">Authenticated user is ready to collaborate!</p>
      </div>
    </div>
  );
};

// Main App Content (after authentication)
const AppContent = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <CanvasPlaceholder />
    </div>
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
