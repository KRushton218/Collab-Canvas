# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CollabCanvas** is a real-time collaborative design tool (MVP) built with React, Firebase, and Konva.js. It enables multiple users to create, move, and delete shapes on a shared canvas with real-time synchronization, multiplayer cursors, and presence awareness.

**Key Constraints:**
- Single global canvas shared by all authenticated users (no multi-project support in MVP)
- Rectangle shapes only (100x100px, fixed gray fill #cccccc)
- Selection-based object locking (first to select acquires lock)
- Fixed canvas size: 5000x5000px with hard boundaries for objects
- Target: 60 FPS, <100ms shape sync, <50ms cursor sync

## Development Commands

**Project is not yet initialized.** Once setup is complete, use:

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run all tests
npm test

# Run tests in watch mode (during development)
npm test -- --watch

# Run specific test file
npm test auth.test.js
npm test canvas-sync.test.js

# Run tests with coverage
npm test -- --coverage

# Run tests with UI
npm run test:ui

# Build for production
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Deploy security rules
firebase deploy --only firestore:rules
firebase deploy --only database
```

## Architecture Overview

### Tech Stack
- **Frontend:** React + Vite, Konva.js (canvas rendering), Tailwind CSS
- **Backend:** Firebase Authentication, Cloud Firestore (persistence), Realtime Database (cursors/presence)
- **Testing:** Vitest, @testing-library/react, Firebase Emulators

### Data Flow
1. **Authentication:** Firebase Auth → AuthContext → Components
2. **Canvas State:** Firestore → CanvasService → useCanvas hook → CanvasContext → Canvas components
3. **Cursors:** Realtime DB → CursorService → useCursors hook → Cursor components
4. **Presence:** Realtime DB → PresenceService → usePresence hook → PresenceList component

### Key Services (`src/services/`)
- `firebase.js`: Initializes Firebase (auth, db, rtdb)
- `auth.js`: signup, login (email/password + Google), logout, display name logic
- `canvas.js`: CRUD operations for shapes, locking (lockShape, unlockShape), Firestore subscriptions
- `cursors.js`: updateCursorPosition (throttled to 20-30 FPS), subscribeToCursors, cleanup
- `presence.js`: setUserOnline, setUserOffline, auto-cleanup on disconnect

### Firestore Schema
**Collection:** `canvas`
**Document ID:** `global-canvas-v1`

```json
{
  "canvasId": "global-canvas-v1",
  "shapes": [
    {
      "id": "shape_uuid",
      "type": "rectangle",
      "x": 100,
      "y": 200,
      "width": 100,
      "height": 100,
      "fill": "#cccccc",
      "createdBy": "user_id",
      "createdAt": "timestamp",
      "lastModifiedBy": "user_id",
      "lastModifiedAt": "timestamp",
      "isLocked": false,
      "lockedBy": null
    }
  ],
  "lastUpdated": "timestamp"
}
```

### Realtime Database Schema
**Path:** `/sessions/global-canvas-v1/{userId}`

```json
{
  "displayName": "John Doe",
  "cursorColor": "#FF5733",
  "cursorX": 450,
  "cursorY": 300,
  "lastSeen": "timestamp"
}
```

## Critical Implementation Details

### Object Locking Mechanism
- **Lock acquired:** When user selects shape (onClick)
- **Lock released:** When user deselects (clicks elsewhere, selects different shape, or disconnects)
- **Lock timeout:** 3-5 seconds backup on disconnect
- **Behavior:** Locked shapes are visible and update in real-time for all users, but only the lock holder can interact
- **No complex visual indicators** for MVP (functional locking only)

### Canvas Boundaries
- **Hard boundary:** Objects cannot be placed/moved outside 5000x5000px
- **Soft boundary:** Viewport can pan slightly beyond edges for better UX
- **Visual indicator:** Different colored background outside canvas area
- **Drag operations:** Stop at boundary edges

### Display Name Logic
- Use Google display name if signing in via Google
- Use email prefix (before @) if signing in via email/password
- Truncate to max 20 characters if too long

### Performance Optimization
- Cursor updates throttled to 20-30 FPS (not full 60Hz)
- Only send cursor updates if position changed >2px
- Use Konva.js (canvas rendering) NOT DOM elements for shapes
- Limit to 500 shapes for MVP testing
- Monitor Firestore read/write counts (charges per operation)

### Real-Time Sync Strategy
- **Firestore:** For persistent canvas state (shapes, locking metadata) - use onSnapshot for real-time listeners
- **Realtime Database:** For high-frequency updates (cursor positions, presence) - lower latency than Firestore
- **Why two databases:** Firestore for durability, Realtime DB for speed

## Testing Requirements

**Critical:** Tasks/PRs are only considered complete when:
1. All relevant tests are written
2. Tests are run in terminal (`npm test`)
3. All tests pass successfully (0 failures)

### Test Organization
- `tests/unit/` - Unit tests for services, contexts, utils
- `tests/integration/` - Multi-user scenarios, end-to-end flows
- `tests/setup.js` - Test configuration, Firebase Emulator setup

### Firebase Emulators
Use Firebase Emulators for integration tests:
- Auth Emulator
- Firestore Emulator
- Realtime Database Emulator

**Note:** Google Auth cannot be tested in emulator (requires manual testing in production)

## Development Workflow

### PR Structure (from tasks.md)
The project follows a 9-PR development plan:
1. **Setup & Config** - Initialize project, Firebase, testing infrastructure
2. **Authentication** - Email/password + Google login, display name logic
3. **Canvas Rendering** - Pan, zoom, 5000x5000px boundaries
4. **Shapes** - Create, select, move, delete rectangles
5. **Real-Time Sync** - Firestore integration, object locking
6. **Cursors** - Real-time cursor tracking with colors and names
7. **Presence** - Online user list, join/leave notifications
8. **Testing & Polish** - Bug fixes, performance verification (60 FPS), cross-browser testing
9. **Deployment** - Firebase Hosting, security rules, production testing

### Before Merging PRs
- Run full test suite: `npm test`
- Verify 0 test failures
- Test with multiple browsers (Chrome, Firefox, Safari)
- Verify 60 FPS maintained (use browser dev tools)
- Check Firebase Console for excessive read/write operations

## Out of Scope for MVP

**Do NOT implement these features:**
- Multiple shape types (circles, text, lines, polygons)
- Color customization or styling for shapes
- Resize or rotate functionality
- Click-and-drag to define rectangle size (button creates standard 100x100px only)
- Multi-select, undo/redo, layer management
- Canvas export, copy/paste
- Mobile support, multiple projects/canvases
- Visual lock indicators (borders, icons) - functional locking only
- CRDTs or Operational Transforms (using simple selection-based locking)

## Known Limitations

1. **Single Global Canvas:** All users share one canvas (multi-project in Phase 2)
2. **Basic Shapes:** Rectangles only, fixed gray fill (#cccccc)
3. **Simple Locking:** First-to-select mechanism, not CRDT/OT
4. **No History:** No undo/redo or version control
5. **Desktop Only:** Not optimized for mobile/tablet
6. **Fixed Size:** 5000x5000px limit (not infinite canvas)
7. **No Ownership:** All shapes globally shared - any user can edit/delete any unlocked shape

## Reference Documents

- **PRD.md** - Complete product requirements, user stories, success criteria
- **architecture.md** - Visual architecture diagram (Mermaid graph)
- **tasks.md** - Detailed task breakdown with file structure and testing commands

## Environment Variables Required

Create `.env` file with:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_URL=
```
