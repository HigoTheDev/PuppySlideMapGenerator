# 🐛 Sprite Not Found - Debug Guide

## Vấn đề: "Sprite 'tileXXX' not found in atlas"

### ✅ CHECKLIST NHANH

1. **Check Atlas Preview**
   - Select TileAtlas trong Assets
   - Xem Preview panel → list tất cả sprites
   - Note EXACT names (case-sensitive!)

2. **Common Issues**
   - ❌ Sprite name có extension: `tile028.png` → Should be `tile028`
   - ❌ Case sensitive: `Tile028` ≠ `tile028`
   - ❌ Atlas chưa build: Cần Rebuild Atlas
   - ❌ Sprites chưa trong atlas: Drag vào Packable list

---

## 🔍 DEBUG METHOD 1: Thêm Debug Logging

### File: GenTest2.ts

Tìm method `getSpriteFrame()` (khoảng line 385) và thay thế bằng:

```typescript
private getSpriteFrame(spriteName: string): SpriteFrame | null {
    if (!spriteName) {
        warn('[SmartMapGenerator2] Sprite name is empty');
        return null;
    }

    // DEBUG: List all available sprites
    if (this.tileAtlas) {
        const allSprites = this.tileAtlas.getSpriteFrames();
        log('[DEBUG] ========================================');
        log('[DEBUG] Available sprites in TileAtlas:');
        for (const key in allSprites) {
            log(`[DEBUG]   - "${key}"`);
        }
        log('[DEBUG] Looking for: "' + spriteName + '"');
        log('[DEBUG] ========================================');
        
        const spriteFrame = this.tileAtlas.getSpriteFrame(spriteName);
        if (spriteFrame) {
            log(`[DEBUG] ✅ Found sprite: ${spriteName}`);
            return spriteFrame;
        } else {
            error(`[DEBUG] ❌ NOT FOUND: ${spriteName}`);
        }
    }

    // Fallback: Try individual sprites array
    if (this.tileSprites.length > 0) {
        const found = this.tileSprites.find(sf => sf && sf.name === spriteName);
        if (found) {
            log(`[DEBUG] ✅ Found sprite in array: ${spriteName}`);
            return found;
        }
    }

    error(`[SmartMapGenerator2] Sprite '${spriteName}' not found anywhere!`);
    return null;
}
```

**Result:** Console sẽ print tất cả sprite names có trong atlas!

---

## 🔍 DEBUG METHOD 2: Check Sprite Names Script

### Tạo file mới: `CheckAtlasSprites.ts`

```typescript
import { _decorator, Component, SpriteAtlas, log } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CheckAtlasSprites')
export class CheckAtlasSprites extends Component {
    @property(SpriteAtlas)
    atlas: SpriteAtlas | null = null;

    start() {
        if (!this.atlas) {
            log('No atlas assigned!');
            return;
        }

        log('=== ATLAS SPRITE LIST ===');
        const sprites = this.atlas.getSpriteFrames();
        let count = 0;
        for (const key in sprites) {
            count++;
            log(`${count}. "${key}"`);
        }
        log(`=== TOTAL: ${count} sprites ===`);
    }
}
```

**Usage:**
1. Add script to any node
2. Assign TileAtlas to `atlas` property
3. Play scene
4. Check console output

---

## 🔧 SOLUTIONS

### Solution 1: Sprite Names có Extension

**Problem:** Atlas sprite names là `tile028.png` nhưng code tìm `tile028`

**Fix 1: Rename trong Atlas (Recommended)**
- Trong Atlas, sprites không nên có extension
- Cocos tự động strip `.png` khi import
- Check preview để confirm

**Fix 2: Update TILE_SPRITE_MAP**
```typescript
// Nếu atlas names có .png extension:
const TILE_SPRITE_MAP: Record<string, { sprite: string; rotation: number }> = {
    [TileType.CORNER_UL]: { sprite: 'tile040.png', rotation: 0 }, // Add .png
    [TileType.CORNER_UR]: { sprite: 'tile028.png', rotation: 0 },
    // ... etc
};
```

---

### Solution 2: Atlas Chưa Build

**Fix:**
1. Select TileAtlas
2. Click "Rebuild Atlas" trong Inspector
3. Save project
4. Re-run scene

---

### Solution 3: Sprites Không Trong Atlas

**Check:**
1. Select TileAtlas
2. Inspector → Packable section
3. Verify tất cả 9 sprites có trong list:
   - tile028
   - tile038
   - tile040
   - tile041
   - tile058
   - tile062
   - tile063
   - path_vertical
   - below_end_obstacle

**Fix:** Drag missing sprites vào Packable list

---

### Solution 4: Fallback to Individual Sprites

**Temporary Fix:**
Nếu atlas không work, dùng individual sprites:

1. Trong Inspector của SmartMapGenerator2:
2. Expand "Tile Sprites" array
3. Set Size = 9
4. Drag 9 sprites vào array slots
5. Code sẽ tự động fallback

---

## 📝 COMMON MISTAKES

### Mistake 1: Texture vs SpriteFrame
```
❌ Wrong: Drag texture file vào atlas
✅ Correct: Drag SpriteFrame asset vào atlas
```

### Mistake 2: Sprite Asset Type
```
Check sprite import settings:
- Type: Sprite
- NOT: Texture, Raw Asset, etc.
```

### Mistake 3: Atlas Path
```
TileAtlas should be in Resources folder:
✅ assets/Resouces/TileAtlas
❌ assets/Prefab/TileAtlas (wrong location)
```

---

## 🧪 TEST SCRIPT

### Quick Test với 1 Sprite

Thêm vào `start()` method của GenTest2:

```typescript
start() {
    // TEST CODE - Remove after debugging
    if (this.tileAtlas) {
        log('[TEST] Testing sprite loading...');
        const testSprite = this.tileAtlas.getSpriteFrame('tile040');
        if (testSprite) {
            log('[TEST] ✅ Successfully loaded tile040!');
        } else {
            error('[TEST] ❌ Failed to load tile040');
            error('[TEST] Available sprites:');
            const allSprites = this.tileAtlas.getSpriteFrames();
            for (const key in allSprites) {
                log(`[TEST]   - ${key}`);
            }
        }
    }
    // END TEST CODE

    try {
        const startTime = performance.now();
        // ... rest of original code
    }
}
```

---

## 🎯 EXPECTED CONSOLE OUTPUT

### If Working Correctly:
```
[SmartMapGenerator2] Component loaded
[SmartMapGenerator2] Map data validated: 5x5
[SmartMapGenerator2] Loaded map: 5x5, tile size: 64px
[SmartMapGenerator2] Spawned 'tile040' (cul) at [0,0] with rotation 0°
[SmartMapGenerator2] Spawned 'tile041' (bu) at [1,0] with rotation 0°
...
```

### If NOT Working:
```
[SmartMapGenerator2] Component loaded
[SmartMapGenerator2] Map data validated: 5x5
[SmartMapGenerator2] Loaded map: 5x5, tile size: 64px
Sprite 'tile040' not found in atlas  ← ERROR HERE
No sprite config for tile type 'cul' at [0, 0]
...
```

---

## 💡 ALTERNATIVE: Use Sprite Assets Directly

Nếu atlas vẫn không work, tạm thời dùng resources.load:

```typescript
// Add to GenTest2.ts
import { resources } from 'cc';

private getSpriteFrame(spriteName: string): SpriteFrame | null {
    // Try atlas first
    if (this.tileAtlas) {
        const spriteFrame = this.tileAtlas.getSpriteFrame(spriteName);
        if (spriteFrame) return spriteFrame;
    }

    // NEW: Try loading from resources
    return new Promise<SpriteFrame | null>((resolve) => {
        resources.load(`Grids/${spriteName}/spriteFrame`, SpriteFrame, (err, sprite) => {
            if (err) {
                warn(`Could not load sprite from resources: ${spriteName}`);
                resolve(null);
            } else {
                resolve(sprite);
            }
        });
    });
}
```

**Note:** Này require async loading, cần refactor code

---

## 📞 SUPPORT CHECKLIST

Nếu vẫn lỗi, provide info:
- [ ] Console error messages (exact text)
- [ ] Atlas preview screenshot
- [ ] List of sprite names in atlas (from debug script)
- [ ] TILE_SPRITE_MAP values
- [ ] Cocos Creator version

---

**Status:** Debug guide created  
**Next:** Run debug script và report kết quả
