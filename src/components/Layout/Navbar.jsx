// Simple Navbar Component
import { useAuth } from '../../hooks/useAuth';

export const Navbar = ({ onlineUsersCount = 0 }) => {
  const { currentUser, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="bg-gray-800 text-white px-4 py-3 flex justify-between items-center">
      <div className="text-xl font-bold">CollabCanvas</div>
      
      <div className="flex items-center gap-4">
        {/* Online users indicator */}
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>{onlineUsersCount} online</span>
        </div>
        
        <span className="text-sm">
          {currentUser?.displayName || 'User'}
        </span>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 px-4 py-1 rounded text-sm"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

