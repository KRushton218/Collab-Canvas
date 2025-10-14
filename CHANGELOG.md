# Changelog

All notable changes to CollabCanvas will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Semantic Versioning Guide

**Version Format**: `MAJOR.MINOR.PATCH` (e.g., `1.2.3`)

### When to Increment:

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
  - API changes that require code updates
  - Database schema changes requiring migration
  - Removed or renamed features
  - Examples: New authentication system, canvas format change

- **MINOR** (1.0.0 → 1.1.0): New features (backward compatible)
  - New shape types (Circle, Line, Text)
  - New tools (Freehand drawing, Text editing)
  - New collaboration features (Comments, Chat)
  - Enhanced UI components
  - Examples: Adding undo/redo, adding export features

- **PATCH** (1.0.0 → 1.0.1): Bug fixes (backward compatible)
  - Bug fixes
  - Performance improvements
  - Security patches
  - Minor UI tweaks
  - Documentation updates
  - Examples: Fix cursor sync bug, improve zoom performance

---

## [1.0.0] - 2025-10-14

### 🎉 **Initial Production Release**

First stable release of CollabCanvas - a real-time collaborative whiteboard application.

### ✨ **Added**

#### Authentication
- Email/password sign up and login
- Google OAuth integration
- Profile photo support from Google accounts
- Display name handling with truncation
- Session persistence
- Secure logout functionality

#### Canvas Core
- 5000x5000 infinite canvas workspace
- Viewport panning (Space + drag or middle mouse)
- Mouse wheel zoom with configurable limits (25% - 500%)
- Zoom controls (in/out/reset buttons)
- Canvas centering and viewport positioning
- Responsive stroke widths based on zoom level

#### Shape Management
- Rectangle shape creation via toolbar
- Drag to move shapes
- Transform handles for resizing shapes
- Keyboard delete (Delete/Backspace)
- Shape selection system
- Color picker with 12 preset colors
- Custom color support via color input
- Real-time shape persistence (Firestore)
- Optimized O(1) per-shape operations

#### Real-Time Collaboration
- Multi-user cursor tracking with smooth interpolation
- Unique color assignment per user
- User presence system (online/offline status)
- Shape locking during edits (prevents conflicts)
- Visual lock indicators (colored borders on shapes)
- Lock conflict prevention and notifications
- Toast notifications for locked shape interactions
- Expandable presence list showing online users
- Automatic cleanup on disconnect

#### User Interface
- Modern toolbar with tool selection
- Shape type buttons (Rectangle/Circle/Line/Text)
- Color picker with preset swatches
- Bottom-left zoom controls
- Top-right profile dropdown with logout
- Collapsible presence list panel
- Consistent design system (Indigo theme)
- Smooth animations and hover effects
- Responsive layout

#### Performance & Architecture
- O(1) shape operations (one Firestore document per shape)
- Throttled RTDB updates (150ms) to prevent rate limiting
- Optimistic local updates (zero lag)
- Efficient state merging
- Automatic disconnect cleanup
- Firestore for persistent data
- Realtime Database for temporary data (cursors, locks, edits)

#### Testing
- 64 passing unit tests
- Service layer test coverage
- Utility function test coverage
- Context test coverage
- Manual integration testing procedures

#### Documentation
- Comprehensive PRD (Product Requirements Document)
- Architecture documentation (RTDB_FIRESTORE_ARCHITECTURE.md)
- Shape persistence guide
- Testing strategy document
- Memory bank system for project tracking
- API documentation in code

### 📝 **Known Limitations**

- **Shape Types**: Only rectangles render currently (Circle/Line/Text UI exists but not functional)
- **Mobile**: Desktop-optimized, mobile responsiveness needs work
- **Scale**: Tested with <500 shapes, performance with 1000+ shapes untested
- **Concurrent Users**: Tested with 5-10 users, higher loads untested

### 🔧 **Technical Details**

- **Frontend**: React 19.1, Vite 7.1, Tailwind CSS 4.1
- **Canvas**: Konva 10.0, React-Konva 19.0
- **Backend**: Firebase 12.4 (Auth, Firestore, Realtime Database)
- **Testing**: Vitest 3.2, Testing Library 16.3
- **Build**: Vite with React Compiler plugin

---

## Future Releases

### Planned for 1.1.0 (Next Minor Release)
- Circle shape rendering
- Line/Arrow shape rendering
- Text box implementation
- Shape property panel (edit after creation)
- Tool mode improvements (draw mode)

### Planned for 1.2.0
- Copy/paste shapes
- Duplicate shapes
- Multi-select shapes
- Group shapes
- Undo/redo system

### Planned for 2.0.0 (Major Release)
- Freehand drawing tool
- Canvas export (PNG/SVG)
- Mobile responsiveness with touch gestures
- User permissions system (viewer/editor roles)
- Multiple canvas projects

---

## Version History

- **1.0.0** (2025-10-14) - Initial production release
- **0.0.0** (Development) - MVP development phase

---

## Links

- [Product Requirements Document](./PRD.md)
- [Architecture Documentation](./RTDB_FIRESTORE_ARCHITECTURE.md)
- [Testing Strategy](./testing-strategy.md)
- [Current Development Tasks](./current-todos.md)

