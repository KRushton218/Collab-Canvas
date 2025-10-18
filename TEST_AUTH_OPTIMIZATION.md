# Test Plan: AuthContext Optimization

**Branch:** `fix/enable-selectiongroupnode-performance`  
**Changes:** AuthContext now uses useMemo to prevent unnecessary re-renders  
**Risk:** Very Low (non-breaking optimization)

## Quick Verification (5 minutes)

### 1. Build Test ✅
```bash
npm run build
# Should complete without errors
```

### 2. Dev Server Test
```bash
npm run dev
# App should start normally
```

### 3. Basic Auth Flow
1. Open http://localhost:5173
2. Sign in with email/password
3. Click logout
4. Sign in with Google
5. Verify no console errors

**Expected:** All flows work identically to before

## Detailed Testing (15 minutes)

### Test 1: Email/Password Sign-In
**Steps:**
1. Open app (should show Login page)
2. Enter email and password
3. Click "Sign In"

**Expected:**
- ✅ Login successful
- ✅ Redirects to canvas
- ✅ Navbar shows user name
- ✅ No console errors

### Test 2: Email/Password Sign-Up
**Steps:**
1. Click "Don't have an account? Sign up"
2. Enter display name (optional)
3. Enter email and password (min 6 chars)
4. Click "Sign Up"

**Expected:**
- ✅ Account created
- ✅ Redirects to canvas
- ✅ Display name shown (or email prefix if none provided)
- ✅ No console errors

### Test 3: Google Sign-In
**Steps:**
1. Click "Sign in with Google"
2. Complete OAuth popup
3. Verify profile loaded

**Expected:**
- ✅ OAuth popup opens
- ✅ Google account selected
- ✅ Redirects to canvas
- ✅ Profile photo displayed (if available)
- ✅ Display name from Google account
- ✅ COOP warnings expected (documented as normal)

### Test 4: Sign-Out
**Steps:**
1. While signed in, click profile dropdown
2. Click "Logout"

**Expected:**
- ✅ Redirects to Login page
- ✅ Session cleared
- ✅ Canvas unmounted
- ✅ Presence disconnected

### Test 5: State Persistence
**Steps:**
1. Sign in
2. Refresh page (F5)

**Expected:**
- ✅ Stays signed in (Firebase auth persistence)
- ✅ No login screen flash
- ✅ Canvas loads immediately

## Performance Testing (React DevTools)

### Setup
1. Install React DevTools extension (if not installed)
2. Open browser DevTools → React tab → Profiler

### Test: Verify No Unnecessary Re-renders

**Steps:**
1. Open Profiler, click "Start profiling"
2. Sign in to app
3. Interact with canvas:
   - Create a shape
   - Move a shape
   - Change zoom level
   - Open/close presence list
4. Click "Stop profiling"

**Analysis:**
1. Find `AuthProvider` in render tree
2. Check render count
3. Find `AppContent`, `Login`, `Navbar` components
4. Verify they only re-render when:
   - Auth state actually changes (login/logout)
   - Their own props change
   - NOT when parent re-renders for other reasons

**Expected Results:**
- `AuthProvider` may render multiple times (normal)
- Auth consumers render only when auth state changes
- No unnecessary cascade re-renders
- Improved performance vs. before optimization

### Visual Check

**Before Optimization:**
```
AuthProvider render
  ├─ AppContent render ← Unnecessary
  └─ Navbar render     ← Unnecessary
```

**After Optimization:**
```
AuthProvider render
  ├─ AppContent (no render) ✅
  └─ Navbar (no render)     ✅
```

## Regression Tests

### Areas to Verify

1. **AuthContext API** - All methods still work:
   - ✅ `currentUser` - returns current user object
   - ✅ `loading` - shows loading state correctly
   - ✅ `signUp(email, password, displayName)` - creates account
   - ✅ `signIn(email, password)` - authenticates user
   - ✅ `signInWithGoogle()` - OAuth flow works
   - ✅ `signOut()` - signs out user

2. **Display Name Handling**:
   - ✅ Google: Uses Google display name
   - ✅ Sign-up with name: Uses provided name
   - ✅ Sign-up without name: Uses email prefix
   - ✅ All names truncated to 20 chars

3. **Loading States**:
   - ✅ Initial load shows loading (handled by AuthProvider)
   - ✅ Children render only after auth state determined
   - ✅ No flash of login page when already authenticated

4. **Error Handling**:
   - ✅ Invalid credentials show error message
   - ✅ Network errors handled gracefully
   - ✅ Firebase errors displayed to user

## Edge Cases

### Test: Rapid Sign-In/Sign-Out
**Steps:**
1. Sign in
2. Immediately sign out
3. Immediately sign in again
4. Repeat 3-5 times

**Expected:**
- ✅ No crashes
- ✅ State updates correctly each time
- ✅ No memory leaks
- ✅ No orphaned listeners

### Test: Multiple Tabs
**Steps:**
1. Open app in two tabs
2. Sign in on tab 1
3. Check tab 2 (should auto-update due to Firebase persistence)
4. Sign out on tab 1
5. Check tab 2 (should auto-sign-out)

**Expected:**
- ✅ Firebase syncs auth state across tabs
- ✅ Both tabs stay in sync
- ✅ No conflicts

### Test: Network Interruption
**Steps:**
1. Start sign-in flow
2. Disable network before completion
3. Re-enable network
4. Complete sign-in

**Expected:**
- ✅ Firebase handles retry automatically
- ✅ Error shown if timeout
- ✅ Success when network restored

## Automated Testing

### Unit Tests
```bash
npm test
# All existing tests should pass
# No new test failures
```

**Expected:**
- ✅ All auth service tests pass
- ✅ No new test updates needed (non-breaking change)

### Coverage
```bash
npm run test:coverage
# Coverage should remain same or improve
```

## Monitoring

### During Testing, Watch For:

1. **Console Errors:**
   - No new errors introduced
   - Existing COOP warnings still present (expected)
   - No React warnings about hooks

2. **Network Tab:**
   - Firebase auth calls complete successfully
   - No excessive API calls
   - Proper caching behavior

3. **Memory:**
   - No memory leaks during sign-in/out cycles
   - AuthProvider cleanup works correctly

4. **CPU:**
   - No performance degradation
   - Ideally improved (fewer re-renders)

## Success Criteria

### Must Pass ✅
- [ ] All auth flows work (email, Google, sign-out)
- [ ] Build compiles without errors
- [ ] No new console errors (except expected COOP)
- [ ] No breaking changes to API
- [ ] Existing tests pass

### Performance Goals ✅
- [ ] React DevTools shows fewer re-renders
- [ ] Auth consumers re-render only when state changes
- [ ] No performance regression

### Nice to Have ✅
- [ ] Measurable performance improvement in DevTools
- [ ] Smoother UI interactions
- [ ] Better React Profiler metrics

## Rollback Plan

**If Issues Found:**
1. Checkout previous commit: `git checkout HEAD~1`
2. Or revert optimization: Remove useMemo, restore object literal
3. Simple two-line change to revert

**Indicators to Rollback:**
- Auth flows broken
- Console errors introduced
- Tests failing
- Performance degradation

## Documentation Checklist

- [x] Performance analysis documented (memory-bank/auth-performance-optimization.md)
- [x] Summary created (AUTH_OPTIMIZATION_SUMMARY.md)
- [x] Test plan created (this file)
- [x] Commit message descriptive
- [ ] Update progress.md after testing
- [ ] Update activeContext.md if significant

## Sign-Off

### After Testing Complete:

**Tested By:** _____________  
**Date:** _____________  
**Test Duration:** _______ minutes  

**Results:**
- [ ] All tests passed
- [ ] Performance improved
- [ ] No regressions found
- [ ] Ready for merge

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________

---

## Quick Test Script

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run tests
npm test

# Browser: Manual testing
# 1. Sign in with email/password ✅
# 2. Sign out ✅
# 3. Sign in with Google ✅
# 4. Check React DevTools Profiler ✅
# 5. Verify no unnecessary re-renders ✅

# If all pass:
git status  # Verify clean
# Ready for merge!
```

