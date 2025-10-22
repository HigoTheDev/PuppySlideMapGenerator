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
    OBSTACLE_V_START = 'ovs',
    OBSTACLE_V_END = 'ove',
    OBSTACLE_V_START_UPPER = 'ovsu',
    OBSTACLE_V_END_UPPER = 'oveu',
}

const CONFIG = {
    MIN_MAP_WIDTH: 3,
    MIN_MAP_HEIGHT: 3,
    MAX_MAP_WIDTH: 1000,
    MAX_MAP_HEIGHT: 1000,
    DEFAULT_TILE_SIZE: 64,
    MIN_TILE_SIZE: 8,
    MAX_TILE_SIZE: 512,
    BORDER_SPRITE_SCALE: 1.0,
} as const;


const BORDER_SPRITE_MAP: Record<string, { sprite: string; flipX: boolean; rotation: number }> = {
    [TileType.CORNER_UL]: { sprite: 'corner_border_bottom', flipX: true, rotation: 0 },
    [TileType.CORNER_UR]: { sprite: 'corner_border_bottom', flipX: false, rotation: 0 },
    [TileType.CORNER_BL]: { sprite: 'corner_border_top', flipX: true, rotation: 0 },
    [TileType.CORNER_BR]: { sprite: 'corner_border_top', flipX: false, rotation: 0 },
    [TileType.BORDER_U]: { sprite: 'straight_border_bottom', flipX: false, rotation: 0 },
    [TileType.BORDER_B]: { sprite: 'straight_border_top', flipX: false, rotation: 0 },
    [TileType.BORDER_L]: { sprite: 'straight_border_left', flipX: false, rotation: 0 },
    [TileType.BORDER_R]: { sprite: 'straight_border_left', flipX: true, rotation: 0 },
};

interface SpriteConfig {
    sprite: string;
    flipX: boolean;
    rotation: number;
}

interface ObstacleConfig {
    sprite1: SpriteConfig;
    sprite2: SpriteConfig;
    offset: { x: number; y: number };
    positionOffset?: number;
}

const OBSTACLE_SPRITE_MAP: Record<string, ObstacleConfig> = {
    [TileType.OBSTACLE_V_START]: {
        sprite1: { sprite: 'corner_border_top', flipX: true, rotation: 0 },
        sprite2: { sprite: 'corner_border_top', flipX: false, rotation: 0 },
        offset: { x: 0.25, y: 0 },
        positionOffset: -0.5
    },
    [TileType.OBSTACLE_V_END]: {
        sprite1: { sprite: 'corner_border_bottom', flipX: true, rotation: 0 },
        sprite2: { sprite: 'corner_border_bottom', flipX: false, rotation: 0 },
        offset: { x: 0.25, y: 0 },
        positionOffset: 0.5
    },
    [TileType.OBSTACLE_V_START_UPPER]: {
        sprite1: { sprite: 'corner_border_top', flipX: true, rotation: 0 },
        sprite2: { sprite: 'corner_border_top', flipX: false, rotation: 0 },
        offset: { x: 0.25, y: 0 },
        positionOffset: -0.5
    },
    [TileType.OBSTACLE_V_END_UPPER]: {
        sprite1: { sprite: 'corner_border_bottom', flipX: true, rotation: 0 },
        sprite2: { sprite: 'corner_border_bottom', flipX: false, rotation: 0 },
        offset: { x: 0.25, y: 0 },
        positionOffset: 0.5
    },
};

interface MapData {
    data: string[][];
    version?: string;
    name?: string;
    tileSize?: number;
}

@ccclass('SmartMapGenerator3')
export class SmartMapGenerator3 extends Component {
    // ========================================================================
    // PROPERTIES
    // ========================================================================

    @property({
        type: Prefab,
        tooltip: "Generic cell prefab (must have Sprite component)"
    })
    cellPrefab: Prefab | null = null;

    @property({
        type: SpriteAtlas,
        tooltip: "Atlas containing BorderLines sprites"
    })
    borderAtlas: SpriteAtlas | null = null;

    @property({
        type: [SpriteFrame],
        tooltip: "Individual border sprites (fallback if no atlas)"
    })
    borderSprites: SpriteFrame[] = [];

    @property({
        type: JsonAsset,
        tooltip: "Map layout JSON (format: {data: string[][]})"
    })
    mapLayoutJson: JsonAsset | null = null;

    @property({
        type: Node,
        tooltip: "Container node for all tiles"
    })
    mapContainer: Node | null = null;

    @property({
        tooltip: "Tile size in pixels",
        range: [CONFIG.MIN_TILE_SIZE, CONFIG.MAX_TILE_SIZE]
    })
    tileSize: number = CONFIG.DEFAULT_TILE_SIZE;

    @property({
        tooltip: "Enable context-aware tile detection",
        visible: true
    })
    useContextAwareDetection: boolean = true;

    @property({
        tooltip: "Enable debug logging",
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
        this.debug('GenTest3 component loaded');
    }

    start() {
        try {
            const startTime = performance.now();

            if (!this.validateSetup()) {
                this.enabled = false;
                return;
            }

            this.loadAndRenderMap();

            const endTime = performance.now();
            this.debug(`Map initialized in ${(endTime - startTime).toFixed(2)}ms`);
        } catch (err) {
            error('[GenTest3] Fatal error in start():', err);
            this.enabled = false;
        }
    }

    // ========================================================================
    // VALIDATION
    // ========================================================================

    private validateSetup(): boolean {
        if (!this.mapContainer) {
            error('[GenTest3] Map container not assigned!');
            return false;
        }

        if (!this.mapLayoutJson) {
            error('[GenTest3] Map layout JSON not assigned!');
            return false;
        }

        if (!this.cellPrefab) {
            error('[GenTest3] Cell prefab not assigned!');
            return false;
        }

        // Check if we have either atlas or sprite array
        if (!this.borderAtlas && this.borderSprites.length === 0) {
            error('[GenTest3] No border atlas or sprites assigned!');
            return false;
        }

        if (this.tileSize < CONFIG.MIN_TILE_SIZE || this.tileSize > CONFIG.MAX_TILE_SIZE) {
            warn(`[GenTest3] Tile size ${this.tileSize} out of range, adjusting to ${CONFIG.DEFAULT_TILE_SIZE}`);
            this.tileSize = CONFIG.DEFAULT_TILE_SIZE;
        }

        return true;
    }

    private validateMapData(data: any): data is MapData {
        if (!data || !Array.isArray(data.data)) {
            error('[GenTest3] Invalid map data structure');
            return false;
        }

        if (data.data.length === 0) {
            error('[GenTest3] Map data is empty');
            return false;
        }

        const height = data.data.length;
        const width = data.data[0].length;

        if (height < CONFIG.MIN_MAP_HEIGHT || height > CONFIG.MAX_MAP_HEIGHT) {
            error(`[GenTest3] Map height ${height} out of range`);
            return false;
        }

        if (width < CONFIG.MIN_MAP_WIDTH || width > CONFIG.MAX_MAP_WIDTH) {
            error(`[GenTes 1 khoảng t3] Map width ${width} out of range`);
            return false;
        }

        // Validate rows
        for (let i = 0; i < height; i++) {
            if (!Array.isArray(data.data[i]) || data.data[i].length !== width) {
                error(`[GenTest3] Row ${i} has inconsistent length`);
                return false;
            }

            for (let j = 0; j < width; j++) {
                const cell = data.data[i][j];
                if (typeof cell !== 'string') {
                    error(`[GenTest3] Cell [${i}][${j}] is not a string`);
                    return false;
                }
                if (this.useContextAwareDetection && cell !== '0' && cell !== '1') {
                    error(`[GenTest3] Cell [${i}][${j}] invalid value '${cell}' in context-aware mode`);
                    return false;
                }
            }
        }

        return true;
    }

    // ========================================================================
    // MAP LOADING
    // ========================================================================

    private loadAndRenderMap(): void {
        try {
            const jsonData = this.mapLayoutJson!.json;

            if (!this.validateMapData(jsonData)) {
                error('[GenTest3] Map validation failed');
                return;
            }

            this.mapData = jsonData.data;
            this.mapHeight = this.mapData.length;
            this.mapWidth = this.mapData[0].length;

            if (jsonData.tileSize && typeof jsonData.tileSize === 'number') {
                this.tileSize = jsonData.tileSize;
            }

            this.debug(`Loaded map: ${this.mapWidth}x${this.mapHeight}, tile size: ${this.tileSize}px`);

            this.renderMap();

        } catch (err) {
            error('[GenTest3] Error loading map:', err);
        }
    }

    // ========================================================================
    // SPRITE LOADING
    // ========================================================================

    private getSpriteFrame(spriteName: string): SpriteFrame | null {
        if (!spriteName) {
            warn('[GenTest3] Sprite name is empty');
            return null;
        }

        if (this.borderAtlas) {
            const spriteFrame = this.borderAtlas.getSpriteFrame(spriteName);
            if (spriteFrame) {
                return spriteFrame;
            }
            this.debug(`Sprite '${spriteName}' not found in atlas, trying fallback...`);
        }

        if (this.borderSprites.length > 0) {
            const found = this.borderSprites.find(sf => sf && sf.name === spriteName);
            if (found) {
                this.debug(`Sprite '${spriteName}' loaded from sprites array`);
                return found;
            }
        }

        warn(`[GenTest3] Sprite '${spriteName}' not found anywhere!`);
        return null;
    }

    // ========================================================================
    // TILE DETECTION
    // ========================================================================

    private isBorderPosition(x: number, y: number): boolean {
        return x === 0 || x === this.mapWidth - 1 || y === 0 || y === this.mapHeight - 1;
    }

    private detectBorderType(x: number, y: number): string | null {
        const maxX = this.mapWidth - 1;
        const maxY = this.mapHeight - 1;

        if (x === 0 && y === 0) return TileType.CORNER_BL;
        if (x === maxX && y === 0) return TileType.CORNER_BR;
        if (x === 0 && y === maxY) return TileType.CORNER_UL;
        if (x === maxX && y === maxY) return TileType.CORNER_UR;

        if (y === 0) return TileType.BORDER_B;
        if (y === maxY) return TileType.BORDER_U;
        if (x === 0) return TileType.BORDER_L;
        if (x === maxX) return TileType.BORDER_R;

        return null;
    }

    private detectObstacleType(x: number, y: number): string | null {
        const hasAbove = y > 0 && this.mapData[y - 1][x] === TileType.WALL;
        const hasBelow = y < this.mapHeight - 1 && this.mapData[y + 1][x] === TileType.WALL;

        const isNearUpperBorder = y <= this.mapHeight / 2;

        if (!hasAbove && hasBelow) {
            return isNearUpperBorder ? TileType.OBSTACLE_V_START_UPPER : TileType.OBSTACLE_V_START;
        }
        
        if (hasAbove && !hasBelow) {
            return isNearUpperBorder ? TileType.OBSTACLE_V_END_UPPER : TileType.OBSTACLE_V_END;
        }

        return null;
    }

    // ========================================================================
    // MAP RENDERING
    // ========================================================================

    private renderMap(): void {
        if (!this.mapContainer) {
            error('[GenTest3] Map container is null');
            return;
        }

        this.mapContainer.destroyAllChildren();

        const startTime = performance.now();
        let tilesRendered = 0;
        let tilesSkipped = 0;

        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tileValue = this.mapData[y][x];

                if (tileValue === TileType.EMPTY) {
                    tilesSkipped++;
                    continue;
                }

                let tileType: string | null = null;

                if (this.useContextAwareDetection && tileValue === TileType.WALL) {
                    if (this.isBorderPosition(x, y)) {
                        tileType = this.detectBorderType(x, y);
                    } else {
                        tileType = this.detectObstacleType(x, y);
                    }
                } else {
                    tileType = tileValue;
                }

                if (tileType) {
                    const isObstacle = tileType === TileType.OBSTACLE_V_START || 
                                      tileType === TileType.OBSTACLE_V_END ||
                                      tileType === TileType.OBSTACLE_V_START_UPPER ||
                                      tileType === TileType.OBSTACLE_V_END_UPPER;
                    
                    if (isObstacle) {
                        if (this.spawnCurvedObstacle(tileType, x, y)) {
                            tilesRendered++;
                        } else {
                            tilesSkipped++;
                        }
                    } else {
                        if (this.spawnTile(tileType, x, y)) {
                            tilesRendered++;
                        } else {
                            tilesSkipped++;
                        }
                    }
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
        if (!this.cellPrefab) {
            error('[GenTest3] Cell prefab is null!');
            return false;
        }

        try {
            const tileNode = instantiate(this.cellPrefab);

            const sprite = tileNode.getComponent(Sprite);
            if (!sprite) {
                error('[GenTest3] Cell prefab missing Sprite component!');
                tileNode.destroy();
                return false;
            }

            const spriteConfig = BORDER_SPRITE_MAP[tileType];
            if (!spriteConfig) {
                warn(`[GenTest3] No sprite mapping for tile type '${tileType}'`);
                tileNode.destroy();
                return false;
            }

            const spriteFrame = this.getSpriteFrame(spriteConfig.sprite);
            if (!spriteFrame) {
                warn(`[GenTest3] Could not load sprite '${spriteConfig.sprite}' at [${x}, ${y}]`);
                tileNode.destroy();
                return false;
            }

            sprite.spriteFrame = spriteFrame;

            const transform = tileNode.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(this.tileSize, this.tileSize);
            }

            const scaleX = spriteConfig.flipX ? -CONFIG.BORDER_SPRITE_SCALE : CONFIG.BORDER_SPRITE_SCALE;
            const scaleY = CONFIG.BORDER_SPRITE_SCALE;
            tileNode.setScale(scaleX, scaleY, 1);

            if (spriteConfig.rotation !== 0) {
                tileNode.angle = spriteConfig.rotation;
            }

            const anchorX = this.mapWidth * this.tileSize / 2;
            const anchorY = this.mapHeight * this.tileSize / 2;
            const posX = x * this.tileSize - anchorX + this.tileSize / 2;
            const posY = -y * this.tileSize + anchorY - this.tileSize / 2;

            tileNode.setPosition(v3(posX, posY, 0));

            this.mapContainer!.addChild(tileNode);

            this.debug(`Spawned '${spriteConfig.sprite}' (${tileType}) at [${x},${y}] scale=${scaleX},${scaleY}`);
            
            return true;

        } catch (err) {
            error(`[GenTest3] Error spawning tile at [${x}, ${y}]:`, err);
            return false;
        }
    }

    private spawnCurvedObstacle(obstacleType: string, x: number, y: number): boolean {
        if (!this.cellPrefab) {
            error('[GenTest3] Cell prefab is null!');
            return false;
        }

        const config = OBSTACLE_SPRITE_MAP[obstacleType];
        if (!config) {
            warn(`[GenTest3] No obstacle mapping for type '${obstacleType}'`);
            return false;
        }

        try {
            const obstacleContainer = new Node(`obstacle_${x}_${y}`);

            const node1 = this.createSpriteNode(
                config.sprite1,
                -config.offset.x,
                -config.offset.y
            );

            const node2 = this.createSpriteNode(
                config.sprite2,
                config.offset.x,
                config.offset.y
            );

            if (!node1 || !node2) {
                if (node1) node1.destroy();
                if (node2) node2.destroy();
                obstacleContainer.destroy();
                return false;
            }

            obstacleContainer.addChild(node1);
            obstacleContainer.addChild(node2);

            const containerPosX = x * this.tileSize - (this.mapWidth * this.tileSize / 2) + this.tileSize / 2;
            let containerPosY = -y * this.tileSize + (this.mapHeight * this.tileSize / 2) - this.tileSize / 2;
            
            if (config.positionOffset) {
                containerPosY += config.positionOffset * this.tileSize;
            }
            
            obstacleContainer.setPosition(v3(containerPosX, containerPosY, 0));

            this.mapContainer!.addChild(obstacleContainer);

            this.debug(`Spawned curved obstacle '${obstacleType}' at [${x},${y}]`);
            return true;

        } catch (err) {
            error(`[GenTest3] Error spawning curved obstacle at [${x}, ${y}]:`, err);
            return false;
        }
    }

    private createSpriteNode(config: SpriteConfig, offsetX: number, offsetY: number): Node | null {
        if (!this.cellPrefab) return null;

        try {
            const node = instantiate(this.cellPrefab);
            
            const sprite = node.getComponent(Sprite);
            if (!sprite) {
                error('[GenTest3] Cell prefab missing Sprite component!');
                node.destroy();
                return null;
            }

            const spriteFrame = this.getSpriteFrame(config.sprite);
            if (!spriteFrame) {
                warn(`[GenTest3] Could not load sprite '${config.sprite}'`);
                node.destroy();
                return null;
            }

            sprite.spriteFrame = spriteFrame;

            const transform = node.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(this.tileSize, this.tileSize);
            }

            const scaleX = config.flipX ? -CONFIG.BORDER_SPRITE_SCALE : CONFIG.BORDER_SPRITE_SCALE;
            const scaleY = CONFIG.BORDER_SPRITE_SCALE;
            node.setScale(scaleX, scaleY, 1);

            if (config.rotation !== 0) {
                node.angle = config.rotation;
            }

            const posX = offsetX * this.tileSize;
            const posY = -offsetY * this.tileSize;
            node.setPosition(v3(posX, posY, 0));

            return node;

        } catch (err) {
            error('[GenTest3] Error creating sprite node:', err);
            return null;
        }
    }

    // ========================================================================
    // UTILITY
    // ========================================================================

    private debug(message: string): void {
        if (this.debugMode) {
            log(`[GenTest3] ${message}`);
        }
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    public reloadMap(): void {
        this.debug('Reloading map...');
        this.loadAndRenderMap();
    }
}
