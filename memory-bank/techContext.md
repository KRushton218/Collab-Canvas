# Technical Context

## Technologies Used

### Core Framework
- **React 18**: UI library
- **Vite**: Build tool and dev server
- **Node.js**: Development environment

### Canvas & Graphics
- **Konva**: HTML5 Canvas library
- **react-konva**: React bindings for Konva
- Enables hardware-accelerated shape rendering and transformations

### Backend Services (Firebase)
- **Firebase Auth**: User authentication
  - Email/Password authentication
  - Google OAuth integration
- **Firestore**: NoSQL document database for persistent data
- **Realtime Database**: Real-time data synchronization
- **Firebase Hosting**: Deployment (optional)

### Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Inline Styles**: Component-specific styling for dynamic values

### Testing
- **Vitest**: Unit testing framework
- **@testing-library/react**: React component testing

## Development Setup

### Prerequisites
```bash
Node.js >= 16
npm or yarn
Firebase project with Auth, Firestore, and RTDB enabled
```

### Environment Variables
Required in `.env`:
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_REALTIME_DATABASE_URL
```

### Running Locally
```bash
npm install
npm run dev
```

### Building for Production
```bash
npm run build
npm run preview  # Test production build
```

## Technical Constraints

### Performance Considerations
1. **Shape Count**: App performs well with 100-500 shapes
2. **Concurrent Users**: Tested with 5-10 simultaneous users
3. **RTDB Updates**: Throttled to prevent rate limiting (150ms intervals)

### Browser Support
- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge (latest versions)
- Requires canvas and WebSocket support

### Firebase Limits
- **Firestore**: 1 write/second per document recommended
- **RTDB**: 1000 concurrent connections per database (free tier)
- **Auth**: Rate limited to prevent abuse

## Dependencies (Key Packages)

### Production
- `react`, `react-dom`: ^18.2.0
- `react-konva`, `konva`: Canvas rendering
- `firebase`: ^10.x Backend services
- `tailwindcss`: ^3.x Styling

### Development
- `vite`: ^5.x Build tool
- `vitest`: Testing
- `eslint`: Code linting
- `autoprefixer`, `postcss`: CSS processing

## Security Notes
- Firebase Security Rules protect data access
- Authentication required for all canvas operations
- Shape ownership tracked via `createdBy` field
- CORS configured for image loading (Google photos)

