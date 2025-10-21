# 🎨 CORNER NEIGHBOR ENHANCEMENT - Design Proposal
**Date:** 2025-10-21  
**Version:** 1.0  
**Status:** 📋 Proposal

---

## 🎯 MỤC TIÊU

Cải thiện visual cho các góc (corners) của playground bằng cách:
- Detect neighbor patterns xung quanh corners
- Spawn các prefab variants phù hợp để tạo cảm giác liền mạch
- Thể hiện "hình dạng bên trong" của playground thay đổi theo context

---

## 🔍 VẤN ĐỀ HIỆN TẠI

### Current Behavior
Hiện tại 4 góc luôn spawn 1 prefab cố định:
- [0,0] → upper_left_corner
- [maxX,0] → upper_right_corner
- [0,maxY] → below_left_corner
- [maxX,maxY] → below_right_corner

### Vấn đề
`
Trường hợp 1: Corner có neighbor bên trong
┌─┐       ┌─┐
│ │  VS   │█│  ← Neighbor ở góc
└─┘       └─┘
Cùng 1 prefab nhưng context khác nhau!

Trường hợp 2: Corner có nhiều neighbors
┌─┐       ┌─┐       ┌─┐
│ │  VS   │█│  VS   │██
└─┘       └█┘       └─┘
Cần 3 prefab variants khác nhau!
`

---

## 📊 PHÂN TÍCH NEIGHBOR PATTERNS

### Corner Neighbors (8 directions)
Mỗi corner có 8 neighbors, nhưng chỉ **3 inner neighbors** quan trọng:

**Upper-Left Corner [0,0]:**
- Inner neighbors: Right, Bottom, BottomRight
- Outer neighbors: Top, Left, TopLeft (always wall/OOB)

**Upper-Right Corner [maxX,0]:**
- Inner neighbors: Left, Bottom, BottomLeft
- Outer neighbors: Top, Right, TopRight (always wall/OOB)

**Below-Left Corner [0,maxY]:**
- Inner neighbors: Right, Top, TopRight
- Outer neighbors: Bottom, Left, BottomLeft (always wall/OOB)

**Below-Right Corner [maxX,maxY]:**
- Inner neighbors: Left, Top, TopLeft
- Outer neighbors: Bottom, Right, BottomRight (always wall/OOB)

---

## 🎨 DESIGN APPROACHES

### ⭐ APPROACH 1: CONTEXT-AWARE CORNER VARIANTS (Recommended)
**Ý tưởng:** Tạo variants cho mỗi corner dựa trên inner neighbor patterns

#### Số lượng variants cần thiết:
Mỗi corner có 3 inner neighbors → 2³ = 8 possibilities

**Nhưng thực tế chỉ cần 4-5 variants phổ biến:**
1. **Clean corner** (0 inner neighbors) - Corner "sạch"
2. **Single edge** (1 inner neighbor: right OR bottom) - 1 cạnh liền
3. **L-shape** (2 inner neighbors: right AND bottom) - Góc L
4. **Diagonal only** (1 inner neighbor: diagonal) - Chỉ góc chéo
5. **Complex** (3 inner neighbors) - Đầy đủ

#### Example cho Upper-Left Corner:

`
Pattern 1: Clean (0 inner neighbors)
┌─┐
│ │  → upper_left_corner (default)
└─┘

Pattern 2: Right neighbor
┌─┐
│ ██ → upper_left_corner_right (cạnh phải liền)
└─┘

Pattern 3: Bottom neighbor
┌─┐
│ │  → upper_left_corner_bottom (cạnh dưới liền)
└█┘

Pattern 4: Right + Bottom (L-shape)
┌─┐
│ ██ → upper_left_corner_filled (góc L đầy)
└█┘

Pattern 5: Diagonal only
┌─┐
│ │  → upper_left_corner_diagonal (chỉ góc chéo)
└─█
`

#### Prefabs cần tạo: **16-20 prefabs**
- 4 corners × 4-5 variants = 16-20 prefabs
- Naming: {corner}_{variant}
  - upper_left_corner
  - upper_left_corner_right
  - upper_left_corner_bottom
  - upper_left_corner_filled
  - upper_left_corner_diagonal

**Pros:**
✅ Visual hoàn hảo, tự nhiên nhất
✅ Linh hoạt, cover được mọi pattern
✅ Không cần rotation logic
✅ Intuitive naming

**Cons:**
❌ Cần tạo 16-20 prefabs mới
❌ Tốn công design assets
❌ Inspector setup phức tạp hơn

---

### APPROACH 2: REUSE TURN OBSTACLE PREFABS
**Ý tưởng:** Dùng lại turn_obstacle_1_direct và turn_obstacle_multi_direct

#### Logic:
`
Corner có 2+ inner neighbors → spawn turn_obstacle (L/T shape)
Corner có 1 inner neighbor → spawn end_obstacle hoặc start_obstacle
Corner clean → giữ nguyên corner prefab
`

**Example:**
`
Upper-Left Corner [0,0]:
- Right + Bottom neighbors → turn_obstacle_1_direct @ 0° (L-shape)
- Right neighbor only → right_end_obstacle @ 90°
- Bottom neighbor only → below_start_obstacle
- Clean → upper_left_corner (default)
`

**Pros:**
✅ Không cần prefab mới
✅ Tận dụng assets hiện có
✅ Implementation nhanh
✅ Consistent với obstacle logic

**Cons:**
❌ Visual có thể không match 100% (obstacle shape ≠ corner shape)
❌ Rotation logic phức tạp
❌ Có thể trông "lạ" với user

---

### APPROACH 3: HYBRID - DYNAMIC CORNER MASKING
**Ý tưởng:** Dùng 1 base corner + overlay sprites động

#### Implementation:
`	ypescript
1. Spawn base corner prefab
2. Check inner neighbors
3. Add overlay sprites để "fill" các cạnh liền
   - Right neighbor → add right edge sprite
   - Bottom neighbor → add bottom edge sprite
   - Diagonal → add diagonal fill sprite
`

**Pros:**
✅ Chỉ cần 4 base corners + few overlay sprites
✅ Linh hoạt, dễ customize
✅ Có thể animate transitions
✅ Tiết kiệm prefabs

**Cons:**
❌ Runtime overhead (multiple sprites per corner)
❌ Z-order phức tạp
❌ Performance impact nếu map lớn
❌ Implementation phức tạp hơn

---

### APPROACH 4: SIMPLIFIED - 2 VARIANTS PER CORNER
**Ý tưởng:** Chỉ tạo 2 variants quan trọng nhất

#### Variants:
1. **Default corner** (clean, no inner neighbors)
2. **Filled corner** (có inner neighbors → góc "đầy")

**Pros:**
✅ Chỉ cần 8 prefabs (4 corners × 2 variants)
✅ Dễ implement
✅ Dễ design assets
✅ Cover 80% use cases

**Cons:**
❌ Không linh hoạt như Approach 1
❌ Một số patterns vẫn không perfect

---

## 💻 IMPLEMENTATION DETAILS

### For APPROACH 1 (Recommended)

#### Step 1: Define Corner Variants Enum
`	ypescript
enum CornerVariant {
    CLEAN = 'clean',           // No inner neighbors
    RIGHT = 'right',           // Right neighbor only
    BOTTOM = 'bottom',         // Bottom neighbor only
    FILLED = 'filled',         // Right + Bottom (L-shape)
    DIAGONAL = 'diagonal',     // Diagonal only
    COMPLEX = 'complex'        // All 3 inner neighbors
}
`

#### Step 2: Extend MapPrefabs Class
`	ypescript
@ccclass('MapPrefabs')
export class MapPrefabs {
    // Upper-Left Corner variants
    @property(Prefab) upper_left_corner: Prefab | null = null;
    @property(Prefab) upper_left_corner_right: Prefab | null = null;
    @property(Prefab) upper_left_corner_bottom: Prefab | null = null;
    @property(Prefab) upper_left_corner_filled: Prefab | null = null;
    
    // Upper-Right Corner variants
    @property(Prefab) upper_right_corner: Prefab | null = null;
    @property(Prefab) upper_right_corner_left: Prefab | null = null;
    @property(Prefab) upper_right_corner_bottom: Prefab | null = null;
    @property(Prefab) upper_right_corner_filled: Prefab | null = null;
    
    // Below-Left Corner variants
    @property(Prefab) below_left_corner: Prefab | null = null;
    @property(Prefab) below_left_corner_right: Prefab | null = null;
    @property(Prefab) below_left_corner_top: Prefab | null = null;
    @property(Prefab) below_left_corner_filled: Prefab | null = null;
    
    // Below-Right Corner variants
    @property(Prefab) below_right_corner: Prefab | null = null;
    @property(Prefab) below_right_corner_left: Prefab | null = null;
    @property(Prefab) below_right_corner_top: Prefab | null = null;
    @property(Prefab) below_right_corner_filled: Prefab | null = null;
    
    // ... existing prefabs ...
}
`

#### Step 3: Detect Corner Variant
`	ypescript
/**
 * Detect which corner variant to use based on inner neighbors
 */
private detectCornerVariant(
    x: number, 
    y: number, 
    cornerType: 'UL' | 'UR' | 'BL' | 'BR'
): string {
    const maxX = this.mapWidth - 1;
    const maxY = this.mapHeight - 1;
    
    let inner1 = false, inner2 = false, innerDiag = false;
    
    switch(cornerType) {
        case 'UL': // Upper-Left
            inner1 = this.isWallAt(x + 1, y);     // Right
            inner2 = this.isWallAt(x, y + 1);     // Bottom
            innerDiag = this.isWallAt(x + 1, y + 1); // BottomRight
            break;
            
        case 'UR': // Upper-Right
            inner1 = this.isWallAt(x - 1, y);     // Left
            inner2 = this.isWallAt(x, y + 1);     // Bottom
            innerDiag = this.isWallAt(x - 1, y + 1); // BottomLeft
            break;
            
        case 'BL': // Below-Left
            inner1 = this.isWallAt(x + 1, y);     // Right
            inner2 = this.isWallAt(x, y - 1);     // Top
            innerDiag = this.isWallAt(x + 1, y - 1); // TopRight
            break;
            
        case 'BR': // Below-Right
            inner1 = this.isWallAt(x - 1, y);     // Left
            inner2 = this.isWallAt(x, y - 1);     // Top
            innerDiag = this.isWallAt(x - 1, y - 1); // TopLeft
            break;
    }
    
    // Determine variant based on pattern
    if (inner1 && inner2) {
        return 'filled';  // L-shape (both edges)
    } else if (inner1) {
        return cornerType === 'UL' || cornerType === 'BL' ? 'right' : 'left';
    } else if (inner2) {
        return cornerType === 'UL' || cornerType === 'UR' ? 'bottom' : 'top';
    } else if (innerDiag) {
        return 'diagonal';
    } else {
        return 'clean';  // Default
    }
}
`

#### Step 4: Update detectBorderType()
`	ypescript
private detectBorderType(x: number, y: number, pattern: NeighborPattern): string {
    const maxX = this.mapWidth - 1;
    const maxY = this.mapHeight - 1;
    
    // Four corners with variant detection
    if (x === 0 && y === 0) {
        const variant = this.detectCornerVariant(x, y, 'UL');
        return \cul_\\; // e.g., 'cul_filled'
    }
    if (x === maxX && y === 0) {
        const variant = this.detectCornerVariant(x, y, 'UR');
        return \cur_\\;
    }
    if (x === 0 && y === maxY) {
        const variant = this.detectCornerVariant(x, y, 'BL');
        return \cbl_\\;
    }
    if (x === maxX && y === maxY) {
        const variant = this.detectCornerVariant(x, y, 'BR');
        return \cbr_\\;
    }
    
    // ... rest of border detection ...
}
`

#### Step 5: Update setupPrefabMap()
`	ypescript
private setupPrefabMap(): void {
    // Upper-Left Corner variants
    this.prefabMap.set('cul_clean', this.mapPrefabs.upper_left_corner!);
    this.prefabMap.set('cul_right', this.mapPrefabs.upper_left_corner_right!);
    this.prefabMap.set('cul_bottom', this.mapPrefabs.upper_left_corner_bottom!);
    this.prefabMap.set('cul_filled', this.mapPrefabs.upper_left_corner_filled!);
    
    // Upper-Right Corner variants
    this.prefabMap.set('cur_clean', this.mapPrefabs.upper_right_corner!);
    this.prefabMap.set('cur_left', this.mapPrefabs.upper_right_corner_left!);
    this.prefabMap.set('cur_bottom', this.mapPrefabs.upper_right_corner_bottom!);
    this.prefabMap.set('cur_filled', this.mapPrefabs.upper_right_corner_filled!);
    
    // ... repeat for BL and BR ...
    
    // Fallback to default if variant not found
    this.prefabMap.set('cul', this.mapPrefabs.upper_left_corner!);
    this.prefabMap.set('cur', this.mapPrefabs.upper_right_corner!);
    this.prefabMap.set('cbl', this.mapPrefabs.below_left_corner!);
    this.prefabMap.set('cbr', this.mapPrefabs.below_right_corner!);
    
    // ... existing mappings ...
}
`

#### Step 6: Add Helper Method
`	ypescript
/**
 * Check if position has wall (for corner neighbor detection)
 */
private isWallAt(x: number, y: number): boolean {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
        return false; // OOB = not a wall for inner neighbor check
    }
    return this.mapData[y][x] === TileType.WALL;
}
`

---

## 🧪 TEST CASES

### Test 1: Clean Corners
`json
{
  "data": [
    ["1", "1", "1"],
    ["1", "0", "1"],
    ["1", "1", "1"]
  ]
}
`
**Expected:** All 4 corners use clean variants

### Test 2: Upper-Left with Right Neighbor
`json
{
  "data": [
    ["1", "1", "1", "1"],
    ["1", "1", "0", "1"],
    ["1", "0", "0", "1"],
    ["1", "1", "1", "1"]
  ]
}
`
**Expected:** [0,0] → upper_left_corner_right

### Test 3: All Filled Corners
`json
{
  "data": [
    ["1", "1", "1", "1"],
    ["1", "1", "1", "1"],
    ["1", "1", "1", "1"],
    ["1", "1", "1", "1"]
  ]
}
`
**Expected:** All 4 corners use filled variants (L-shapes)

### Test 4: Mixed Variants
`json
{
  "data": [
    ["1", "1", "1", "1", "1"],
    ["1", "1", "0", "1", "1"],
    ["1", "0", "0", "0", "1"],
    ["1", "1", "0", "1", "1"],
    ["1", "1", "1", "1", "1"]
  ]
}
`
**Expected:**
- Upper-Left: right variant
- Upper-Right: left variant
- Below-Left: right variant
- Below-Right: left variant

---

## 📊 COMPARISON TABLE

| Approach | Prefabs | Complexity | Visual Quality | Flexibility | Implementation Time |
|----------|---------|------------|----------------|-------------|---------------------|
| **Approach 1** | 16-20 | Medium | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 6-8 hours |
| **Approach 2** | 0 (reuse) | High | ⭐⭐⭐ | ⭐⭐⭐ | 2-3 hours |
| **Approach 3** | 8-10 | High | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 8-10 hours |
| **Approach 4** | 8 | Low | ⭐⭐⭐⭐ | ⭐⭐⭐ | 3-4 hours |

---

## 💡 RECOMMENDATION

### Short-term (Quick Win): **Approach 4**
- Chỉ tạo 2 variants: clean và filled
- 8 prefabs mới (dễ design)
- Cover 80% cases
- Implementation: 3-4 hours

### Long-term (Perfect Solution): **Approach 1**
- Full context-aware corners
- 16-20 prefabs với all variants
- Visual hoàn hảo
- Implementation: 6-8 hours

### Budget Option: **Approach 2**
- Không cần prefab mới
- Reuse turn_obstacle assets
- Visual acceptable
- Implementation: 2-3 hours

---

## 📝 ASSET DESIGN GUIDELINES

### Naming Convention
`
{corner_position}_{variant}.prefab

Examples:
- upper_left_corner.prefab (clean)
- upper_left_corner_right.prefab
- upper_left_corner_bottom.prefab
- upper_left_corner_filled.prefab
`

### Visual Design Tips
1. **Clean variant:** Corner vòng cung tự nhiên
2. **Right/Left/Top/Bottom variants:** 1 cạnh vuông, 1 cạnh cong
3. **Filled variant:** 2 cạnh vuông, tạo góc L
4. **Diagonal variant:** Corner cong + điểm diagonal fill

### Consistency
- Tất cả variants cùng style
- Cùng color palette
- Cùng line thickness
- Seamless transitions

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase 1: Design (2-3 days)
- [ ] Quyết định approach (1, 2, hoặc 4)
- [ ] Sketch 4-5 variants cho 1 corner
- [ ] Review và approve design
- [ ] Replicate cho 3 corners còn lại

### Phase 2: Asset Creation (3-5 days)
- [ ] Create prefabs trong Cocos
- [ ] Test visual trong scene
- [ ] Adjust nếu cần
- [ ] Organize trong Prefab folder

### Phase 3: Code Implementation (1 day)
- [ ] Add new properties to MapPrefabs
- [ ] Implement detectCornerVariant()
- [ ] Update detectBorderType()
- [ ] Update setupPrefabMap()

### Phase 4: Testing (1 day)
- [ ] Create test maps
- [ ] Visual verification
- [ ] Edge case testing
- [ ] Performance testing

### Phase 5: Documentation (0.5 day)
- [ ] Update README.md
- [ ] Add examples
- [ ] Update TESTING_GUIDE.md

**Total Time:** 7-10 days (depending on approach)

---

## ⚠️ CONSIDERATIONS

### Performance
- Corner detection chỉ chạy cho 4 tiles → negligible overhead
- Thêm 12-16 prefabs → memory impact minimal
- No runtime calculations (pre-computed)

### Backward Compatibility
- Nếu variants không được assign → fallback về default corner
- Old maps vẫn work với clean corners
- Graceful degradation

### Maintenance
- More prefabs = more assets to maintain
- Consider versioning strategy
- Document each variant clearly

---

## 🎉 EXPECTED RESULTS

### Before
`
┌─────┐
│     │  ← Corners always same, regardless of neighbors
│     │
└─────┘
`

### After (Approach 1)
`
┌─────┐     ┌█────┐     ┌█████┐
│     │  →  │█    │  →  │█████│  ← Corners adapt to context!
│     │     │     │     │█████│
└─────┘     └─────┘     └█████┘
 clean       right       filled
`

Visual sẽ **tự nhiên, liền mạch, và professional hơn rất nhiều!**

---

**END OF DOCUMENT**

Which approach do you prefer? I recommend:
- **Approach 4** if you want quick results (3-4 hours)
- **Approach 1** if you want perfect visuals (6-8 hours)
- **Approach 2** if you want zero new assets (2-3 hours)
