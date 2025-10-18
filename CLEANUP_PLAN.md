# Cleanup Plan - October 18, 2025

## Files to Archive (Combine into single document)
These temporary session files should be archived:
- COMPLETE_PERFORMANCE_SOLUTION.md
- FINAL_PERFORMANCE_SUMMARY.md
- PERFORMANCE_STATUS.md
- REFRESH_AND_TEST.md
- SESSION_SUMMARY_OCT16.md
- TEST_NOW.md

## Files to Move to docs/ (Already created, just need to move)
- docs/ARCHITECTURE_REFACTOR.md
- docs/BATCH_OPERATIONS_COMPLETE_GUIDE.md
- docs/DEPLOYMENT_SUCCESS.md
- docs/EDGE_CASES_AND_RTDB_FIRESTORE_SYNC.md
- docs/FIRESTORE_BATCH_COMMITS.md
- docs/FIRESTORE_RULES_OPTIMIZATION.md
- docs/LARGE_SELECTION_OPTIMIZATION.md
- docs/OPTIMISTIC_LOCKING.md
- docs/PERFORMANCE_OPTIMIZATION_STATUS.md
- docs/SELECTION_GROUP_ARCHITECTURE.md
- docs/VIEWPORT_CULLING.md

## Files to Commit (Modified)
- firestore.rules (updated security rules)
- memory-bank/activeContext.md
- memory-bank/systemPatterns.md
- package.json (new deployment scripts)
- src/App.jsx
- src/components/Canvas/Canvas.jsx
- src/components/Canvas/ShapeNode.jsx
- src/components/Canvas/StylePanel.jsx
- src/contexts/CanvasContext.jsx
- src/services/realtimeShapes.js
- src/services/shapes.js

## Files to Add (New components/features)
- src/components/Canvas/BatchOperationIndicator.jsx (NEW - batch loading indicator)
- src/components/Canvas/SelectionGroupNode.jsx (NEW - group transform handler)
- src/models/SelectionGroup.js (NEW - group data model)

## Files to Add (New documents)
- DEPLOYMENT_STRATEGY.md (NEW - comprehensive deployment guide)
- .env.public (NEW - environment config)

## Actions
1. Archive session files: Create SESSION_ARCHIVE.md
2. Keep docs/ files: Already in right place
3. Commit all modified files
4. Add new components/models
5. Add new deployment docs
