# Migration Guide: Old Schema → New Schema

## What Changed?

### OLD Schema (O(n) - Problematic)
```javascript
/canvas/global-canvas-v1
{
  shapes: [
    { id: 'shape1', x: 10, y: 20, width: 100, height: 50, ... },
    { id: 'shape2', x: 30, y: 40, width: 80, height: 60, ... },
    // ... 500 shapes in ONE document
  ],
  lastModified: '2025-10-14T...'
}
```

**Problems:**
- ❌ Every update reads/writes ALL 500 shapes
- ❌ 100KB+ network transfer per operation
- ❌ Race conditions with concurrent users
- ❌ 1MB document size limit (~800 shapes max)

### NEW Schema (O(1) - Fixed!)
```javascript
/shapes/shape1
{
  id: 'shape1',
  canvasId: 'global-canvas-v1',
  x: 10,
  y: 20,
  width: 100,
  height: 50,
  fill: '#cccccc',
  createdAt: '2025-10-14T12:00:00Z',
  updatedAt: '2025-10-14T12:05:00Z',
  createdBy: 'user-xyz'
}

/shapes/shape2
{
  id: 'shape2',
  canvasId: 'global-canvas-v1',
  x: 30,
  y: 40,
  width: 80,
  height: 60,
  fill: '#cccccc',
  createdAt: '2025-10-14T12:01:00Z',
  updatedAt: '2025-10-14T12:06:00Z',
  createdBy: 'user-xyz'
}
// Each shape is its own document!
```

**Benefits:**
- ✅ Update 1 shape = read/write 1 document (O(1))
- ✅ ~400 bytes network transfer per operation (500x less!)
- ✅ No race conditions (each shape is independent)
- ✅ Unlimited shapes (no document size limit)

---

## Code Changes

### 1. shapes.js - Before & After

#### BEFORE (shapes.js)
```javascript
export const updateShape = async (shapeId, updates) => {
  // ❌ Read ENTIRE document (all shapes)
  const docSnap = await getDoc(canvasDocRef);
  const currentShapes = docSnap.data().shapes || [];
  
  // ❌ Map over ALL shapes to update ONE
  const updatedShapes = currentShapes.map((shape) =>
    shape.id === shapeId ? { ...shape, ...updates } : shape
  );

  // ❌ Write ENTIRE array back
  await updateDoc(canvasDocRef, {
    shapes: updatedShapes,
    lastModified: new Date().toISOString(),
  });
};
```

#### AFTER (shapes_v2.js)
```javascript
export const updateShape = async (shapeId, updates) => {
  // ✅ Only touch ONE document
  const shapeRef = doc(db, 'shapes', shapeId);
  
  // ✅ Update only this shape - O(1)!
  await updateDoc(shapeRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
};
```

### 2. Subscription Logic - Before & After

#### BEFORE
```javascript
// Subscribe to ONE document containing all shapes
export const subscribeToShapes = (callback) => {
  return onSnapshot(canvasDocRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().shapes || []);
    } else {
      callback([]);
    }
  });
};
```

#### AFTER
```javascript
// Subscribe to COLLECTION (query all shapes for this canvas)
export const subscribeToShapes = (callback) => {
  const q = query(
    collection(db, 'shapes'),
    where('canvasId', '==', CANVAS_ID)
  );
  
  return onSnapshot(q, (snapshot) => {
    const shapes = snapshot.docs.map(doc => doc.data());
    callback(shapes);
  });
};
```

---

## Migration Steps

### Step 1: Run Migration Script

```javascript
// In your browser console or a migration script
import { migrateShapesToNewSchema, verifyMigration } from './src/utils/migrateShapes';

// Run migration
const result = await migrateShapesToNewSchema();
console.log(result);
// Expected output:
// {
//   success: true,
//   migrated: 500,
//   message: 'Migrated 500 shapes successfully',
//   oldDocPath: '/canvas/global-canvas-v1'
// }

// Verify migration
const verification = await verifyMigration();
console.log(verification);
// Expected output:
// {
//   success: true,
//   oldCount: 500,
//   newCount: 500,
//   message: 'Migration verified successfully'
// }
```

### Step 2: Update Code References

```bash
# Replace shapes.js import with shapes_v2.js
find src -type f -name "*.js" -o -name "*.jsx" | xargs sed -i '' 's/from.*shapes\.js/from ".\/shapes_v2.js"/g'

# Or manually update:
# - src/contexts/CanvasContext.jsx
# - src/components/Canvas/Canvas.jsx
# - Any other files importing shapes.js
```

### Step 3: Test the New Schema

1. **Open the app with the new code**
2. **Create a new shape** → should create in `/shapes/{shapeId}`
3. **Move a shape** → should update only that document
4. **Delete a shape** → should delete only that document
5. **Open in another browser** → should see real-time updates

### Step 4: Clean Up Old Data (Optional)

```javascript
// After verifying everything works, delete the old document
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from './services/firebase';

const oldCanvasRef = doc(db, 'canvas', 'global-canvas-v1');
await deleteDoc(oldCanvasRef);
console.log('✅ Old schema deleted');
```

---

## Rollback Plan (If Something Goes Wrong)

```javascript
import { rollbackMigration } from './src/utils/migrateShapes';

// This will delete all new /shapes/* documents
// Old /canvas/global-canvas-v1 document remains intact
const result = await rollbackMigration();
console.log(result);

// Then switch code back to use shapes.js instead of shapes_v2.js
```

---

## Testing Checklist

- [ ] Migration script runs without errors
- [ ] Verification shows matching counts (old = new)
- [ ] Can create new shapes in new schema
- [ ] Can move shapes (check Firestore console - only 1 doc updated)
- [ ] Can delete shapes (check Firestore console - only 1 doc deleted)
- [ ] Real-time sync works between multiple browsers
- [ ] No console errors
- [ ] Performance feels faster (check Network tab - should see ~400B updates instead of 100KB)
- [ ] No race conditions (test with 2 users moving different shapes simultaneously)

---

## Performance Comparison

Run this test before and after migration:

```javascript
// Test: Update 10 shapes in quick succession
const shapeIds = ['shape1', 'shape2', 'shape3', ...]; // 10 IDs

console.time('Update 10 shapes');
for (const id of shapeIds) {
  await updateShape(id, { x: Math.random() * 1000, y: Math.random() * 1000 });
}
console.timeEnd('Update 10 shapes');

// BEFORE (old schema): ~2000-3000ms (200-300ms per update × 10)
// AFTER (new schema): ~300-500ms (30-50ms per update × 10)
// Improvement: 4-6x faster! 🚀
```

---

## Database Rules

Update your Firestore rules to match the new schema:

```javascript
// OLD rules for /canvas/{canvasId}
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /canvas/{canvasId} {
      allow read, write: if request.auth != null;
    }
  }
}

// NEW rules for /shapes/{shapeId}
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /shapes/{shapeId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null 
                    && request.resource.data.createdBy == request.auth.uid;
      allow update: if request.auth != null;
      allow delete: if request.auth != null;
    }
  }
}
```

---

## FAQ

### Q: What happens if migration fails halfway?
**A:** The migration uses Firestore batches (atomic operations). If a batch fails, already-committed batches remain, but you can run the migration again. Use `verifyMigration()` to check progress.

### Q: Can I run both schemas simultaneously?
**A:** Yes! The old document at `/canvas/global-canvas-v1` and new documents at `/shapes/*` can coexist. This allows for safe migration and testing.

### Q: What if I have more than 500 shapes?
**A:** The migration script handles any number of shapes by batching writes (500 per batch). No problem!

### Q: Will this break existing user sessions?
**A:** Yes, temporarily. Users will need to refresh the page after you deploy the new code. Consider showing a "Please refresh" banner or forcing a reload.

### Q: How much will Firestore costs decrease?
**A:** With 500 shapes and 50 updates/hour:
- **Before:** 50 updates × 100KB = 5 MB transfer
- **After:** 50 updates × 400B = 20 KB transfer
- **Savings:** 99.6% reduction in data transfer! 💰

---

## Next Steps After Migration

1. **Monitor Firestore console** for a few hours to ensure stability
2. **Check performance** in browser DevTools (Network tab)
3. **Delete old schema** after 24-48 hours of stable operation
4. **Update documentation** to reflect new schema
5. **Consider adding indexes** if querying by fields other than `canvasId`

---

## Need Help?

If migration fails or you encounter issues:
1. Check browser console for errors
2. Check Firestore console for data integrity
3. Run `verifyMigration()` to see what's missing
4. Run `rollbackMigration()` if needed (reverts to old schema)
5. Check RTDB rules haven't changed (locks still work the same way)

