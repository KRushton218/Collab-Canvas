// Simple Navbar Component
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

export const Navbar = ({ activeUsersCount = 0, onTogglePresence, showPresence }) => {
  const { currentUser, signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  // Reset photo error when user changes
  useEffect(() => {
    setPhotoError(false);
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Get first letter of display name for avatar
  const avatarLetter = currentUser?.displayName?.charAt(0).toUpperCase() || 'U';
  
  // Get photo URL - try main user object first, then provider data
  const photoURL = useMemo(() => {
    if (!currentUser) return null;
    
    // First try the main photoURL property
    if (currentUser.photoURL) {
      return currentUser.photoURL;
    }
    
    // Fallback: check provider data for Google sign-in
    if (currentUser.providerData?.length > 0) {
      const googleProvider = currentUser.providerData.find(p => p.providerId === 'google.com');
      if (googleProvider?.photoURL) {
        return googleProvider.photoURL;
      }
    }
    
    return null;
  }, [currentUser]);

  // Handle photo load error
  const handlePhotoError = () => {
    setPhotoError(true);
  };

  return (
    <>
      <nav style={{
        backgroundColor: '#1f2937',
        color: 'white',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        position: 'relative',
        zIndex: 1001,
      }}>
        <div style={{
          fontSize: '20px',
          fontWeight: 700,
          letterSpacing: '-0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18M3 9h18M3 15h18" />
          </svg>
          CollabCanvas
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          {/* Profile Chip with Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '6px 12px 6px 6px',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: 'white',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              {photoURL && !photoError ? (
                <img
                  src={photoURL}
                  alt={currentUser?.displayName}
                  onError={handlePhotoError}
                  referrerPolicy="no-referrer"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                }}>
                  {avatarLetter}
                </div>
              )}
              <span style={{
                fontSize: '14px',
                fontWeight: 500,
              }}>
                {currentUser?.displayName || 'User'}
              </span>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                style={{
                  transform: showProfileMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div style={{
                position: 'absolute',
                top: '48px',
                right: '0',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                minWidth: '200px',
                overflow: 'hidden',
                zIndex: 1002,
              }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#ef4444',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fef2f2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Active users indicator - now rightmost */}
          <button
            onClick={onTogglePresence}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              backgroundColor: showPresence ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              padding: '6px 14px',
              borderRadius: '20px',
              border: showPresence ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              color: 'white',
            }}
            onMouseEnter={(e) => {
              if (!showPresence) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (!showPresence) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
          >
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.3)',
            }} />
            <span style={{ fontWeight: 500 }}>
              {activeUsersCount} active
            </span>
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              style={{
                transform: showPresence ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Click outside to close profile menu */}
      {showProfileMenu && (
        <div
          onClick={() => setShowProfileMenu(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
          }}
        />
      )}
    </>
  );
};

