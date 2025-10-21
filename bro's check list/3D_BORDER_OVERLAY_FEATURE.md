# 🎨 3D Border Overlay Feature - Design Document

**Date:** 2025-10-21  
**Version:** 2.0 (Simplified)  
**Status:** 📋 Design Proposal  
**Purpose:** Thêm viền overlay để tạo hiệu ứng 3D cho obstacles

---

## 🎯 MỤC TIÊU

Tạo độ sâu/nổi 3D cho obstacles bằng cách:
- Detect tiles `END_U` (upper end obstacle - đầu obstacle nhô lên)
- Spawn sprite overlay tại ô `[x, y+1]` (ô phía dưới END_U)
- Sprite overlay đã được định nghĩa trong `TILE_SPRITE_MAP`
- Hệ thống mở rộng cho các tile types khác trong tương lai

**Lưu ý Coordinate System:**
- `END_U` = End Upper (obstacle nhô lên) → Cần border ở **phía dưới** (y+1)
- `END_B` = End Below (obstacle nhô xuống) → Cần border ở **phía trên** (y-1)

---

## 🔍 PHÂN TÍCH YÊU CẦU

### Use Case Chính
```
Map Data (JSON):
y=0: [1][1][1][1][1]
y=1: [1][0][█][0][1]  ← END_U obstacle tại đây (obstacle nhô lên)
y=2: [1][0][▓][0][1]  ← Overlay sprite spawn ở đây (border 3D effect)
y=3: [1][0][0][0][1]
y=4: [1][1][1][1][1]

Khi detect END_U tại [x=2, y=1]:
→ Spawn overlay sprite tại [x=2, y=2] (ô trống phía dưới)
→ Overlay sprite name: từ TILE_SPRITE_MAP['overlay_end_u']

Visual Effect:
     [█]  ← END_U (obstacle đầu nhô lên)
     [▓]  ← Overlay border (tạo độ sâu 3D)
     [ ]  ← Empty space
```

### Quy Trình Đơn Giản
1. Detect tile type = `END_U` tại vị trí `[x, y]`
2. Check ô `[x, y+1]` có phải ô trống (`"0"`) không?
3. Nếu YES → Spawn overlay sprite tại `[x, y+1]`
4. Overlay sprite được định nghĩa trong `TILE_SPRITE_MAP` như các tile bình thường

**Giải thích Direction:**
- `END_U` (End Upper) = Đầu obstacle nhô **lên** → Border cần ở **dưới** (y+1)
- `END_B` (End Below) = Đầu obstacle nhô **xuống** → Border cần ở **trên** (y-1)

### Yêu Cầu Kỹ Thuật
1. **Không thay đổi tọa độ** - Spawn tại grid position `[x, y+1]`, không offset
2. **Không xâm lấn logic** - Chỉ thêm detection sau khi render base tiles
3. **Extensible** - Dễ dàng thêm overlay cho tile types khác
4. **Simple** - Treat overlay như 1 tile bình thường, không cần special handling

---

## 🏗️ KIẾN TRÚC THIẾT KẾ

### Approach: Decorator Pattern + Configuration-Based System

```
┌─────────────────────────────────────────────────────────────┐
│                 3D OVERLAY SYSTEM                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CONFIGURATION                                           │
│     ├─ Overlay Rules (tile type → overlay config)           │
│     ├─ Sprite Mapping (overlay sprite names)                │
│     └─ Offset Settings (Y offset, Z-order)                  │
│                                                             │
│  2. DETECTION                                               │
│     └─ Scan rendered tiles for overlay triggers             │
│                                                             │
│  3. RENDERING                                               │
│     ├─ Spawn overlay sprites at calculated positions        │
│     ├─ Apply Z-order for proper layering                    │
│     └─ Parent to same container                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 CONFIGURATION STRUCTURE

### Step 1: Add Overlay Sprite to TILE_SPRITE_MAP

**📍 Location:** `GenTest2.ts` - Line ~38 (TILE_SPRITE_MAP constant)

```typescript
const TILE_SPRITE_MAP: Record<string, { sprite: string; rotation: number }> = {
    // ... existing tiles ...
    
    // Obstacles - End
    [TileType.END_U]: { sprite: 'path_vertical', rotation: 0 },
    [TileType.END_B]: { sprite: 'below_end_obstacle', rotation: 0 },
    [TileType.END_L]: { sprite: 'below_end_obstacle', rotation: 90 },
    [TileType.END_R]: { sprite: 'below_end_obstacle', rotation: 270 },
    
    // ========================================================================
    // 3D OVERLAY SPRITES (NEW)
    // ========================================================================
    // Overlay cho END_U - spawn tại ô phía dưới (y+1)
    ['overlay_end_u']: { sprite: 'tile003', rotation: 0 },
    
    // Future: Có thể thêm overlay cho tiles khác
    // ['overlay_end_b']: { sprite: 'tile_xxx', rotation: 0 },  // Border cho END_B (y-1)
    // ['overlay_start_b']: { sprite: 'tile_yyy', rotation: 0 }, // Border cho START_B
};
```

**Giải thích:**
- Key: `'overlay_end_u'` - Internal tile type cho overlay
- Value: Sprite config như các tile bình thường
- Sprite name: `'tile003'` - phải có trong atlas (code hiện tại đang dùng)
- **Naming Convention:** `overlay_{base_tile_type}`

---

### Step 2: Define Overlay Rules

**📍 Location:** `GenTest2.ts` - Line ~68 (Sau TILE_SPRITE_MAP)

```typescript
/**
 * Map tile types to their overlay tile types
 * Simple mapping: base tile → overlay tile type
 */
const TILE_OVERLAY_RULES: Partial<Record<string, string>> = {
    // END_U has overlay spawned at cell below (y+1)
    [TileType.END_U]: 'overlay_end_u',
    
    // Future: Add more overlays
    // [TileType.END_B]: 'overlay_end_b',     // Border ở trên (y-1)
    // [TileType.START_B]: 'overlay_start_b', // Border cho start
    // [TileType.OBSTACLE]: 'overlay_obstacle', // Border cho obstacle
};
```

**Giải thích:**
- Key: Base tile type (`END_U`)
- Value: Overlay tile type (`'overlay_end_u'`) - phải match key trong TILE_SPRITE_MAP
- Đơn giản, dễ extend
- **Direction Note:** 
  - `END_U` → overlay ở **dưới** (y+1)
  - `END_B` → overlay ở **trên** (y-1)

---

### Step 3: Add Component Property (Optional)

**📍 Location:** `GenTest2.ts` - Line ~100 (Component properties section)

```typescript
@ccclass('SmartMapGenerator2')
export class SmartMapGenerator2 extends Component {
    // ... existing properties ...
    
    // ========================================================================
    // 3D OVERLAY PROPERTY
    // ========================================================================
    
    @property({
        tooltip: "Bật/tắt 3D overlay system (spawn border sprites trên obstacles)",
        group: { name: "Advanced Settings", id: "advanced" }
    })
    use3DOverlay: boolean = true;
}
```

**Giải thích:**
- Single boolean flag
- Có thể bật/tắt feature từ Inspector
- Optional: Có thể bỏ qua và mặc định bật

---

## 💻 IMPLEMENTATION DETAILS

### Core Function: Process Overlays

**📍 Location:** `GenTest2.ts` - Add after `renderMap()` function (Line ~688+)

```typescript
/**
 * Process và spawn overlay tiles cho tiles có overlay rules
 * Gọi sau khi renderMap() hoàn tất
 */
private processOverlays(): void {
    // Check nếu feature disabled
    if (!this.use3DOverlay) {
        return;
    }
    
    this.debug('[3DOverlay] Processing overlays...');
    
    let overlaysSpawned = 0;
    
    // Loop through mapData để tìm tiles cần overlay
    for (let y = 0; y < this.mapHeight; y++) {
        for (let x = 0; x < this.mapWidth; x++) {
            const cellValue = this.mapData[y][x];
            
            // Check nếu cell này có overlay rule
            const overlayTileType = TILE_OVERLAY_RULES[cellValue];
            if (!overlayTileType) {
                continue; // Không có overlay rule
            }
            
            // Check cell phía dưới [x, y+1]
            const targetY = y + 1;
            
            // Validate: Cell target phải trong bounds và phải empty
            if (targetY >= this.mapHeight) {
                continue; // Out of bounds
            }
            
            if (this.mapData[targetY][x] !== TileType.EMPTY) {
                continue; // Cell target không empty, skip
            }
            
            // Spawn overlay tile tại [x, y+1]
            // Sử dụng spawnTile() function hiện có
            if (this.spawnTile(overlayTileType, x, targetY)) {
                overlaysSpawned++;
                this.debug(`[3DOverlay] Spawned '${overlayTileType}' at [${x},${targetY}] for base tile '${cellValue}' at [${x},${y}]`);
            }
        }
    }
    
    this.debug(`[3DOverlay] Completed: ${overlaysSpawned} overlays spawned`);
}
```

**Giải thích:**
1. Loop qua tất cả cells trong mapData
2. Check cell có trong TILE_OVERLAY_RULES không
3. Check cell phía dưới `[x, y+1]` có empty không
4. Nếu YES → Spawn overlay tile tại `[x, y+1]` bằng `spawnTile()`
5. Overlay được treat như tile bình thường, không cần special handling!

**Logic Direction:**
- `END_U` (obstacle nhô lên) → Cần border ở **dưới** (y+1) để tạo base
- `END_B` (obstacle nhô xuống) → Cần border ở **trên** (y-1) để tạo shadow

---

### Integration: Call processOverlays() After renderMap()

**📍 Location:** `GenTest2.ts` - Inside `renderMap()` function (Line ~642-688)

**Original Code:**
```typescript
private renderMap(): void {
    // Clear old tiles
    this.mapContainer.destroyAllChildren();
    
    let tilesRendered = 0;
    let tilesSkipped = 0;
    
    // Loop through map and render tiles
    for (let y = 0; y < this.mapHeight; y++) {
        for (let x = 0; x < this.mapWidth; x++) {
            // ... existing tile spawn logic ...
        }
    }
    
    this.debug(`Map rendered: ${tilesRendered} tiles in ${elapsed}ms`);
}
```

**Modified Code (ADD 2 LINES):**
```typescript
private renderMap(): void {
    // Clear old tiles
    this.mapContainer.destroyAllChildren();
    
    let tilesRendered = 0;
    let tilesSkipped = 0;
    
    // Loop through map and render tiles
    for (let y = 0; y < this.mapHeight; y++) {
        for (let x = 0; x < this.mapWidth; x++) {
            // ... existing tile spawn logic ...
        }
    }
    
    this.debug(`Map rendered: ${tilesRendered} tiles in ${elapsed}ms`);
    
    // ========================================================================
    // NEW: Process 3D overlays (ADD THESE 2 LINES)
    // ========================================================================
    this.processOverlays();
}
```

**Vị trí chính xác:** Sau dòng `this.debug(\`Map rendered:...)`, trước khi kết thúc function.

---

## 🎨 SPRITE ASSET REQUIREMENTS

### Overlay Sprite Naming Convention

```
Pattern: {base_sprite_name}_border
        hoặc
        {base_sprite_name}_overlay

Examples:
- below_end_obstacle → below_end_obstacle_border
- obstacle → obstacle_border
- start_below → start_below_overlay
```

### Visual Guidelines

1. **Border Style:**
   - Viền overlay nên "nhô lên" phía trên
   - Màu sắc hơi đậm hơn base sprite
   - Có thể có shadow/highlight để tạo depth

2. **Size:**
   - Cùng size với base tile (64x64 pixels)
   - Hoặc có thể scale nhỏ hơn (ví dụ: 0.9x)

3. **Transparency:**
   - Có thể semi-transparent để base tile vẫn thấy được
   - Hoặc opaque nếu muốn full cover

---

## 🧪 TESTING STRATEGY

### Test Case 1: Basic Overlay Spawn

**Map:**
```json
{
  "data": [
    ["1", "1", "1", "1", "1"],
    ["1", "0", "1", "0", "1"],
    ["1", "0", "0", "0", "1"],
    ["1", "1", "1", "1", "1"]
  ]
}
```

**Setup:**
- Tile [2,1] có tile type = END_U (từ context detection)

**Expected:**
- Overlay sprite spawn tại [2,2] (phía dưới END_U)
- Visual: Border overlay nằm dưới obstacle, tạo base 3D
- No errors in console

### Test Case 2: Multiple Overlays

**Map với nhiều END_U:**
```json
{
  "data": [
    ["1", "1", "1", "1", "1", "1", "1"],
    ["1", "0", "1", "0", "1", "0", "1"],
    ["1", "0", "0", "0", "0", "0", "1"],
    ["1", "1", "1", "1", "1", "1", "1"]
  ]
}
```

**Expected:**
- Tất cả END_U tiles đều có overlay spawn ở [x, y+1]
- Không có overlap issues
- Performance acceptable
- Visual consistency across all overlays

### Test Case 3: Overlay Blocked by Tile Below

**Map:**
```json
{
  "data": [
    ["1", "1", "1"],
    ["1", "0", "1"],
    ["1", "1", "1"],
    ["1", "1", "1"]
  ]
}
```

**Setup:**
- Tile [1,1] có END_U
- Tile [1,2] không phải empty (có wall)

**Expected:**
- Overlay KHÔNG spawn vì cell [1,2] không empty
- No errors, graceful skip
- Log: "Cell target không empty, skip"

### Test Case 4: Toggle Feature On/Off

**Actions:**
1. Set `use3DOverlay = true` → Overlays visible
2. Set `use3DOverlay = false` → No overlays
3. Toggle back → Overlays reappear

**Expected:** No errors, smooth toggle

---

## 📊 PERFORMANCE CONSIDERATIONS

### Expected Impact

| Metric | Without Overlays | With Overlays | Impact |
|--------|------------------|---------------|--------|
| Render Time (10x10) | ~10ms | ~12ms | +20% |
| Render Time (50x50) | ~100ms | ~120ms | +20% |
| Memory | X MB | X + 0.1 MB | +negligible |
| Draw Calls | N | N + M | +M overlays |

### Optimization Tips

1. **Only spawn overlays where needed** - Use `shouldSpawnOverlay()` logic
2. **Batch overlays** - Use same sprite atlas
3. **Cache sprite frames** - Don't load repeatedly
4. **Z-order management** - Use sibling index efficiently

---

## 🔄 EXTENSIBILITY - Adding New Overlay Rules

### Example 1: Add Overlay for END_B (End Below - obstacle nhô xuống)

**Step 1:** Add sprite to TILE_SPRITE_MAP
```typescript
const TILE_SPRITE_MAP = {
    // ... existing ...
    ['overlay_end_b']: { sprite: 'tile_xxx', rotation: 0 },
};
```

**Step 2:** Add rule to TILE_OVERLAY_RULES
```typescript
const TILE_OVERLAY_RULES = {
    [TileType.END_U]: 'overlay_end_u',     // Existing
    [TileType.END_B]: 'overlay_end_b',     // NEW - overlay ở TRÊN (y-1)
};
```

**Step 3:** Update `processOverlays()` để handle both directions
```typescript
// Xác định direction dựa trên tile type
let targetY: number;
if (cellValue === TileType.END_U) {
    targetY = y + 1;  // Overlay dưới
} else if (cellValue === TileType.END_B) {
    targetY = y - 1;  // Overlay trên
}
```

**Done!** System sẽ spawn overlay đúng direction cho cả END_U và END_B.

---

### Example 2: Add Overlay for Regular OBSTACLE

**Step 1:** Add sprite to TILE_SPRITE_MAP
```typescript
const TILE_SPRITE_MAP = {
    // ... existing ...
    ['overlay_obstacle']: { sprite: 'obstacle_top_border', rotation: 0 },
};
```

**Step 2:** Add rule to TILE_OVERLAY_RULES
```typescript
const TILE_OVERLAY_RULES = {
    [TileType.END_B]: 'overlay_end_b',
    [TileType.OBSTACLE]: 'overlay_obstacle',  // NEW
};
```

**Note:** Overlay sẽ spawn ở `[x, y-1]` (ô phía trên OBSTACLE).

---

### Example 3: Conditional Overlay (Advanced)

Nếu muốn logic phức tạp hơn, có thể modify `processOverlays()`:

```typescript
private processOverlays(): void {
    // ... existing code ...
    
    for (let y = 0; y < this.mapHeight; y++) {
        for (let x = 0; x < this.mapWidth; x++) {
            const cellValue = this.mapData[y][x];
            const overlayTileType = TILE_OVERLAY_RULES[cellValue];
            
            if (!overlayTileType) continue;
            
            // CUSTOM LOGIC: Chỉ spawn overlay nếu có >= 2 neighbors
            const pattern = this.getNeighborPattern(x, y);
            const neighborCount = [pattern.top, pattern.bottom, pattern.left, pattern.right]
                .filter(Boolean).length;
            
            if (neighborCount < 2) {
                continue; // Skip overlay nếu ít neighbors
            }
            
            // ... rest of spawn logic ...
        }
    }
}
```

---

## 🎓 BEST PRACTICES

### 1. Sprite Asset Organization

```
Resouces/
├─ tiles/
│  ├─ base/           # Base tile sprites
│  │  ├─ below_end_obstacle.png
│  │  ├─ obstacle.png
│  │  └─ ...
│  └─ overlays/       # Overlay sprites
│     ├─ below_end_obstacle_border.png
│     ├─ obstacle_shadow.png
│     └─ ...
```

### 2. Naming Consistency

- Base sprite: `{type}_obstacle`
- Border overlay: `{type}_obstacle_border`
- Shadow overlay: `{type}_obstacle_shadow`
- Highlight overlay: `{type}_obstacle_highlight`

### 3. Configuration Management

```typescript
// Centralize all config values
const OVERLAY_DEFAULTS = {
    Y_OFFSET: -32,
    Z_ORDER: 1,
    SCALE: 1.0,
    OPACITY: 255,
    ENABLED: true
} as const;

// Use defaults in rules
const TILE_OVERLAY_RULES: Partial<Record<TileType, OverlayConfig>> = {
    [TileType.END_B]: {
        spriteName: 'below_end_obstacle_border',
        yOffset: OVERLAY_DEFAULTS.Y_OFFSET,
        zOrder: OVERLAY_DEFAULTS.Z_ORDER,
        enabled: OVERLAY_DEFAULTS.ENABLED
    }
};
```

### 4. Error Handling

```typescript
// Always validate before spawning
if (!config.spriteName) {
    warn('[3DOverlay] Missing sprite name');
    return false;
}

// Graceful fallback if sprite not found
const spriteFrame = this.getSpriteFrame(config.spriteName);
if (!spriteFrame) {
    warn(`[3DOverlay] Sprite '${config.spriteName}' not found, skipping overlay`);
    return false;  // Continue without error
}
```

### 5. Memory Management

```typescript
// Always track and cleanup overlays
private clearOverlays(): void {
    for (const overlayNode of this.overlayNodes) {
        if (overlayNode && overlayNode.isValid) {
            overlayNode.destroy();
        }
    }
    this.overlayNodes = [];
}

// Call in onDestroy()
onDestroy(): void {
    this.clearOverlays();
}
```

---

## 📝 IMPLEMENTATION CHECKLIST (SIMPLIFIED)

### Phase 1: Setup Config (15 minutes)
**📍 File:** `GenTest2.ts`

- [ ] **Line ~38:** Add overlay sprite to `TILE_SPRITE_MAP`
  ```typescript
  ['overlay_end_u']: { sprite: 'tile003', rotation: 0 }
  ```

- [ ] **Line ~68:** Add `TILE_OVERLAY_RULES` constant (after TILE_SPRITE_MAP)
  ```typescript
  const TILE_OVERLAY_RULES: Partial<Record<string, string>> = {
      [TileType.END_U]: 'overlay_end_u'
  };
  ```

- [ ] **Line ~100:** Add component property (optional)
  ```typescript
  @property() use3DOverlay: boolean = true;
  ```

### Phase 2: Core Function (30 minutes)
**📍 File:** `GenTest2.ts`

- [ ] **Line ~688+:** Add `processOverlays()` function (sau renderMap())
  - Copy full function từ document
  - ~40 lines code

### Phase 3: Integration (5 minutes)
**📍 File:** `GenTest2.ts`

- [ ] **Line ~685:** Add call to `processOverlays()` trong renderMap()
  - Add 2 lines: Comment + function call

### Phase 4: Assets (30 minutes - 1 hour)
- [ ] Create/Use border sprite (hiện tại: `tile003`)
- [ ] Verify sprite có trong atlas
- [ ] Test sprite load được không
- [ ] (Optional) Design sprite riêng cho overlay

### Phase 5: Testing (30 minutes)
- [ ] Test với map có END_U tiles
- [ ] Verify overlay spawn đúng vị trí [x, y+1] (phía dưới)
- [ ] Test với map không có empty space phía dưới END_U
- [ ] Visual check: Overlay tạo 3D effect như mong muốn

**Total Time:** ~2-3 hours (bao gồm asset creation)

---

## 🎉 EXPECTED RESULTS

### Before (Flat)
```
[1][1][1][1][1]
[1][0][1][0][1]
[1][0][█][0][1]  ← END_B (flat, no depth)
[1][0][0][0][1]
[1][1][1][1][1]
```

### After (3D Effect)
```
[1][1][1][1][1]
[1][0][▓][0][1]  ← Border overlay (tạo depth)
[1][0][█][0][1]  ← END_B base
[1][0][0][0][1]
[1][1][1][1][1]

→ Visual có chiều sâu, professional hơn!
```

---

## 🔮 FUTURE ENHANCEMENTS

### Enhancement 1: Animated Overlays
```typescript
interface OverlayConfig {
    // ... existing fields ...
    animation?: {
        type: 'pulse' | 'float' | 'rotate';
        duration: number;
        loop: boolean;
    };
}
```

### Enhancement 2: Conditional Overlays
```typescript
interface OverlayConfig {
    // ... existing fields ...
    condition?: (x: number, y: number, mapData: string[][]) => boolean;
}

// Example: Only show shadow if tile below is empty
[TileType.OBSTACLE]: {
    spriteName: 'obstacle_shadow',
    condition: (x, y, mapData) => {
        const belowY = y + 1;
        return belowY < mapData.length && mapData[belowY][x] === TileType.EMPTY;
    }
}
```

### Enhancement 3: Dynamic Overlay Colors
```typescript
interface OverlayConfig {
    // ... existing fields ...
    tintColor?: Color;  // Apply color tint
}
```

---

## 💡 TROUBLESHOOTING

### Issue 1: Overlay không hiện
**Possible causes:**
1. Sprite name sai trong TILE_SPRITE_MAP
2. Sprite không có trong atlas
3. Cell target (y+1) không empty
4. `use3DOverlay = false`
5. Tile type không match rule (END_U vs END_B)

**Debug Steps:**
```typescript
// 1. Check overlay rule exists
console.log('Overlay rule:', TILE_OVERLAY_RULES[TileType.END_U]);
// Expected: 'overlay_end_u'

// 2. Check sprite config exists
console.log('Sprite config:', TILE_SPRITE_MAP['overlay_end_u']);
// Expected: { sprite: 'tile003', rotation: 0 }

// 3. Add logs in processOverlays()
this.debug(`Checking cell [${x},${y}] = ${cellValue}`);
this.debug(`Target cell [${x},${targetY}] = ${this.mapData[targetY]?.[x]}`);

// 4. Check sprite loading
const sprite = this.getSpriteFrame('tile003');
console.log('Sprite loaded:', sprite);

// 5. Verify tile type detection
this.debug(`Detected tile type at [${x},${y}]: ${tileType}`);
```

### Issue 2: Overlay spawn sai vị trí
**Root cause:** Nhầm lẫn coordinate direction

**Clarification:**
```typescript
// END_U (obstacle nhô LÊN) → overlay ở DƯỚI (y+1)
[TileType.END_U]: 'overlay_end_u'  // targetY = y + 1

// END_B (obstacle nhô XUỐNG) → overlay ở TRÊN (y-1)
[TileType.END_B]: 'overlay_end_b'  // targetY = y - 1
```

**Debug:**
```typescript
console.log(`Base tile '${cellValue}' at [${x},${y}]`);
console.log(`Target overlay position: [${x},${targetY}]`);
console.log(`Target cell value: ${this.mapData[targetY][x]}`);
```

### Issue 3: Overlay bị duplicate
**Root cause:** `processOverlays()` được gọi nhiều lần

**Fix:** Ensure `processOverlays()` chỉ được gọi 1 lần sau `renderMap()`
```typescript
// BAD: Don't call multiple times
this.processOverlays();
this.processOverlays(); // Duplicate!

// GOOD: Only once
this.processOverlays();
```

### Issue 4: Performance với map lớn
**Optimization:** Add early exit conditions
```typescript
private processOverlays(): void {
    // Skip if no overlay rules defined
    if (Object.keys(TILE_OVERLAY_RULES).length === 0) {
        return;
    }
    
    // ... rest of logic ...
}
```

---

## 📚 SUMMARY

### Key Points

1. **Simple Grid-Based** - Overlay spawn tại grid position, không offset phức tạp
2. **Reuse Existing Code** - Dùng `spawnTile()` function, treat overlay như tile bình thường
3. **Configuration-Based** - Chỉ cần add 2 entries (TILE_SPRITE_MAP + TILE_OVERLAY_RULES)
4. **Non-Invasive** - Minimal code changes (1 function + 1 function call)
5. **Extensible** - Dễ dàng thêm overlay cho tile types khác

### Complete Example

```typescript
// EXAMPLE: Add overlay cho END_U (obstacle nhô lên)

// Step 1: Add sprite config (in TILE_SPRITE_MAP)
['overlay_end_u']: { sprite: 'tile003', rotation: 0 }

// Step 2: Add overlay rule (in TILE_OVERLAY_RULES)
[TileType.END_U]: 'overlay_end_u'

// Step 3: Sprite 'tile003' đã có trong atlas

// Step 4: Done! System tự động:
// - Tìm tất cả END_U tiles
// - Check cell [x, y+1] có empty không
// - Spawn overlay tile tại [x, y+1] (phía dưới obstacle)

// Visual Result:
//     [█]  ← END_U obstacle (nhô lên)
//     [▓]  ← Overlay border (base 3D)
```

### Code Changes Summary

**Total lines added:** ~50 lines
- Config: ~10 lines (TILE_SPRITE_MAP + TILE_OVERLAY_RULES)
- Function: ~40 lines (processOverlays)
- Integration: ~1 line (function call in renderMap)

**Files modified:** 1 file (GenTest2.ts)

**Breaking changes:** None

---

**Status:** 📋 Ready for Implementation  
**Complexity:** Medium  
**Priority:** Feature Enhancement  
**Breaking Changes:** None (purely additive)

**Next Action:** Create border sprite asset, then implement Phase 1

---

**Author:** AI Assistant  
**Date:** 2025-10-21
