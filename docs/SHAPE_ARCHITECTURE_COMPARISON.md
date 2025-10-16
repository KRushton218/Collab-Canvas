# Shape Storage Architecture Comparison

## Performance Requirement
- 500+ shapes without FPS drops
- 60 FPS during all interactions  
- Shape changes sync in <100ms
- Support 5+ concurrent users

---

## Option 1: Current (All Shapes in 1 Document) ❌

### Schema
```
/canvas/global-canvas-v1
{
  shapes: [ {shape1}, {shape2}, ... {shape500} ],
  lastModified: timestamp
}
```

### Performance
- **Read**: O(n) - must read entire 500-shape array
- **Write**: O(n) - must write entire 500-shape array  
- **Listeners**: 1 listener × 10 users = 10 connections ✅
- **Race Conditions**: HIGH - concurrent edits overwrite each other
- **Document Size**: ~100KB with 500 shapes (approaching 1MB limit)

### Cost (500 operations)
- Reads: 500 × (1 doc with 500 shapes) = 500 document reads
- Writes: 500 × (1 doc with 500 shapes) = 500 document writes
- **Network Transfer**: ~50MB total (100KB × 500 operations)

### Verdict
❌ Fails at scale
❌ Race conditions  
❌ Can't exceed 800-1000 shapes (1MB limit)
❌ Every user gets ALL shapes on every update

---

## Option 2: One Shape Per Document

### Schema
```
/shapes/{shapeId}
{
  id: 'shape-abc',
  canvasId: 'global-canvas-v1',
  x: 100,
  y: 200,
  width: 100,
  height: 50,
  fill: '#cccccc'
}
```

### Performance
- **Read**: O(1) - only read 1 shape
- **Write**: O(1) - only write 1 shape
- **Listeners**: 500 shapes × 10 users = 5,000 connections ⚠️
- **Race Conditions**: NONE - each shape is independent
- **Document Size**: ~200 bytes per shape

### Cost (500 operations)
- Reads: 500 × 1 shape = 500 document reads
- Writes: 500 × 1 shape = 500 document writes  
- **Network Transfer**: ~100KB total (200 bytes × 500 operations)

### Verdict
✅ Perfect O(1) updates
✅ No race conditions
✅ Scales to 10,000+ shapes
⚠️ 5,000 concurrent listeners may be heavy for mobile
✅ 500x less network data than Option 1

---

## Option 3: Spatial Partitioning (RECOMMENDED) ⭐

### Schema
```
/regions/{regionId}/shapes/{shapeId}
{
  id: 'shape-abc',
  x: 2500,  // Global coordinates
  y: 3750,
  width: 100,
  height: 50,
  fill: '#cccccc',
  regionId: 'r10-15'  // Denormalized for quick lookup
}

// Canvas divided into 20×20 grid = 400 regions
// Each region = 250×250 pixels
// Average ~1-2 shapes per region (500 shapes / 400 regions)
```

### Performance
- **Read**: O(1) - only read shapes in 1 region
- **Write**: O(1) - only write to 1 region
- **Listeners**: Only subscribe to visible viewport regions
  - Viewport typically shows ~4-16 regions at 1x zoom
  - 16 regions × 10 users = 160 connections ✅
- **Race Conditions**: LOW - shapes in different regions never conflict
- **Document Size**: ~200-400 bytes per shape (1-2 shapes/region avg)

### Viewport Culling
```javascript
// Only load shapes in visible regions
const visibleRegions = calculateVisibleRegions(viewport, zoom);
// At 1x zoom, viewport sees ~4-16 regions
// At 0.5x zoom (zoomed out), viewport sees ~64 regions

visibleRegions.forEach(regionId => {
  subscribeToRegion(regionId); // Only 4-64 subscriptions!
});
```

### Cost (500 operations, assuming uniform distribution)
- Reads: 500 × 1 region doc (1-2 shapes) = 500 reads
- Writes: 500 × 1 region doc (1-2 shapes) = 500 writes
- **Network Transfer**: ~100KB total
- **Active Listeners**: Only 4-16 regions visible = 40-160 connections

### Moving Shapes Between Regions
```javascript
// When shape moves from region r5-10 to r5-11:
// 1. Delete from old region: 1 write
// 2. Create in new region: 1 write
// Total: 2 operations (only when crossing region boundaries)
```

### Verdict
✅ O(1) updates within a region
✅ Viewport culling = only load visible shapes
✅ Low listener count (40-160 vs 5,000)
✅ Scales to 10,000+ shapes
✅ Natural performance optimization
⚠️ 2 operations when moving across region boundaries (rare)

---

## Option 4: Fixed Chunks (50 shapes/doc)

### Schema
```
/shape-chunks/{chunkId}
{
  shapes: [ {shape1}, ... {shape50} ]
}
```

### Performance
- **Read**: O(50) - read 50 shapes to update 1
- **Write**: O(50) - write 50 shapes back
- **Listeners**: 10 chunks × 10 users = 100 connections ✅
- **Race Conditions**: MEDIUM - shapes in same chunk can conflict

### Verdict
⚠️ Still has O(n) problem (n=50 instead of 500)
⚠️ Race conditions within chunks
⚠️ Arbitrary grouping (no spatial locality)
✅ Better than Option 1, worse than Options 2 & 3

---

## Comparison Table

| Metric | Option 1 (Current) | Option 2 (1/doc) | Option 3 (Spatial) ⭐ | Option 4 (Chunks) |
|--------|-------------------|-----------------|---------------------|------------------|
| Update Complexity | O(500) ❌ | O(1) ✅ | O(1-2) ✅ | O(50) ⚠️ |
| Network per Update | 100KB ❌ | 200B ✅ | 200-400B ✅ | 10KB ⚠️ |
| Listeners (10 users) | 10 ✅ | 5,000 ⚠️ | 40-160 ✅ | 100 ✅ |
| Race Conditions | HIGH ❌ | NONE ✅ | LOW ✅ | MEDIUM ⚠️ |
| Max Shapes | 800 ❌ | Unlimited ✅ | 10,000+ ✅ | 5,000 ✅ |
| Viewport Culling | NO ❌ | NO ⚠️ | YES ✅ | NO ❌ |
| Mobile Friendly | YES ✅ | NO ⚠️ | YES ✅ | YES ✅ |

---

## Recommended Architecture: Spatial Partitioning

### Grid Configuration
```javascript
// For 5000×5000 canvas with 500 shapes target:
const REGION_SIZE = 250;  // 250×250 pixels per region
const GRID_SIZE = 20;     // 20×20 = 400 total regions
const AVG_SHAPES_PER_REGION = 500 / 400 = 1.25 shapes

// Region ID format: "r{x}-{y}"
// Examples: "r0-0", "r5-10", "r19-19"

function getRegionId(x, y) {
  const regionX = Math.floor(x / REGION_SIZE);
  const regionY = Math.floor(y / REGION_SIZE);
  return `r${regionX}-${regionY}`;
}
```

### Benefits for Your Use Case
1. **Meets 500-shape requirement** with room to grow to 5,000+
2. **60 FPS maintained** - only render/listen to visible regions
3. **<100ms sync** - O(1) Firestore operations
4. **Mobile-friendly** - only 40-160 active listeners (vs 5,000)
5. **Natural optimization** - users naturally cluster in different regions
6. **Future-proof** - viewport culling enables infinite canvas later

### Implementation Complexity
- **Low**: Similar code to Option 2, just calculate regionId
- **Migration**: Can be done incrementally (read old, write new)
- **RTDB layer**: No changes needed (already handles active edits)

---

## Action Plan

If you choose **Option 3 (Spatial Partitioning)**:
1. Add region calculation utilities
2. Refactor `shapes.js` to use subcollections
3. Update subscription logic to track viewport
4. Add region boundary crossing logic
5. Write migration script for existing data

Estimated implementation: ~2-3 hours

