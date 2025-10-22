import { _decorator, Component, Node, Prefab, instantiate, UITransform, v3, JsonAsset, Sprite, SpriteFrame, SpriteAtlas, error, warn, log } from 'cc';
const { ccclass, property } = _decorator;

enum TileType {
    EMPTY = '0',
    WALL = '1',
    CORNER_UL = 'cbl',
    CORNER_UR = 'cbr',
    CORNER_BL = 'cul',
    CORNER_BR = 'cur',
    BORDER_U = 'bb',
    BORDER_B = 'bu',
    BORDER_L = 'bl',
    BORDER_R = 'br',
    START_U = 'sb',
    START_B = 'su',
    START_L = 'sl',
    START_R = 'sr',
    OBSTACLE = 'o',
    OBSTACLE_L = 'ol',
    OBSTACLE_R = 'or',
    END_U = 'eb',
    END_B = 'eu',
    END_L = 'el',
    END_R = 'er',
    TURN_TOP_RIGHT = 'turn_tr',
    TURN_TOP_LEFT = 'turn_tl',
    TURN_BOTTOM_RIGHT = 'turn_br',
    TURN_BOTTOM_LEFT = 'turn_bl',
    TURN_HORIZONTAL_BOTTOM = 'turn_hb',
    TURN_VERTICAL_RIGHT = 'turn_vr',
    TURN_VERTICAL_LEFT = 'turn_vl',
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


const TILE_SPRITE_MAP: Record<string, { sprite: string; rotation: number }> = {
    // Corners
    [TileType.CORNER_UL]: { sprite: 'tile048', rotation: 0 },
    [TileType.CORNER_UR]: { sprite: 'tile050', rotation: 0 },
    [TileType.CORNER_BL]: { sprite: 'tile040', rotation: 0 },
    [TileType.CORNER_BR]: { sprite: 'tile028', rotation: 0 },

    // Borders
    [TileType.BORDER_U]: { sprite: 'tile006', rotation: 0 },
    [TileType.BORDER_B]: { sprite: 'tile041', rotation: 0 },
    [TileType.BORDER_L]: { sprite: 'tile063', rotation: 0 },
    [TileType.BORDER_R]: { sprite: 'tile062', rotation: 0 },

    // Obstacles - Start
    [TileType.START_U]: { sprite: 'tile024', rotation: 0 },
    [TileType.START_B]: { sprite: 'tile038', rotation: 0 },
    [TileType.START_L]: { sprite: 'tile020', rotation: 0 },
    [TileType.START_R]: { sprite: 'tile028', rotation: 0 },

    // Obstacles - Middle
    [TileType.OBSTACLE]: { sprite: 'path_vertical', rotation: 0 },
    [TileType.OBSTACLE_L]: { sprite: 'tile017', rotation: 0 },
    [TileType.OBSTACLE_R]: { sprite: 'tile017', rotation: 0 },

    // Obstacles - End
    [TileType.END_U]: { sprite: 'below_end_obstacle', rotation: 0 },
    [TileType.END_B]: { sprite: 'tile003', rotation: 0 },
    [TileType.END_L]: { sprite: 'tile016', rotation: 0 },
    [TileType.END_R]: { sprite: 'tile018', rotation: 0 },

    // Turns - L-corners (2 neighbors)
    [TileType.TURN_TOP_RIGHT]: { sprite: 'tile016', rotation: 0 },
    [TileType.TURN_TOP_LEFT]: { sprite: 'tile023', rotation: 0 },
    [TileType.TURN_BOTTOM_RIGHT]: { sprite: 'tile054', rotation: 0 },
    [TileType.TURN_BOTTOM_LEFT]: { sprite: 'tile055', rotation: 0 },

    // Turns - T-junctions (3 neighbors)
    [TileType.TURN_HORIZONTAL_BOTTOM]: { sprite: 'tile038', rotation: 0 },
    [TileType.TURN_VERTICAL_RIGHT]: { sprite: 'tile054', rotation: 0 },
    [TileType.TURN_VERTICAL_LEFT]: { sprite: 'tile055', rotation: 0 },

    // Turns - Cross (4 neighbors)
    [TileType.TURN_OBSTACLE_MULTI]: { sprite: 'tile058', rotation: 0 },
};


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

interface SpriteConfig {
    sprite: string;
    rotation: number;
}

@ccclass('SmartMapGenerator2')
export class SmartMapGenerator2 extends Component {
    // ========================================================================
    // PROPERTIES
    // ========================================================================

    @property({
        type: Prefab,
        tooltip: "Generic cell prefab (chứa Sprite component)"
    })
    cellPrefab: Prefab | null = null;

    @property({
        type: SpriteAtlas,
        tooltip: "Atlas chứa tất cả tile sprites"
    })
    tileAtlas: SpriteAtlas | null = null;

    @property({
        type: [SpriteFrame],
        tooltip: "Individual sprite frames (fallback nếu không dùng atlas)"
    })
    tileSprites: SpriteFrame[] = [];

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

    // ========================================================================
    // PRIVATE FIELDS
    // ========================================================================

    private mapData: string[][] = [];
    private mapWidth: number = 0;
    private mapHeight: number = 0;

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

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

            // Load and render map
            this.loadAndRenderMap();

            const endTime = performance.now();
            this.debug(`Map initialized in ${(endTime - startTime).toFixed(2)}ms`);
        } catch (err) {
            error('[SmartMapGenerator2] Fatal error in start():', err);
            this.enabled = false;
        }
    }

    // ========================================================================
    // VALIDATION
    // ========================================================================

    private validateSetup(): boolean {
        // Check map container
        if (!this.mapContainer) {
            error('[SmartMapGenerator2] Map container is not assigned!');
            return false;
        }

        // Check JSON asset
        if (!this.mapLayoutJson) {
            error('[SmartMapGenerator2] Map layout JSON is not assigned!');
            return false;
        }

        // Check cell prefab
        if (!this.cellPrefab) {
            error('[SmartMapGenerator2] Cell prefab is not assigned!');
            return false;
        }

        // Check sprite atlas or sprite array
        if (!this.tileAtlas && this.tileSprites.length === 0) {
            error('[SmartMapGenerator2] No tile atlas or sprites assigned!');
            return false;
        }

        // Check tile size
        if (this.tileSize < CONFIG.MIN_TILE_SIZE || this.tileSize > CONFIG.MAX_TILE_SIZE) {
            warn(`[SmartMapGenerator2] Tile size ${this.tileSize} is out of range. Adjusting to ${CONFIG.DEFAULT_TILE_SIZE}`);
            this.tileSize = CONFIG.DEFAULT_TILE_SIZE;
        }

        return true;
    }

    private validateMapData(data: any): data is MapData {
        // Check if data exists
        if (!data) {
            error('[SmartMapGenerator2] Map data is null or undefined');
            return false;
        }

        // Check if data.data exists and is array
        if (!Array.isArray(data.data)) {
            error('[SmartMapGenerator2] Map data.data is not an array');
            return false;
        }

        // Check if map is empty
        if (data.data.length === 0) {
            error('[SmartMapGenerator2] Map data is empty');
            return false;
        }

        // Check minimum size
        if (data.data.length < CONFIG.MIN_MAP_HEIGHT) {
            error(`[SmartMapGenerator2] Map height ${data.data.length} is less than minimum ${CONFIG.MIN_MAP_HEIGHT}`);
            return false;
        }

        // Check maximum size
        if (data.data.length > CONFIG.MAX_MAP_HEIGHT) {
            error(`[SmartMapGenerator2] Map height ${data.data.length} exceeds maximum ${CONFIG.MAX_MAP_HEIGHT}`);
            return false;
        }

        // Validate each row
        const firstRowLength = data.data[0].length;

        if (firstRowLength < CONFIG.MIN_MAP_WIDTH) {
            error(`[SmartMapGenerator2] Map width ${firstRowLength} is less than minimum ${CONFIG.MIN_MAP_WIDTH}`);
            return false;
        }

        if (firstRowLength > CONFIG.MAX_MAP_WIDTH) {
            error(`[SmartMapGenerator2] Map width ${firstRowLength} exceeds maximum ${CONFIG.MAX_MAP_WIDTH}`);
            return false;
        }

        for (let i = 0; i < data.data.length; i++) {
            const row = data.data[i];

            // Check if row is array
            if (!Array.isArray(row)) {
                error(`[SmartMapGenerator2] Row ${i} is not an array`);
                return false;
            }

            // Check if all rows have same length
            if (row.length !== firstRowLength) {
                error(`[SmartMapGenerator2] Row ${i} has inconsistent length. Expected ${firstRowLength}, got ${row.length}`);
                return false;
            }

            // Validate each cell
            for (let j = 0; j < row.length; j++) {
                const cell = row[j];

                // Check if cell is string
                if (typeof cell !== 'string') {
                    error(`[SmartMapGenerator2] Cell [${i}][${j}] is not a string. Got ${typeof cell}`);
                    return false;
                }

                // In context-aware mode, only allow '0' and '1'
                if (this.useContextAwareDetection) {
                    if (cell !== TileType.EMPTY && cell !== TileType.WALL) {
                        error(`[SmartMapGenerator2] Cell [${i}][${j}] has invalid value '${cell}' in context-aware mode. Only '0' and '1' are allowed.`);
                        return false;
                    }
                }
            }
        }

        this.debug(`Map data validated: ${data.data.length}x${firstRowLength}`);
        return true;
    }

    // ========================================================================
    // MAP LOADING
    // ========================================================================

    private loadAndRenderMap(): void {
        try {
            // Parse JSON
            const jsonData = this.mapLayoutJson!.json;

            // Validate map data
            if (!this.validateMapData(jsonData)) {
                error('[SmartMapGenerator2] Map validation failed');
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
            error('[SmartMapGenerator2] Error loading map:', err);
        }
    }

    // ========================================================================
    // SPRITE LOADING
    // ========================================================================

    private getSpriteFrame(spriteName: string): SpriteFrame | null {
        if (!spriteName) {
            warn('[SmartMapGenerator2] Sprite name is empty');
            return null;
        }

        // Try to get from atlas first
        if (this.tileAtlas) {
            const spriteFrame = this.tileAtlas.getSpriteFrame(spriteName);
            if (spriteFrame) {
                return spriteFrame;
            }
            this.debug(`Sprite '${spriteName}' not found in atlas, trying fallback...`);
        }

        // Fallback: Try individual sprites array
        if (this.tileSprites.length > 0) {
            // Match by sprite frame name
            const found = this.tileSprites.find(sf => sf && sf.name === spriteName);
            if (found) {
                this.debug(`Sprite '${spriteName}' loaded from sprites array`);
                return found;
            }
        }

        warn(`[SmartMapGenerator2] Sprite '${spriteName}' not found anywhere!`);
        return null;
    }

    private getSpriteConfig(tileType: string): SpriteConfig | null {
        const config = TILE_SPRITE_MAP[tileType];
        if (!config) {
            warn(`[SmartMapGenerator2] No sprite mapping for tile type '${tileType}'`);
            return null;
        }
        return config;
    }

    // ========================================================================
    // NEIGHBOR DETECTION (from GenTest.ts)
    // ========================================================================

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

    private isWallAt(x: number, y: number): boolean {
        if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
            return false; // OOB = not a wall for inner neighbor check
        }
        return this.mapData[y][x] === TileType.WALL;
    }

    // ========================================================================
    // TILE TYPE DETECTION (from GenTest.ts)
    // ========================================================================

    private detectTileType(x: number, y: number, pattern: NeighborPattern): string {
        // Priority 1: Border detection (position-based)
        if (this.isBorderPosition(x, y)) {
            return this.detectBorderType(x, y, pattern);
        }

        // Priority 2: Obstacle detection (pattern-based)
        return this.detectObstacleType(pattern, x, y);
    }

    /**
     * Check if border tile has inner obstacle neighbor
     */
    private hasInnerObstacleNeighbor(x: number, y: number): {
        hasObstacle: boolean;
        direction: 'top' | 'bottom' | 'left' | 'right' | null
    } {
        const maxX = this.mapWidth - 1;
        const maxY = this.mapHeight - 1;

        // Check inner neighbor based on border position
        if (y === 0) {
            if (y + 1 < this.mapHeight && this.mapData[y + 1][x] === TileType.WALL) {
                return { hasObstacle: true, direction: 'bottom' };
            }
        }
        if (y === maxY) {
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

        // Four corners
        if (x === 0 && y === 0) return TileType.CORNER_BL;
        if (x === maxX && y === 0) return TileType.CORNER_BR;
        if (x === 0 && y === maxY) return TileType.CORNER_UL;
        if (x === maxX && y === maxY) return TileType.CORNER_UR;

        // Check if this border tile has obstacle neighbor pointing inward
        const obstacleCheck = this.hasInnerObstacleNeighbor(x, y);

        if (obstacleCheck.hasObstacle) {
            // This border connects to an obstacle
            if (y === 0) {
                return TileType.START_B;
            }
            if (y === maxY) {
                return TileType.START_U;
            }
            if (x === 0) {
                // Left border with obstacle to the right
                return TileType.START_L;
            }
            if (x === maxX) {
                // Right border with obstacle to the left
                return TileType.START_R;
            }
        }

        // Regular border without obstacle neighbor
        if (y === 0) return TileType.BORDER_B;
        if (y === maxY) return TileType.BORDER_U;
        if (x === 0) return TileType.BORDER_L;
        if (x === maxX) return TileType.BORDER_R;

        // Fallback (should never reach here)
        warn(`[SmartMapGenerator2] Unexpected border case at [${x}, ${y}]`);
        return TileType.OBSTACLE;
    }

    private detectObstacleType(pattern: NeighborPattern, x: number, y: number): string {
        const { top, bottom, left, right } = pattern;

        // Count obstacle neighbors
        const neighbors = [top, bottom, left, right].filter(Boolean).length;

        // Isolated obstacle (0 neighbors)
        if (neighbors === 0) {
            return TileType.TURN_OBSTACLE_MULTI;
        }

        // Check for turn obstacles (2, 3, or 4 neighbors)
        const turnCheck = this.detectTurnObstacle(pattern);
        if (turnCheck.isTurn) {
            // No rotation needed anymore - each pattern has specific sprite
            return turnCheck.tileType;
        }

        // Single neighbor = End tile
        if (neighbors === 1) {
            if (top) return TileType.END_U;
            if (bottom) return TileType.END_B;
            if (left) return TileType.END_R;
            if (right) return TileType.END_L;
        }

        // Two neighbors = Middle tile (straight lines only, turns handled above)
        if (neighbors === 2) {
            // Vertical (top-bottom)
            if (top && bottom) {
                return TileType.OBSTACLE;
            }

            // Horizontal (left-right)
            if (left && right) {
                if (x === 1) {
                    return TileType.OBSTACLE_L;
                }
                if (x === this.mapWidth - 2) {
                    return TileType.OBSTACLE_R;
                }
                return TileType.OBSTACLE_L;
            }

            // Other 2-neighbor patterns not matched by turns - use fallback
            return TileType.OBSTACLE;
        }

        // Three or more neighbors not matched - use fallback
        return TileType.OBSTACLE;
    }

    /**
     * Detect turn obstacles based on specific patterns from request.md
     * Analyzed patterns: exactly 7 cases mapped to specific tiles
     */
    private detectTurnObstacle(pattern: NeighborPattern): {
        isTurn: boolean;
        tileType: string;
        rotation: number;
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
                rotation: 0
            };
        }

        // Case 3: L-corners and T-junctions (2 or 3 neighbors)
        if (neighbors === 2 || neighbors === 3) {
            // Pattern 1: TOP + RIGHT (L-corner) → tile016
            if (top && right && !bottom && !left) {
                return { isTurn: true, tileType: TileType.TURN_TOP_RIGHT, rotation: 0 };
            }

            // Pattern 2: TOP + LEFT (L-corner) → tile023
            if (top && left && !bottom && !right) {
                return { isTurn: true, tileType: TileType.TURN_TOP_LEFT, rotation: 0 };
            }

            // Pattern 3: LEFT + RIGHT + BOTTOM (T-junction) → tile038
            if (left && right && bottom && !top) {
                return { isTurn: true, tileType: TileType.TURN_HORIZONTAL_BOTTOM, rotation: 0 };
            }

            // Pattern 4: RIGHT + BOTTOM (L-corner) → tile054
            if (right && bottom && !top && !left) {
                return { isTurn: true, tileType: TileType.TURN_BOTTOM_RIGHT, rotation: 0 };
            }

            // Pattern 5: RIGHT + TOP + BOTTOM (T-junction) → tile054
            if (right && top && bottom && !left) {
                return { isTurn: true, tileType: TileType.TURN_VERTICAL_RIGHT, rotation: 0 };
            }

            // Pattern 6: LEFT + BOTTOM (L-corner) → tile055
            if (left && bottom && !top && !right) {
                return { isTurn: true, tileType: TileType.TURN_BOTTOM_LEFT, rotation: 0 };
            }

            // Pattern 7: LEFT + TOP + BOTTOM (T-junction) → tile055
            if (left && top && bottom && !right) {
                return { isTurn: true, tileType: TileType.TURN_VERTICAL_LEFT, rotation: 0 };
            }

            // No specific pattern matched - return false to use fallback
            return { isTurn: false, tileType: '', rotation: 0 };
        }

        return { isTurn: false, tileType: '', rotation: 0 };
    }

    // ========================================================================
    // MAP RENDERING
    // ========================================================================

    private renderMap(): void {
        if (!this.mapContainer) {
            error('[SmartMapGenerator2] Map container is null');
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
        // Validate generic prefab exists
        if (!this.cellPrefab) {
            error('[SmartMapGenerator2] Cell prefab is not assigned!');
            return false;
        }

        try {
            // 1. Instantiate generic cell prefab
            const tileNode = instantiate(this.cellPrefab);

            // 2. Get sprite component
            const sprite = tileNode.getComponent(Sprite);
            if (!sprite) {
                error('[SmartMapGenerator2] Cell prefab missing Sprite component!');
                tileNode.destroy();
                return false;
            }

            // 3. Get sprite configuration from mapping
            const spriteConfig = this.getSpriteConfig(tileType);
            if (!spriteConfig) {
                warn(`[SmartMapGenerator2] No sprite config for tile type '${tileType}' at [${x}, ${y}]`);
                tileNode.destroy();
                return false;
            }

            // 4. Load sprite frame
            const spriteFrame = this.getSpriteFrame(spriteConfig.sprite);
            if (!spriteFrame) {
                warn(`[SmartMapGenerator2] Could not load sprite '${spriteConfig.sprite}' at [${x}, ${y}]`);
                tileNode.destroy();
                return false;
            }

            // 5. Assign sprite
            sprite.spriteFrame = spriteFrame;

            // 6. Set size
            const transform = tileNode.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(this.tileSize, this.tileSize);
            }

            // 7. Apply base rotation if specified (from TILE_SPRITE_MAP)
            if (spriteConfig.rotation !== 0) {
                tileNode.setRotationFromEuler(0, 0, -spriteConfig.rotation);
            }

            // 8. Calculate position
            const anchorX = this.mapWidth * this.tileSize / 2;
            const anchorY = this.mapHeight * this.tileSize / 2;
            const posX = x * this.tileSize - anchorX + this.tileSize / 2;
            const posY = -y * this.tileSize + anchorY - this.tileSize / 2;

            tileNode.setPosition(v3(posX, posY, 0));

            // 9. Add to container
            this.mapContainer!.addChild(tileNode);

            this.debug(`Spawned '${spriteConfig.sprite}' (${tileType}) at [${x},${y}]`);
            return true;

        } catch (err) {
            error(`[SmartMapGenerator2] Error spawning tile at [${x}, ${y}]:`, err);
            return false;
        }
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /**
     * Reload and re-render the map
     */
    public reloadMap(): void {
        this.debug('Reloading map...');
        this.loadAndRenderMap();
    }

    /**
     * Clear all tiles from the map
     */
    public clearMap(): void {
        if (this.mapContainer) {
            this.mapContainer.destroyAllChildren();
            this.debug('Map cleared');
        }
    }

    /**
     * Get map dimensions
     */
    public getMapSize(): { width: number; height: number } {
        return {
            width: this.mapWidth,
            height: this.mapHeight
        };
    }

    /**
     * Get tile value at position
     */
    public getTileAt(x: number, y: number): string | null {
        if (y < 0 || y >= this.mapHeight || x < 0 || x >= this.mapWidth) {
            return null;
        }
        return this.mapData[y][x];
    }

    // ========================================================================
    // DEBUG UTILITIES
    // ========================================================================

    private debug(...args: any[]): void {
        if (this.debugMode) {
            log('[SmartMapGenerator2]', ...args);
        }
    }
}
