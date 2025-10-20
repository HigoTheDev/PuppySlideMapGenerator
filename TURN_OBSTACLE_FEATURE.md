# 🔄 Turn Obstacle Feature - Design Document

**Version:** 1.0  
**Date:** 2025-10-20  
**Status:** 📋 Proposal (Not Yet Implemented)

---

## 📖 Overview

Thêm khả năng detect và render **turn obstacles** (góc rẽ/corner) cho các obstacle có hình dạng không thẳng (L-shape, T-junction, cross, etc.).

### New Prefabs
1. **`turn_obstacle_1_direct`** - Corner đơn (2 neighbors: 1 từ nhánh cũ + 1 ra nhánh mới)
2. **`turn_obstacle_multi_direct`** - Junction phức tạp (3+ neighbors)

### Default Orientation
- `turn_obstacle_1_direct`: **Hướng mặc định nối sang bên PHẢI**
- Cần rotate dựa trên vị trí thực tế của neighbors

---

## 🎯 Detection Logic

### Rule 1: Identify Turn Obstacles

```typescript
// Count obstacle neighbors (4 cardinal directions)
const neighbors = [top, bottom, left, right].filter(isObstacle).length;

if (neighbors === 2) {
    // Check if it's a corner (L-shape) or straight line
    if ((top && bottom) || (left && right)) {
        // Straight line → use normal obstacle prefab
    } else {
        // Corner (L-shape) → use turn_obstacle_1_direct
    }
}

if (neighbors >= 3) {
    // Junction → use turn_obstacle_multi_direct
}
```

### Rule 2: Determine Rotation

Cho `turn_obstacle_1_direct` với default hướng **nối sang phải**:

| Neighbors | Rotation | Description |
|-----------|----------|-------------|
| Top + Right | 0° | Default (↑→) |
| Right + Bottom | 90° clockwise | (→↓) |
| Bottom + Left | 180° | (↓←) |
| Left + Top | 270° clockwise (90° counter) | (←↑) |

---

## 🔍 Detailed Analysis

### Case 1: Simple L-Corner (2 neighbors)

```
Pattern 1: Top-Right
    [ ]
    [X]→[1]
    
Neighbors: top=true, right=true
Rotation: 0° (default)
Prefab: turn_obstacle_1_direct
```

```
Pattern 2: Right-Bottom
    
    [X]→[1]
    [ ] [1]
         ↓
Neighbors: right=true, bottom=true
Rotation: 90°
Prefab: turn_obstacle_1_direct
```

```
Pattern 3: Bottom-Left
    
    [1]←[X]
    [1]
    ↓
Neighbors: bottom=true, left=true
Rotation: 180°
Prefab: turn_obstacle_1_direct
```

```
Pattern 4: Left-Top
        [1]
        ↑
    [1]←[X]
    
Neighbors: left=true, top=true
Rotation: 270° (or -90°)
Prefab: turn_obstacle_1_direct
```

### Case 2: T-Junction (3 neighbors)

```
Pattern: Top-Right-Bottom (T pointing left)
    [1]
    ↓
[X]→[1]
    [1]
    ↓
Neighbors: top, right, bottom (3)
Prefab: turn_obstacle_multi_direct
Rotation: Depends on multi_direct default orientation
```

### Case 3: Cross Junction (4 neighbors)

```
Pattern: All 4 directions
        [1]
        ↑
[1]←[X]→[1]
        ↓
        [1]

Neighbors: all 4 (top, bottom, left, right)
Prefab: turn_obstacle_multi_direct
Rotation: No rotation needed (symmetric)
```

---

## 💻 Implementation Plan

### Step 1: Add New Prefabs to MapPrefabs Class

```typescript
@ccclass('MapPrefabs')
export class MapPrefabs {
    // ... existing prefabs ...
    
    @property({ type: Prefab, tooltip: "Góc rẽ đơn (2 hướng, default: right)" })
    turn_obstacle_1_direct: Prefab | null = null;
    
    @property({ type: Prefab, tooltip: "Ngã rẽ phức tạp (3+ hướng)" })
    turn_obstacle_multi_direct: Prefab | null = null;
}
```

### Step 2: Add New TileType Enums

```typescript
enum TileType {
    // ... existing types ...
    
    TURN_OBSTACLE_1 = 'turn1',        // L-corner (2 directions)
    TURN_OBSTACLE_MULTI = 'turn_multi' // Junction (3+ directions)
}
```

### Step 3: Update setupPrefabMap()

```typescript
private setupPrefabMap(): void {
    // ... existing mappings ...
    
    this.prefabMap.set(TileType.TURN_OBSTACLE_1, this.mapPrefabs.turn_obstacle_1_direct!);
    this.prefabMap.set(TileType.TURN_OBSTACLE_MULTI, this.mapPrefabs.turn_obstacle_multi_direct!);
}
```

### Step 4: Create Turn Detection Function

```typescript
/**
 * Detect if obstacle is a turn/corner (L-shape)
 * Returns the tile type and required rotation
 */
private detectTurnObstacle(pattern: NeighborPattern): {
    isTurn: boolean;
    tileType: string;
    rotation: number; // degrees
} {
    const { top, bottom, left, right } = pattern;
    
    // Count obstacle neighbors
    const neighbors = [top, bottom, left, right].filter(Boolean).length;
    
    // Case 1: Straight line (not a turn)
    if (neighbors === 2 && ((top && bottom) || (left && right))) {
        return { isTurn: false, tileType: '', rotation: 0 };
    }
    
    // Case 2: L-Corner (2 neighbors, not in line)
    if (neighbors === 2) {
        let rotation = 0;
        
        if (top && right) rotation = 0;         // Top-Right: default
        else if (right && bottom) rotation = 90;  // Right-Bottom
        else if (bottom && left) rotation = 180;  // Bottom-Left
        else if (left && top) rotation = 270;     // Left-Top
        
        return {
            isTurn: true,
            tileType: TileType.TURN_OBSTACLE_1,
            rotation: rotation
        };
    }
    
    // Case 3: T-Junction or Cross (3+ neighbors)
    if (neighbors >= 3) {
        // For multi-direct, rotation depends on prefab design
        // If prefab is symmetric, no rotation needed
        // If prefab has specific orientation, calculate based on neighbors
        
        return {
            isTurn: true,
            tileType: TileType.TURN_OBSTACLE_MULTI,
            rotation: 0 // TODO: Calculate based on multi_direct design
        };
    }
    
    return { isTurn: false, tileType: '', rotation: 0 };
}
```

### Step 5: Update detectObstacleType()

```typescript
private detectObstacleType(pattern: NeighborPattern, x: number, y: number): string {
    const { top, bottom, left, right } = pattern;
    
    // NEW: Check for turn obstacles first
    const turnCheck = this.detectTurnObstacle(pattern);
    if (turnCheck.isTurn) {
        // Store rotation info for later use in spawnTile()
        this.tileRotations.set(`${x},${y}`, turnCheck.rotation);
        return turnCheck.tileType;
    }
    
    // Count cardinal neighbors (4 main directions)
    const neighbors = [top, bottom, left, right].filter(Boolean).length;
    
    // ... existing logic for start, middle, end obstacles ...
}
```

### Step 6: Add Rotation Support to spawnTile()

```typescript
/**
 * Spawn a single tile at the specified position
 */
private spawnTile(tileType: string, x: number, y: number): boolean {
    const prefab = this.prefabMap.get(tileType);
    
    if (!prefab) {
        warn(`[SmartMapGenerator] No prefab found for tile type '${tileType}' at [${x}, ${y}]`);
        return false;
    }
    
    try {
        const tileNode = instantiate(prefab);
        
        // Set size
        const transform = tileNode.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(this.tileSize, this.tileSize);
        }
        
        // NEW: Apply rotation if needed
        const rotationKey = `${x},${y}`;
        if (this.tileRotations.has(rotationKey)) {
            const rotation = this.tileRotations.get(rotationKey)!;
            tileNode.setRotationFromEuler(0, 0, -rotation); // Negative for clockwise
            this.tileRotations.delete(rotationKey); // Clean up
        }
        
        // Calculate position
        const anchorX = this.mapWidth * this.tileSize / 2;
        const anchorY = this.mapHeight * this.tileSize / 2;
        const posX = x * this.tileSize - anchorX + this.tileSize / 2;
        const posY = -y * this.tileSize + anchorY - this.tileSize / 2;
        
        tileNode.setPosition(v3(posX, posY, 0));
        this.mapContainer!.addChild(tileNode);
        
        return true;
    } catch (err) {
        error(`[SmartMapGenerator] Error spawning tile at [${x}, ${y}]:`, err);
        return false;
    }
}
```

### Step 7: Add Private Field for Rotation Storage

```typescript
@ccclass('SmartMapGenerator')
export class SmartMapGenerator extends Component {
    // ... existing fields ...
    
    private tileRotations: Map<string, number> = new Map();
}
```

---

## 📊 Complete Detection Priority

```
Priority 1: Border Position
    → detectBorderType()
    
Priority 2: Turn/Corner Detection (NEW!)
    → detectTurnObstacle()
        Case A: 2 neighbors (L-shape)
            → turn_obstacle_1_direct + rotation
        Case B: 3+ neighbors (junction)
            → turn_obstacle_multi_direct
    
Priority 3: Regular Obstacle
    → detectObstacleType()
        Case A: 1 neighbor → end_obstacle
        Case B: 2 neighbors (straight) → obstacle/side_obstacle
        Case C: 3+ neighbors → junction/complex
```

---

## 🎨 Visual Examples

### Example 1: L-Shape Obstacle

**Map:**
```json
{
  "data": [
    ["1", "1", "1", "1", "1"],
    ["1", "0", "1", "0", "1"],
    ["1", "0", "1", "1", "1"],
    ["1", "0", "0", "0", "1"],
    ["1", "1", "1", "1", "1"]
  ]
}
```

**Detection:**
- `[2,1]` = inner obstacle, neighbors: top(border), bottom(obstacle) → `obstacle` (vertical)
- `[2,2]` = inner obstacle, neighbors: top(obstacle), right(obstacle) → **`turn_obstacle_1_direct` at 0°** ✓
- `[3,2]` = inner obstacle, neighbors: left(obstacle), right(border) → `right_end_obstacle`

### Example 2: T-Junction

**Map:**
```json
{
  "data": [
    ["1", "1", "1", "1", "1"],
    ["1", "0", "1", "0", "1"],
    ["1", "1", "1", "1", "1"],
    ["1", "0", "1", "0", "1"],
    ["1", "1", "1", "1", "1"]
  ]
}
```

**Detection:**
- `[2,2]` = neighbors: top(obstacle), bottom(obstacle), left(obstacle), right(border)
  → **`turn_obstacle_multi_direct`** ✓

### Example 3: Multiple Corners

**Map:**
```json
{
  "data": [
    ["1", "1", "1", "1", "1", "1"],
    ["1", "0", "1", "1", "0", "1"],
    ["1", "0", "0", "1", "0", "1"],
    ["1", "1", "1", "1", "0", "1"],
    ["1", "0", "0", "0", "0", "1"],
    ["1", "1", "1", "1", "1", "1"]
  ]
}
```

**Detection:**
- `[2,1]` = top+right → **turn_1_direct at 0°**
- `[3,1]` = left+bottom → **turn_1_direct at 180°**
- `[3,2]` = top+bottom → obstacle (straight)
- `[3,3]` = top+left → **turn_1_direct at 270°**

---

## 🔄 Rotation Matrix

### For turn_obstacle_1_direct (Default: connects to RIGHT)

| Actual Pattern | Top | Right | Bottom | Left | Rotation | Visual |
|----------------|-----|-------|--------|------|----------|--------|
| Top-Right | ✓ | ✓ | ✗ | ✗ | 0° | ┗ |
| Right-Bottom | ✗ | ✓ | ✓ | ✗ | 90° | ┏ |
| Bottom-Left | ✗ | ✗ | ✓ | ✓ | 180° | ┓ |
| Left-Top | ✓ | ✗ | ✗ | ✓ | 270° | ┛ |

### For turn_obstacle_multi_direct

Depends on prefab design. Options:
1. **No rotation** (if symmetric like +)
2. **Rotate based on missing direction** (if asymmetric like ⊢)
3. **Multiple variants** for each configuration

---

## 📋 Validation Requirements

### Before Implementation

1. ✅ `turn_obstacle_1_direct` prefab exists
2. ✅ `turn_obstacle_multi_direct` prefab exists
3. ✅ Default orientation of `turn_obstacle_1_direct` is RIGHT
4. ❓ Default orientation of `turn_obstacle_multi_direct` is?

### After Implementation

1. [ ] All L-corners use `turn_obstacle_1_direct`
2. [ ] All junctions use `turn_obstacle_multi_direct`
3. [ ] Rotations are correct (visual test)
4. [ ] No performance degradation
5. [ ] Backward compatible (old maps still work)

---

## ⚠️ Edge Cases

### Edge Case 1: Corner at Border

```
["1", "1", "1"]
["1", "1", "0"]
```

- `[1,1]` = neighbors: top(border), left(border), right
- Should this be a corner? Or border?
- **Recommendation:** Treat as border (existing logic)

### Edge Case 2: Diagonal Obstacle

```
["1", "0", "1"]
["0", "1", "0"]
["1", "0", "1"]
```

- Center tile has NO cardinal neighbors
- **Recommendation:** Isolated tile → use default obstacle

### Edge Case 3: All 4 Neighbors

```
    [1]
[1] [X] [1]
    [1]
```

- Cross junction
- Use `turn_obstacle_multi_direct`
- No rotation (symmetric)

---

## 🎯 Testing Strategy

### Unit Tests

```typescript
describe('detectTurnObstacle', () => {
    test('Top-Right corner returns 0° rotation', () => {
        const pattern = { top: true, right: true, bottom: false, left: false };
        const result = detectTurnObstacle(pattern);
        expect(result).toEqual({
            isTurn: true,
            tileType: 'turn1',
            rotation: 0
        });
    });
    
    test('Right-Bottom corner returns 90° rotation', () => {
        const pattern = { top: false, right: true, bottom: true, left: false };
        const result = detectTurnObstacle(pattern);
        expect(result.rotation).toBe(90);
    });
    
    test('T-junction returns multi_direct', () => {
        const pattern = { top: true, right: true, bottom: true, left: false };
        const result = detectTurnObstacle(pattern);
        expect(result.tileType).toBe('turn_multi');
    });
});
```

### Visual Tests

Create test maps:
1. **test_turns_simple.json** - Basic L-corners
2. **test_turns_complex.json** - T-junctions and crosses
3. **test_turns_all.json** - All rotation angles

---

## 🔧 Configuration Options

### Optional Feature Flags

```typescript
@property({
    tooltip: "Bật turn obstacle detection (góc rẽ)",
    visible: true
})
useTurnObstacles: boolean = true;
```

### Rotation Direction

```typescript
@property({
    tooltip: "Hướng xoay (clockwise hoặc counter-clockwise)",
    visible: true
})
rotationDirection: 'clockwise' | 'counter-clockwise' = 'clockwise';
```

---

## 📝 Documentation Updates Needed

### Files to Update

1. **README.md**
   - Add turn obstacle section
   - Update prefab count (16 → 18)
   - Add rotation examples

2. **TESTING_GUIDE.md**
   - Add turn obstacle test cases
   - Add rotation verification

3. **REFACTOR_SUMMARY.md**
   - Document new feature in changelog

4. **QUICK_START.md**
   - Mention optional turn prefabs

---

## 🚀 Implementation Checklist

### Phase 1: Setup (1 hour)
- [ ] Add new prefab properties to MapPrefabs
- [ ] Add new TileType enums
- [ ] Update validatePrefabs() to include new prefabs
- [ ] Update setupPrefabMap()

### Phase 2: Detection (2 hours)
- [ ] Implement detectTurnObstacle()
- [ ] Update detectObstacleType() with turn check
- [ ] Add tileRotations Map field
- [ ] Test detection logic with console logs

### Phase 3: Rendering (1 hour)
- [ ] Update spawnTile() with rotation support
- [ ] Test rotation visually
- [ ] Fix any rotation direction issues

### Phase 4: Testing (2 hours)
- [ ] Create test JSON files
- [ ] Visual verification
- [ ] Edge case testing
- [ ] Performance testing

### Phase 5: Documentation (1 hour)
- [ ] Update all docs
- [ ] Create examples
- [ ] Write usage guide

**Total Estimated Time:** 7 hours

---

## 💡 Alternative Approaches

### Approach 1: Multiple Prefab Variants (Current Proposal)
✅ **Pros:** Single prefab + rotation = flexible  
❌ **Cons:** Need rotation logic  

### Approach 2: Separate Prefabs for Each Rotation
```typescript
turn_obstacle_top_right: Prefab
turn_obstacle_right_bottom: Prefab
turn_obstacle_bottom_left: Prefab
turn_obstacle_left_top: Prefab
```
✅ **Pros:** No rotation logic needed  
❌ **Cons:** 4 prefabs instead of 1, harder to manage  

### Approach 3: Auto-Tiling System
Use sprite sheets with auto-tiling rules (like Unity's Rule Tiles)
✅ **Pros:** Most flexible  
❌ **Cons:** Complex to implement  

**Recommendation:** Stick with **Approach 1** (current proposal)

---

## 🎓 Learning Resources

### Cocos Creator Rotation
```typescript
// Set rotation from Euler angles (x, y, z)
node.setRotationFromEuler(0, 0, angle);

// Or use angle property directly
node.angle = angle;

// Note: Positive angle = counter-clockwise
// Negative angle = clockwise
```

### Neighbor Pattern Detection
```typescript
// Check all 4 cardinal directions
const pattern = {
    top: isObstacle(x, y - 1),
    bottom: isObstacle(x, y + 1),
    left: isObstacle(x - 1, y),
    right: isObstacle(x + 1, y)
};

// Count neighbors
const count = Object.values(pattern).filter(Boolean).length;
```

---

## 📊 Performance Impact

### Expected Performance
- **Detection:** +2-3ms per map (negligible)
- **Rotation:** +1ms per turn tile (negligible)
- **Memory:** +8 bytes per turn tile (rotation storage)

### Optimization Tips
1. Clear tileRotations Map after rendering
2. Use rotation cache if same pattern repeats
3. Consider pre-calculating rotations

---

## ✅ Success Criteria

Feature is successful if:
1. ✅ All L-corners visually correct
2. ✅ All junctions visually correct
3. ✅ Rotations accurate (±5° tolerance)
4. ✅ No performance degradation
5. ✅ Backward compatible
6. ✅ Easy to use (no manual config)
7. ✅ Well documented

---

## 🎉 Expected Results

### Before
```
[1][1][1][1][1]
[1][0][1][0][1]
[1][0][1][1][1]  ← Straight obstacle pieces look wrong at corner
```

### After
```
[1][1][1][1][1]
[1][0][1][0][1]
[1][0][┗━━━━1]  ← Proper corner piece! ✓
```

---

**Status:** 📋 Ready for Implementation  
**Complexity:** Medium  
**Priority:** High  
**Breaking Changes:** None

**Next Action:** Review this document, then implement Phase 1

---

**Author:** AI Assistant  
**Reviewed by:** (Pending)  
**Approved by:** (Pending)
