# 🔧 REFACTOR SUGGESTIONS

## Priority 1: Critical Fixes

### 1. Fix canPlaceObstacle() logic
```typescript
canPlaceObstacle(grid: string[][], x: number, y: number, isFirstStep: boolean = false): boolean {
    if (grid[y][x] === '1') return false;
    
    // Chỉ đếm 4 hướng chính trong khu vực chơi
    const directions = [[0,-1], [-1,0], [1,0], [0,1]];
    let adjacentCount = 0;
    
    for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (this.isInsidePlayArea(nx, ny) && grid[ny][nx] === '1') {
            adjacentCount++;
        }
    }
    
    // Bước đầu cho phép nhiều hơn (sát viền)
    const maxAdjacent = isFirstStep ? 3 : 1;
    return adjacentCount <= maxAdjacent;
}
```

### 2. Remove wouldNotIsolate() for performance
```typescript
createObstaclePath(grid: string[][], startX: number, startY: number, initialDirection: number) {
    // ... code ...
    
    for (let step = 0; step < pathLength; step++) {
        if (!this.isInsidePlayArea(x, y) || 
            this.isInCornerZone(x, y, cornerOffset) ||
            !this.canPlaceObstacle(grid, x, y, step === 0)) {
            break;
        }
        
        grid[y][x] = '1';
        // ... rest ...
    }
}
```

### 3. Add constants
```typescript
export class GenTest extends Component {
    private static readonly MIN_SPAWN_DISTANCE = 4;
    private static readonly CORNER_EXCLUSION_SIZE = 3;
    private static readonly MAX_ADJACENT_TILES = 1;
    private static readonly MIN_MAP_SIZE = 3;
    
    // ... rest of code ...
}
```

## Priority 2: Performance Improvements

### 4. Iterative flood fill
```typescript
private floodFillIterative(grid: string[][], startX: number, startY: number): number {
    const queue: Array<{x: number, y: number}> = [{x: startX, y: startY}];
    const visited = new Set<string>();
    let count = 0;
    
    while (queue.length > 0) {
        const {x, y} = queue.shift()!;
        const key = `${x},${y}`;
        
        if (visited.has(key) || 
            !this.isInsidePlayArea(x, y) || 
            grid[y][x] === '1') {
            continue;
        }
        
        visited.add(key);
        count++;
        
        queue.push(
            {x: x + 1, y},
            {x: x - 1, y},
            {x, y: y + 1},
            {x, y: y - 1}
        );
    }
    
    return count;
}
```

## Priority 3: Code Quality

### 5. Extract helper functions
```typescript
private isInsidePlayArea(x: number, y: number): boolean {
    return x >= this.borderThickness && 
           x < this.borderThickness + this.innerWidth &&
           y >= this.borderThickness && 
           y < this.borderThickness + this.innerHeight;
}

private isOutOfBounds(x: number, y: number): boolean {
    return x < 0 || x >= this.mapData[0]?.length || 
           y < 0 || y >= this.mapData.length;
}

private manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}
```

### 6. Add Direction enum
```typescript
enum Direction {
    UP = 0,
    RIGHT = 1,
    DOWN = 2,
    LEFT = 3
}

private getOppositeDirection(dir: Direction): Direction {
    return (dir + 2) % 4 as Direction;
}

private getPossibleDirections(current: Direction): Direction[] {
    const opposite = this.getOppositeDirection(current);
    return [Direction.UP, Direction.RIGHT, Direction.DOWN, Direction.LEFT]
        .filter(d => d !== opposite);
}
```

### 7. Add validation
```typescript
start() {
    // Validate
    if (!this.tilePrefab) {
        console.error("GenTest: tilePrefab is required!");
        this.enabled = false;
        return;
    }
    
    if (!this.mapContainer) {
        console.error("GenTest: mapContainer is required!");
        this.enabled = false;
        return;
    }
    
    if (this.innerWidth < GenTest.MIN_MAP_SIZE || 
        this.innerHeight < GenTest.MIN_MAP_SIZE) {
        console.error(`GenTest: Map size must be at least ${GenTest.MIN_MAP_SIZE}x${GenTest.MIN_MAP_SIZE}`);
        this.enabled = false;
        return;
    }
    
    this.regenerateMap();
}
```

### 8. Reduce duplicate code in getSpawnPoints()
```typescript
private addEdgeSpawnPoints(
    allPoints: SpawnPoint[],
    isHorizontal: boolean,
    position: number,
    direction: Direction,
    cornerOffset: number
) {
    const length = isHorizontal ? this.innerWidth : this.innerHeight;
    const start = this.borderThickness + cornerOffset;
    const end = this.borderThickness + length - cornerOffset;
    
    for (let i = start; i < end; i++) {
        const point = isHorizontal
            ? {x: i, y: position, direction}
            : {x: position, y: i, direction};
        allPoints.push(point);
    }
}

getSpawnPoints(): SpawnPoint[] {
    const points: SpawnPoint[] = [];
    const allPoints: SpawnPoint[] = [];
    const cornerOffset = GenTest.CORNER_EXCLUSION_SIZE;
    
    // Top edge
    this.addEdgeSpawnPoints(allPoints, true, this.borderThickness, Direction.DOWN, cornerOffset);
    
    // Right edge
    this.addEdgeSpawnPoints(allPoints, false, this.borderThickness + this.innerWidth - 1, Direction.LEFT, cornerOffset);
    
    // Bottom edge
    this.addEdgeSpawnPoints(allPoints, true, this.borderThickness + this.innerHeight - 1, Direction.UP, cornerOffset);
    
    // Left edge
    this.addEdgeSpawnPoints(allPoints, false, this.borderThickness, Direction.RIGHT, cornerOffset);
    
    // Shuffle and select
    this.shuffleArray(allPoints);
    
    return this.selectPointsWithMinDistance(allPoints, GenTest.MIN_SPAWN_DISTANCE);
}
```

## Priority 4: Testing & Debug

### 9. Add debug mode
```typescript
@property({ visible: false, tooltip: "Enable debug logging" })
debugMode: boolean = false;

private debug(...args: any[]) {
    if (this.debugMode) {
        console.log('[GenTest]', ...args);
    }
}

// Use it:
this.debug(`Spawning ${this.obstaclePathCount} obstacles...`);
this.debug(`Selected spawn point:`, point);
```

### 10. Add performance metrics
```typescript
regenerateMap() {
    if (this.debugMode) {
        const startTime = performance.now();
        this.createBorderMap();
        this.generateMap();
        const endTime = performance.now();
        console.log(`[GenTest] Map generated in ${(endTime - startTime).toFixed(2)}ms`);
    } else {
        this.createBorderMap();
        this.generateMap();
    }
}
```
