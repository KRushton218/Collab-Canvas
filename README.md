# CollabCanvas MVP

A real-time collaborative canvas application built with React, Firebase, and Konva. Multiple users can create, manipulate, and delete shapes simultaneously with real-time synchronization, multiplayer cursors, and presence awareness.

## 🎯 Features

- **Real-time Collaboration**: Multiple users can work on the same canvas simultaneously
- **Shape Manipulation**: Create, move, select, and delete rectangles
- **Object Locking**: First user to select a shape locks it; others see real-time updates but cannot interact
- **Multiplayer Cursors**: See other users' cursors with names and unique colors
- **Presence Awareness**: View who's currently online
- **User Authentication**: Email/password and Google sign-in via Firebase
- **Canvas Controls**: Pan, zoom, and navigate a 5000x5000px canvas
- **Persistent State**: All changes saved to Firestore

## 🚀 Tech Stack

- **Frontend**: React 19 + Vite
- **Canvas Rendering**: Konva.js + React-Konva
- **Styling**: Tailwind CSS v4
- **Backend**: Firebase (Authentication, Firestore, Realtime Database)
- **Testing**: Vitest + React Testing Library

## 📋 Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Firebase account (free tier is sufficient)

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Collab-Canvas
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new Firebase project (or use an existing one)
3. Enable the following services:
   - **Authentication**: Enable Email/Password and Google sign-in methods
   - **Firestore Database**: Create in production mode (or test mode for development)
   - **Realtime Database**: Create in locked mode (or test mode for development)

4. Get your Firebase configuration:
   - Go to Project Settings > General
   - Scroll down to "Your apps"
   - Click on the web icon (</>) to create a web app
   - Copy the Firebase SDK configuration

### 4. Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and fill in your Firebase credentials:
```env
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_REALTIME_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
```

**Important**: Never commit your `.env` file! It's already in `.gitignore`.

### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or another port if 5173 is in use).

## 🧪 Testing

### Run Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Tests with UI

```bash
npm run test:ui
```

### Generate Coverage Report

```bash
npm run test:coverage
```

## 📦 Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 🏗️ Project Structure

```
collabcanvas/
├── src/
│   ├── components/
│   │   ├── Auth/              # Authentication components
│   │   ├── Canvas/            # Canvas and shape components
│   │   ├── Collaboration/     # Cursor and presence components
│   │   └── Layout/            # Layout components (Navbar, etc.)
│   ├── services/
│   │   ├── firebase.js        # Firebase initialization
│   │   ├── auth.js            # Authentication service
│   │   ├── canvas.js          # Canvas/shape operations
│   │   ├── cursors.js         # Cursor tracking service
│   │   └── presence.js        # Presence management
│   ├── hooks/                 # Custom React hooks
│   ├── contexts/              # React contexts
│   ├── utils/                 # Utility functions and constants
│   └── App.jsx
├── tests/
│   ├── unit/                  # Unit tests
│   └── integration/           # Integration tests
└── public/
```

## 🎮 Usage

1. **Sign Up/Login**: Create an account or sign in with Google
2. **Create Shapes**: Click the "Add Shape" button to create rectangles
3. **Select & Move**: Click on a shape to select it, then drag to move
4. **Delete**: Select a shape and press Delete/Backspace
5. **Navigate**: 
   - Pan: Drag the canvas background
   - Zoom: Use mouse wheel
   - Reset View: Click the reset button
6. **Collaborate**: Open the app in multiple browsers/windows to see real-time collaboration

## 🔐 Security Notes

- Never commit your `.env` file
- Use Firebase Security Rules to restrict access in production
- The current setup is for development; implement proper security rules before deploying

## 📄 Documentation

- [PRD.md](./PRD.md) - Product Requirements Document
- [tasks.md](./tasks.md) - Development Task List
- [architecture.md](./architecture.md) - System Architecture

## 🐛 Known Issues

See [tasks.md](./tasks.md) for current development status and known limitations.

## 🤝 Contributing

This is an MVP project. Follow the task list in `tasks.md` for development workflow.

## 📝 License

MIT License - see LICENSE file for details

---

**Note**: This is an MVP (Minimum Viable Product). Advanced features like multiple shape types, styling, undo/redo, and AI integration are planned for future phases.
