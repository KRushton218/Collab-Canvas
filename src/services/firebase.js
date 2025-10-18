// Firebase Configuration and Initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_REALTIME_DATABASE_URL,
};

// Validate that all required environment variables are present
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_REALTIME_DATABASE_URL',
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !import.meta.env[varName]
);

if (missingEnvVars.length > 0) {
  console.error(
    'Missing required Firebase environment variables:',
    missingEnvVars.join(', ')
  );
  console.error('Please copy .env.example to .env and fill in your Firebase credentials');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);  // Firestore for persistent canvas state
export const rtdb = getDatabase(app); // Realtime Database for cursors and presence

// Connect to emulators if VITE_USE_EMULATOR is true
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  console.log('🧪 Connecting to Firebase Emulators...');
  
  try {
    connectFirestoreEmulator(db, 'localhost', 8081);
    console.log('✅ Connected to Firestore Emulator (localhost:8081)');
  } catch (error) {
    // Emulator already connected or other error
    if (!error.message.includes('already connected')) {
      console.error('❌ Firestore Emulator connection error:', error);
    }
  }
  
  try {
    connectDatabaseEmulator(rtdb, 'localhost', 9001);
    console.log('✅ Connected to Realtime Database Emulator (localhost:9001)');
  } catch (error) {
    // Emulator already connected or other error
    if (!error.message.includes('already connected')) {
      console.error('❌ Realtime Database Emulator connection error:', error);
    }
  }
}

// Export the app instance for any additional configuration
export default app;

