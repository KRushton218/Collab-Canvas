# Auth Context Performance Optimization

## Discovery Date
October 18, 2025

## Context
While investigating console errors near the Login component, I discovered a performance anti-pattern in the AuthContext that causes unnecessary re-renders across the application.

## The Problem

### Current Implementation (AuthContext.jsx)
```javascript
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {              // ❌ New object created on EVERY render
    currentUser,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
```

### Why This Is A Problem

1. **New object reference on every render**
   - JavaScript creates a new object literal on each render
   - Even though the function references (`signUp`, etc.) are stable
   - React Context compares values by reference, not by deep equality

2. **Cascading re-renders**
   - Every component using `useAuth()` re-renders when value changes
   - Happens even when actual auth state hasn't changed
   - Can trigger on any parent component re-render

3. **Performance impact multiplies**
   - `AppContent` re-renders unnecessarily
   - `Login` component re-renders unnecessarily  
   - `Navbar` re-renders unnecessarily
   - Any future auth consumers also affected

### Affected Components

Current consumers of `useAuth()`:
- `src/App.jsx` - AppContent component (checks currentUser)
- `src/components/Auth/Login.jsx` - Uses signIn, signUp, signInWithGoogle
- `src/components/Layout/Navbar.jsx` - Uses signOut (likely)

**Scope:** Medium impact now, high impact as app grows

## The Solution

### Use `useMemo` to memoize the context value

```javascript
import { createContext, useState, useEffect, useMemo } from 'react';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ✅ Memoize value - only recreates when dependencies change
  const value = useMemo(() => ({
    currentUser,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  }), [currentUser, loading]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
```

### Why This Works

1. **Stable reference when nothing changes**
   - `useMemo` returns same object reference if dependencies unchanged
   - Functions are already stable (imported from service)
   - Only recreates when `currentUser` or `loading` actually change

2. **Prevents unnecessary re-renders**
   - Context consumers only re-render when auth state actually changes
   - Parent component re-renders don't propagate unnecessarily

3. **Minimal code change**
   - Just wrap object in `useMemo`
   - Add `useMemo` to imports
   - Zero breaking changes

## Performance Impact

### Before
- AuthProvider renders → New value object → All consumers re-render
- Any parent re-render → AuthProvider re-renders → All consumers re-render
- **Unnecessary re-renders**: High frequency

### After
- AuthProvider renders → Same value object (if state unchanged) → No consumer re-renders
- Auth state changes → New value object → Consumers re-render (expected)
- **Unnecessary re-renders**: Zero

### Measurable Benefits

1. **Fewer React render cycles**
   - Reduces CPU usage during interactions
   - Smoother UI performance
   - Better battery life on mobile

2. **Scales better**
   - As more components use `useAuth()`, savings multiply
   - Prevents performance degradation as app grows

3. **Best practice compliance**
   - Follows React Context optimization guidelines
   - Prevents common performance pitfall
   - Sets good pattern for other contexts

## Risk Assessment

**Risk Level:** Very Low

**Why Safe:**
- Non-breaking change (same API surface)
- `useMemo` is stable React API (since React 16.8)
- Dependencies are explicit and correct
- Functions are already stable imports
- No test updates needed

**Potential Issues:**
- None identified - this is a pure optimization

## Implementation Plan

1. ✅ Document the issue and solution (this file)
2. Update `src/contexts/AuthContext.jsx` with `useMemo`
3. Test authentication flows:
   - Sign in with email/password
   - Sign up with email/password
   - Sign in with Google
   - Sign out
4. Verify no re-render issues in dev tools
5. Commit to current branch (`fix/console-errors`) or new branch
6. Build and verify no issues

## References

- [React Context Optimization](https://react.dev/reference/react/useContext#optimizing-re-renders-when-passing-objects-and-functions)
- [useMemo Documentation](https://react.dev/reference/react/useMemo)
- Similar pattern used in CanvasContext (already optimized)

## Decision

**Proceed with optimization** - Low risk, clear benefit, follows React best practices.

This is exactly the type of "nearby optimization" that makes sense:
- Discovered while working on auth
- Clear performance win
- Low effort, high value
- Sets good pattern for future contexts

