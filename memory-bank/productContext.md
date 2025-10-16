# Product Context

## Why This Project Exists
CollabCanvas solves the problem of real-time visual collaboration without requiring expensive third-party tools. It provides a simple, focused canvas where teams can collaborate visually in real-time.

## Problems It Solves
1. **Remote Collaboration**: Teams working remotely need shared visual spaces
2. **Real-time Feedback**: See changes instantly as team members work
3. **Conflict Prevention**: Shape locking prevents editing conflicts
4. **Visual Communication**: Draw and annotate together in real-time

## User Experience Goals

### Seamless Collaboration
- Users see each other's cursors with colored indicators
- Shapes lock automatically when being edited (with colored borders showing who's editing)
- Smooth real-time updates without lag or conflicts

### Intuitive Interface
- **Left Toolbar**: Vertical tool palette with icon-based buttons
  - Select/Drag tool (default)
  - Rectangle, Circle, Line, Text creation tools
  - Color picker for fill colors
- **Bottom-Left Controls**: Compact zoom controls (in/out/reset)
- **Top Navbar**: 
  - Profile chip with photo/avatar + dropdown menu (logout)
  - Online users indicator (expandable to show presence list)

### Visual Feedback
- Active tool highlights in indigo
- Locked shapes show colored borders matching the editor's cursor color
- Hover states on all interactive elements
- Smooth animations for dropdowns and transitions

## How It Should Work

### Authentication Flow
1. User visits the app and sees login screen
2. Can sign in with email/password or Google
3. Google users get their profile photo displayed
4. After login, enters the canvas workspace

### Canvas Interaction
1. **Creating Shapes**: Click a tool, shape appears at canvas center
2. **Moving Shapes**: Click and drag any shape (auto-locks while dragging)
3. **Resizing Shapes**: Select a shape to see transform handles
4. **Deleting Shapes**: Select and press Delete/Backspace
5. **Panning**: Hold Space and drag, or drag with two fingers

### Collaboration Features
- **Presence**: See who's connected in the top-right dropdown
  - Navbar shows "X active" (users who have moved mouse in last 5 minutes)
  - Dropdown shows "Connected Sessions" with total count including idle users
- **Idle Detection**: Users idle for 5+ minutes show with yellow dot and "(idle)" label
- **Session Cleanup**: After 1 hour of inactivity, users prompted to reconnect
- **Cursors**: See colored cursors for each user with their name
- **Shape Locks**: When someone edits a shape, it shows a colored border
- **Conflict Prevention**: Can't edit shapes locked by others (shows toast notification)
- **Right-Side Style Panel**: Contextual controls that adapt to selection
- **Selection-Aware Controls**: Text formatting appears only when all selected are text
- **Default Borders**: Subtle borders on shapes for accessibility; visible text bounding boxes

