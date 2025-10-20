# 🔄 Turn Obstacle Feature - Design Document

**Version:** 1.0  
**Date:** 2025-10-20  
**Status:** 📋 Proposal (Not Yet Implemented)

---

## 📖 Overview

Thêm khả năng detect và render **turn obstacles** (góc rẽ/junction) cho các obstacle có hình dạng phức tạp (T-shape, L-shape, cross, etc.).

### New Prefabs
1. **`turn_obstacle_1_direct`** - Junction có 1 nhánh phụ
   - Bản chất: Nối 3 hướng (T-shape)
   - Dùng cho: 
     - Obstacle dài có 1 nhánh phụ ở giữa
     - Góc rẽ L-corner (2 neighbors)
   - Default orientation: 1 nhánh dài dọc + 1 nhánh phụ ngang phải
   
2. **`turn_obstacle_multi_direct`** - Junction phức tạp (4 hướng)
   - Cross junction (+ shape)
   - Nhiều nhánh gặp nhau

### Default Orientation
- `turn_obstacle_1_direct`: 
  - **Nhánh chính: VERTICAL (↑↓)**
  - **Nhánh phụ: nối sang TRÁI (←)** *(Updated: Prefab thực tế ngược 180° so với assumption ban đầu)*
  - Visual: ⊣ (T-shape pointing left)
- Cần rotate dựa trên vị trí thực tế của neighbors

---

## 🎯 Detection Logic

### Rule 1: Identify Turn Obstacles

```typescript
// Count obstacle neighbors (4 cardinal directions)
const neighbors = [top, bottom, left, right].filter(isObstacle).length;

if (neighbors === 2) {
    // L-Corner: 2 hướng
    // → Use turn_obstacle_1_direct (can represent L-corner)
    if ((top && bottom) || (left && right)) {
        // Straight line → use normal obstacle prefab
    } else {
        // Corner (L-shape) → use turn_obstacle_1_direct
    }
}

if (neighbors === 3) {
    // T-Junction: 3 hướng (primary use case)
    // → Use turn_obstacle_1_direct
}

if (neighbors === 4) {
    // Cross: 4 hướng
    // → Use turn_obstacle_multi_direct
}
```

### Rule 2: Determine Rotation

Cho `turn_obstacle_1_direct` với default:
- **Nhánh chính: Vertical (↑↓)**
- **Nhánh phụ: Left (←)** *(Updated: Thực tế prefab)*
- **Visual: ⊣ (T-shape pointing left)**

#### For 3 Neighbors (T-Shape) - Primary Case

| Actual Pattern | Top | Right | Bottom | Left | Rotation | Visual | Description |
|----------------|-----|-------|--------|------|----------|--------|-------------|
| Bottom-Left-Top | ✓ | ✗ | ✓ | ✓ | 0° | ⊣ | T pointing left (default) |
| Left-Top-Right | ✓ | ✓ | ✗ | ✓ | 90° | ⊤ | T pointing up |
| Top-Right-Bottom | ✓ | ✓ | ✓ | ✗ | 180° | ⊢ | T pointing right |
| Right-Bottom-Left | ✗ | ✓ | ✓ | ✓ | 270° | ⊥ | T pointing down |

#### For 2 Neighbors (L-Corner) - Fallback Case

| Actual Pattern | Top | Right | Bottom | Left | Rotation | Visual | Description |
|----------------|-----|-------|--------|------|----------|--------|-------------|
| Bottom-Left | ✗ | ✗ | ✓ | ✓ | 0° | ⊣* | Use left part of T (default) |
| Left-Top | ✓ | ✗ | ✗ | ✓ | 90° | ⊤* | Use top part of T |
| Top-Right | ✓ | ✓ | ✗ | ✗ | 180° | ⊢* | Use right part of T |
| Right-Bottom | ✗ | ✓ | ✓ | ✗ | 270° | ⊥* | Use bottom part of T |

*Note: Chỉ 2 cạnh của T được kết nối, cạnh thứ 3 không có obstacle nhưng prefab vẫn có hình dạng đó (acceptable).

---

## 🔍 Detailed Analysis

### Case 1: T-Junction (3 neighbors) - PRIMARY USE

```
Pattern 1: Top-Right-Bottom (T pointing right)
    [1]
    ↓
    [X]→[1]
    [1]
    ↓
    
Neighbors: top=true, right=true, bottom=true
Rotation: 0° (default)
Prefab: turn_obstacle_1_direct
Visual: ⊢
```

```
Pattern 2: Right-Bottom-Left (T pointing down)
    
    [1]←[X]→[1]
        [1]
        ↓
        
Neighbors: right=true, bottom=true, left=true
Rotation: 90°
Prefab: turn_obstacle_1_direct
Visual: ⊥
```

```
Pattern 3: Bottom-Left-Top (T pointing left)
        [1]
        ↑
    [1]←[X]
        [1]
        ↑
        
Neighbors: bottom=true, left=true, top=true
Rotation: 180°
Prefab: turn_obstacle_1_direct
Visual: ⊣
```

```
Pattern 4: Left-Top-Right (T pointing up)
        [1]
        ↑
    [1]←[X]→[1]
    
Neighbors: left=true, top=true, right=true
Rotation: 270° (or -90°)
Prefab: turn_obstacle_1_direct
Visual: ⊤
```

### Case 2: L-Corner (2 neighbors) - FALLBACK USE

**Note:** `turn_obstacle_1_direct` có 3 cạnh, nhưng chỉ 2 cạnh được kết nối. Cạnh thứ 3 vẫn hiển thị nhưng không có obstacle neighbor.

```
Pattern 1: Top-Right (use right part of T)
    [1]
    ↓
    [X]→[1]
    
Neighbors: top=true, right=true
Rotation: 0°
Prefab: turn_obstacle_1_direct (bottom part unused)
Visual: ⊢ (but no bottom neighbor)
```

```
Pattern 2: Right-Bottom (use bottom part of T)
    
    [X]→[1]
    [1]
    ↓
    
Neighbors: right=true, bottom=true
Rotation: 90°
Prefab: turn_obstacle_1_direct (left part unused)
Visual: ⊥ (but no left neighbor)
```

```
Pattern 3: Bottom-Left (use left part of T)
    
    [1]←[X]
    [1]
    ↓
    
Neighbors: bottom=true, left=true
Rotation: 180°
Prefab: turn_obstacle_1_direct (top part unused)
Visual: ⊣ (but no top neighbor)
```

```
Pattern 4: Left-Top (use top part of T)
    [1]
    ↑
    [1]←[X]
    
Neighbors: left=true, top=true
Rotation: 270°
Prefab: turn_obstacle_1_direct (right part unused)
Visual: ⊤ (but no right neighbor)
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
Visual: +
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
 * Detect if obstacle is a turn/junction
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
    
    // Case 2: Cross Junction (4 neighbors)
    if (neighbors === 4) {
        return {
            isTurn: true,
            tileType: TileType.TURN_OBSTACLE_MULTI,
            rotation: 0 // Symmetric, no rotation needed
        };
    }
    
    // Case 3: T-Junction (3 neighbors) or L-Corner (2 neighbors)
    // Both use turn_obstacle_1_direct
    if (neighbors === 2 || neighbors === 3) {
        let rotation = 0;
        
        // Determine rotation based on pattern
        // Default orientation: Vertical (top-bottom) + Left branch (⊣)
        
        // Pattern: Bottom + Left + Top (missing right) = Default (0°)
        if (bottom && left && top) rotation = 0;
        // Pattern: Bottom + Left (L-corner pointing left-down) = Default (0°)
        else if (bottom && left && !top && !right) rotation = 0;
        
        // Pattern: Left + Top + Right (missing bottom) = 90°
        else if (left && top && right) rotation = 90;
        // Pattern: Left + Top (L-corner pointing left-up) = 90°
        else if (left && top && !bottom && !right) rotation = 90;
        
        // Pattern: Top + Right + Bottom (missing left) = 180°
        else if (top && right && bottom) rotation = 180;
        // Pattern: Top + Right (L-corner pointing right-up) = 180°
        else if (top && right && !bottom && !left) rotation = 180;
        
        // Pattern: Right + Bottom + Left (missing top) = 270°
        else if (right && bottom && left) rotation = 270;
        // Pattern: Right + Bottom (L-corner pointing right-down) = 270°
        else if (right && bottom && !top && !left) rotation = 270;
        
        return {
            isTurn: true,
            tileType: TileType.TURN_OBSTACLE_1,
            rotation: rotation
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
        Case A: 4 neighbors (Cross)
            → turn_obstacle_multi_direct (no rotation)
        Case B: 3 neighbors (T-junction)
            → turn_obstacle_1_direct + rotation (PRIMARY)
        Case C: 2 neighbors (L-corner)
            → turn_obstacle_1_direct + rotation (FALLBACK)
    
Priority 3: Regular Obstacle
    → detectObstacleType()
        Case A: 1 neighbor → end_obstacle
        Case B: 2 neighbors (straight) → obstacle/side_obstacle
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
- `[2,0]` = top border + obstacle below → `upper_start_obstacle`
- `[2,1]` = inner obstacle, neighbors: top(border), bottom(obstacle) → `obstacle` (vertical)
- `[2,2]` = inner obstacle, neighbors: top(obstacle), right(obstacle), bottom → **`turn_obstacle_1_direct` at 0°** ✓ (T-junction)
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
- `[2,2]` = neighbors: top(obstacle), bottom(obstacle), left(obstacle), right(border) → **`turn_obstacle_1_direct` at 180°** ✓ (T-junction pointing left)

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
- `[2,1]` = top+right+bottom → **turn_1_direct at 0°** (T pointing right)
- `[3,1]` = left+bottom → **turn_1_direct at 180°** (L-corner, using left part of T)
- `[3,2]` = top+bottom+right → **turn_1_direct at 270°** (T pointing up)
- `[3,3]` = top+left+right → **turn_1_direct at 270°** (T pointing up)

---

## 🔄 Rotation Matrix

### For turn_obstacle_1_direct (Default: Vertical ↑↓ + Right → branch)

Default visual: **⊢** (T pointing right)

#### 3 Neighbors (T-Junction) - PRIMARY USE CASE

| Actual Pattern | Top | Right | Bottom | Left | Rotation | Visual | Missing Direction |
|----------------|-----|-------|--------|------|----------|--------|-------------------|
| Top-Right-Bottom | ✓ | ✓ | ✓ | ✗ | 0° | ⊢ | Left (default) |
| Right-Bottom-Left | ✗ | ✓ | ✓ | ✓ | 90° | ⊥ | Top |
| Bottom-Left-Top | ✓ | ✗ | ✓ | ✓ | 180° | ⊣ | Right |
| Left-Top-Right | ✓ | ✓ | ✗ | ✓ | 270° | ⊤ | Bottom |

#### 2 Neighbors (L-Corner) - FALLBACK USE CASE

**Note:** Prefab vẫn có 3 cạnh, nhưng chỉ 2 cạnh connect với obstacle thực tế.

| Actual Pattern | Top | Right | Bottom | Left | Rotation | Visual | Unused Part |
|----------------|-----|-------|--------|------|----------|--------|-------------|
| Top-Right | ✓ | ✓ | ✗ | ✗ | 0° | ⊢ | Bottom part |
| Right-Bottom | ✗ | ✓ | ✓ | ✗ | 90° | ⊥ | Left part |
| Bottom-Left | ✗ | ✗ | ✓ | ✓ | 180° | ⊣ | Top part |
| Left-Top | ✓ | ✗ | ✗ | ✓ | 270° | ⊤ | Right part |

### For turn_obstacle_multi_direct (Cross junction)

Default visual: **+** (symmetric)

| Pattern | Neighbors | Rotation | Notes |
|---------|-----------|----------|-------|
| Cross | All 4 | 0° | No rotation needed (symmetric) |

---

## 📋 Validation Requirements

### Before Implementation

1. ✅ `turn_obstacle_1_direct` prefab exists
   - Visual: T-shape (⊢) - vertical bar + horizontal right branch
2. ✅ `turn_obstacle_multi_direct` prefab exists
   - Visual: Cross (+) - symmetric 4-way
3. ✅ Default orientation of `turn_obstacle_1_direct`:
   - Main branch: Vertical (↑↓)
   - Side branch: Right (→)
4. ✅ Understand that `turn_obstacle_1_direct` works for both:
   - T-junction (3 neighbors) - primary use
   - L-corner (2 neighbors) - fallback (1 unused arm)

### After Implementation

1. [ ] All T-junctions use `turn_obstacle_1_direct` (3 neighbors)
2. [ ] All L-corners use `turn_obstacle_1_direct` (2 neighbors)
3. [ ] All crosses use `turn_obstacle_multi_direct` (4 neighbors)
4. [ ] Rotations are correct (visual test)
5. [ ] Unused arms in L-corners are acceptable visually
6. [ ] No performance degradation
7. [ ] Backward compatible (old maps still work)

---

## ⚠️ Edge Cases

### Edge Case 1: L-Corner with Unused Arm

```
["1", "1", "1"]
["1", "0", "1"]
["1", "1", "1"]
```

- `[1,1]` = only 2 neighbors (top + right)
- Uses `turn_obstacle_1_direct` at 0°
- **Result:** T-shape (⊢) displayed, but bottom arm không connect
- **Acceptable:** Visual vẫn OK trong game context

### Edge Case 2: Corner at Border

```
["1", "1", "1"]
["1", "1", "0"]
```

- `[1,1]` = neighbors: top(border), left(border), bottom(inner)
- Should this be a turn?
- **Recommendation:** Priority to border detection (existing logic)
- Border detection runs BEFORE turn detection

### Edge Case 3: Single Obstacle

```
["1", "0", "1"]
["0", "1", "0"]
["1", "0", "1"]
```

- Center tile has NO cardinal neighbors
- Not a turn (0 neighbors)
- **Recommendation:** Falls to regular obstacle logic (isolated tile)

### Edge Case 4: All 4 Neighbors

```
    [1]
[1] [X] [1]
    [1]
```

- Cross junction (4 neighbors)
- Use `turn_obstacle_multi_direct`
- No rotation (symmetric)
- **Clear case, no ambiguity**

---

## 🎯 Testing Strategy

### Unit Tests

```typescript
describe('detectTurnObstacle', () => {
    test('T-junction Top-Right-Bottom returns 0° rotation', () => {
        const pattern = { top: true, right: true, bottom: true, left: false };
        const result = detectTurnObstacle(pattern);
        expect(result).toEqual({
            isTurn: true,
            tileType: 'turn1',
            rotation: 0
        });
    });
    
    test('T-junction Right-Bottom-Left returns 90° rotation', () => {
        const pattern = { top: false, right: true, bottom: true, left: true };
        const result = detectTurnObstacle(pattern);
        expect(result.rotation).toBe(90);
    });
    
    test('L-corner Top-Right returns 0° rotation (fallback)', () => {
        const pattern = { top: true, right: true, bottom: false, left: false };
        const result = detectTurnObstacle(pattern);
        expect(result).toEqual({
            isTurn: true,
            tileType: 'turn1',
            rotation: 0
        });
    });
    
    test('Cross junction returns multi_direct', () => {
        const pattern = { top: true, right: true, bottom: true, left: true };
        const result = detectTurnObstacle(pattern);
        expect(result.tileType).toBe('turn_multi');
        expect(result.rotation).toBe(0); // Symmetric
    });
    
    test('Straight line is not detected as turn', () => {
        const pattern = { top: true, right: false, bottom: true, left: false };
        const result = detectTurnObstacle(pattern);
        expect(result.isTurn).toBe(false);
    });
});
```

### Visual Tests

Create test maps:
1. **test_turns_t_junction.json** - T-junctions (3 neighbors)
2. **test_turns_l_corner.json** - L-corners (2 neighbors, fallback)
3. **test_turns_cross.json** - Cross junctions (4 neighbors)
4. **test_turns_all.json** - Mixed patterns with all rotation angles

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
   - Explain T-shape prefab usage
   - Add rotation examples

2. **TESTING_GUIDE.md**
   - Add turn obstacle test cases (T-junction primary, L-corner fallback)
   - Add rotation verification
   - Note about unused arms in L-corners

3. **REFACTOR_SUMMARY.md**
   - Document new feature in changelog

4. **QUICK_START.md**
   - Mention optional turn prefabs
   - Clarify `turn_obstacle_1_direct` is T-shape

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

### Approach 1: Single T-Shape Prefab with Rotation (Current Proposal) ✅
**What we're doing:**
- 1 prefab: `turn_obstacle_1_direct` (T-shape)
- Used for BOTH T-junction (3 neighbors) AND L-corner (2 neighbors)
- L-corners will have 1 unused arm visible

✅ **Pros:** 
- Minimal prefabs needed (just 2 total)
- Single prefab + rotation = flexible
- Unused arm in L-corners might be acceptable visually

❌ **Cons:** 
- L-corners show extra arm that doesn't connect
- May look slightly wrong in some contexts

### Approach 2: Separate L and T Prefabs
**Alternative:**
- 2 prefabs for 2-neighbor: `l_corner_obstacle` (pure L-shape ┗)
- 4 prefabs for 3-neighbor: `t_obstacle` (T-shapes ⊢⊥⊣⊤)
- 1 prefab for 4-neighbor: `cross_obstacle` (+)

✅ **Pros:** Perfect visual for each case  
❌ **Cons:** Need 7 prefabs instead of 2

### Approach 3: Multiple Prefab Variants
```typescript
turn_obstacle_top_right: Prefab        // L-corner
turn_obstacle_right_bottom: Prefab     // L-corner
turn_obstacle_t_right: Prefab          // T pointing right
turn_obstacle_t_down: Prefab           // T pointing down
// ... etc
```
✅ **Pros:** No rotation logic, perfect visuals  
❌ **Cons:** 8-12 prefabs to manage, complex setup

**Recommendation:** Stick with **Approach 1** (current proposal)
- Trade-off: Visual accuracy vs. Simplicity
- Unused arm in L-corners is minor issue
- User confirms this is acceptable for their map design

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
1. ✅ All T-junctions (3 neighbors) visually correct
2. ✅ All L-corners (2 neighbors) use T-prefab acceptably
3. ✅ All crosses (4 neighbors) visually correct
4. ✅ Rotations accurate (±5° tolerance)
5. ✅ Unused arms in L-corners are acceptable in gameplay
6. ✅ No performance degradation
7. ✅ Backward compatible
8. ✅ Easy to use (no manual config)
9. ✅ Well documented

---

## 🎉 Expected Results

### Before (Wrong)
```
[1][1][1][1][1]
[1][0][1][0][1]
[1][0][1][1][1]  ← Straight obstacle pieces look wrong at T-junction
    [1][0][0][1]
```

### After (Correct)
```
[1][1][1][1][1]
[1][0][1][0][1]
[1][0][⊢──1][1]  ← Proper T-junction piece! ✓
    [1][0][0][1]
```

### L-Corner with T-Prefab (Acceptable)
```
[1][1][1][1][1]
[1][0][⊢][0][1]  ← T-shape used for L-corner
[1][0][0][0][1]  ← Bottom arm visible but not connected (acceptable)
```

**Note:** Trong L-corner, prefab T-shape vẫn hiển thị cạnh thứ 3 (unused arm), nhưng điều này được chấp nhận trong game design của bạn.

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
