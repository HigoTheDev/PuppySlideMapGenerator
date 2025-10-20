import { _decorator, Component, Node, Prefab, instantiate, UITransform, v3, JsonAsset, error, warn, log } from 'cc';
const { ccclass, property } = _decorator;

enum TileType {
    EMPTY = '0',
    WALL = '1',
    CORNER_UL = 'cul',
    CORNER_UR = 'cur',
    CORNER_BL = 'cbl',
    CORNER_BR = 'cbr',
    BORDER_U = 'bu',
    BORDER_B = 'bb',
    BORDER_L = 'bl',
    BORDER_R = 'br',
    START_U = 'su',
    START_B = 'sb',
    OBSTACLE = 'o',
    OBSTACLE_SIDE = 'os',
    END_U = 'eu',
    END_B = 'eb',
    END_L = 'el',
    END_R = 'er',
    TURN_OBSTACLE_1 = 'turn1',
    TURN_OBSTACLE_MULTI = 'turn_multi'
}


const CONFIG = {
    MIN_MAP_WIDTH: 3,
    MIN_MAP_HEIGHT: 3,
    MAX_MAP_WIDTH: 1000,
    MAX_MAP_HEIGHT: 1000,
    DEFAULT_TILE_SIZE: 64,
    MIN_TILE_SIZE: 8,
    MAX_TILE_SIZE: 512,
} as const;


interface NeighborPattern {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
    topLeft: boolean;
    topRight: boolean;
    bottomLeft: boolean;
    bottomRight: boolean;
}


interface MapData {
    data: string[][];
    version?: string;
    name?: string;
    tileSize?: number;
}


@ccclass('MapPrefabs')
export class MapPrefabs {
    @property({ type: Prefab, tooltip: "Góc trên-trái" })
    upper_left_corner: Prefab | null = null;

    @property({ type: Prefab, tooltip: "Góc trên-phải" })
    upper_right_corner: Prefab | null = null;

    @property({ type: Prefab, tooltip: "Góc dưới-trái" })
    below_left_corner: Prefab | null = null;

    @property({ type: Prefab, tooltip: "Góc dưới-phải" })
    below_right_corner: Prefab | null = null;

    @property({ type: Prefab, tooltip: "Viền trên" })
    border_upper: Prefab | null = null;

    @property({ type: Prefab, tooltip: "Viền dưới" })
    border_below: Prefab | null = null;

    @property({ type: Prefab, tooltip: "Viền trái" })
    border_left: Prefab | null = null;

    @property({ type: Prefab, tooltip: "Viền phải" })
    border_right: Prefab | null = null;

    @property({ type: Prefab, tooltip: "Đầu chướng ngại vật (từ trên)" })
    upper_start_obstacle: Prefab | null = null;

    @property({ type: Prefab, tooltip: "Đầu chướng ngại vật (từ dưới)" })
    below_start_obstacle: Prefab | null = null;

    @property({ type: Prefab, tooltip: "Chướng ngại vật dọc" })
    obstacle: Prefab | null = null;

    @property({ type: Prefab, tooltip: "Chướng ngại vật ngang" })
    side_obstacle: Prefab | null = null;

    @property({ type: Prefab, tooltip: "Đuôi chướng ngại vật (hướng lên)" })
    upper_end_obstacle: Prefab | null = null;

    @property({ type: Prefab, tooltip: "Đuôi chướng ngại vật (hướng xuống)" })
    below_end_obstacle: Prefab | null = null;

    @property({ type: Prefab, tooltip: "Đuôi chướng ngại vật (hướng phải)" })
    right_end_obstacle: Prefab | null = null;

    @property({ type: Prefab, tooltip: "Đuôi chướng ngại vật (hướng trái)" })
    left_end_obstacle: Prefab | null = null;

    @property({ type: Prefab, tooltip: "Góc rẽ đơn (2 hướng, default: right)" })
    turn_obstacle_1_direct: Prefab | null = null;

    @property({ type: Prefab, tooltip: "Ngã rẽ phức tạp (3+ hướng)" })
    turn_obstacle_multi_direct: Prefab | null = null;
}


@ccclass('SmartMapGenerator')
export class SmartMapGenerator extends Component {
    // ========================================================================
    // PROPERTIES
    // ========================================================================

    @property({ 
        type: MapPrefabs, 
        tooltip: "Tất cả các prefab tile cho map" 
    })
    mapPrefabs: MapPrefabs = new MapPrefabs();

    @property({
        type: JsonAsset,
        tooltip: "File JSON chứa dữ liệu map (format: {data: string[][]})"
    })
    mapLayoutJson: JsonAsset | null = null;

    @property({ 
        type: Node, 
        tooltip: "Node container chứa tất cả các tiles" 
    })
    mapContainer: Node | null = null;

    @property({
        tooltip: "Kích thước mỗi tile (pixel)",
        range: [CONFIG.MIN_TILE_SIZE, CONFIG.MAX_TILE_SIZE]
    })
    tileSize: number = CONFIG.DEFAULT_TILE_SIZE;

    @property({
        tooltip: "Bật chế độ context-aware (tự động detect tile type)",
        visible: true
    })
    useContextAwareDetection: boolean = true;

    @property({
        tooltip: "Bật debug mode để xem log chi tiết",
        visible: true
    })
    debugMode: boolean = false;

    private mapData: string[][] = [];
    private prefabMap: Map<string, Prefab> = new Map();
    private mapWidth: number = 0;
    private mapHeight: number = 0;
    private tileRotations: Map<string, number> = new Map();

    onLoad() {
        this.debug('Component loaded');
    }

    start() {
        try {
            const startTime = performance.now();

            // Validate setup
            if (!this.validateSetup()) {
                this.enabled = false;
                return;
            }

            // Setup prefab mapping
            this.setupPrefabMap();

            // Load and render map
            this.loadAndRenderMap();

            const endTime = performance.now();
            this.debug(`Map initialized in ${(endTime - startTime).toFixed(2)}ms`);
        } catch (err) {
            error('[SmartMapGenerator] Fatal error in start():', err);
            this.enabled = false;
        }
    }

    /**
     * Validate all required components and settings
     */
    private validateSetup(): boolean {
        // Check map container
        if (!this.mapContainer) {
            error('[SmartMapGenerator] Map container is not assigned!');
            return false;
        }

        // Check JSON asset
        if (!this.mapLayoutJson) {
            error('[SmartMapGenerator] Map layout JSON is not assigned!');
            return false;
        }

        // Check tile size
        if (this.tileSize < CONFIG.MIN_TILE_SIZE || this.tileSize > CONFIG.MAX_TILE_SIZE) {
            warn(`[SmartMapGenerator] Tile size ${this.tileSize} is out of range. Adjusting to ${CONFIG.DEFAULT_TILE_SIZE}`);
            this.tileSize = CONFIG.DEFAULT_TILE_SIZE;
        }

        // Validate all required prefabs
        if (!this.validatePrefabs()) {
            return false;
        }

        return true;
    }

    private validatePrefabs(): boolean {
        const requiredPrefabs: (keyof MapPrefabs)[] = [
            'upper_left_corner',
            'upper_right_corner',
            'below_left_corner',
            'below_right_corner',
            'border_upper',
            'border_below',
            'border_left',
            'border_right',
            'upper_start_obstacle',
            'below_start_obstacle',
            'obstacle',
            'side_obstacle',
            'upper_end_obstacle',
            'below_end_obstacle',
            'left_end_obstacle',
            'right_end_obstacle',
        ];

        const missingPrefabs: string[] = [];

        for (const prefabName of requiredPrefabs) {
            if (!this.mapPrefabs[prefabName]) {
                missingPrefabs.push(prefabName);
            }
        }

        if (missingPrefabs.length > 0) {
            error('[SmartMapGenerator] Missing prefabs:', missingPrefabs.join(', '));
            return false;
        }

        this.debug('All prefabs validated successfully');
        return true;
    }

    private validateMapData(data: any): data is MapData {
        // Check if data exists
        if (!data) {
            error('[SmartMapGenerator] Map data is null or undefined');
            return false;
        }

        // Check if data.data exists and is array
        if (!Array.isArray(data.data)) {
            error('[SmartMapGenerator] Map data.data is not an array');
            return false;
        }

        // Check if map is empty
        if (data.data.length === 0) {
            error('[SmartMapGenerator] Map data is empty');
            return false;
        }

        // Check minimum size
        if (data.data.length < CONFIG.MIN_MAP_HEIGHT) {
            error(`[SmartMapGenerator] Map height ${data.data.length} is less than minimum ${CONFIG.MIN_MAP_HEIGHT}`);
            return false;
        }

        // Check maximum size
        if (data.data.length > CONFIG.MAX_MAP_HEIGHT) {
            error(`[SmartMapGenerator] Map height ${data.data.length} exceeds maximum ${CONFIG.MAX_MAP_HEIGHT}`);
            return false;
        }

        // Validate each row
        const firstRowLength = data.data[0].length;

        if (firstRowLength < CONFIG.MIN_MAP_WIDTH) {
            error(`[SmartMapGenerator] Map width ${firstRowLength} is less than minimum ${CONFIG.MIN_MAP_WIDTH}`);
            return false;
        }

        if (firstRowLength > CONFIG.MAX_MAP_WIDTH) {
            error(`[SmartMapGenerator] Map width ${firstRowLength} exceeds maximum ${CONFIG.MAX_MAP_WIDTH}`);
            return false;
        }

        for (let i = 0; i < data.data.length; i++) {
            const row = data.data[i];

            // Check if row is array
            if (!Array.isArray(row)) {
                error(`[SmartMapGenerator] Row ${i} is not an array`);
                return false;
            }

            // Check if all rows have same length
            if (row.length !== firstRowLength) {
                error(`[SmartMapGenerator] Row ${i} has inconsistent length. Expected ${firstRowLength}, got ${row.length}`);
                return false;
            }

            // Validate each cell
            for (let j = 0; j < row.length; j++) {
                const cell = row[j];
                
                // Check if cell is string
                if (typeof cell !== 'string') {
                    error(`[SmartMapGenerator] Cell [${i}][${j}] is not a string. Got ${typeof cell}`);
                    return false;
                }

                // In context-aware mode, only allow '0' and '1'
                if (this.useContextAwareDetection) {
                    if (cell !== TileType.EMPTY && cell !== TileType.WALL) {
                        error(`[SmartMapGenerator] Cell [${i}][${j}] has invalid value '${cell}' in context-aware mode. Only '0' and '1' are allowed.`);
                        return false;
                    }
                }
            }
        }

        this.debug(`Map data validated: ${data.data.length}x${firstRowLength}`);
        return true;
    }

    private setupPrefabMap(): void {
        // Legacy tile codes mapping
        this.prefabMap.set(TileType.CORNER_UL, this.mapPrefabs.upper_left_corner!);
        this.prefabMap.set(TileType.CORNER_UR, this.mapPrefabs.upper_right_corner!);
        this.prefabMap.set(TileType.CORNER_BL, this.mapPrefabs.below_left_corner!);
        this.prefabMap.set(TileType.CORNER_BR, this.mapPrefabs.below_right_corner!);
        this.prefabMap.set(TileType.BORDER_U, this.mapPrefabs.border_upper!);
        this.prefabMap.set(TileType.BORDER_B, this.mapPrefabs.border_below!);
        this.prefabMap.set(TileType.BORDER_L, this.mapPrefabs.border_left!);
        this.prefabMap.set(TileType.BORDER_R, this.mapPrefabs.border_right!);
        this.prefabMap.set(TileType.START_U, this.mapPrefabs.upper_start_obstacle!);
        this.prefabMap.set(TileType.START_B, this.mapPrefabs.below_start_obstacle!);
        this.prefabMap.set(TileType.OBSTACLE, this.mapPrefabs.obstacle!);
        this.prefabMap.set(TileType.OBSTACLE_SIDE, this.mapPrefabs.side_obstacle!);
        this.prefabMap.set(TileType.END_U, this.mapPrefabs.upper_end_obstacle!);
        this.prefabMap.set(TileType.END_B, this.mapPrefabs.below_end_obstacle!);
        this.prefabMap.set(TileType.END_L, this.mapPrefabs.left_end_obstacle!);
        this.prefabMap.set(TileType.END_R, this.mapPrefabs.right_end_obstacle!);
        this.prefabMap.set(TileType.TURN_OBSTACLE_1, this.mapPrefabs.turn_obstacle_1_direct!);
        this.prefabMap.set(TileType.TURN_OBSTACLE_MULTI, this.mapPrefabs.turn_obstacle_multi_direct!);

        this.debug('Prefab map initialized with', this.prefabMap.size, 'entries');
    }


    private loadAndRenderMap(): void {
        try {
            // Parse JSON
            const jsonData = this.mapLayoutJson!.json;

            // Validate map data
            if (!this.validateMapData(jsonData)) {
                error('[SmartMapGenerator] Map validation failed');
                return;
            }

            // Store map data
            this.mapData = jsonData.data;
            this.mapHeight = this.mapData.length;
            this.mapWidth = this.mapData[0].length;

            // Override tile size if specified in JSON
            if (jsonData.tileSize && typeof jsonData.tileSize === 'number') {
                this.tileSize = jsonData.tileSize;
                this.debug(`Tile size overridden from JSON: ${this.tileSize}`);
            }

            // Log map info
            this.debug(`Loaded map: ${this.mapWidth}x${this.mapHeight}, tile size: ${this.tileSize}px`);
            if (jsonData.name) {
                this.debug(`Map name: ${jsonData.name}`);
            }
            if (jsonData.version) {
                this.debug(`Map version: ${jsonData.version}`);
            }

            // Render map
            this.renderMap();

        } catch (err) {
            error('[SmartMapGenerator] Error loading map:', err);
        }
    }


    private getNeighborPattern(x: number, y: number): NeighborPattern {
        const isWall = (checkX: number, checkY: number): boolean => {
            // Out of bounds = treat as wall
            if (checkY < 0 || checkY >= this.mapHeight || checkX < 0 || checkX >= this.mapWidth) {
                return true;
            }
            return this.mapData[checkY][checkX] === TileType.WALL;
        };

        return {
            top: isWall(x, y - 1),
            bottom: isWall(x, y + 1),
            left: isWall(x - 1, y),
            right: isWall(x + 1, y),
            topLeft: isWall(x - 1, y - 1),
            topRight: isWall(x + 1, y - 1),
            bottomLeft: isWall(x - 1, y + 1),
            bottomRight: isWall(x + 1, y + 1),
        };
    }


    private isBorderPosition(x: number, y: number): boolean {
        return x === 0 || x === this.mapWidth - 1 || y === 0 || y === this.mapHeight - 1;
    }


    private detectTileType(x: number, y: number, pattern: NeighborPattern): string {
        // Priority 1: Border detection (position-based)
        if (this.isBorderPosition(x, y)) {
            return this.detectBorderType(x, y, pattern);
        }

        // Priority 2: Obstacle detection (pattern-based)
        return this.detectObstacleType(pattern, x, y);
    }


    /**
     * Check if border tile has inner obstacle neighbor (for start obstacle detection)
     */
    private hasInnerObstacleNeighbor(x: number, y: number): { 
        hasObstacle: boolean; 
        direction: 'top' | 'bottom' | 'left' | 'right' | null 
    } {
        const maxX = this.mapWidth - 1;
        const maxY = this.mapHeight - 1;

        // Check inner neighbor based on border position
        if (y === 0) {
            // Top border - check cell below (y+1)
            if (y + 1 < this.mapHeight && this.mapData[y + 1][x] === TileType.WALL) {
                return { hasObstacle: true, direction: 'bottom' };
            }
        }
        if (y === maxY) {
            // Bottom border - check cell above (y-1)
            if (y - 1 >= 0 && this.mapData[y - 1][x] === TileType.WALL) {
                return { hasObstacle: true, direction: 'top' };
            }
        }
        if (x === 0) {
            // Left border - check cell to right (x+1)
            if (x + 1 < this.mapWidth && this.mapData[y][x + 1] === TileType.WALL) {
                return { hasObstacle: true, direction: 'right' };
            }
        }
        if (x === maxX) {
            // Right border - check cell to left (x-1)
            if (x - 1 >= 0 && this.mapData[y][x - 1] === TileType.WALL) {
                return { hasObstacle: true, direction: 'left' };
            }
        }

        return { hasObstacle: false, direction: null };
    }

    private detectBorderType(x: number, y: number, pattern: NeighborPattern): string {
        const maxX = this.mapWidth - 1;
        const maxY = this.mapHeight - 1;

        // Four corners - corners remain as corners
        if (x === 0 && y === 0) return TileType.CORNER_UL;
        if (x === maxX && y === 0) return TileType.CORNER_UR;
        if (x === 0 && y === maxY) return TileType.CORNER_BL;
        if (x === maxX && y === maxY) return TileType.CORNER_BR;

        // Check if this border tile has obstacle neighbor pointing inward
        const obstacleCheck = this.hasInnerObstacleNeighbor(x, y);
        
        if (obstacleCheck.hasObstacle) {
            // This border connects to an obstacle - spawn start_obstacle instead
            if (y === 0 ) {
                // Top border with obstacle below
                return TileType.START_U;
            }
            if (y === maxY) {
                // Bottom border with obstacle above
                return TileType.START_B;
            }
            if (x === 0 || x === maxX) {
                return TileType.TURN_OBSTACLE_MULTI;
            }
        }

        // Regular border without obstacle neighbor
        if (y === 0) return TileType.BORDER_U;
        if (y === maxY) return TileType.BORDER_B;
        if (x === 0) return TileType.BORDER_L;
        if (x === maxX) return TileType.BORDER_R;

        // Fallback (should never reach here)
        warn(`[SmartMapGenerator] Unexpected border case at [${x}, ${y}]`);
        return TileType.OBSTACLE;
    }


    private detectObstacleType(pattern: NeighborPattern, x: number, y: number): string {
        const { top, bottom, left, right } = pattern;
        const turnCheck = this.detectTurnObstacle(pattern);
        if (turnCheck.isTurn) {
            // Store rotation info for later use in spawnTile()
            this.tileRotations.set(`${x},${y}`, turnCheck.rotation);
            return turnCheck.tileType;
        }

        const neighbors = [top, bottom, left, right].filter(Boolean).length;

        if(neighbors === 0){
            return TileType.TURN_OBSTACLE_MULTI;
        }

        // Single neighbor = End tile
        if (neighbors === 1) {
            if (top) return TileType.END_B;    // End pointing down
            if (bottom) return TileType.END_U; // End pointing up
            if (left) return TileType.END_R;   // End pointing right
            if (right) return TileType.END_L;  // End pointing left
        }

        // Two neighbors = Middle tile
        if (neighbors === 2) {
            // Vertical (top-bottom)
            if (top && bottom) return TileType.OBSTACLE;

            // Horizontal (left-right)
            if (left && right) return TileType.OBSTACLE_SIDE;

            // L-shape or corner - use vertical as default
            // Could be enhanced to detect L-shapes specifically
            return TileType.OBSTACLE;
        }

        // Three or more neighbors = Junction/complex
        // Default to vertical obstacle
        return TileType.OBSTACLE;
    }

    private renderMap(): void {
        if (!this.mapContainer) {
            error('[SmartMapGenerator] Map container is null');
            return;
        }

        // Clear existing tiles
        this.mapContainer.destroyAllChildren();

        const startTime = performance.now();
        let tilesRendered = 0;
        let tilesSkipped = 0;

        // Iterate through each tile
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tileValue = this.mapData[y][x];

                // Skip empty tiles
                if (tileValue === TileType.EMPTY) {
                    tilesSkipped++;
                    continue;
                }

                // Determine tile type
                let tileType: string;

                if (this.useContextAwareDetection && tileValue === TileType.WALL) {
                    // Context-aware mode: auto-detect tile type
                    const pattern = this.getNeighborPattern(x, y);
                    tileType = this.detectTileType(x, y, pattern);
                } else {
                    // Legacy mode: use tile value directly
                    tileType = tileValue;
                }

                // Spawn tile
                if (this.spawnTile(tileType, x, y)) {
                    tilesRendered++;
                } else {
                    tilesSkipped++;
                }
            }
        }

        const endTime = performance.now();
        this.debug(
            `Map rendered: ${tilesRendered} tiles in ${(endTime - startTime).toFixed(2)}ms ` +
            `(${tilesSkipped} skipped)`
        );
    }

    private spawnTile(tileType: string, x: number, y: number): boolean {
        // Get prefab for this tile type
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

    private debug(...args: any[]): void {
        if (this.debugMode) {
            log('[SmartMapGenerator]', ...args);
        }
    }


    public reloadMap(): void {
        this.debug('Reloading map...');
        this.loadAndRenderMap();
    }


    public clearMap(): void {
        if (this.mapContainer) {
            this.mapContainer.destroyAllChildren();
            this.debug('Map cleared');
        }
    }


    public getMapSize(): { width: number; height: number } {
        return {
            width: this.mapWidth,
            height: this.mapHeight
        };
    }


    public getTileAt(x: number, y: number): string | null {
        if (y < 0 || y >= this.mapHeight || x < 0 || x >= this.mapWidth) {
            return null;
        }
        return this.mapData[y][x];
    }

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

            // Determine rotation based on which neighbor is MISSING or least important
            // Default orientation: Vertical (top-bottom) + Right branch

            // Pattern: Top + Right + Bottom (missing left) = Default (0°)
            if (top && right && bottom) rotation = 180;
            // Pattern: Top + Right (L-corner pointing right-up) = Default (0°)
            else if (top && right && !bottom && !left) rotation = 180;

            // Pattern: Right + Bottom + Left (missing top) = 90°
            else if (right && bottom && left) rotation = 270;
            // Pattern: Right + Bottom (L-corner pointing right-down) = 90°
            else if (right && bottom && !top && !left) rotation = 270;

            // Pattern: Bottom + Left + Top (missing right) = 180°
            else if (bottom && left && top) rotation = 0;
            // Pattern: Bottom + Left (L-corner pointing left-down) = 180°
            else if (bottom && left && !top && !right) rotation = 0;

            // Pattern: Left + Top + Right (missing bottom) = 270°
            else if (left && top && right) rotation = 90;
            // Pattern: Left + Top (L-corner pointing left-up) = 270°
            else if (left && top && !bottom && !right) rotation = 90;

            return {
                isTurn: true,
                tileType: TileType.TURN_OBSTACLE_1,
                rotation: rotation
            };
        }

        return { isTurn: false, tileType: '', rotation: 0 };
    }
}


