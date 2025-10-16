# 🧪 CollabCanvas Rubric Testing Checklist

**Purpose**: Systematic testing protocol aligned with grading rubric  
**Target Score**: 75/100 (without AI Agent) → A- equivalent  
**Date Created**: October 16, 2025  
**Status**: Ready for testing after code fixes

---

## ⚠️ Important Context

**AI Canvas Agent (Section 4: 25 pts)** is intentionally NOT implemented yet. This testing focuses on maximizing the remaining **75 available points**.

**Modified Score Breakdown:**
- Section 1: Core Collaboration (30 pts) - **CRITICAL**
- Section 2: Canvas Features/Performance (20 pts) - **CRITICAL**  
- Section 3: Advanced Features (15 pts) - **HIGH**
- Section 5: Technical Implementation (10 pts) - **MEDIUM**
- Section 6: Documentation (5 pts) - **MEDIUM**
- Section 7: AI Dev Log (Pass/Fail) - **REQUIRED**
- Section 8: Demo Video (Pass/Fail) - **REQUIRED**

---

## 🔧 Code Fixes Applied (October 16, 2025)

Before testing, the following issues were fixed:

✅ **R1**: Added border thickness control for rectangles/circles  
✅ **C1**: Fixed circle resize to anchor at edge instead of midpoint  
✅ **L1**: Fixed line color to use stroke property, renamed control to "Line Color"  
✅ **L2**: Added 20px hit area for easier line selection, excluded from transformer  
✅ **L3**: Implemented line endpoint dragging (grab one end, other anchors)  
✅ **T1**: Fixed text placement to center at click position  
✅ **UX1**: ESC now deselects shapes before swapping tools  
✅ **UX2**: Improved RTDB throttle to 16ms (60 FPS) for smoother viewing  
✅ **UX3**: Added name label showing WHO is editing locked shapes  

---

## 📋 SECTION 1: Core Collaborative Infrastructure (30 points)

### A. Real-Time Synchronization (12 pts target: 11-12)

**Target: Excellent (11-12 points)**
- Sub-100ms object sync
- Sub-50ms cursor sync
- Zero visible lag during rapid multi-user edits

#### Test 1.1: Object Sync Speed ⏳

**Procedure:**
1. User A creates a shape
2. Measure time until User B sees it appear
3. Repeat 10 times

**How to measure:**
```javascript
// In browser console (both users)
// User A:
const start = performance.now();
// Create shape
console.log('Shape created at:', start);

// User B: Watch for shape to appear, then:
const end = performance.now();
const syncTime = end - [User A's timestamp];
console.log('Sync delay:', syncTime, 'ms');
```

**Success Criteria:**
- ✅ Average < 100ms
- ✅ No test > 150ms
- ✅ Consistent across all 10 tests

**Points at Risk:** 4 pts

---

#### Test 1.2: Cursor Sync Speed ⏳

**Procedure:**
1. User A moves cursor rapidly across canvas
2. User B observes cursor smoothness

**Success Criteria:**
- ✅ No visible lag
- ✅ No stuttering or teleporting
- ✅ Smooth 60 FPS updates

**Points at Risk:** 4 pts

---

#### Test 1.3: Rapid Edit Test ⏳

**Procedure:**
1. Create 10 rectangles
2. User A: Rapidly drag/resize shapes (5+ operations/sec)
3. User B: Watch updates
4. Both check FPS in DevTools

**Success Criteria:**
- ✅ User B sees smooth updates
- ✅ No teleporting or missing frames
- ✅ Both users maintain 60 FPS

**Points at Risk:** 4 pts

---

### B. Conflict Resolution & State Management (9 pts target: 8-9)

**RUBRIC REQUIRED TESTS:**

#### Test 1.4: Simultaneous Move ⏳

**Procedure:**
1. Create 1 rectangle
2. User A: Click to select, start dragging left
3. User B: Simultaneously try to select and drag right
4. Both complete drag motion

**Expected Result:**
- First user gets lock
- Second user blocked with toast: "Shape is locked by [User]"
- Final position = first user's drag only

**Success Criteria:**
- ✅ Both users see SAME final position
- ✅ No ghost shapes or jumping
- ✅ Toast notification shows for blocked user
- ✅ Lock visual appears (grayed + name label)

**Points at Risk:** 2 pts

---

#### Test 1.5: Rapid Edit Storm ⏳

**Procedure:**
1. Create 1 rectangle
2. User A: Select and start resizing
3. User B: Simultaneously change color (StylePanel)
4. User C: Simultaneously try to move it
5. All users continue for 5 seconds

**Expected Result:**
- User A's resize works (has transform lock)
- User B's color change works (property edit = LWW)
- User C's move BLOCKED (lock conflict)

**Success Criteria:**
- ✅ Final shape has User A's size
- ✅ Final shape has User B's color (or last color change if multiple)
- ✅ Position unchanged (only A could move it)
- ✅ No corruption, all properties intact

**Points at Risk:** 3 pts

---

#### Test 1.6: Delete vs Edit ⏳

**Procedure:**
1. Create 1 rectangle
2. User A: Select and start dragging
3. User B: While A is dragging, press Delete

**Expected Result:**
- User B's delete BLOCKED (shape locked by A)
- OR shape deletes and A's drag fails gracefully

**Success Criteria:**
- ✅ No crash or error
- ✅ Both users see consistent state
- ✅ Clear feedback to both users

**Points at Risk:** 2 pts

---

#### Test 1.7: Create Collision ⏳

**Procedure:**
1. Clear canvas
2. User A & B: Both click Rectangle tool
3. Both click same spot simultaneously

**Expected Result:**
- Two shapes created (different IDs)
- Both visible and distinct
- No duplicates

**Success Criteria:**
- ✅ Exactly 2 shapes exist
- ✅ Both users see same 2 shapes
- ✅ Shapes have unique IDs

**Points at Risk:** 2 pts

---

### C. Persistence & Reconnection (9 pts target: 8-9)

**RUBRIC REQUIRED TESTS:**

#### Test 1.8: Mid-Operation Refresh ⏳

**Procedure:**
1. User A creates rectangle
2. User A starts dragging to new position
3. **MID-DRAG**: User A hits Cmd+R (refresh)
4. Page reloads
5. Check rectangle position

**Expected Result:**
- Shape at original position (drag not committed) OR
- Shape at new position (if commit happened before refresh)

**Success Criteria:**
- ✅ No data loss
- ✅ Shape exists at valid position
- ✅ No ghost shapes

**Points at Risk:** 3 pts

---

#### Test 1.9: Total Disconnect ⏳

**Procedure:**
1. User A & B create 10 shapes together
2. Both users close browsers completely
3. Wait 2 minutes
4. Both reopen and sign in

**Success Criteria:**
- ✅ All 10 shapes present
- ✅ Correct positions/colors/properties
- ✅ No data loss

**Points at Risk:** 3 pts

---

#### Test 1.10: Network Simulation ⏳

**Procedure:**
1. User A creates 5 shapes
2. Chrome DevTools → Network → Offline
3. User A tries to create 3 more shapes (will fail)
4. Wait 30 seconds
5. Set back to Online

**Success Criteria:**
- ✅ Original 5 shapes persist
- ✅ Operations after reconnect work
- ✅ No corruption

**Points at Risk:** 2 pts

---

#### Test 1.11: Rapid Disconnect ⏳

**Procedure:**
1. User A makes 5 rapid edits (within 2 seconds)
2. Immediately close tab
3. User B checks canvas

**Success Criteria:**
- ✅ All 5 edits persist for User B
- ✅ Visible within 5 seconds

**Points at Risk:** 1 pt

---

## 📋 SECTION 2: Canvas Features & Performance (20 points)

### A. Canvas Functionality (8 pts target: 7-8)

**Requirements for Excellent:**
- ✅ Smooth pan/zoom
- ✅ 3+ shape types (rectangle, circle, line, text)
- ✅ Text with formatting
- ✅ Multi-select (shift-click AND drag)
- ❓ Layer management (z-index control)
- ✅ Transform operations (move/resize/rotate)
- ❓ Duplicate/delete

#### Test 2.1: Feature Completeness Checklist ⏳

| Feature | Test Procedure | Expected Result | Status |
|---------|---------------|-----------------|--------|
| **Pan (Space+Drag)** | Hold Space, drag canvas in all directions | Smooth panning, shapes not draggable while Space held | ⏳ |
| **Zoom (Ctrl+Scroll)** | Ctrl+scroll from 10% to 300% | Smooth zoom, centers around mouse | ⏳ |
| **Rectangle** | Create, drag, resize, rotate, adjust border | All operations smooth | ⏳ |
| **Circle** | Create, drag, resize (stays circular), rotate | Anchors to edge during resize | ⏳ |
| **Line** | Create, drag whole line, drag endpoints | Endpoints moveable, easy to select | ⏳ |
| **Text** | Create (centers at click), edit, format (B/I/U), align, font size | Consistent placement, all formatting works | ⏳ |
| **Multi-Select Shift** | Shift+click 3 shapes | All selected, blue outlines | ⏳ |
| **Multi-Select Drag** | Click+drag selection box | Correct shapes captured | ⏳ |
| **Group Transform** | Select 3 shapes, drag together | All move together smoothly | ⏳ |
| **Delete** | Select shape(s), press Delete | All selected disappear | ⏳ |
| **Layer/Z-Index** | Check for bring-front/send-back | ❓ VERIFY IF EXISTS | ⏳ |
| **Duplicate** | Check for Cmd+D or duplicate option | ❓ VERIFY IF EXISTS | ⏳ |

**Missing Features:**
- [ ] Layer management (z-index control) → **-1 pt if missing**
- [ ] Duplicate functionality → **-1 pt if missing**

---

### B. Performance & Scalability (12 pts target: 11-12)

**Requirements for Excellent:**
- 500+ objects at 60 FPS
- 5+ concurrent users
- No degradation under load

#### Test 2.2: Object Scalability (500+ shapes) ⏳

**Procedure:**
1. Open Chrome DevTools → Performance tab
2. Create 50 shapes, test performance
3. Continue to 100, 200, 300, 500 shapes
4. At each milestone, test drag/zoom/pan
5. Monitor FPS throughout

**Helper Script:**
```javascript
// Run in browser console after signing in
async function createTestShapes(count, context) {
  for(let i = 0; i < count; i++) {
    const x = Math.random() * 4000;
    const y = Math.random() * 4000;
    const type = ['rectangle', 'circle'][Math.floor(Math.random() * 2)];
    const fill = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    
    // Call addShape from your canvas context
    // await context.addShape({ type, x, y, width: 50, height: 50, fill });
    
    if(i % 50 === 0) {
      console.log(`Created ${i}/${count} shapes...`);
      await new Promise(r => setTimeout(r, 100)); // Pause to avoid throttling
    }
  }
  console.log('Shape creation complete!');
}

// Use like: createTestShapes(500, canvasContext)
```

**Success Criteria:**
- ✅ 60 FPS with 500 shapes
- ✅ Drag operations smooth
- ✅ Zoom/pan responsive
- ✅ No memory leaks (check Memory tab)

**Points at Risk:** 4 pts

---

#### Test 2.3: User Scalability (5+ users) ⏳

**Procedure:**
1. Open 5 browser windows/profiles
2. All sign in to same canvas
3. Each creates 5 shapes (25 total)
4. All simultaneously drag/edit for 2 minutes

**Success Criteria:**
- ✅ All users smooth performance
- ✅ No lag or delays
- ✅ Consistent state across all users
- ✅ No conflicts or crashes

**Points at Risk:** 4 pts

---

#### Test 2.4: Combined Load (5 users + 300 shapes) ⏳

**Procedure:**
1. Start with 300 shapes
2. 5 users join
3. All actively editing simultaneously
4. Monitor FPS on all machines

**Success Criteria:**
- ✅ 60 FPS maintained
- ✅ Network traffic reasonable
- ✅ No RTDB throttling warnings

**Points at Risk:** 4 pts

---

## 📋 SECTION 3: Advanced Features (15 points)

**Scoring Guide:**
- Excellent (13-15): 3 Tier 1 + 2 Tier 2 + 1 Tier 3
- Good (10-12): 2-3 Tier 1 + 1-2 Tier 2
- Satisfactory (6-9): 2-3 Tier 1 OR 1 Tier 2

### Current Feature Inventory

#### Tier 1 Features (2 pts each, max 6 pts)

| Feature | Status | Test | Points |
|---------|--------|------|--------|
| Color picker with palettes | ✅ Implemented | Basic color picker works | 2 |
| Undo/redo (Cmd+Z) | ❌ NOT IMPLEMENTED | Would need action history | 0 |
| Keyboard shortcuts | ⚠️ PARTIAL | Delete works, need more | 1 |
| Export PNG/SVG | ❌ NOT IMPLEMENTED | No export functionality | 0 |
| Snap-to-grid | ❌ NOT IMPLEMENTED | No snapping | 0 |
| Object grouping | ❌ NOT IMPLEMENTED | No grouping feature | 0 |
| Copy/paste | ❌ NOT IMPLEMENTED | No clipboard | 0 |

**Current Tier 1 Score: 3 pts** (need 6 for Excellent)

#### Tier 2 Features (3 pts each, max 6 pts)

| Feature | Status | Test | Points |
|---------|--------|------|--------|
| Layers panel | ❌ NOT IMPLEMENTED | No z-index control | 0 |
| Alignment tools | ❌ NOT IMPLEMENTED | No align/distribute | 0 |
| Z-index management | ❓ NEEDS TESTING | Check for bring-to-front | 0-3 |
| Selection tools | ⚠️ PARTIAL | Multi-select works | 2 |

**Current Tier 2 Score: 2 pts** (need 6 for Excellent)

#### Tier 3 Features (3 pts each, max 3 pts)

**Current Tier 3 Score: 0 pts**

**PROJECTED SECTION 3 SCORE: 5-7 pts (Satisfactory)**

### Improvement Recommendations:

**Quick Wins (Tier 1 - can implement in 1-2 days):**
1. **Undo/Redo** (+2 pts) - Action history with Cmd+Z
2. **Copy/Paste** (+2 pts) - Clipboard with Cmd+C/V
3. **Enhanced Keyboard Shortcuts** (+2 pts) - Arrow keys, Cmd+D duplicate

**If all 3 implemented: Section 3 score = 11 pts (Good)**

---

## 📋 SECTION 5: Technical Implementation (10 points)

### A. Architecture Quality (5 pts target: 5)

**Automated Check:**
- ✅ Clean, well-organized code structure (verified)
- ✅ Separation of concerns (services/components/contexts)
- ✅ Scalable architecture (two-database hybrid)
- ✅ Error handling (try/catch blocks present)
- ✅ Modular components (verified)

**Manual Verification:**
- [ ] Code review for best practices
- [ ] Check error handling coverage
- [ ] Verify no code smells

**Expected Score: 4-5 pts**

---

### B. Authentication & Security (5 pts target: 5)

**Checklist:**
- [ ] Firebase Auth working (email + Google)
- [ ] Session handling correct
- [ ] Protected routes (canvas requires auth)
- [ ] No exposed credentials (.env not in repo)
- [ ] Firestore rules deployed and secure
- [ ] RTDB rules deployed and secure

**Expected Score: 4-5 pts**

---

## 📋 SECTION 6: Documentation (5 points)

### A. Repository & Setup (3 pts)

**Checklist:**
- [ ] README clear and up-to-date
- [ ] Setup guide detailed
- [ ] Architecture documented (memory-bank/)
- [ ] Easy to run locally (test: `npm install && npm run dev`)
- [ ] Dependencies listed in package.json

**Action Items:**
- [ ] Update README.md (remove "only rectangles" references)
- [ ] Verify setup instructions work on fresh machine
- [ ] Check all memory-bank files are current

**Expected Score: 2-3 pts**

---

### B. Deployment (2 pts)

**URL:** https://collab-canvas-ed2fc.web.app

**Checklist:**
- [ ] Deployment accessible publicly
- [ ] Test with 5+ users simultaneously
- [ ] Check load times (<3 seconds)
- [ ] No console errors in production
- [ ] Firebase rules deployed

**Expected Score: 1-2 pts**

---

## 📋 SECTION 7: AI Development Log (Pass/Fail)

**REQUIREMENT:** Must include ANY 3 of 5 sections

**Status:** ❌ NOT CREATED

**Required Sections (pick 3):**
1. Tools & Workflow used
2. 3-5 effective prompting strategies
3. Code analysis (AI-generated vs hand-written %)
4. Strengths & limitations
5. Key learnings

**Create file:** `/docs/AI_DEVELOPMENT_LOG.md`

**Estimated time:** 2-3 hours of reflection and writing

---

## 📋 SECTION 8: Demo Video (Pass/Fail)

**REQUIREMENT:** 3-5 minute video

**Must demonstrate:**
- [ ] Real-time collaboration (2+ users, show both screens)
- [ ] ~~AI commands~~ (SKIP - not implemented yet)
- [ ] Advanced features walkthrough
- [ ] Architecture explanation
- [ ] Clear audio and video

**Estimated time:** 4-6 hours (planning, recording, editing)

---

## 📊 TESTING SCHEDULE

### Week 1 (Current)
- **Day 1-2**: Section 1 Tests (Collaboration) - All 11 tests
- **Day 3**: Document conflict resolution strategy
- **Day 4**: Section 2A Tests (Feature completeness)
- **Day 5**: Fix any issues found

### Week 2
- **Day 1**: Section 2B Tests (Performance - 500 shapes)
- **Day 2**: Section 2B Tests (5+ users)
- **Day 3**: Section 5 & 6 verification
- **Day 4**: Write AI Development Log
- **Day 5**: Plan and record demo video

### Week 3 (Optional Improvements)
- Implement undo/redo
- Implement copy/paste
- Implement keyboard shortcuts
- Re-test and document

---

## 📈 SCORE TRACKING

### Current Projected Score (Before Testing)

| Section | Projected | Possible | % |
|---------|-----------|----------|---|
| 1. Collaboration | 26 | 30 | 87% |
| 2. Features/Perf | 16 | 20 | 80% |
| 3. Advanced | 5 | 15 | 33% |
| 4. AI Agent | SKIP | SKIP | N/A |
| 5. Technical | 9 | 10 | 90% |
| 6. Documentation | 4 | 5 | 80% |
| **TOTAL** | **60** | **80** | **75%** |

**Rubric Equivalency:** 60/80 available = 75% of available points

### Target Score (After Testing + Quick Wins)

| Section | Target | Possible | % |
|---------|--------|----------|---|
| 1. Collaboration | 29 | 30 | 97% |
| 2. Features/Perf | 19 | 20 | 95% |
| 3. Advanced | 11 | 15 | 73% |
| 4. AI Agent | SKIP | SKIP | N/A |
| 5. Technical | 10 | 10 | 100% |
| 6. Documentation | 5 | 5 | 100% |
| **TOTAL** | **74** | **80** | **93%** |

**Rubric Equivalency:** 74/80 available = 93% (A)

---

## ✅ NEXT STEPS

1. **Test all Section 1 scenarios** (11 tests)
2. **Document results** in this file or spreadsheet
3. **Fix any issues** discovered
4. **Report back** with results

For each test, mark as:
- ✅ **PASS** - Meets success criteria
- ⚠️ **PARTIAL** - Works but with issues
- ❌ **FAIL** - Does not meet criteria
- ❓ **UNCLEAR** - Need clarification on expected behavior

---

## 🎯 Critical Path to A Grade

**Must Have (Non-Negotiable):**
1. Section 1: 28+ points (93% of collaboration)
2. Section 2: 18+ points (90% of features/perf)
3. Pass/Fail sections complete (AI Log + Demo Video)

**Should Have (For buffer):**
4. Section 3: 10+ points (implement 2-3 Tier 1 features)
5. Section 5: 9+ points
6. Section 6: 5 points

**Total Target: 70-74 / 80 available = 88-93% = A-/A**

---

**Ready to begin systematic testing!** 🚀

