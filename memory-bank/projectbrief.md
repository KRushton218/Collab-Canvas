# Project Brief: CollabCanvas

## Overview
CollabCanvas is a real-time collaborative canvas application where multiple users can draw, create shapes, and see each other's cursors and edits in real-time.

## Core Requirements
- **Real-time collaboration**: Multiple users can work on the same canvas simultaneously
- **Shape manipulation**: Users can create, move, resize, and delete shapes (rectangles, circles, lines, text)
- **Live presence**: See who's online with live cursor tracking
- **Shape locking**: Automatic locking prevents conflicts when users edit the same shape
- **Modern UI**: Clean, professional interface with intuitive controls

## Technology Stack
- **Frontend**: React + Vite
- **Canvas Rendering**: Konva (react-konva)
- **Authentication**: Firebase Auth (Email/Password + Google Sign-In)
- **Database**: 
  - Firestore (persistent shape data)
  - Realtime Database (live cursor positions, presence, temporary edits)
- **Styling**: Tailwind CSS + inline styles

## Key Features
1. **Drawing Tools**: Select, Rectangle, Circle, Line/Arrow, Text
2. **Zoom Controls**: Zoom in/out, reset view, mouse wheel zoom
3. **User Presence**: See active users with their cursor colors
4. **Shape Locking**: Visual feedback when shapes are being edited
5. **Profile Management**: User avatars, Google photos, logout dropdown

## Target Users
Teams and individuals who need a shared visual workspace for brainstorming, design collaboration, or real-time diagramming.

