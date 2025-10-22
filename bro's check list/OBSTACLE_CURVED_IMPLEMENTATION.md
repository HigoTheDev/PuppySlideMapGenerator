# Curved Obstacle Implementation - Phase 1 MVP

**Date:** 2025-10-22  
**Status:** ✅ Implemented and Ready for Testing

---

## 🎯 What Was Implemented

**Concept:** Each obstacle = 2 corner sprites paired together to create smooth curves

**Scope:** Phase 1 MVP - Vertical obstacles only

---

## 📝 Code Changes Summary

### 1. New TileTypes

```typescript
enum TileType {
    // ... existing ...
    OBSTACLE_V_START = 'ovs',    // Start of vertical obstacle
    OBSTACLE_V_END = 'ove',      // End of vertical obstacle
}
```

### 2. New Interfaces

```typescript
interface SpriteConfig {
    sprite: string;
    flipX: boolean;
    rotation: number;
}

interface ObstacleConfig {
    sprite1: SpriteConfig;      // Left/top corner
    sprite2: SpriteConfig;      // Right/bottom corner
    offset: { x: number; y: number };  // Spacing between sprites
}
```

### 3. Obstacle Configuration

```typescript
const OBSTACLE_SPRITE_MAP: Record<string, ObstacleConfig> = {
    [TileType.OBSTACLE_V_START]: {
        sprite1: { sprite: 'corner_border_top', flipX: true, rotation: 0 },
        sprite2: { sprite: 'corner_border_top', flipX: false, rotation: 0 },
        offset: { x: 0.25, y: 0 }
    },
    [TileType.OBSTACLE_V_END]: {
        sprite1: { sprite: 'corner_border_bottom', flipX: true, rotation: 180 },
        sprite2: { sprite: 'corner_border_bottom', flipX: false, rotation: 180 },
        offset: { x: 0.25, y: 0 }
    },
};
```

### 4. New Functions

#### `detectObstacleType(x, y)`
Detects obstacle type based on vertical neighbors:
- No neighbor above + has below → `OBSTACLE_V_START` (opening)
- Has above + no neighbor below → `OBSTACLE_V_END` (closing)

#### `spawnCurvedObstacle(obstacleType, x, y)`
Spawns a curved obstacle:
1. Creates container node
2. Spawns 2 sprite nodes using `createSpriteNode()`
3. Positions sprites with offset
4. Parents sprites to container
5. Adds container to map

#### `createSpriteNode(config, offsetX, offsetY)`
Creates a single sprite node with:
- Sprite frame from config
- Scale and flip
- Rotation
- Position offset

### 5. Updated renderMap()

```typescript
// Detection
if (this.useContextAwareDetection && tileValue === TileType.WALL) {
    if (this.isBorderPosition(x, y)) {
        tileType = this.detectBorderType(x, y);
    } else {
        tileType = this.detectObstacleType(x, y);  // NEW
    }
}

// Spawning
const isObstacle = tileType === TileType.OBSTACLE_V_START || 
                  tileType === TileType.OBSTACLE_V_END;

if (isObstacle) {
    this.spawnCurvedObstacle(tileType, x, y);  // NEW
} else {
    this.spawnTile(tileType, x, y);
}
```

---

## 🎨 Visual Concept

### Single Obstacle Tile

**OBSTACLE_V_START (opening from border):**
```
    ╭─╮
    │ │
```
- Uses 2x `corner_border_top`
- Left corner: flipX = true
- Right corner: flipX = false
- Offset: 0.25 tiles apart

**OBSTACLE_V_END (closing inside map):**
```
    │ │
    ╰─╯
```
- Uses 2x `corner_border_bottom`
- Both rotated 180°
- Same offset pattern

### Complete 2-Tile Obstacle

```
Map:
  ┌─╮─┬───┐
  │ │ │   │  ← START at y=1 (2 corners facing each other)
  │ ╰─╯   │  ← END at y=2 (2 corners closing)
  └───────┘
```

---

## 🔧 Technical Details

### Node Hierarchy

```
MapContainer
├── obstacle_2_1 (container)
│   ├── Sprite1 (left corner at x-0.25)
│   └── Sprite2 (right corner at x+0.25)
├── obstacle_2_2 (container)
│   ├── Sprite1 (left corner at x-0.25)
│   └── Sprite2 (right corner at x+0.25)
└── ... borders and other tiles
```

### Positioning Logic

**Container Position:**
- Grid-aligned to tile coordinates
- Same as single tile positioning

**Child Sprites:**
- Offset from container center
- `sprite1.x = -offset.x * tileSize`
- `sprite2.x = +offset.x * tileSize`
- Both use same y (no vertical offset)

### Offset Value

**Current: `{ x: 0.25, y: 0 }`**
- Sprites are 0.25 tiles apart (each 0.25 from center)
- Total width = 0.5 tiles spacing
- Adjust if curves don't align perfectly

---

## 🧪 Testing

### Test Map Example

```json
{
  "data": [
    ["1","1","1","1","1","1","1"],
    ["1","0","1","0","1","0","1"],
    ["1","0","1","0","1","0","1"],
    ["1","0","0","0","1","0","1"],
    ["1","1","1","1","1","1","1"]
  ]
}
```

Expected result:
- Borders render normally
- Column at x=2: Vertical obstacle (START at y=1, END at y=2)
- Column at x=4: Another vertical obstacle

### What to Check

✅ **Visual:**
- Curved obstacles appear smooth
- Corners face inward (forming tube/pipe shape)
- No gaps between sprite pairs
- Aligned with grid

✅ **Hierarchy:**
- Each obstacle = 1 container with 2 child sprites
- Container named `obstacle_x_y`
- Sprites have correct rotation/flip

✅ **Console:**
- No errors
- Debug logs show "Spawned curved obstacle" messages

---

## ⚙️ Configuration Tuning

### If Curves Don't Align

**Problem:** Gap between sprite pairs
**Solution:** Reduce offset
```typescript
offset: { x: 0.2, y: 0 }  // Closer together
```

**Problem:** Sprites overlap too much
**Solution:** Increase offset
```typescript
offset: { x: 0.3, y: 0 }  // Further apart
```

### If Rotation Looks Wrong

**OBSTACLE_V_END:**
```typescript
// Try different rotation values
rotation: 180  // Current
rotation: 0    // If 180° is wrong direction
```

### If FlipX Needs Adjustment

Currently:
- LEFT sprite: `flipX: true`
- RIGHT sprite: `flipX: false`

If corners face outward instead of inward, swap these values.

---

## 📊 Performance Notes

### Node Count
- 1 obstacle tile = 3 nodes (1 container + 2 sprites)
- vs 1 border tile = 1 node

**Impact:** ~3x more nodes for obstacles
**Acceptable:** For typical maps with few obstacles

### Render Calls
- Same atlas = same batch
- No performance impact if using SpriteAtlas

### Memory
- Reuses existing corner sprites
- No additional asset loading
- Same memory footprint

---

## 🚀 Future Enhancements (Not Yet Implemented)

### Phase 2 - Horizontal Obstacles
- Add `OBSTACLE_H_START` / `OBSTACLE_H_END`
- Rotate sprites 90°/-90°
- Adjust offset to `{ x: 0, y: 0.25 }`

### Phase 3 - Middle Sections
- Add `OBSTACLE_V_MID` for long obstacles
- Use straight border sprites or repeated corners

### Phase 4 - Advanced
- L-shaped obstacles (turns)
- T-junctions
- Variable widths
- Animated obstacles

---

## 🐛 Known Limitations

1. **Vertical Only**
   - Only detects vertical obstacle sequences
   - Horizontal obstacles not yet supported

2. **No Middle Sections**
   - Long obstacles (3+ tiles) will show multiple START/END pairs
   - Need dedicated MIDDLE tile type

3. **Simple Detection**
   - Only checks immediate neighbors
   - Doesn't handle complex patterns (L-shapes, T-junctions)

4. **Fixed Offset**
   - Single offset value for all obstacles
   - May need per-obstacle tuning for variety

---

## 📝 Next Steps

1. **Test with current implementation**
   - Verify visual output
   - Check alignment
   - Tune offset if needed

2. **Add horizontal support** (Phase 2)
   - Similar to vertical but rotated
   - Different offset direction

3. **Improve detection**
   - Handle middle sections
   - Support L-shapes and turns

4. **Polish**
   - Add variety (slight rotation variations)
   - Optimize performance (pooling)
   - Add collision shapes

---

**Implementation Status:** ✅ Complete  
**Testing Status:** ⏳ Awaiting User Feedback  
**File:** `assets/Scripts/GenTest3.ts`
