// Authentication Service
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';

/**
 * Extract display name from email (prefix before @)
 * Truncate to max 20 characters if needed
 */
export const getDisplayNameFromEmail = (email) => {
  if (!email) return 'Anonymous';
  const prefix = email.split('@')[0];
  return prefix.length > 20 ? prefix.substring(0, 20) : prefix;
};

/**
 * Truncate display name to max 20 characters
 */
export const truncateDisplayName = (name) => {
  if (!name) return 'Anonymous';
  return name.length > 20 ? name.substring(0, 20) : name;
};

/**
 * Sign up with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} displayName - Optional display name (will use email prefix if not provided)
 * @returns {Promise<UserCredential>}
 */
export const signUp = async (email, password, displayName = null) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Set display name: use provided name or extract from email
    const finalDisplayName = displayName 
      ? truncateDisplayName(displayName)
      : getDisplayNameFromEmail(email);
    
    // Update user profile with display name
    await updateProfile(userCredential.user, {
      displayName: finalDisplayName,
    });
    
    return userCredential;
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
};

/**
 * Sign in with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<UserCredential>}
 */
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // If user doesn't have a display name yet, set it from email
    if (!userCredential.user.displayName) {
      const displayName = getDisplayNameFromEmail(email);
      await updateProfile(userCredential.user, { displayName });
    }
    
    return userCredential;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

/**
 * Sign in with Google
 * Uses Google display name with truncation if needed
 * Preserves photoURL from Google profile
 * @returns {Promise<UserCredential>}
 */
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    // Request profile and email scopes
    provider.addScope('profile');
    provider.addScope('email');
    
    const userCredential = await signInWithPopup(auth, provider);
    
    // Google provides display name and photoURL automatically
    // Truncate name if needed, but preserve photoURL
    if (userCredential.user.displayName && userCredential.user.displayName.length > 20) {
      const truncatedName = truncateDisplayName(userCredential.user.displayName);
      await updateProfile(userCredential.user, { 
        displayName: truncatedName,
        photoURL: userCredential.user.photoURL // Preserve the photoURL
      });
    }
    
    return userCredential;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
};

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

/**
 * Update user's display name
 * @param {string} displayName - New display name (will be truncated to 20 chars)
 * @returns {Promise<void>}
 */
export const updateUserDisplayName = async (displayName) => {
  try {
    if (!auth.currentUser) {
      throw new Error('No user logged in');
    }
    
    const truncatedName = truncateDisplayName(displayName);
    await updateProfile(auth.currentUser, { displayName: truncatedName });
  } catch (error) {
    console.error('Update display name error:', error);
    throw error;
  }
};

