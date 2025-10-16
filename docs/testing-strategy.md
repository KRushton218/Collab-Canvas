# Testing Strategy & Coverage

> **CollabCanvas Testing Approach**  
> **Last Updated**: October 14, 2025  
> **Testing Philosophy**: Manual testing for visual/interactive features, unit tests for logic

---

## 🎯 Testing Philosophy

### Why Manual Testing for This Project

CollabCanvas is a **highly visual and interactive** real-time collaboration tool. The core value and functionality center around:

1. **Visual Rendering**: Canvas shapes, colors, borders, transforms
2. **Real-time Interactions**: Cursor movements, shape dragging, live updates
3. **Multi-user Coordination**: Locking, presence indicators, concurrent edits
4. **User Experience**: Smooth animations, responsive feedback, toast notifications

**These features are difficult to test programmatically** without:
- Complex browser automation (Playwright/Cypress)
- Firebase emulator setup for real-time data
- Multiple browser instances simulating concurrent users
- Visual regression testing tools

**Manual testing is more efficient and reliable** for this type of application during MVP development.

---

## 📊 Current Test Coverage

### Unit Tests: 62/62 Passing ✅

#### Authentication Tests (8 tests)
**File**: `tests/unit/services/auth.test.js`
- ✅ Display name extraction from email (prefix before @)
- ✅ Display name truncation (max 20 characters)
- ✅ Error handling for null/empty values
- ✅ Edge cases (special characters, short emails)

#### Presence Tests (12 tests)
**File**: `tests/unit/services/presence.test.js`
- ✅ User goes online (sets presence)
- ✅ User goes offline (removes presence)
- ✅ onDisconnect cleanup logic
- ✅ Cursor position updates
- ✅ User color assignment
- ✅ Subscribe to presence changes
- ✅ Handle multiple users joining/leaving

#### Canvas & Helpers Tests (42 tests)
**Files**: 
- `tests/unit/contexts/CanvasContext.test.jsx`
- `tests/unit/utils/constants.test.js`
- `tests/unit/utils/helpers.test.js`
- `tests/unit/services/canvas.test.js`
- `tests/unit/services/shapes.test.js`

**Coverage**:
- ✅ Canvas dimension constants
- ✅ Initial viewport positioning
- ✅ Zoom limits (min 0.1, max 3)
- ✅ Pan boundary constraints
- ✅ Shape CRUD operations (Create, Read, Update, Delete)
- ✅ Shape ID generation (unique, timestamped)
- ✅ Boundary validation logic
- ✅ User color generation from palette
- ✅ Shape fill value validation
- ✅ Firestore query construction

### Integration Tests: Manual Approach ✅

**Rationale**: 
- Firebase Realtime Database interactions are complex to mock
- Multi-browser concurrent user scenarios require actual Firebase instances
- Visual feedback (cursors, locks, shapes) needs human verification
- Real-time sync timing (<100ms) best validated manually

**Status**: All critical integration scenarios tested manually (see User Story Test Suite below)

---

## 🧪 User Story Test Suite

This comprehensive test suite provides **full functional coverage** of CollabCanvas. Like typing "The quick brown fox jumps over the lazy dog" to verify all keyboard keys work, completing these user stories confirms all features work correctly.

### Prerequisites
- Two browser windows (or incognito + regular)
- Two separate user accounts (or Google + Email auth)
- Canvas app running locally or deployed

---

## ✅ Complete User Story Test Suite

### Category 1: Authentication & Session Management

#### US-1.1: Email/Password Registration ✅
**User Story**: As a new user, I want to create an account with email/password so I can access the canvas.

**Test Steps**:
1. Navigate to login page
2. Toggle to "Sign Up" mode
3. Enter email: `testuser@example.com`
4. Enter password: `SecurePass123!`
5. (Optional) Enter display name: `Test User`
6. Click "Sign Up"

**Expected Results**:
- Account created successfully
- Redirected to canvas
- Display name shows as "Test User" (or "testuser" if not provided)
- User appears in presence list

---

#### US-1.2: Email/Password Login ✅
**User Story**: As a returning user, I want to log in with my email/password.

**Test Steps**:
1. Log out from canvas
2. Enter existing email/password
3. Click "Sign In"

**Expected Results**:
- Successfully logged in
- Canvas loads with any existing shapes
- User appears in presence list
- Display name shows correctly

---

#### US-1.3: Google OAuth Sign-In ✅
**User Story**: As a user, I want to sign in with Google for quick access.

**Test Steps**:
1. Click "Sign in with Google"
2. Select Google account
3. Authorize application

**Expected Results**:
- Successfully signed in
- Google display name appears
- Google profile photo appears in navbar
- User color assigned
- User appears in presence list

---

#### US-1.4: Session Persistence ✅
**User Story**: As a user, I want my session to persist when I refresh the page.

**Test Steps**:
1. Sign in to canvas
2. Refresh page (Cmd+R or F5)

**Expected Results**:
- Still logged in after refresh
- Canvas loads with shapes intact
- Presence restores (user rejoins list)
- No login screen shown

---

#### US-1.5: Logout ✅
**User Story**: As a user, I want to log out when I'm done.

**Test Steps**:
1. Click profile dropdown in navbar
2. Click "Logout"

**Expected Results**:
- Logged out successfully
- Redirected to login page
- User removed from presence list in other browsers

---

### Category 2: Canvas Navigation & Viewport

#### US-2.1: Pan Canvas ✅
**User Story**: As a user, I want to pan the canvas to navigate my workspace.

**Test Steps**:
1. Hold Space key
2. Click and drag canvas
3. Release Space key

**Expected Results**:
- Canvas pans smoothly in drag direction
- Cursor changes to "grab" while holding Space
- Cursor changes to "grabbing" while dragging
- Can pan to edge of canvas (soft boundaries)
- Background color outside 5000x5000 canvas visible

---

#### US-2.2: Zoom with Mouse Wheel ✅
**User Story**: As a user, I want to zoom in/out with my mouse wheel.

**Test Steps**:
1. Position mouse over canvas
2. Scroll wheel up (zoom in)
3. Scroll wheel down (zoom out)

**Expected Results**:
- Zoom in: Canvas enlarges, zooming toward cursor position
- Zoom out: Canvas shrinks, zooming away from cursor
- Zoom stops at min (0.1x or 10%) and max (3x or 300%)
- Zoom percentage updates in bottom-left controls
- Smooth, no jitter

---

#### US-2.3: Zoom with Buttons ✅
**User Story**: As a user, I want to use zoom controls to zoom in/out.

**Test Steps**:
1. Click "+" button (zoom in)
2. Click "-" button (zoom out)
3. Zoom to min or max
4. Click "Reset View"

**Expected Results**:
- Zoom in: Increases zoom by fixed increment
- Zoom out: Decreases zoom by fixed increment
- Buttons disable at min/max zoom
- Reset view: Returns to 100% zoom, centered on canvas
- Zoom percentage updates correctly

---

### Category 3: Shape Creation & Basic Manipulation

#### US-3.1: Create Rectangle ✅
**User Story**: As a user, I want to create rectangles on the canvas.

**Test Steps**:
1. Click Rectangle tool in left toolbar
2. Shape appears at center of viewport

**Expected Results**:
- Rectangle appears with selected fill color
- Default size (100x100px or based on constants)
- Rectangle is automatically selected (blue border)
- Tool returns to Select mode (or stays in Rectangle mode if tool mode persistence implemented)

---

#### US-3.2: Select Shape ✅
**User Story**: As a user, I want to select shapes by clicking them.

**Test Steps**:
1. Create 2-3 rectangles
2. Click deselect (click empty canvas)
3. Click on different shapes

**Expected Results**:
- Clicked shape becomes selected (blue border)
- Previously selected shape deselects
- Only one shape selected at a time
- Transform handles appear on selected shape

---

#### US-3.3: Drag Shape ✅
**User Story**: As a user, I want to move shapes by dragging them.

**Test Steps**:
1. Create rectangle
2. Click and hold on rectangle
3. Drag to new position
4. Release mouse

**Expected Results**:
- Shape drags smoothly with cursor
- Shape cannot be dragged outside canvas boundaries (5000x5000)
- If at boundary, drag stops at edge
- Shape position updates immediately (no lag)
- Lock border appears during drag (user's color)

---

#### US-3.4: Resize Shape ✅
**User Story**: As a user, I want to resize shapes with transform handles.

**Test Steps**:
1. Create rectangle
2. Select rectangle
3. Drag corner handle to resize

**Expected Results**:
- Transform handles visible on selected shape
- Dragging corner resizes shape proportionally
- Dragging edge resizes in one dimension
- Shape maintains minimum size (MIN_SHAPE_SIZE)
- Shape cannot resize outside canvas boundaries
- Lock border appears during resize

---

#### US-3.5: Delete Shape ✅
**User Story**: As a user, I want to delete shapes I no longer need.

**Test Steps**:
1. Create rectangle
2. Select rectangle
3. Press Delete or Backspace key

**Expected Results**:
- Shape immediately deleted
- Shape removed from canvas
- Selection cleared

---

#### US-3.6: Deselect Shape ✅
**User Story**: As a user, I want to deselect shapes by clicking empty canvas.

**Test Steps**:
1. Select a shape
2. Click on empty canvas area

**Expected Results**:
- Shape deselects (no blue border)
- Transform handles disappear
- No shape selected

---

### Category 4: Shape Styling

#### US-4.1: Change Shape Color ✅
**User Story**: As a user, I want to create shapes with different colors.

**Test Steps**:
1. Click color picker in left toolbar
2. Select a preset color (e.g., red)
3. Click Rectangle tool
4. Select custom color
5. Click Rectangle tool again

**Expected Results**:
- First rectangle has red fill
- Second rectangle has custom color fill
- Color persists until changed
- Color picker shows current selection

---

### Category 5: Real-Time Collaboration (Multi-User)

#### US-5.1: See Other User Join ✅
**User Story**: As a user, I want to see when another user joins the canvas.

**Test Steps**:
1. **Browser A**: Sign in as User A
2. **Browser B**: Sign in as User B

**Expected Results**:
- User A sees User B appear in presence list
- User B sees User A in presence list
- Each user has distinct color indicator
- Online user count updates (e.g., "2 users online")

---

#### US-5.2: See Other User's Cursor ✅
**User Story**: As a user, I want to see other users' cursors with their names.

**Test Steps**:
1. **Browser A**: Move mouse around canvas
2. **Browser B**: Observe cursor

**Expected Results**:
- User A's cursor appears in Browser B
- Cursor has User A's color
- Name label appears near cursor
- Cursor moves smoothly (no jitter)
- Updates within ~150ms
- Cursor disappears when outside canvas

---

#### US-5.3: See Shape Created by Another User ✅
**User Story**: As a user, I want to see shapes created by other users in real-time.

**Test Steps**:
1. **Browser A**: Create rectangle
2. **Browser B**: Observe canvas

**Expected Results**:
- Rectangle appears in Browser B within 100ms
- Rectangle has correct position, size, color
- No duplicate shapes
- Shape persists if Browser A refreshes

---

#### US-5.4: See Shape Moved by Another User ✅
**User Story**: As a user, I want to see when other users move shapes.

**Test Steps**:
1. **Browser A**: Create rectangle
2. **Browser B**: Wait for rectangle to appear
3. **Browser A**: Drag rectangle to new position

**Expected Results**:
- In Browser B:
  - Lock border appears on rectangle (User A's color)
  - Rectangle moves in real-time during drag
  - Updates smooth (<100ms latency)
  - Lock border disappears when User A releases

---

#### US-5.5: Shape Locking During Drag ✅
**User Story**: As a user, I should not be able to edit shapes that another user is editing.

**Test Steps**:
1. **Browser A**: Start dragging a rectangle (don't release)
2. **Browser B**: Try to click and drag the same rectangle

**Expected Results**:
- In Browser B:
  - Rectangle has colored dashed border (User A's color)
  - Rectangle is at 50% opacity
  - Cannot click to select the rectangle
  - Toast notification: "🔒 This shape is being edited by [User A name]"
  - Can still see rectangle moving in real-time as User A drags

---

#### US-5.6: Lock Release After Drag ✅
**User Story**: As a user, I want to be able to edit a shape after another user releases it.

**Test Steps**:
1. **Browser A**: Drag rectangle, then release (finish drag)
2. **Browser B**: Immediately try to drag the same rectangle

**Expected Results**:
- In Browser B:
  - Lock border disappears
  - Opacity returns to 100%
  - Can now click and drag rectangle
  - Lock acquired by User B
  - User A now sees lock border

---

#### US-5.7: Lock Release on Disconnect ✅
**User Story**: As a user, I want locked shapes to unlock if another user disconnects.

**Test Steps**:
1. **Browser A**: Start dragging a rectangle (hold)
2. **Browser B**: Observe locked state
3. **Browser A**: Close browser or navigate away
4. **Browser B**: Wait 3-5 seconds

**Expected Results**:
- In Browser B:
  - Lock border disappears after disconnect
  - Can now interact with shape
  - User A removed from presence list

---

#### US-5.8: Delete Shape Across Users ✅
**User Story**: As a user, I want to see shapes deleted by other users.

**Test Steps**:
1. **Browser A**: Create rectangle
2. **Browser B**: Wait for rectangle to appear
3. **Browser A**: Select and delete rectangle (Delete key)

**Expected Results**:
- In Browser B:
  - Rectangle disappears immediately (<100ms)
  - No ghost shapes
  - Shape does not reappear after refresh

---

#### US-5.9: Cannot Delete Locked Shape ✅
**User Story**: As a user, I should not be able to delete shapes locked by another user.

**Test Steps**:
1. **Browser A**: Start dragging a rectangle
2. **Browser B**: Try to select and delete the rectangle

**Expected Results**:
- In Browser B:
  - Cannot select the locked shape
  - Delete key has no effect
  - Toast notification if attempted

---

#### US-5.10: See User Leave ✅
**User Story**: As a user, I want to see when other users leave the canvas.

**Test Steps**:
1. **Browser A & B**: Both signed in
2. **Browser A**: Log out or close tab

**Expected Results**:
- In Browser B:
  - User A removed from presence list
  - User A's cursor disappears
  - Online user count decreases
  - Any shapes locked by User A become unlocked

---

### Category 6: Persistence & State Management

#### US-6.1: Shapes Persist After Logout ✅
**User Story**: As a user, I want my shapes to be saved when I log out.

**Test Steps**:
1. Create 3-5 shapes
2. Log out
3. Log back in

**Expected Results**:
- All shapes still present
- Shapes in same positions with same colors
- No duplicates
- Canvas view state may reset (acceptable)

---

#### US-6.2: Shapes Persist Across Users ✅
**User Story**: As a user, I want to see shapes created by other users even after they leave.

**Test Steps**:
1. **Browser A**: Create 3 shapes
2. **Browser A**: Log out
3. **Browser B**: Sign in

**Expected Results**:
- Browser B sees all 3 shapes
- Shapes have correct positions and colors
- Can edit/delete shapes created by User A

---

#### US-6.3: Page Refresh Preserves State ✅
**User Story**: As a user, I don't want to lose my work if I refresh the page.

**Test Steps**:
1. Create several shapes
2. Move shapes around
3. Refresh page (Cmd+R)

**Expected Results**:
- All shapes still present after refresh
- Shapes in final positions
- User still logged in
- Presence restored (rejoins online users)

---

#### US-6.4: Multiple Sessions See Same State ✅
**User Story**: As a user, I can open multiple tabs and see the same canvas state.

**Test Steps**:
1. Sign in to canvas
2. Create shape in Tab 1
3. Open canvas in Tab 2 (same account)

**Expected Results**:
- Tab 2 shows shape from Tab 1
- Edits in Tab 1 appear in Tab 2 in real-time
- Both tabs show same presence (same user appears once)

---

### Category 7: Edge Cases & Error Handling

#### US-7.1: Handle Empty Canvas ✅
**User Story**: As a new user, I should see an empty canvas when no shapes exist.

**Test Steps**:
1. Sign in to canvas (first time, or all shapes deleted)

**Expected Results**:
- Canvas renders successfully
- No errors in console
- Can pan, zoom, create shapes normally
- Presence list works

---

#### US-7.2: Handle Many Shapes (Performance) ✅
**User Story**: As a user, I want smooth performance even with many shapes.

**Test Steps**:
1. Create 50-100 shapes
2. Pan and zoom canvas
3. Drag shapes around

**Expected Results**:
- Canvas remains responsive (60 FPS)
- No lag during pan/zoom
- Shapes drag smoothly
- No memory leaks (check browser DevTools)

---

#### US-7.3: Handle Concurrent Shape Creation ✅
**User Story**: As a user, I should not see conflicts when multiple users create shapes simultaneously.

**Test Steps**:
1. **Browser A & B**: Both click Rectangle rapidly at the same time
2. Count total shapes created

**Expected Results**:
- All shapes appear in both browsers
- No duplicate shapes
- No missing shapes
- Each shape has unique ID

---

#### US-7.4: Handle Network Disconnect (Graceful Degradation) ⚠️
**User Story**: As a user, I should get feedback if my network connection drops.

**Test Steps**:
1. Sign in to canvas
2. Open browser DevTools → Network tab → Throttling → Offline
3. Try to create/move shapes
4. Reconnect network

**Expected Results**:
- App doesn't crash (graceful degradation)
- May show error message or connection status
- Shapes may not sync while offline
- Reconnection restores sync
- **Note**: Full offline support not implemented in MVP

---

### Category 8: UI/UX Verification

#### US-8.1: Profile Photo Display (Google Users) ✅
**User Story**: As a Google user, I want to see my profile photo in the navbar.

**Test Steps**:
1. Sign in with Google account

**Expected Results**:
- Profile photo appears in navbar (top-right)
- Photo loads correctly (no CORS errors)
- Clicking photo opens dropdown menu
- Logout option visible

---

#### US-8.2: Presence List Toggle ✅
**User Story**: As a user, I want to see who's online by clicking the online users indicator.

**Test Steps**:
1. Click online users button in navbar (top-right)
2. Observe presence list
3. Click again to close

**Expected Results**:
- Presence list expands below navbar
- Shows all online users with colors
- Current user highlighted
- Clicking again closes list
- Clicking outside closes list

---

#### US-8.3: Tool Selection Feedback ✅
**User Story**: As a user, I want visual feedback on which tool is active.

**Test Steps**:
1. Click different tools in left toolbar
2. Observe visual changes

**Expected Results**:
- Active tool highlighted in indigo
- Inactive tools gray
- Hover states work on all tools
- Color picker reflects current color

---

#### US-8.4: Toast Notifications ✅
**User Story**: As a user, I want helpful notifications for locked shapes.

**Test Steps**:
1. **Browser A**: Drag a shape
2. **Browser B**: Try to click the locked shape

**Expected Results**:
- Toast appears: "🔒 This shape is being edited by [name]"
- Toast fades out after 2 seconds
- Multiple toasts don't stack awkwardly

---

#### US-8.5: Canvas Boundaries Visual ✅
**User Story**: As a user, I want to see where the canvas boundaries are.

**Test Steps**:
1. Pan canvas to the edge
2. Pan beyond the edge

**Expected Results**:
- Canvas area (5000x5000) has distinct background
- Outside canvas has different background color
- Can pan slightly beyond canvas for better UX
- Shapes cannot be placed outside boundaries

---

## 🎯 Test Execution Tracking

### Quick Smoke Test (5 minutes)
Use this for rapid verification after changes:

1. ✅ Sign in (Google or Email)
2. ✅ Create 3 shapes (different colors)
3. ✅ Drag and resize shapes
4. ✅ Delete a shape
5. ✅ Open second browser, see shapes
6. ✅ Drag shape in Browser A, watch in Browser B
7. ✅ See cursors and presence
8. ✅ Refresh page, shapes persist

### Full Test Execution
Run complete suite before major releases:
- All 45+ user stories above
- Check console for errors
- Verify performance (open DevTools Performance tab)

---

## 📝 Testing Notes

### When to Test
- **After code changes**: Run smoke test
- **Before committing**: Run affected user stories
- **Before deploying**: Run full test suite
- **After adding features**: Add new user stories

### Reporting Issues
When a user story fails:
1. Note which story (US-X.X)
2. Describe what went wrong (actual vs expected)
3. Include console errors if any
4. Note browser and OS
5. Create issue in current-todos.md or GitHub

### Future Test Automation
If the project scales, consider:
- Playwright for E2E tests
- Firebase Emulator Suite for integration tests
- Visual regression testing (Percy, Chromatic)
- Load testing for 50+ concurrent users

---

## ✅ Test Suite Completion Status

**Last Full Run**: October 14, 2025  
**Status**: All critical user stories passing ✅  
**Known Failures**: None  
**Deferred**: US-7.4 (Offline handling - not MVP scope)

**Next Review**: After implementing additional shape types (Circle, Line, Text)

