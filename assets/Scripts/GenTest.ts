import { _decorator, Component, Node, Prefab, instantiate, Sprite, UITransform, v3, systemEvent, SystemEvent, EventKeyboard, KeyCode } from 'cc';
const { ccclass, property } = _decorator;

/**
 * Lớp này dùng để gom nhóm các Prefab trong Inspector cho gọn gàng.
 */
@ccclass('MapPrefabs')
export class MapPrefabs {
    // VIỀN & GÓC (Không đổi)
    @property({ type: Prefab, tooltip: "Góc trên-trái của viền" })
    upper_left_corner: Prefab = null;
    @property({ type: Prefab, tooltip: "Góc trên-phải của viền" })
    upper_right_corner: Prefab = null;
    @property({ type: Prefab, tooltip: "Góc dưới-trái của viền" })
    below_left_corner: Prefab = null;
    @property({ type: Prefab, tooltip: "Góc dưới-phải của viền" })
    below_right_corner: Prefab = null;

    @property({ type: Prefab, tooltip: "Cạnh trên của viền" })
    border_upper: Prefab = null;
    @property({ type: Prefab, tooltip: "Cạnh dưới của viền" })
    border_below: Prefab = null;
    @property({ type: Prefab, tooltip: "Cạnh trái của viền" })
    border_left: Prefab = null;
    @property({ type: Prefab, tooltip: "Cạnh phải của viền" })
    border_right: Prefab = null;

    // ĐIỂM BẮT ĐẦU (Không đổi)
    @property({ type: Prefab, tooltip: "Điểm bắt đầu của chướng ngại vật từ viền trên" })
    upper_start_obstacle: Prefab = null;
    @property({ type: Prefab, tooltip: "Điểm bắt đầu của chướng ngại vật từ viền dưới" })
    below_start_obstacle: Prefab = null;

    // PHẦN THÂN (Cập nhật)
    @property({ type: Prefab, tooltip: "Phần thân của chướng ngại vật từ trên/dưới" })
    obstacle: Prefab = null;
    @property({ type: Prefab, tooltip: "Phần thân của chướng ngại vật từ hai bên" }) // MỚI
    side_obstacle: Prefab = null;

    // ĐIỂM KẾT THÚC (Cập nhật)
    @property({ type: Prefab, tooltip: "Đuôi chướng ngại vật khi bước cuối đi XUỐNG" }) // Đổi tên
    upper_end_obstacle: Prefab = null;
    @property({ type: Prefab, tooltip: "Đuôi chướng ngại vật khi bước cuối đi LÊN" }) // MỚI
    below_end_obstacle: Prefab = null;
    @property({ type: Prefab, tooltip: "Đuôi chướng ngại vật khi bước cuối đi TRÁI" }) // MỚI
    right_end_obstacle: Prefab = null;
    @property({ type: Prefab, tooltip: "Đuôi chướng ngại vật khi bước cuối đi PHẢI" }) // MỚI
    left_end_obstacle: Prefab = null;
}

/**
 * Định nghĩa các mã code cho từng loại tile.
 */
const TILE_CODE = {
    EMPTY: '0',
    CORNER_UL: 'cul', CORNER_UR: 'cur', CORNER_BL: 'cbl', CORNER_BR: 'cbr',
    BORDER_U: 'bu', BORDER_B: 'bb', BORDER_L: 'bl', BORDER_R: 'br',
    START_U: 'su', START_B: 'sb',
    OBSTACLE: 'o', OBSTACLE_SIDE: 'os', // MỚI
    END_U: 'eu', END_B: 'eb', END_L: 'el', END_R: 'er', // MỚI
};

@ccclass('GenTest')
export class GenTest extends Component {

    @property({ type: MapPrefabs, tooltip: "Kéo thả tất cả các prefab của map vào đây" })
    mapPrefabs: MapPrefabs = new MapPrefabs();

    // ... (Các thuộc tính khác không đổi)
    @property({ tooltip: "Chiều rộng của khu vực chơi bên trong." })
    innerWidth: number = 10;
    @property({ tooltip: "Chiều cao của khu vực chơi bên trong." })
    innerHeight: number = 15;
    @property({ tooltip: "Độ dày của viền (chỉ nên để là 1)." })
    borderThickness: number = 1;
    @property({ tooltip: "Số lượng đường chướng ngại vật nối từ viền vào trong." })
    obstaclePathCount: number = 5;
    @property({ range: [2, 10], tooltip: "Độ dài tối đa của mỗi đường chướng ngại vật (nên >= 2)." })
    maxPathLength: number = 5;
    @property({ range: [0, 1, 0.05], slide: true, tooltip: "Xác suất đổi hướng khi đi." })
    turnChance: number = 0.5;
    @property({ range: [0, 5, 1], tooltip: "Buộc đổi hướng sau bao nhiêu bước (tạo hình chữ L)." })
    guaranteedTurnStep: number = 3;
    @property(Node)
    mapContainer: Node = null;
    @property
    tileSize: number = 64;


    private mapData: string[][] = [];
    private prefabMap: Map<string, Prefab> = new Map();

    onLoad() {
        this.setupPrefabMap();
        systemEvent.on(SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }

    onDestroy() {
        systemEvent.off(SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }

    start() {
        if (!this.mapPrefabs.obstacle) {
            console.error("Chưa gán đầy đủ các Prefab trong mục MapPrefabs!");
            return;
        }
        this.regenerateMap();
    }

    setupPrefabMap() {
        // Viền & Góc
        this.prefabMap.set(TILE_CODE.CORNER_UL, this.mapPrefabs.upper_left_corner);
        this.prefabMap.set(TILE_CODE.CORNER_UR, this.mapPrefabs.upper_right_corner);
        this.prefabMap.set(TILE_CODE.CORNER_BL, this.mapPrefabs.below_left_corner);
        this.prefabMap.set(TILE_CODE.CORNER_BR, this.mapPrefabs.below_right_corner);
        this.prefabMap.set(TILE_CODE.BORDER_U, this.mapPrefabs.border_upper);
        this.prefabMap.set(TILE_CODE.BORDER_B, this.mapPrefabs.border_below);
        this.prefabMap.set(TILE_CODE.BORDER_L, this.mapPrefabs.border_left);
        this.prefabMap.set(TILE_CODE.BORDER_R, this.mapPrefabs.border_right);
        // Bắt đầu
        this.prefabMap.set(TILE_CODE.START_U, this.mapPrefabs.upper_start_obstacle);
        this.prefabMap.set(TILE_CODE.START_B, this.mapPrefabs.below_start_obstacle);
        // Thân
        this.prefabMap.set(TILE_CODE.OBSTACLE, this.mapPrefabs.obstacle);
        this.prefabMap.set(TILE_CODE.OBSTACLE_SIDE, this.mapPrefabs.side_obstacle); // MỚI
        // Kết thúc
        this.prefabMap.set(TILE_CODE.END_U, this.mapPrefabs.upper_end_obstacle); // MỚI
        this.prefabMap.set(TILE_CODE.END_B, this.mapPrefabs.below_end_obstacle); // MỚI
        this.prefabMap.set(TILE_CODE.END_L, this.mapPrefabs.left_end_obstacle);   // MỚI
        this.prefabMap.set(TILE_CODE.END_R, this.mapPrefabs.right_end_obstacle); // MỚI
    }

    onKeyUp(event: EventKeyboard) {
        if (event.keyCode === KeyCode.KEY_J) this.regenerateMap();
    }

    regenerateMap() {
        this.createBorderMap();
        this.generateMap();
    }

    createBorderMap() {
        const totalWidth = this.innerWidth + (this.borderThickness * 2);
        const totalHeight = this.innerHeight + (this.borderThickness * 2);
        const mapGrid: string[][] = [];

        for (let y = 0; y < totalHeight; y++) {
            mapGrid.push(Array(totalWidth).fill(TILE_CODE.EMPTY));
        }

        mapGrid[0][0] = TILE_CODE.CORNER_UL;
        mapGrid[0][totalWidth - 1] = TILE_CODE.CORNER_UR;
        mapGrid[totalHeight - 1][0] = TILE_CODE.CORNER_BL;
        mapGrid[totalHeight - 1][totalWidth - 1] = TILE_CODE.CORNER_BR;

        for (let x = 1; x < totalWidth - 1; x++) {
            mapGrid[0][x] = TILE_CODE.BORDER_U;
            mapGrid[totalHeight - 1][x] = TILE_CODE.BORDER_B;
        }
        for (let y = 1; y < totalHeight - 1; y++) {
            mapGrid[y][0] = TILE_CODE.BORDER_L;
            mapGrid[y][totalWidth - 1] = TILE_CODE.BORDER_R;
        }

        const spawnPoints = this.getSpawnPoints();
        for (const spawnPoint of spawnPoints) {
            this.createObstaclePath(mapGrid, spawnPoint);
        }
        this.mapData = mapGrid;
    }

    getSpawnPoints(): Array<{x: number, y: number, direction: number}> {
        // ... (Hàm này không đổi)
        const points: Array<{x: number, y: number, direction: number}> = [];
        const minDistance = 4; const cornerOffset = 3; const allPoints: Array<{x: number, y: number, direction: number}> = [];
        const topStart = this.borderThickness + cornerOffset; const topEnd = this.borderThickness + this.innerWidth - cornerOffset;
        for (let x = topStart; x < topEnd; x++) { allPoints.push({x, y: this.borderThickness, direction: 2}); }
        const rightStart = this.borderThickness + cornerOffset; const rightEnd = this.borderThickness + this.innerHeight - cornerOffset;
        for (let y = rightStart; y < rightEnd; y++) { allPoints.push({x: this.borderThickness + this.innerWidth - 1, y, direction: 3}); }
        const bottomStart = this.borderThickness + cornerOffset; const bottomEnd = this.borderThickness + this.innerWidth - cornerOffset;
        for (let x = bottomStart; x < bottomEnd; x++) { allPoints.push({x, y: this.borderThickness + this.innerHeight - 1, direction: 0}); }
        const leftStart = this.borderThickness + cornerOffset; const leftEnd = this.borderThickness + this.innerHeight - cornerOffset;
        for (let y = leftStart; y < leftEnd; y++) { allPoints.push({x: this.borderThickness, y, direction: 1}); }
        for (let i = allPoints.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [allPoints[i], allPoints[j]] = [allPoints[j], allPoints[i]]; }
        for (const point of allPoints) {
            let tooClose = false;
            for (const selected of points) { if (Math.abs(point.x - selected.x) + Math.abs(point.y - selected.y) < minDistance) { tooClose = true; break; } }
            if (!tooClose) { points.push(point); }
            if (points.length >= this.obstaclePathCount) { break; }
        }
        return points;
    }

    createObstaclePath(grid: string[][], spawnPoint: {x: number, y: number, direction: number}) {
        const plannedPath: {x: number, y: number}[] = [];
        const tempGridForThisPath = grid.map(arr => arr.slice());
        plannedPath.push({ x: spawnPoint.x, y: spawnPoint.y });
        tempGridForThisPath[spawnPoint.y][spawnPoint.x] = TILE_CODE.OBSTACLE;
        let { x, y, direction } = spawnPoint;
        switch (direction) { case 0: y--; break; case 1: x++; break; case 2: y++; break; case 3: x--; break; }
        const pathLength = 1 + Math.floor(Math.random() * (this.maxPathLength - 1));
        for (let step = 0; step < pathLength; step++) {
            if (x < this.borderThickness || x >= this.borderThickness + this.innerWidth || y < this.borderThickness || y >= this.borderThickness + this.innerHeight || this.isInCornerZone(x, y, 3)) { break; }
            if (!this.canPlaceObstacle(tempGridForThisPath, x, y) || !this.wouldNotIsolate(tempGridForThisPath, x, y)) { break; }
            plannedPath.push({ x, y });
            tempGridForThisPath[y][x] = TILE_CODE.OBSTACLE;
            if ((this.guaranteedTurnStep > 0 && (step + 1) % this.guaranteedTurnStep === 0) || (Math.random() < this.turnChance)) {
                const possibleDirections = this.getPossibleDirections(direction);
                if (possibleDirections.length > 0) { direction = possibleDirections[Math.floor(Math.random() * possibleDirections.length)]; }
            }
            switch (direction) { case 0: y--; break; case 1: x++; break; case 2: y++; break; case 3: x--; break; }
        }
        this.applyPathCodes(grid, plannedPath, spawnPoint.direction);
    }

    /**
     * HÀM NÀY ĐƯỢC NÂNG CẤP ĐỂ XỬ LÝ CÁC LOẠI THÂN VÀ ĐUÔI MỚI
     */
    applyPathCodes(grid: string[][], coords: {x: number, y: number}[], startDirection: number) {
        if (coords.length === 0) return;

        // 1. XỬ LÝ ĐIỂM BẮT ĐẦU (Không đổi)
        const startCoord = coords.shift();
        if (startDirection === 2) grid[startCoord.y][startCoord.x] = TILE_CODE.START_U;
        else if (startDirection === 0) grid[startCoord.y][startCoord.x] = TILE_CODE.START_B;
        else grid[startCoord.y][startCoord.x] = TILE_CODE.OBSTACLE_SIDE; // Bắt đầu từ bên cạnh dùng side_obstacle

        if (coords.length === 0) return;

        // 2. XỬ LÝ ĐIỂM KẾT THÚC (Logic mới)
        const endCoord = coords.pop();
        const prevCoord = coords.length > 0 ? coords[coords.length - 1] : startCoord;
        const dx = endCoord.x - prevCoord.x;
        const dy = endCoord.y - prevCoord.y;

        if (dy > 0) grid[endCoord.y][endCoord.x] = TILE_CODE.END_U;      // Đi xuống -> đuôi trên
        else if (dy < 0) grid[endCoord.y][endCoord.x] = TILE_CODE.END_B; // Đi lên -> đuôi dưới
        else if (dx > 0) grid[endCoord.y][endCoord.x] = TILE_CODE.END_L; // Đi phải -> đuôi trái
        else if (dx < 0) grid[endCoord.y][endCoord.x] = TILE_CODE.END_R; // Đi trái -> đuôi phải
        else grid[endCoord.y][endCoord.x] = TILE_CODE.END_U; // Mặc định nếu không di chuyển

        // 3. XỬ LÝ PHẦN THÂN (Logic mới)
        const bodyTileCode = (startDirection === 2 || startDirection === 0) ? TILE_CODE.OBSTACLE : TILE_CODE.OBSTACLE_SIDE;
        for(const coord of coords) {
            grid[coord.y][coord.x] = bodyTileCode;
        }
    }

    // --- CÁC HÀM HỖ TRỢ & KIỂM TRA (Không đổi) ---
    isInCornerZone(x: number, y: number, offset: number): boolean {
        const left = this.borderThickness; const right = this.borderThickness + this.innerWidth - 1;
        const top = this.borderThickness; const bottom = this.borderThickness + this.innerHeight - 1;
        if ((x < left + offset) && (y < top + offset)) return true;
        if ((x > right - offset) && (y < top + offset)) return true;
        if ((x < left + offset) && (y > bottom - offset)) return true;
        if ((x > right - offset) && (y > bottom - offset)) return true;
        return false;
    }

    getPossibleDirections(currentDirection: number): number[] {
        const opposite = (currentDirection + 2) % 4;
        return [0, 1, 2, 3].filter(d => d !== opposite);
    }

    canPlaceObstacle(grid: string[][], x: number, y: number): boolean {
        if (grid[y][x] !== TILE_CODE.EMPTY) return false;
        const patterns = [
            [[0, 0], [-1, 0], [0, -1], [-1, -1]], [[0, 0], [1, 0], [0, -1], [1, -1]],
            [[0, 0], [-1, 0], [0, 1], [-1, 1]], [[0, 0], [1, 0], [0, 1], [1, 1]],
        ];
        for (const pattern of patterns) {
            let neighborsInPattern = 0;
            for (const offset of pattern) { if (this.getTile(grid, x + offset[0], y + offset[1]) !== TILE_CODE.EMPTY) { neighborsInPattern++; } }
            if (neighborsInPattern === 3) return false;
        }
        return true;
    }

    getTile(grid: string[][], x: number, y: number): string {
        if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return TILE_CODE.BORDER_U;
        return grid[y][x];
    }

    wouldNotIsolate(grid: string[][], x: number, y: number): boolean {
        const originalValue = grid[y][x]; grid[y][x] = TILE_CODE.OBSTACLE;
        let emptyX = -1, emptyY = -1;
        for (let ty = this.borderThickness; ty < this.borderThickness + this.innerHeight; ty++) {
            for (let tx = this.borderThickness; tx < this.borderThickness + this.innerWidth; tx++) { if (grid[ty][tx] === TILE_CODE.EMPTY) { emptyX = tx; emptyY = ty; break; } }
            if (emptyX !== -1) break;
        }
        if (emptyX === -1) { grid[y][x] = originalValue; return true; }
        const visited = new Set<string>(); const reachableCount = this.floodFill(grid, emptyX, emptyY, visited);
        let totalEmpty = 0;
        for (let ty = this.borderThickness; ty < this.borderThickness + this.innerHeight; ty++) {
            for (let tx = this.borderThickness; tx < this.borderThickness + this.innerWidth; tx++) { if (grid[ty][tx] === TILE_CODE.EMPTY) { totalEmpty++; } }
        }
        grid[y][x] = originalValue;
        return reachableCount === totalEmpty;
    }

    floodFill(grid: string[][], x: number, y: number, visited: Set<string>): number {
        const key = `${x},${y}`;
        if (visited.has(key) || x < this.borderThickness || x >= this.borderThickness + this.innerWidth || y < this.borderThickness || y >= this.borderThickness + this.innerHeight || grid[y][x] !== TILE_CODE.EMPTY) { return 0; }
        visited.add(key); let count = 1;
        count += this.floodFill(grid, x + 1, y, visited); count += this.floodFill(grid, x - 1, y, visited);
        count += this.floodFill(grid, x, y + 1, visited); count += this.floodFill(grid, x, y - 1, visited);
        return count;
    }

    generateMap() {
        if (!this.mapContainer) { return; }
        this.mapContainer.destroyAllChildren();
        const finalMapWidth = this.mapData[0]?.length || 0; const finalMapHeight = this.mapData.length;
        for (let y = 0; y < finalMapHeight; y++) {
            for (let x = 0; x < finalMapWidth; x++) {
                const tileCode = this.mapData[y][x];
                if (tileCode === TILE_CODE.EMPTY) continue;
                const prefabToSpawn = this.prefabMap.get(tileCode);
                if (prefabToSpawn) {
                    const tileNode = instantiate(prefabToSpawn);
                    const transform = tileNode.getComponent(UITransform);
                    transform.setContentSize(this.tileSize, this.tileSize);
                    const anchorX = finalMapWidth * this.tileSize / 2; const anchorY = finalMapHeight * this.tileSize / 2;
                    tileNode.setPosition(v3(x * this.tileSize - anchorX + this.tileSize / 2, -y * this.tileSize + anchorY - this.tileSize / 2));
                    this.mapContainer.addChild(tileNode);
                } else { console.warn(`Không tìm thấy prefab cho mã code: '${tileCode}' tại (${x}, ${y})`); }
            }
        }
    }
}