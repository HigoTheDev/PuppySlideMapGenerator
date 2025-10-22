# Curved Obstacle System Proposal for GenTest3

**Date:** 2025-10-22  
**Concept:** Use paired corner sprites to create natural curved obstacles protruding from borders

---

## 🎯 Core Concept

Instead of using separate obstacle sprites like GenTest2, **reuse existing corner border sprites** by pairing them together to create smooth, curved obstacles that appear to grow naturally from the border into the map.

### Visual Concept

```
Traditional Obstacle (GenTest2):
┌─────────────────┐
│ ┌─■─■─■─┐       │  ← Square/blocky obstacles
│ │       │       │
│ └───────┘       │
└─────────────────┘

Curved Obstacle (GenTest3 Proposal):
┌─────────────────┐
│ ┌─╮ ╭─╮ ╭──╮    │  ← Smooth curved obstacles using corner pairs
│ │ ╰─╯ │         │     Each obstacle = 2 corner sprites combined
│ └───────┘       │
└─────────────────┘
```

---

## 💡 Why This Works

### 1. **Visual Consistency**
- Obstacles match border style perfectly (same sprites!)
- Natural flow from border → obstacle → path
- Cohesive visual language throughout map

### 2. **Asset Efficiency**
- No need for separate obstacle sprites
- Reuse existing `corner_border_top/bottom` sprites
- Smaller asset bundle size

### 3. **Flexibility**
- Can create various obstacle shapes by pairing different corners
- Rotation + flip gives many combinations
- Easy to adjust curvature

### 4. **Technical Simplicity**
- Already have corner sprites loaded in atlas
- Same rendering pipeline as borders
- Just need logic to place 2 sprites per obstacle

---

## 🏗️ Technical Design

### Obstacle Types

Each obstacle consists of **2 corner sprites** placed strategically:

#### Type A: Vertical Obstacle (From Top/Bottom Border)

```
From UPPER border (y=max):
    ╭─╮              Two corner_border_top sprites
    │ │              - Left:  normal orientation
    ╰─╯              - Right: flipped
    
From BELOW border (y=0):
    ╭─╮              Two corner_border_bottom sprites
    │ │              - Left:  normal orientation
    ╰─╯              - Right: flipped
```

**Position Pattern:**
- Obstacle at `[x, y]` spawns:
  - Sprite 1 at `[x, y]` (left corner)
  - Sprite 2 at `[x, y]` (right corner, slightly offset or rotated)

#### Type B: Horizontal Obstacle (From Left/Right Border)

```
From LEFT border (x=0):
    ╭─────╮          Two corner sprites rotated 90°
    │     │          - Top:    rotated + flipped
    ╰─────╯          - Bottom: rotated

From RIGHT border (x=max):
    ╭─────╮          Two corner sprites rotated -90°
    │     │          - Top:    rotated + flipped
    ╰─────╯          - Bottom: rotated
```

**Position Pattern:**
- Obstacle at `[x, y]` spawns:
  - Sprite 1 at `[x, y]` (top curve)
  - Sprite 2 at `[x, y+1]` (bottom curve)

---

## 📐 Sprite Configuration

### New TileTypes Needed

```typescript
enum TileType {
    // ... existing ...
    
    // Vertical obstacles (from top/bottom borders)
    OBSTACLE_V_START = 'ovs',    // Start from border
    OBSTACLE_V_END = 'ove',      // End inside map
    
    // Horizontal obstacles (from left/right borders)
    OBSTACLE_H_START = 'ohs',    // Start from border
    OBSTACLE_H_END = 'ohe',      // End inside map
    
    // Optional: Middle sections for long obstacles
    OBSTACLE_V_MID = 'ovm',
    OBSTACLE_H_MID = 'ohm',
}
```

### Sprite Mapping Strategy

```typescript
// Each obstacle tile spawns TWO corner sprites
const OBSTACLE_SPRITE_MAP: Record<string, ObstacleConfig> = {
    [TileType.OBSTACLE_V_START]: {
        sprite1: { sprite: 'corner_border_top', flipX: false, rotation: 0 },
        sprite2: { sprite: 'corner_border_top', flipX: true, rotation: 0 },
        offset: { x: 0.5, y: 0 }  // How far apart the sprites are
    },
    
    [TileType.OBSTACLE_V_END]: {
        sprite1: { sprite: 'corner_border_bottom', flipX: false, rotation: 180 },
        sprite2: { sprite: 'corner_border_bottom', flipX: true, rotation: 180 },
        offset: { x: 0.5, y: 0 }
    },
    
    [TileType.OBSTACLE_H_START]: {
        sprite1: { sprite: 'corner_border_top', flipX: false, rotation: 90 },
        sprite2: { sprite: 'corner_border_top', flipX: false, rotation: -90 },
        offset: { x: 0, y: 0.5 }
    },
    
    // ... etc
};
```

---

## 🎨 Visual Examples

### Example 1: Vertical Obstacle from Upper Border

```
Map coordinates:
   0   1   2   3
0  ┌───┬─╮─┬───┐
   │   │ │ │   │   ← Obstacle at [2, 1-2]
1  │   │ │ │   │      Uses 2 corner_border_top at y=1
   │   ╰─╯ │   │      Uses 2 corner_border_bottom at y=2
2  │       │   │
   └───────────┘
```

**Sprite breakdown:**
- `[2, 1]` → 2x `corner_border_top` (left normal, right flipped)
- `[2, 2]` → 2x `corner_border_bottom` (left normal, right flipped, rotated 180°)

### Example 2: Horizontal Obstacle from Left Border

```
Map coordinates:
   0   1   2   3
0  ┌───────────┐
   │ ╭─────╮   │   ← Obstacle at [1, 1-2]
1  │ │     │   │      Uses rotated corner sprites
   │ ╰─────╯   │
2  │           │
   └───────────┘
```

**Sprite breakdown:**
- `[1, 1]` → `corner_border_top` rotated 90° (top curve)
- `[1, 2]` → `corner_border_top` rotated -90° (bottom curve)

### Example 3: Complex Obstacle Pattern

```
   0   1   2   3   4
0  ┌───╮───┬─╮─┬───┐
   │ ╭─╯   │ │ │   │   Multiple obstacles
1  │ │     │ │ │   │   creating varied patterns
   │ ╰─────╯ ╰─╯   │
2  │               │
   └───────────────┘
```

---

## 🔧 Implementation Requirements

### 1. Spawn Logic Changes

Current: 1 tile = 1 sprite node
```typescript
spawnTile(tileType, x, y) → spawns 1 node
```

Proposed: Obstacle tiles = 2 sprite nodes
```typescript
spawnObstacle(tileType, x, y) → spawns 2 nodes (sprite1, sprite2)
```

### 2. New Helper Function

```typescript
private spawnCurvedObstacle(
    obstacleType: string,
    x: number,
    y: number
): boolean {
    const config = OBSTACLE_SPRITE_MAP[obstacleType];
    
    // Spawn sprite 1 (left/top curve)
    const node1 = this.createSpriteNode(
        config.sprite1.sprite,
        config.sprite1.flipX,
        config.sprite1.rotation,
        x - config.offset.x,
        y - config.offset.y
    );
    
    // Spawn sprite 2 (right/bottom curve)
    const node2 = this.createSpriteNode(
        config.sprite2.sprite,
        config.sprite2.flipX,
        config.sprite2.rotation,
        x + config.offset.x,
        y + config.offset.y
    );
    
    // Parent both to obstacle container
    const obstacleContainer = new Node('obstacle_' + x + '_' + y);
    obstacleContainer.addChild(node1);
    obstacleContainer.addChild(node2);
    
    this.mapContainer.addChild(obstacleContainer);
    
    return true;
}
```

### 3. Detection Logic

```typescript
private detectObstacleType(x: number, y: number): string | null {
    // Check neighbors to determine obstacle direction
    const hasAbove = this.hasObstacleNeighbor(x, y - 1);
    const hasBelow = this.hasObstacleNeighbor(x, y + 1);
    const hasLeft = this.hasObstacleNeighbor(x - 1, y);
    const hasRight = this.hasObstacleNeighbor(x + 1, y);
    
    // Vertical obstacle
    if (hasAbove && !hasBelow) return TileType.OBSTACLE_V_END;
    if (!hasAbove && hasBelow) return TileType.OBSTACLE_V_START;
    if (hasAbove && hasBelow) return TileType.OBSTACLE_V_MID;
    
    // Horizontal obstacle
    if (hasLeft && !hasRight) return TileType.OBSTACLE_H_END;
    if (!hasLeft && hasRight) return TileType.OBSTACLE_H_START;
    if (hasLeft && hasRight) return TileType.OBSTACLE_H_MID;
    
    // Single obstacle
    return TileType.OBSTACLE_V_START; // Default
}
```

---

## 📊 Advantages vs GenTest2

| Aspect | GenTest2 | GenTest3 (Proposed) |
|--------|----------|---------------------|
| **Sprite Count** | ~20+ obstacle sprites | 2 sprites (reused corners) |
| **Visual Style** | Blocky/geometric | Smooth/curved |
| **Asset Size** | Larger | Smaller |
| **Consistency** | Separate style | Matches borders |
| **Flexibility** | Fixed shapes | Combinable curves |
| **Implementation** | Simpler (1 tile = 1 sprite) | More complex (1 tile = 2 sprites) |

---

## 🎮 Gameplay Benefits

### 1. **Visual Clarity**
- Curved obstacles clearly "grow" from borders
- Players understand map flow intuitively
- Natural-looking environment

### 2. **Aesthetic Appeal**
- Organic, flowing design
- Less harsh/geometric than traditional tiles
- Modern, polished look

### 3. **Strategic Depth**
- Curved paths feel different than straight corridors
- Creates more interesting movement patterns
- Better for swipe-based gameplay

---

## ⚠️ Challenges & Considerations

### 1. **Complexity**
- **Challenge:** 1 obstacle tile = 2 sprite nodes (double the nodes)
- **Solution:** Use object pooling for performance
- **Alternative:** Combine sprites into single texture atlas entry

### 2. **Positioning Precision**
- **Challenge:** Two sprites must align perfectly to form smooth curve
- **Solution:** Carefully tune offset values
- **Testing:** May need different offsets based on sprite actual size

### 3. **Collision Detection**
- **Challenge:** Collision shape for curved obstacle (2 sprites)
- **Solution:** Use bounding box of combined sprites OR create custom collision polygons

### 4. **Middle Sections**
- **Challenge:** Long obstacles need middle sections (not just start/end)
- **Solution:** Add OBSTACLE_V_MID / OBSTACLE_H_MID types
- **Alternative:** Repeat start/end sprites with rotation

### 5. **Corner Cases** (pun intended)
- **Challenge:** L-shaped obstacles (turns)
- **Solution:** May need special configurations for turns
- **Alternative:** Treat as separate vertical + horizontal obstacles

---

## 🚀 Proposed Implementation Phases

### Phase 1: Foundation (MVP)
- [ ] Add OBSTACLE_V_START / OBSTACLE_V_END tile types
- [ ] Implement `spawnCurvedObstacle()` for vertical obstacles only
- [ ] Test with simple 2-tile obstacles from upper border
- [ ] Tune sprite offsets for perfect alignment

### Phase 2: Expansion
- [ ] Add horizontal obstacle support (OBSTACLE_H_*)
- [ ] Implement obstacle detection logic
- [ ] Add middle section support for long obstacles
- [ ] Create obstacle container nodes for easier management

### Phase 3: Polish
- [ ] Add rotation variations for variety
- [ ] Implement collision shapes
- [ ] Performance optimization (pooling)
- [ ] Visual testing with various map layouts

### Phase 4: Advanced
- [ ] L-shaped obstacle support (turns)
- [ ] T-junction obstacles (3-way)
- [ ] Special obstacle variations (wider, narrower)
- [ ] Animation support (growing obstacles?)

---

## 🎯 Expected Results

### Visual Output
```
Before (no obstacles):
┌───────────┐
│           │
│           │
│           │
└───────────┘

After (curved obstacles):
┌─╮───┬───╮─┐
│ ╰─╮ │ ╭─╯ │  Natural curves
│   ╰─╯     │  Flowing from borders
│           │  Cohesive visual style
└───────────┘
```

### Performance
- **Node count:** ~2x for obstacle tiles (acceptable)
- **Asset size:** Smaller (reusing sprites)
- **Render calls:** Same (same atlas)
- **Memory:** Similar (sprites already loaded)

### Code Quality
- More complex spawn logic
- Cleaner sprite management (fewer unique sprites)
- More flexible (many combinations possible)

---

## 📝 Code Structure Preview

```typescript
// New interface
interface ObstacleConfig {
    sprite1: SpriteConfig;
    sprite2: SpriteConfig;
    offset: { x: number; y: number };
}

interface SpriteConfig {
    sprite: string;
    flipX: boolean;
    rotation: number;
}

// New constant
const OBSTACLE_SPRITE_MAP: Record<string, ObstacleConfig> = {
    // ... configurations ...
};

// Modified renderMap()
if (isObstacleTile(tileType)) {
    this.spawnCurvedObstacle(tileType, x, y);
} else if (isBorderTile(tileType)) {
    this.spawnTile(tileType, x, y);
}
```

---

## 🤔 Questions to Consider

1. **Offset Values:** What offset creates the perfect curve?
   - Start with `offset: { x: 0.3, y: 0 }` for vertical
   - Test and adjust based on visual result

2. **Rotation:** Do we need rotation for variety?
   - Maybe 0°, 15°, -15° for slight variations?

3. **Middle Sections:** How to handle long obstacles?
   - Option A: Repeat start/end sprites
   - Option B: Use straight border sprites for middle
   - Option C: Create dedicated "middle curve" config

4. **Collision:** Simple box or complex polygon?
   - MVP: Use bounding box of both sprites
   - Later: Custom collision shapes if needed

5. **Layering:** Should sprites overlap or touch edge-to-edge?
   - Test both approaches
   - May need slight overlap to avoid seams

---

## ✅ Recommendation

**Proceed with Phased Implementation:**

Start with **Phase 1** (vertical obstacles only) to validate the concept:
- Simpler to implement
- Proves the visual concept works
- Allows tuning offsets/rotations
- Can expand to horizontal later

**Why this works:**
- Unique visual style
- Asset efficient
- Flexible and extensible
- Matches your creative vision

**Next step:** Implement Phase 1 MVP and see results!

---

**Status:** 📋 Proposal Ready for Review  
**Decision Needed:** Approve to proceed with implementation?
