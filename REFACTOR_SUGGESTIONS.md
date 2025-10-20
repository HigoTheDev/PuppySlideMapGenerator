# 🗺️ KẾ HOẠCH PHÁT TRIỂN - SMART MAP GENERATOR

**Date:** 2025-10-20  
**Version:** 2.0  
**Approach:** Context-Aware Tile Recognition System

---

## 🎯 **TỔNG QUAN HƯỚNG ĐI MỚI**

### **Triết lý thiết kế:**
Thay vì sử dụng 16+ tile codes phức tạp (`cul`, `cur`, `bu`, `o`, `su`, etc.), hệ thống mới chỉ sử dụng **2 giá trị đơn giản**:
- `"0"` - Ô trống (walkable)
- `"1"` - Ô vật cản (wall/obstacle)

**Ưu điểm:**
- ✅ Đơn giản hóa data format
- ✅ Dễ dàng tạo/edit map (chỉ cần vẽ 0 và 1)
- ✅ Flexible - có thể import từ nhiều nguồn (Tiled, custom editor, procedural generation)
- ✅ Code tự động nhận diện context và chọn prefab phù hợp

---

## 🧠 **NGUYÊN LÝ HOẠT ĐỘNG**

### **Context-Aware Tile Recognition**

Mỗi ô `"1"` sẽ được phân tích dựa trên **8 ô xung quanh** (neighbors) để xác định:
1. **Loại tile** (góc, viền, chướng ngại vật)
2. **Hướng/orientation** (trên, dưới, trái, phải)
3. **Shape pattern** (góc nào, đầu/đuôi/giữa của obstacle)

```
Ví dụ phân tích ô [4,4]:
    [3,3][3,4][3,5]     [?][1][?]
    [4,3][4,4][4,5]  →  [0][X][1]  → Detect: left obstacle end
    [5,3][5,4][5,5]     [?][0][?]
```

---

## 📋 **CÁC BƯỚC THỰC HIỆN**

### **Phase 1: Tile Detection System**

#### **1.1. Neighbor Analysis**
```typescript
interface NeighborPattern {
    top: boolean;        // Có tile '1' phía trên?
    bottom: boolean;     // Có tile '1' phía dưới?
    left: boolean;       // Có tile '1' bên trái?
    right: boolean;      // Có tile '1' bên phải?
    topLeft: boolean;    // Góc trên-trái
    topRight: boolean;   // Góc trên-phải
    bottomLeft: boolean; // Góc dưới-trái
    bottomRight: boolean;// Góc dưới-phải
}

function getNeighborPattern(grid: string[][], x: number, y: number): NeighborPattern {
    // Kiểm tra 8 ô xung quanh
    return {
        top: grid[y-1]?.[x] === '1',
        bottom: grid[y+1]?.[x] === '1',
        left: grid[y]?.[x-1] === '1',
        right: grid[y]?.[x+1] === '1',
        topLeft: grid[y-1]?.[x-1] === '1',
        topRight: grid[y-1]?.[x+1] === '1',
        bottomLeft: grid[y+1]?.[x-1] === '1',
        bottomRight: grid[y+1]?.[x+1] === '1'
    };
}
```

#### **1.2. Tile Type Detection**
Dựa trên pattern để xác định loại tile:

**A. Border Detection (Viền ngoài)**
```typescript
function isBorderTile(x: number, y: number, mapWidth: number, mapHeight: number): boolean {
    return x === 0 || x === mapWidth - 1 || 
           y === 0 || y === mapHeight - 1;
}
```

**B. Corner Detection (4 góc)**
```
Góc trên-trái (upper_left_corner):
  Pattern: [0][0][0]
           [0][X][1]
           [0][1][?]
  
Góc trên-phải (upper_right_corner):
  Pattern: [0][0][0]
           [1][X][0]
           [?][1][0]
           
Góc dưới-trái (below_left_corner):
  Pattern: [0][1][?]
           [0][X][1]
           [0][0][0]
           
Góc dưới-phải (below_right_corner):
  Pattern: [?][1][0]
           [1][X][0]
           [0][0][0]
```

**C. Border Edge Detection (Viền thẳng)**
```
Viền trên (border_upper):
  Pattern: [?][0][?]
           [1][X][1]
           [?][1][?]
  Position: y === 0

Viền dưới (border_below):
  Pattern: [?][1][?]
           [1][X][1]
           [?][0][?]
  Position: y === mapHeight - 1

Viền trái (border_left):
  Pattern: [?][?][0]
           [0][X][1]
           [?][?][1]
  Position: x === 0

Viền phải (border_right):
  Pattern: [0][?][?]
           [1][X][0]
           [1][?][?]
  Position: x === mapWidth - 1
```

**D. Obstacle Detection (Chướng ngại vật bên trong)**
```
Obstacle Start (từ viền vào trong):
- upper_start_obstacle: Từ viền trên đi xuống
  Pattern: [?][1][?]   (neighbor trên là border)
           [0][X][0]
           [?][1][?]

- below_start_obstacle: Từ viền dưới đi lên
  Pattern: [?][1][?]
           [0][X][0]
           [?][1][?]   (neighbor dưới là border)

Obstacle Middle (giữa đường):
- obstacle (vertical): Dọc
  Pattern: [?][1][?]
           [0][X][0]
           [?][1][?]

- side_obstacle (horizontal): Ngang
  Pattern: [?][0][?]
           [1][X][1]
           [?][0][?]

Obstacle End (đuôi):
- upper_end_obstacle: Đuôi hướng lên
  Pattern: [?][0][?]
           [0][X][0]
           [?][1][?]

- below_end_obstacle: Đuôi hướng xuống
  Pattern: [?][1][?]
           [0][X][0]
           [?][0][?]

- left_end_obstacle: Đuôi hướng trái
  Pattern: [?][0][?]
           [0][X][1]
           [?][0][?]

- right_end_obstacle: Đuôi hướng phải
  Pattern: [?][0][?]
           [1][X][0]
           [?][0][?]
```

---

### **Phase 2: Prefab Mapping**

#### **2.1. Detection Rules**
```typescript
enum TileType {
    // Borders
    CORNER_UL = 'upper_left_corner',
    CORNER_UR = 'upper_right_corner',
    CORNER_BL = 'below_left_corner',
    CORNER_BR = 'below_right_corner',
    BORDER_U = 'border_upper',
    BORDER_B = 'border_below',
    BORDER_L = 'border_left',
    BORDER_R = 'border_right',
    
    // Obstacles
    START_U = 'upper_start_obstacle',
    START_B = 'below_start_obstacle',
    OBSTACLE = 'obstacle',
    OBSTACLE_SIDE = 'side_obstacle',
    END_U = 'upper_end_obstacle',
    END_B = 'below_end_obstacle',
    END_L = 'left_end_obstacle',
    END_R = 'right_end_obstacle',
}

function detectTileType(
    grid: string[][], 
    x: number, 
    y: number,
    pattern: NeighborPattern
): TileType | null {
    // 1. Check if border position
    if (isBorderTile(x, y, grid[0].length, grid.length)) {
        return detectBorderType(x, y, pattern, grid);
    }
    
    // 2. Check if obstacle
    return detectObstacleType(pattern);
}
```

#### **2.2. Priority Detection Order**
```
1. Border tiles (highest priority - dựa vào vị trí)
   └─ Corners (4 góc)
   └─ Edges (4 cạnh)

2. Obstacle tiles (nhận diện pattern)
   └─ Start tiles (kết nối với border)
   └─ End tiles (đuôi - chỉ 1 neighbor)
   └─ Middle tiles (2+ neighbors)
```

---

### **Phase 3: Implementation Strategy**

#### **3.1. Class Structure**
```typescript
@ccclass('SmartMapGenerator')
export class SmartMapGenerator extends Component {
    // Properties
    @property(JsonAsset) mapData: JsonAsset = null;
    @property(Node) mapContainer: Node = null;
    @property({ type: MapPrefabs }) prefabs: MapPrefabs = null;
    @property tileSize: number = 64;
    
    // Core methods
    private loadMapData(): string[][];
    private analyzeTile(x: number, y: number): TileType;
    private getNeighborPattern(x: number, y: number): NeighborPattern;
    private detectBorderType(...): TileType;
    private detectObstacleType(...): TileType;
    private spawnTile(type: TileType, x: number, y: number): void;
    private renderMap(): void;
}
```

#### **3.2. Core Algorithm**
```typescript
renderMap() {
    const grid = this.loadMapData();
    
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x] === '1') {
                // Phân tích context
                const pattern = this.getNeighborPattern(grid, x, y);
                const tileType = this.detectTileType(grid, x, y, pattern);
                
                // Spawn prefab tương ứng
                if (tileType) {
                    this.spawnTile(tileType, x, y);
                }
            }
        }
    }
}
```

---

## 🎨 **DETECTION LOGIC DETAILS**

### **Border Detection Algorithm**
```typescript
private detectBorderType(
    x: number, 
    y: number, 
    pattern: NeighborPattern,
    grid: string[][]
): TileType {
    const maxX = grid[0].length - 1;
    const maxY = grid.length - 1;
    
    // Góc trên-trái
    if (x === 0 && y === 0) return TileType.CORNER_UL;
    
    // Góc trên-phải
    if (x === maxX && y === 0) return TileType.CORNER_UR;
    
    // Góc dưới-trái
    if (x === 0 && y === maxY) return TileType.CORNER_BL;
    
    // Góc dưới-phải
    if (x === maxX && y === maxY) return TileType.CORNER_BR;
    
    // Viền trên
    if (y === 0) return TileType.BORDER_U;
    
    // Viền dưới
    if (y === maxY) return TileType.BORDER_B;
    
    // Viền trái
    if (x === 0) return TileType.BORDER_L;
    
    // Viền phải
    if (x === maxX) return TileType.BORDER_R;
    
    return null;
}
```

### **Obstacle Detection Algorithm**
```typescript
private detectObstacleType(pattern: NeighborPattern): TileType {
    const { top, bottom, left, right } = pattern;
    
    // Đếm số neighbors (4 hướng chính)
    const neighbors = [top, bottom, left, right].filter(Boolean).length;
    
    // 1 neighbor = End tile (đuôi)
    if (neighbors === 1) {
        if (top) return TileType.END_B;      // Đuôi hướng xuống
        if (bottom) return TileType.END_U;   // Đuôi hướng lên
        if (left) return TileType.END_R;     // Đuôi hướng phải
        if (right) return TileType.END_L;    // Đuôi hướng trái
    }
    
    // 2 neighbors = Middle tile
    if (neighbors === 2) {
        // Vertical (trên-dưới)
        if (top && bottom) return TileType.OBSTACLE;
        
        // Horizontal (trái-phải)
        if (left && right) return TileType.OBSTACLE_SIDE;
        
        // L-shape (có thể xử lý riêng nếu cần)
        // ... corner obstacle logic ...
    }
    
    // 3+ neighbors = Junction/complex shape
    // (Có thể extend thêm logic)
    
    return TileType.OBSTACLE; // Default
}
```

---

## 🚀 **ROADMAP TRIỂN KHAI**

### **Sprint 1: Core Detection (1-2 days)**
- [ ] Implement `getNeighborPattern()`
- [ ] Implement `detectBorderType()`
- [ ] Implement `detectObstacleType()`
- [ ] Unit test với mem.json

### **Sprint 2: Rendering (1 day)**
- [ ] Implement `spawnTile()`
- [ ] Implement `renderMap()`
- [ ] Test visual output
- [ ] Fix edge cases

### **Sprint 3: Validation & Polish (1 day)**
- [ ] Add error handling
- [ ] Add debug visualization (draw grid overlay)
- [ ] Performance optimization
- [ ] Documentation

### **Sprint 4: Advanced Features (Optional)**
- [ ] Support L-shape obstacles
- [ ] Support T-junction
- [ ] Support custom tile mapping
- [ ] Map editor integration

---

## 📊 **LỢI ÍCH SO VỚI PHƯƠNG PHÁP CŨ**

| Aspect | Old Approach | New Approach |
|--------|-------------|--------------|
| **Data Format** | 16+ tile codes | 2 values (0, 1) |
| **Map Creation** | Phải biết đúng code | Chỉ vẽ tường và đường |
| **Maintainability** | Hard-coded mapping | Auto-detection |
| **Flexibility** | Fixed patterns | Any pattern works |
| **Tool Integration** | Custom only | Works with any tool |
| **Code Complexity** | Simple | Medium (smart) |

---

## 🎯 **EXPECTED RESULTS**

### **Input (mem.json):**
```json
{
  "data": [
    ["1", "1", "1", "1"],
    ["1", "0", "0", "1"],
    ["1", "0", "1", "1"],
    ["1", "1", "1", "1"]
  ]
}
```

### **Auto-detected:**
```
[0,0]: upper_left_corner
[1,0]: border_upper
[2,0]: border_upper
[3,0]: upper_right_corner
[0,1]: border_left
[3,1]: border_right
[0,2]: border_left
[2,2]: right_end_obstacle (detected: only left neighbor)
[3,2]: border_right
[0,3]: below_left_corner
[1,3]: border_below
[2,3]: border_below
[3,3]: below_right_corner
```

---

## 💡 **TIPS & BEST PRACTICES**

1. **Ưu tiên border detection trước** - Vì position-based, dễ và chính xác
2. **Cache neighbor patterns** - Tránh tính lại nhiều lần
3. **Validate input data** - Check grid consistency (rows có cùng width)
4. **Debug visualization** - Draw grid overlay để verify detection
5. **Extensible design** - Dễ dàng add thêm tile types sau

---

## 🔮 **FUTURE ENHANCEMENTS**

1. **Auto-generate variations** - Random chọn giữa `border_below` và `border_below01`
2. **Theme support** - Swap prefab set (ice theme, desert theme, etc.)
3. **Animation** - Smooth tile transitions
4. **Procedural decoration** - Auto-add decorative sprites
5. **Collision optimization** - Merge adjacent tiles thành 1 collider

---

**Status:** 📝 Planning Phase  
**Next Step:** Implement Phase 1 - Tile Detection System
