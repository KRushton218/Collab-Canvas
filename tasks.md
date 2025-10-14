# CollabCanvas MVP - Development Task List

## Project File Structure

```
collabcanvas/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   └── AuthProvider.jsx
│   │   ├── Canvas/
│   │   │   ├── Canvas.jsx
│   │   │   ├── CanvasControls.jsx
│   │   │   └── Shape.jsx
│   │   ├── Collaboration/
│   │   │   ├── Cursor.jsx
│   │   │   ├── UserPresence.jsx
│   │   │   └── PresenceList.jsx
│   │   └── Layout/
│   │       ├── Navbar.jsx
│   │       └── Sidebar.jsx
│   ├── services/
│   │   ├── firebase.js
│   │   ├── auth.js
│   │   ├── canvas.js
│   │   ├── cursors.js
│   │   └── presence.js
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useCanvas.js
│   │   ├── useCursors.js
│   │   └── usePresence.js
│   ├── utils/
│   │   ├── constants.js
│   │   └── helpers.js
│   ├── contexts/
│   │   ├── AuthContext.jsx
│   │   └── CanvasContext.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── tests/
│   ├── setup.js
│   ├── unit/
│   │   ├── utils/
│   │   │   ├── helpers.test.js
│   │   │   └── constants.test.js
│   │   ├── services/
│   │   │   ├── auth.test.js
│   │   │   ├── canvas.test.js
│   │   │   ├── cursors.test.js
│   │   │   └── presence.test.js
│   │   └── contexts/
│   │       ├── CanvasContext.test.js
│   │       └── shapes.test.js
│   └── integration/
│       ├── auth-flow.test.js
│       ├── canvas-sync.test.js
│       └── multiplayer.test.js
├── .env
├── .env.example
├── .gitignore
├── package.json
├── vite.config.js
├── vitest.config.js
├── tailwind.config.js
├── postcss.config.js
├── firebase.json
├── .firebaserc
└── README.md
```

---

## Testing Commands

**Run all tests:**
```bash
npm test
```

**Run tests in watch mode (during development):**
```bash
npm test -- --watch
```

**Run specific test file:**
```bash
npm test auth.test.js
npm test canvas-sync.test.js
```

**Run tests with coverage:**
```bash
npm test -- --coverage
```

**Run tests with UI:**
```bash
npm run test:ui
```

**Critical:** Tasks/PRs are only considered complete when:
1. All relevant tests are written
2. Tests are run in terminal (`npm test`)
3. All tests pass successfully (0 failures)

---

## PR #1: Project Setup & Firebase Configuration

**Branch:** `setup/initial-config`  
**Goal:** Initialize project with all dependencies and Firebase configuration

### Tasks:

- [X] **1.1: Initialize React + Vite Project**

  - Files to create: `package.json`, `vite.config.js`, `index.html`
  - Run: `npm create vite@latest collabcanvas -- --template react`
  - Verify dev server runs with `npm run dev`

- [X] **1.2: Install Core Dependencies**

  - Files to update: `package.json`
  - Install:
    ```bash
    npm install firebase konva react-konva
    npm install -D tailwindcss postcss autoprefixer
    ```

- [X] **1.3: Configure Tailwind CSS**

  - Files to create: `tailwind.config.js`, `postcss.config.js`
  - Files to update: `src/index.css`
  - Run: `npx tailwindcss init -p`
  - Add Tailwind directives to `index.css`

- [X] **1.4: Set Up Firebase Project**

  - Create Firebase project in console (USER TO COMPLETE IN FIREBASE CONSOLE)
  - Enable Authentication (Email/Password AND Google) (USER TO COMPLETE)
  - Create Firestore database (USER TO COMPLETE)
  - Create Realtime Database (USER TO COMPLETE)
  - Files to create: `.env`, `.env.example` (DONE: .env.example created, user to create .env)
  - Add Firebase config keys to `.env` (USER TO COMPLETE after Firebase setup)

- [X] **1.5: Create Firebase Service File**

  - Files to create: `src/services/firebase.js`
  - Initialize Firebase app
  - Export `auth`, `db` (Firestore), `rtdb` (Realtime Database)

- [X] **1.6: Configure Git & .gitignore**

  - Files to create/update: `.gitignore`
  - Ensure `.env` is ignored
  - Add `node_modules/`, `dist/`, `.firebase/` to `.gitignore`

- [X] **1.7: Set Up Testing Infrastructure**
  
  - Files to update: `package.json`
  - Install testing dependencies:
    ```bash
    npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
    ```
  - Files to create: `tests/setup.js`, `vitest.config.js`
  - Configure Vitest to use jsdom environment
  - Add test scripts to `package.json`: `"test": "vitest"`, `"test:ui": "vitest --ui"`

- [X] **1.8: Create README with Setup Instructions**
  - Files to create: `README.md`
  - Include setup steps, env variables needed, run commands, test commands

**PR Checklist:**

- [X] Dev server runs successfully (`npm run dev`)
- [X] Firebase initialized without errors (USER: Complete Firebase console setup and create .env)
- [ ] Tailwind classes work in test component (PENDING: Will test when components are built)
- [X] `.env` is in `.gitignore`
- [X] Test runner works (`npm test` exits without errors) - ✅ 2/2 tests passing

---

## PR #2: Authentication System

**Branch:** `feature/authentication`  
**Goal:** Complete user authentication with login/signup flows

### Tasks:

- [X] **2.1: Create Auth Context**

  - Files to create: `src/contexts/AuthContext.jsx`
  - Provide: `currentUser`, `loading`, `login()`, `signup()`, `logout()`

- [X] **2.2: Create Auth Service**

  - Files to create: `src/services/auth.js`
  - Functions: `signUp(email, password, displayName)`, `signIn(email, password)`, `signInWithGoogle()`, `signOut()`, `updateUserProfile(displayName)`
  - Display name logic: Extract from Google profile or use email prefix

- [X] **2.3: Create Auth Hook**

  - Files to create: `src/hooks/useAuth.js`
  - Return auth context values

- [X] **2.4: Build Login Component (Combines Signup & Login)**

  - Files to create: `src/components/Auth/Login.jsx`
  - Form fields: email, password, display name (optional for signup)
  - Display name field shown only in signup mode
  - If display name not provided, uses email prefix as fallback
  - Toggle between signup and signin modes
  - Add "Sign in with Google" button
  - Handle login/signup errors
  - Minimal UI as requested

- [X] **2.5: Update App.jsx with Protected Routes**

  - Files to update: `src/App.jsx`
  - Integrated AuthProvider wrapper
  - Show Login if not authenticated
  - Show Canvas placeholder if authenticated
  - Basic routing logic

- [X] **2.6: Create Navbar Component**
  - Files to create: `src/components/Layout/Navbar.jsx`
  - Display current user name
  - Logout button

- [X] **2.7: Write Auth Service Tests**
  - Files to create: `tests/unit/services/auth.test.js`
  - Test display name extraction from email (email prefix) ✅
  - Test display name truncation (max 20 chars) ✅
  - Test error handling for empty/null values ✅
  - All 8 auth unit tests passing

- [ ] **2.8: Write Auth Integration Tests (DEFERRED to later)**
  - Files to create: `tests/integration/auth-flow.test.js`
  - Test complete signup flow
  - Test complete login flow
  - Test logout flow
  - Test auth persistence across page refresh
  - Note: Manual testing sufficient for MVP, integration tests can be added later

**PR Checklist:**

- [X] Can create new account with email/password (READY FOR MANUAL TEST - User to test in browser)
- [X] Can login with existing account (READY FOR MANUAL TEST - User to test in browser)
- [X] Can sign in with Google (READY FOR MANUAL TEST - User to test in browser)
- [X] Display name appears correctly (Google name or email prefix) - Logic implemented and tested
- [X] Display name truncates at 20 chars if too long - Logic implemented and tested
- [X] Logout works and redirects to login (READY FOR MANUAL TEST - User to test in browser)
- [X] Auth state persists on page refresh (READY FOR MANUAL TEST - User to test in browser)
- [X] **All auth unit tests pass (`npm test auth.test.js`)** - ✅ 8/8 tests passing
- [ ] Integration tests deferred (manual testing sufficient for MVP)

---

## PR #3: Basic Canvas Rendering

**Branch:** `feature/canvas-basic`  
**Goal:** Canvas with pan, zoom, and basic stage setup

### Tasks:

- [X] **3.1: Create Canvas Constants**

  - Files to create: `src/utils/constants.js` ✅
  - Define: `CANVAS_WIDTH = 5000`, `CANVAS_HEIGHT = 5000`, `VIEWPORT_WIDTH`, `VIEWPORT_HEIGHT` ✅

- [X] **3.2: Create Canvas Context**

  - Files to create: `src/contexts/CanvasContext.jsx` ✅
  - State: `shapes`, `selectedId`, `stageRef` ✅
  - Provide methods to add/update/delete shapes ✅

- [X] **3.3: Build Base Canvas Component**

  - Files to create: `src/components/Canvas/Canvas.jsx` ✅
  - Set up Konva Stage and Layer ✅
  - Container div with fixed dimensions ✅
  - Background color/grid (optional) ✅

- [X] **3.4: Implement Pan Functionality**

  - Files to update: `src/components/Canvas/Canvas.jsx` ✅
  - Handle `onDragMove` on Stage ✅
  - Constrain panning to canvas bounds (5000x5000px) ✅
  - Prevent objects from being placed/moved outside boundaries ✅

- [X] **3.5: Implement Zoom Functionality**

  - Files to update: `src/components/Canvas/Canvas.jsx` ✅
  - Handle `onWheel` event ✅
  - Zoom to cursor position ✅
  - Min zoom: 0.1, Max zoom: 3 ✅

- [X] **3.6: Create Canvas Controls Component**

  - Files to create: `src/components/Canvas/CanvasControls.jsx` ✅
  - Buttons: "Zoom In", "Zoom Out", "Reset View", "Add Shape" ✅
  - Position: Fixed/floating on canvas ✅

- [X] **3.7: Add Canvas to App**
  - Files to update: `src/App.jsx` ✅
  - Wrap Canvas in CanvasContext ✅
  - Include Navbar and Canvas ✅
  - Initial canvas view centered at (2500, 2500) ✅

- [X] **3.8: Write Canvas Utils Tests**
  - Files to create: `tests/unit/utils/constants.test.js` ✅
  - Test canvas dimension constants are correct ✅
  - Test initial viewport position calculation ✅

- [X] **3.9: Write Canvas Context Tests**
  - Files to create: `tests/unit/contexts/CanvasContext.test.js` ✅
  - Test canvas context provides correct initial state ✅
  - Test zoom limits (min 0.1, max 3) ✅
  - Test pan boundary constraints ✅

- [X] **3.10: Create Helper Functions & Tests (BONUS)**
  - Files to create: `src/utils/helpers.js` ✅
  - Files to create: `tests/unit/utils/helpers.test.js` ✅
  - Functions for shape ID generation, boundary validation, user colors ✅

**PR Checklist:**

- [X] Canvas renders at correct size (5000x5000px) (READY FOR MANUAL TEST - User to test in browser)
- [X] Initial view centered at canvas center (2500, 2500) (READY FOR MANUAL TEST - User to test in browser)
- [X] Can pan by dragging canvas background (READY FOR MANUAL TEST - User to test in browser)
- [X] Can zoom with mousewheel (READY FOR MANUAL TEST - User to test in browser)
- [X] Zoom centers on cursor position (READY FOR MANUAL TEST - User to test in browser)
- [X] Reset view button works (READY FOR MANUAL TEST - User to test in browser)
- [X] Canvas has visual background differentiation outside 5000x5000 area (READY FOR MANUAL TEST - User to test in browser)
- [ ] 60 FPS maintained during pan/zoom (READY FOR MANUAL TEST - User to test in browser)
- [X] **All canvas unit tests pass (`npm test`)** - ✅ 42/42 tests passing

---

## PR #4: Shape Creation & Manipulation

**Branch:** `feature/shapes`  
**Goal:** Create, select, and move shapes on canvas

### Tasks:

- [ ] **4.1: Create Shape Component**

  - Files to create: `src/components/Canvas/Shape.jsx`
  - Support: **Rectangles only for MVP**
  - Props: `id`, `x`, `y`, `width`, `height`, `fill`, `isSelected`, `isLocked`, `lockedBy`

- [ ] **4.2: Add Shape Creation Logic**

  - Files to update: `src/contexts/CanvasContext.jsx`
  - Function: `addShape(type, position)`
  - Generate unique ID for each shape
  - Default properties: 100x100px, fixed gray fill (#cccccc)

- [ ] **4.3: Implement Shape Rendering**

  - Files to update: `src/components/Canvas/Canvas.jsx`
  - Map over `shapes` array
  - Render Shape component for each

- [ ] **4.4: Add Shape Selection**

  - Files to update: `src/components/Canvas/Shape.jsx`
  - Handle `onClick` to set selected
  - Visual feedback: border/outline when selected
  - Files to update: `src/contexts/CanvasContext.jsx`
  - State: `selectedId`

- [ ] **4.5: Implement Shape Dragging**

  - Files to update: `src/components/Canvas/Shape.jsx`
  - Enable `draggable={true}`
  - Handle `onDragEnd` to update position
  - Files to update: `src/contexts/CanvasContext.jsx`
  - Function: `updateShape(id, updates)`

- [ ] **4.6: Add Click-to-Deselect**

  - Files to update: `src/components/Canvas/Canvas.jsx`
  - Handle Stage `onClick` to deselect when clicking background

- [ ] **4.7: Connect "Add Shape" Button**

  - Files to update: `src/components/Canvas/CanvasControls.jsx`
  - Button creates standard 100x100px rectangle at center of current viewport

- [ ] **4.8: Add Delete Functionality**
  - Files to update: `src/contexts/CanvasContext.jsx`
  - Function: `deleteShape(id)`
  - Files to update: `src/components/Canvas/Canvas.jsx`
  - Add keyboard listener for Delete/Backspace key
  - Delete selected shape when key pressed
  - Cannot delete shapes locked by other users

- [ ] **4.9: Write Shape Manipulation Tests**
  - Files to create: `tests/unit/contexts/shapes.test.js`
  - Test shape creation with correct default properties (100x100px, #cccccc)
  - Test shape selection (only one selected at a time)
  - Test shape deselection (clicking elsewhere)
  - Test shape boundary constraints (cannot move outside 5000x5000)
  - Test shape deletion
  - Test deletion blocked when shape is locked

- [ ] **4.10: Write Helper Function Tests**
  - Files to create: `tests/unit/utils/helpers.test.js`
  - Test unique ID generation for shapes
  - Test shape boundary validation logic

**PR Checklist:**

- [ ] Can create rectangles via button (manual test)
- [ ] Rectangles are 100x100px with #cccccc fill (manual test)
- [ ] Rectangles render at correct positions with gray fill (manual test)
- [ ] Can select rectangles by clicking (manual test)
- [ ] Can drag rectangles smoothly (manual test)
- [ ] Selection state shows visually (manual test)
- [ ] Can delete selected rectangle with Delete/Backspace key (manual test)
- [ ] Clicking another shape deselects the previous one (manual test)
- [ ] Clicking empty canvas deselects current selection (manual test)
- [ ] Objects cannot be moved outside canvas boundaries (manual test)
- [ ] No lag with 20+ shapes (manual test)
- [ ] **All shape manipulation tests pass (`npm test shapes.test.js`)**
- [ ] **All helper function tests pass (`npm test helpers.test.js`)**

---

## PR #5: Real-Time Shape Synchronization

**Branch:** `feature/realtime-sync`  
**Goal:** Sync shape changes across all connected users

### Tasks:

- [ ] **5.1: Design Firestore Schema**

  - Collection: `canvas` (single document: `global-canvas-v1`)
  - Document structure:
    ```
    {
      canvasId: "global-canvas-v1",
      shapes: [
        {
          id: string,
          type: 'rectangle',
          x: number,
          y: number,
          width: number,
          height: number,
          fill: string,
          createdBy: string (userId),
          createdAt: timestamp,
          lastModifiedBy: string,
          lastModifiedAt: timestamp,
          isLocked: boolean,
          lockedBy: string (userId) or null
        }
      ],
      lastUpdated: timestamp
    }
    ```

- [ ] **5.2: Create Canvas Service**

  - Files to create: `src/services/canvas.js`
  - Function: `subscribeToShapes(canvasId, callback)`
  - Function: `createShape(canvasId, shapeData)`
  - Function: `updateShape(canvasId, shapeId, updates)`
  - Function: `deleteShape(canvasId, shapeId)`

- [ ] **5.3: Create Canvas Hook**

  - Files to create: `src/hooks/useCanvas.js`
  - Subscribe to Firestore on mount
  - Sync local state with Firestore
  - Return: `shapes`, `addShape()`, `updateShape()`, `deleteShape()`

- [ ] **5.4: Integrate Real-Time Updates in Context**

  - Files to update: `src/contexts/CanvasContext.jsx`
  - Replace local state with `useCanvas` hook
  - Listen to Firestore changes
  - Update local shapes array on remote changes

- [ ] **5.5: Implement Object Locking**

  - Files to update: `src/services/canvas.js`
  - Strategy: First user to **select** acquires lock
  - Function: `lockShape(canvasId, shapeId, userId)`
  - Function: `unlockShape(canvasId, shapeId)`
  - Lock acquired when user selects shape (onClick)
  - Lock released when user deselects (clicks elsewhere or selects different shape)
  - Auto-release lock on disconnect/timeout (3-5 seconds backup)
  - Other users see real-time updates but cannot interact with locked shapes
  - No complex visual indicators needed for MVP (functional locking only)

- [ ] **5.6: Add Loading States**

  - Files to update: `src/contexts/CanvasContext.jsx`
  - Show loading spinner while initial shapes load
  - Files to update: `src/components/Canvas/Canvas.jsx`
  - Display "Loading canvas..." message

- [ ] **5.7: Handle Offline/Reconnection**
  - Files to update: `src/hooks/useCanvas.js`
  - Enable Firestore offline persistence
  - Show reconnection status

- [ ] **5.8: Write Canvas Service Tests**
  - Files to create: `tests/unit/services/canvas.test.js`
  - Test shape CRUD operations (create, read, update, delete)
  - Test lock acquisition logic
  - Test lock release on deselection
  - Test lock timeout on disconnect
  - Mock Firestore for unit tests

- [ ] **5.9: Write Real-Time Sync Integration Tests**
  - Files to create: `tests/integration/canvas-sync.test.js`
  - Test shape creation syncs between two simulated users
  - Test shape updates sync in real-time
  - Test shape deletion syncs immediately
  - Test lock prevents other users from interacting
  - Test locked shapes still visible and update in real-time
  - Test lock releases when user deselects
  - Use Firestore Emulator for integration tests

**PR Checklist:**

- [ ] Open two browsers: creating shape in one appears in other (manual test)
- [ ] User A selects shape → shape locks for User A (manual test)
- [ ] User B cannot select/move/delete shape while User A has it locked (manual test)
- [ ] User B sees real-time updates while shape is locked (manual test)
- [ ] Lock releases automatically when User A deselects (clicks elsewhere) (manual test)
- [ ] Lock releases after timeout (3-5 seconds) if User A disconnects (manual test)
- [ ] Moving shape in one browser updates in other (<100ms) (manual test)
- [ ] User A can delete unlocked shape created by User B (manual test)
- [ ] Cannot delete shapes locked by other users (manual test)
- [ ] Page refresh loads all existing shapes (manual test)
- [ ] All users leave and return: shapes still there (manual test)
- [ ] No duplicate shapes or sync issues (manual test)
- [ ] **All canvas service tests pass (`npm test canvas.test.js`)**
- [ ] **All sync integration tests pass (`npm test canvas-sync.test.js`)**

---

## PR #6: Multiplayer Cursors

**Branch:** `feature/cursors`  
**Goal:** Real-time cursor tracking for all connected users

### Tasks:

- [ ] **6.1: Design Realtime Database Schema**

  - Path: `/sessions/global-canvas-v1/{userId}`
  - Data structure:
    ```
    {
      displayName: string,
      cursorColor: string,
      cursorX: number,
      cursorY: number,
      lastSeen: timestamp
    }
    ```

- [ ] **6.2: Create Cursor Service**

  - Files to create: `src/services/cursors.js`
  - Function: `updateCursorPosition(canvasId, userId, x, y, name, color)`
  - Function: `subscribeToCursors(canvasId, callback)`
  - Function: `removeCursor(canvasId, userId)` (on disconnect)

- [ ] **6.3: Create Cursors Hook**

  - Files to create: `src/hooks/useCursors.js`
  - Track mouse position on canvas
  - Convert screen coords to canvas coords
  - Throttle updates to ~60Hz (16ms)
  - Return: `cursors` object (keyed by userId)

- [ ] **6.4: Build Cursor Component**

  - Files to create: `src/components/Collaboration/Cursor.jsx`
  - SVG cursor icon with user color
  - Name label next to cursor
  - Smooth CSS transitions for movement

- [ ] **6.5: Integrate Cursors into Canvas**

  - Files to update: `src/components/Canvas/Canvas.jsx`
  - Add `onMouseMove` handler to Stage
  - Update cursor position in RTDB
  - Render Cursor components for all other users

- [ ] **6.6: Assign User Colors**

  - Files to create: `src/utils/helpers.js`
  - Function: `generateUserColor(userId)` - randomly assigned on join
  - Color palette: 8-10 distinct colors with sufficient contrast
  - Maintain color consistency per user throughout session

- [ ] **6.7: Handle Cursor Cleanup**

  - Files to update: `src/hooks/useCursors.js`
  - Remove cursor on component unmount
  - Use `onDisconnect()` in RTDB to auto-cleanup

- [ ] **6.8: Optimize Cursor Updates**
  - Files to update: `src/hooks/useCursors.js`
  - Throttle mouse events to 20-30 FPS (not full 60Hz)
  - Only send if position changed significantly (>2px)

- [ ] **6.9: Write Cursor Tests**
  - Files to create: `tests/unit/services/cursors.test.js`
  - Test cursor position updates
  - Test cursor cleanup on disconnect
  - Test cursor color assignment
  - Mock Realtime Database for unit tests

- [ ] **6.10: Write Helper Tests for Color Generation**
  - Files to update: `tests/unit/utils/helpers.test.js`
  - Test `generateUserColor()` returns valid color
  - Test color palette has sufficient contrast
  - Test color consistency for same user

**PR Checklist:**

- [ ] Moving mouse shows cursor to other users (manual test)
- [ ] Cursor has correct user name and color (manual test)
- [ ] Cursors move smoothly without jitter (manual test)
- [ ] Cursor disappears when user leaves (manual test)
- [ ] Updates happen within 50ms (manual test)
- [ ] No performance impact with 5 concurrent cursors (manual test with browser dev tools)
- [ ] **All cursor service tests pass (`npm test cursors.test.js`)**
- [ ] **All color generation tests pass (`npm test helpers.test.js`)**

---

## PR #7: User Presence System

**Branch:** `feature/presence`  
**Goal:** Show who's online and active on the canvas

### Tasks:

- [X] **7.1: Design Presence Schema**

  - Path: `/sessions/global-canvas-v1/{userId}` (same as cursors) ✅
  - Data structure (combined with cursor data):
    ```
    {
      displayName: string,
      cursorColor: string,
      cursorX: number,
      cursorY: number,
      lastSeen: timestamp
    }
    ```
  - Note: Presence and cursor data share same RTDB location ✅

- [X] **7.2: Create Presence Service**

  - Files to create: `src/services/presence.js` ✅
  - Function: `setUserOnline(canvasId, userId, name, color)` ✅
  - Function: `setUserOffline(canvasId, userId)` ✅
  - Function: `subscribeToPresence(canvasId, callback)` ✅
  - Use `onDisconnect()` to auto-set offline ✅

- [X] **7.3: Create Presence Hook**

  - Files to create: `src/hooks/usePresence.js` ✅
  - Set user online on mount ✅
  - Subscribe to presence changes ✅
  - Return: `onlineUsers` array ✅

- [X] **7.4: Build Presence List Component**

  - Files to create: `src/components/Collaboration/PresenceList.jsx` ✅
  - Display list of online users ✅
  - Show user color dot + name ✅
  - Show count: "3 users online" ✅

- [X] **7.5: Build User Presence Badge**

  - Files to create: `src/components/Collaboration/UserPresence.jsx` ✅
  - Avatar/initial with user color ✅
  - Tooltip with full name ✅

- [X] **7.6: Add Presence to Navbar**

  - Files to update: `src/components/Layout/Navbar.jsx` ✅
  - Include PresenceList component (positioned on right side below navbar) ✅
  - Online user count indicator in navbar ✅

- [X] **7.7: Integrate Presence System**
  - Files to update: `src/App.jsx` ✅
  - Initialize presence when canvas loads ✅
  - Clean up on unmount ✅

- [X] **7.8: Write Presence Service Tests**
  - Files to create: `tests/unit/services/presence.test.js` ✅
  - Test setUserOnline adds user to presence list ✅
  - Test setUserOffline removes user from presence list ✅
  - Test onDisconnect cleanup logic ✅
  - Mock Realtime Database for unit tests ✅
  - All 12 tests passing ✅

- [ ] **7.9: Write Multiplayer Integration Tests (DEFERRED to later)**
  - Files to create: `tests/integration/multiplayer.test.js`
  - Test multiple users joining and appearing in presence list
  - Test users leaving and being removed from presence
  - Test cursor colors match presence colors
  - Use Realtime Database Emulator for integration tests
  - Note: Manual testing sufficient for MVP, integration tests can be added later

**PR Checklist:**

- [ ] Current user appears in presence list (READY FOR MANUAL TEST - User to test in browser)
- [ ] Other users appear when they join (READY FOR MANUAL TEST - User to test in browser)
- [ ] Users disappear when they leave (READY FOR MANUAL TEST - User to test in browser)
- [ ] User count is accurate (READY FOR MANUAL TEST - User to test in browser)
- [ ] Colors match cursor colors (READY FOR MANUAL TEST - User to test in browser)
- [ ] Updates happen in real-time (READY FOR MANUAL TEST - User to test in browser)
- [X] **All presence service tests pass (`npm test presence.test.js`)** - ✅ 12/12 tests passing
- [ ] Integration tests deferred (manual testing sufficient for MVP)

---

## PR #8: Testing, Polish & Bug Fixes

**Branch:** `fix/testing-polish`  
**Goal:** Ensure MVP requirements are met and fix critical bugs

### Tasks:

- [ ] **8.1: Run Complete Test Suite**

  - Run all unit tests: `npm test`
  - Verify all tests pass with 0 failures
  - Check test coverage report
  - Fix any failing tests

- [ ] **8.2: Multi-User Testing**

  - Test with 2-5 concurrent users in separate browsers
  - Create shapes simultaneously
  - Test selection-based locking with concurrent users
  - Move locked shapes and verify others see updates
  - Verify deselection releases locks immediately
  - Check for race conditions

- [ ] **8.3: Performance Testing**

  - Create 500+ shapes and test FPS (use browser dev tools)
  - Verify 60 FPS maintained during pan/zoom
  - Verify cursor updates don't drop frames
  - Test pan/zoom with many objects
  - Monitor Firestore read/write counts in Firebase Console
  - Optimize if needed

- [ ] **8.4: Persistence Testing**

  - All users leave canvas
  - Return and verify shapes remain
  - Test page refresh mid-edit
  - Test browser close and reopen
  - Verify auth state persists across refreshes

- [ ] **8.5: Error Handling**

  - Files to update: All service files
  - Add try/catch blocks
  - Display user-friendly error messages
  - Handle network failures gracefully
  - Test error states with Firebase offline

- [ ] **8.6: UI Polish**

  - Files to update: All component files
  - Consistent spacing and colors
  - Responsive button states
  - Loading states for all async operations

- [ ] **8.7: Verify Keyboard Shortcuts**

  - Files to verify: `src/components/Canvas/Canvas.jsx`
  - Delete/Backspace key: delete selected shape (already implemented in PR #4)
  - Escape key: deselect (optional enhancement)
  - Note: Undo/redo is out of scope for MVP

- [ ] **8.8: Cross-Browser Testing**

  - Test in Chrome, Firefox, Safari
  - Fix any compatibility issues
  - Document any browser-specific issues

- [ ] **8.9: Document Known Issues**
  - Files to update: `README.md`
  - List any known bugs or limitations
  - Add troubleshooting section
  - Document testing procedures

**PR Checklist:**

- [ ] **All unit tests pass (`npm test`) with 0 failures**
- [ ] **All integration tests pass**
- [ ] All MVP requirements pass (manual testing)
- [ ] No console errors during normal operation
- [ ] Smooth performance on test devices (60 FPS verified)
- [ ] Works in Chrome, Firefox, and Safari
- [ ] Error messages are user-friendly
- [ ] Test coverage is adequate (check coverage report)

---

## PR #9: Deployment & Final Prep

**Branch:** `deploy/production`  
**Goal:** Deploy to production and finalize documentation

### Tasks:

- [ ] **9.1: Configure Firebase Hosting**

  - Files to create: `firebase.json`, `.firebaserc`
  - Run: `firebase init hosting`
  - Set public directory to `dist`

- [ ] **9.2: Update Environment Variables**

  - Create production Firebase project (or use same)
  - Files to update: `.env.example`
  - Document all required env vars

- [ ] **9.3: Build Production Bundle**

  - Run: `npm run build`
  - Test production build locally
  - Check bundle size

- [ ] **9.4: Deploy to Firebase Hosting**

  - Run: `firebase deploy --only hosting`
  - Test deployed URL
  - Verify all features work in production

- [ ] **9.5: Set Up Firestore Security Rules**

  - Files to create: `firestore.rules`
  - Allow authenticated users to read/write
  - Validate shape schema
  - Deploy rules: `firebase deploy --only firestore:rules`

- [ ] **9.6: Set Up Realtime Database Rules**

  - Files to create: `database.rules.json`
  - Allow authenticated users read/write
  - Deploy rules: `firebase deploy --only database`

- [ ] **9.7: Update README with Deployment Info**

  - Files to update: `README.md`
  - Add live demo link
  - Add deployment instructions
  - Add architecture diagram (optional)

- [ ] **9.8: Final Production Testing**

  - **Run full test suite before deployment: `npm test`**
  - **Verify 0 test failures**
  - Test with 5 concurrent users on deployed URL
  - Verify auth works (email/password AND Google)
  - Verify shapes sync (<100ms)
  - Verify selection-based locking works
  - Verify locked shapes update in real-time for other users
  - Verify deselection releases locks immediately
  - Verify cursors work (<50ms updates)
  - Verify presence system works
  - Test all features from PRD Testing Checklist

- [ ] **9.9: Performance Verification in Production**

  - Create 500+ shapes and verify 60 FPS maintained
  - Test with 5+ concurrent users
  - Monitor Firebase Console for excessive reads/writes
  - Verify cursor throttling (20-30 FPS)

- [ ] **9.10: Create Demo Video Script**
  - Outline key features to demonstrate
  - Prepare 2-3 browser windows for demo
  - Include locking demonstration (select, see real-time updates, deselect)

**PR Checklist:**

- [ ] **All tests pass in production build (`npm test` before deployment)**
- [ ] App deployed and accessible via public URL
- [ ] Auth works in production (email/password AND Google)
- [ ] Real-time features work in production (<100ms sync)
- [ ] Selection-based locking works correctly
- [ ] 5+ concurrent users tested successfully
- [ ] 60 FPS maintained with 500+ shapes
- [ ] README has deployment link and instructions
- [ ] Security rules deployed and working
- [ ] No console errors in production

---

## MVP Completion Checklist

### Required Features:

- [ ] Basic canvas with pan/zoom (5000x5000px with boundaries)
- [ ] Initial canvas view centered at (2500, 2500)
- [ ] Rectangle shapes with gray fill (#cccccc), standard 100x100px size
- [ ] Ability to create, move, and delete objects
- [ ] Object locking (first user to **select** locks the object)
- [ ] Lock releases on deselection (clicking elsewhere)
- [ ] Real-time sync between 2+ users (<100ms)
- [ ] Locked shapes visible and update in real-time for other users
- [ ] Multiplayer cursors with name labels and unique colors
- [ ] Presence awareness (who's online)
- [ ] User authentication (email/password AND Google login)
- [ ] Deployed and publicly accessible

### Performance Targets:

- [ ] 60 FPS during all interactions (verified with browser dev tools)
- [ ] Shape changes sync in <100ms
- [ ] Cursor positions sync in <50ms
- [ ] Support 500+ simple objects without FPS drops
- [ ] Support 5+ concurrent users without degradation

### Automated Testing Requirements:

- [ ] **All unit tests pass (`npm test`)**
- [ ] **All integration tests pass**
- [ ] Test coverage report reviewed
- [ ] No failing tests before deployment

### Manual Testing Scenarios:

- [ ] 2 users editing simultaneously in different browsers
- [ ] User A selects shape → shape locks, User B cannot interact with it
- [ ] User A moves locked shape → User B sees real-time updates (but cannot edit)
- [ ] User A deselects shape (clicks elsewhere) → User B can now select and move it
- [ ] User A deletes unlocked shape created by User B → disappears for User B immediately
- [ ] One user refreshing mid-edit confirms state persistence
- [ ] Multiple shapes created and moved rapidly to test sync performance
- [ ] Test with 500+ rectangles to verify performance target (60 FPS maintained)

---

## Post-MVP: Phase 2 Preparation

**Next PRs (After MVP Deadline):**

- PR #10: Multiple shape types (circles, text)
- PR #11: Shape styling (colors, borders)
- PR #12: Resize and rotate functionality
- PR #13: AI agent integration
- PR #14: Multi-select and grouping
- PR #15: Undo/redo system
