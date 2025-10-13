import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock environment variables for tests
if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  import.meta.env.VITE_FIREBASE_API_KEY = 'test-api-key';
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN = 'test-project.firebaseapp.com';
  import.meta.env.VITE_FIREBASE_PROJECT_ID = 'test-project';
  import.meta.env.VITE_FIREBASE_STORAGE_BUCKET = 'test-project.appspot.com';
  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID = 'test-sender-id';
  import.meta.env.VITE_FIREBASE_APP_ID = 'test-app-id';
  import.meta.env.VITE_FIREBASE_REALTIME_DATABASE_URL = 'https://test-project-default-rtdb.firebaseio.com';
}

// Extend expect with custom matchers from jest-dom
expect.extend({});

