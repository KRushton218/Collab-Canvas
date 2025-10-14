# Technical Context

## Technologies Used

### Core Framework
- **React 19.1**: UI library (latest)
- **Vite 7.1**: Build tool and dev server
- **Node.js**: Development environment

### Current Version
- **App Version**: 1.0.0 (Production)
- **Deployed**: October 14, 2025
- **Live URL**: https://collab-canvas-ed2fc.web.app

### Canvas & Graphics
- **Konva**: HTML5 Canvas library
- **react-konva**: React bindings for Konva
- Enables hardware-accelerated shape rendering and transformations

### Backend Services (Firebase)
- **Firebase 12.4**: Backend services
- **Firebase Auth**: User authentication
  - Email/Password authentication
  - Google OAuth integration
- **Firestore**: NoSQL document database for persistent data
- **Realtime Database**: Real-time data synchronization
- **Firebase Hosting**: Deployed to production ✅
- **Project ID**: collab-canvas-ed2fc

### Styling
- **Tailwind CSS 4.1**: Utility-first CSS framework
- **Inline Styles**: Component-specific styling for dynamic values

### Testing
- **Vitest 3.2**: Unit testing framework
- **@testing-library/react 16.3**: React component testing
- **Coverage**: 64/64 tests passing ✅

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
npm run preview  # Test production build locally
```

### Deploying to Firebase
```bash
npm run firebase:login          # One-time login
npm run firebase:use            # Select Firebase project
npm run firebase:deploy         # Build and deploy everything
npm run firebase:deploy:hosting # Deploy only hosting (faster)
```

### Semantic Versioning (for releases)
```bash
npm version patch  # 1.0.0 → 1.0.1 (bug fixes)
npm version minor  # 1.0.0 → 1.1.0 (new features)
npm version major  # 1.0.0 → 2.0.0 (breaking changes)
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
- `react`, `react-dom`: ^19.1.1
- `react-konva`: ^19.0.10
- `konva`: ^10.0.2
- `firebase`: ^12.4.0
- `tailwindcss`: ^4.1.14
- `react-icons`: ^5.5.0

### Development
- `vite`: ^7.1.7
- `vitest`: ^3.2.4
- `@testing-library/react`: ^16.3.0
- `eslint`: ^9.36.0
- `firebase-tools`: ^14.19.1
- `babel-plugin-react-compiler`: ^19.1.0 (React Compiler enabled)

## Security Notes
- Firebase Security Rules protect data access (deployed to production)
- Authentication required for all canvas operations
- Shape ownership tracked via `createdBy` field
- CORS configured for image loading (Google photos)
- Database rules deployed with hosting

## Production Bundle
- **Size**: 1.21 MB (326 KB gzipped)
- **Build Time**: ~2.3 seconds
- **Optimization**: Vite production build with minification
- **Note**: Bundle size warning at 1.2MB - consider code-splitting for V2.0

## Monitoring & Maintenance
- **Firebase Console**: https://console.firebase.google.com/project/collab-canvas-ed2fc
- **Hosting Rollback**: `npx firebase hosting:rollback`
- **View Deployments**: Firebase Console > Hosting
- **Database Usage**: Monitor in Firebase Console > Database

