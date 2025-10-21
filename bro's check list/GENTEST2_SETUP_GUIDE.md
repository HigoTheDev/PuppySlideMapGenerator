# 🚀 GenTest2 Setup Guide - Dynamic Sprite System

**Version:** 1.0  
**Date:** 2025-10-21  
**Component:** SmartMapGenerator2

---

## 📋 OVERVIEW

GenTest2 là phiên bản cải tiến của GenTest với **Dynamic Sprite System**:
- ✅ Chỉ cần **1 prefab** duy nhất (thay vì 16-20 prefabs)
- ✅ Load sprite dynamically từ **SpriteAtlas**
- ✅ Tự động rotation dựa trên **TILEINFO mapping**
- ✅ Giữ nguyên logic detection từ GenTest.ts
- ✅ Giữ nguyên logic xoay của turn_obstacle_1_direct

---

## 🎯 YÊU CẦU TRƯỚC KHI CÀI ĐẶT

### 1. Sprites cần chuẩn bị
Đảm bảo bạn có các sprite files sau trong project:

**Từ TILEINFO:**
- `tile028.png` - Used for corners
- `tile038.png` - Used for start obstacles
- `tile040.png` - Used for corners
- `tile041.png` - Used for borders
- `tile058.png` - Used for turn_obstacle_multi_direct
- `tile062.png` - Used for border_right
- `tile063.png` - Used for border_left & turn_obstacle_1_direct
- `path_vertical.png` - Used for obstacles
- `below_end_obstacle.png` - Used for end obstacles

**Location:** `assets/Resouces/Grids/` hoặc `assets/Resouces/map_tiles/`

### 2. Files cần có
- ✅ `GenTest2.ts` (script mới)
- ✅ `TILEINFO` (file mapping)
- ✅ Map JSON file (e.g., `mem.json`, `test_simple.json`)

---

## 🛠️ CÀI ĐẶT TRONG COCOS CREATOR

### STEP 1: Tạo Generic Cell Prefab

#### 1.1. Tạo Node mới trong Hierarchy
1. Click chuột phải trong **Hierarchy**
2. Chọn **Create → Create Empty Node**
3. Đổi tên thành **`CellPrefab`**

#### 1.2. Add Sprite Component
1. Select **CellPrefab** node
2. Trong **Inspector**, click **Add Component**
3. Chọn **2D → Sprite**
4. Configure Sprite component:
   - **Type:** Simple
   - **SpriteFrame:** Leave empty (null)
   - **Size Mode:** Custom
   - **Trim:** Uncheck (false)

#### 1.3. Set UITransform
1. Vẫn trong **Inspector** của CellPrefab
2. Tìm **UITransform** component
3. Set:
   - **Content Size:** Width = 64, Height = 64
   - **Anchor:** X = 0.5, Y = 0.5

#### 1.4. Tạo Prefab
1. Drag **CellPrefab** node từ Hierarchy vào **assets/Prefab/** folder
2. Confirm tạo prefab mới
3. Xóa CellPrefab node khỏi scene (không cần nữa)

✅ **Result:** Bạn có file `CellPrefab.prefab` trong `assets/Prefab/`

---

### STEP 2: Tạo SpriteAtlas

#### 2.1. Tạo SpriteAtlas mới
1. Click chuột phải trong **Assets**
2. Chọn **Create → SpriteAtlas**
3. Đổi tên thành **`TileAtlas`**
4. Move vào `assets/Resouces/` folder

#### 2.2. Add Sprites vào Atlas
1. Select **TileAtlas** trong Assets
2. Trong **Inspector**, tìm section **Packable**
3. Drag & drop các sprite files vào list:
   - `tile028`
   - `tile038`
   - `tile040`
   - `tile041`
   - `tile058`
   - `tile062`
   - `tile063`
   - `path_vertical`
   - `below_end_obstacle`

**Important:** Sprite names trong atlas MUST match names trong TILE_SPRITE_MAP!

#### 2.3. Build Atlas (Optional)
1. Click button **Rebuild Atlas** trong Inspector
2. Verify các sprites hiển thị trong atlas preview

✅ **Result:** Atlas chứa tất cả sprites cần thiết

---

### STEP 3: Setup Component trong Scene

#### 3.1. Tạo Map Container Node
1. Trong **Hierarchy**, create empty node
2. Đổi tên thành **`MapContainer`**
3. Set position: (0, 0, 0)

#### 3.2. Tạo Map Generator Node
1. Create empty node, đặt tên **`MapGenerator2`**
2. Select node này
3. Click **Add Component**
4. Chọn **Custom Script → SmartMapGenerator2**

#### 3.3. Assign Properties trong Inspector

**Với node MapGenerator2 được select:**

##### Property 1: Cell Prefab
- Drag **`CellPrefab.prefab`** từ Assets vào field **Cell Prefab**

##### Property 2: Tile Atlas
- Drag **`TileAtlas`** từ Assets vào field **Tile Atlas**

##### Property 3: Tile Sprites (Optional)
- Leave empty (chỉ dùng nếu không có atlas)
- Hoặc drag individual sprites vào array làm fallback

##### Property 4: Map Layout Json
- Drag file JSON (e.g., **`mem.json`**) vào field **Map Layout Json**

##### Property 5: Map Container
- Drag **`MapContainer`** node từ Hierarchy vào field **Map Container**

##### Property 6: Tile Size
- Set = **64** (hoặc size phù hợp)

##### Property 7: Use Context Aware Detection
- Check ✅ (enable auto-detection)

##### Property 8: Debug Mode
- Check ✅ để xem logs (optional, recommended for setup)

---

### STEP 4: Verify Setup

#### 4.1. Check Inspector
Đảm bảo tất cả fields đã được assign:
```
SmartMapGenerator2
├─ Cell Prefab: ✅ CellPrefab (Prefab)
├─ Tile Atlas: ✅ TileAtlas (SpriteAtlas)
├─ Tile Sprites: [] (empty - OK)
├─ Map Layout Json: ✅ mem.json (JsonAsset)
├─ Map Container: ✅ MapContainer (Node)
├─ Tile Size: 64
├─ Use Context Aware Detection: ✅
└─ Debug Mode: ✅
```

#### 4.2. Check Console for Errors
- Mở **Console** panel
- Không có errors màu đỏ
- Có thể có warnings màu vàng (OK nếu sprites tìm thấy)

---

## ▶️ CHẠY THỬ

### 1. Play Scene
1. Click nút **Play** ▶️ trên toolbar
2. Đợi scene load

### 2. Check Console Output
Nếu Debug Mode enabled, bạn sẽ thấy:
```
[SmartMapGenerator2] Component loaded
[SmartMapGenerator2] Map data validated: 15x15
[SmartMapGenerator2] Loaded map: 15x15, tile size: 64px
[SmartMapGenerator2] Spawned 'tile040' (cul) at [0,0] with rotation 0°
[SmartMapGenerator2] Spawned 'tile041' (bu) at [1,0] with rotation 0°
...
[SmartMapGenerator2] Map rendered: 100 tiles in 45.23ms (125 skipped)
```

### 3. Visual Verification
- Map được render trong scene
- Tiles có sprite đúng
- Rotation đúng hướng
- Không có tiles bị thiếu hoặc lỗi

---

## 🐛 TROUBLESHOOTING

### Problem 1: "Cell prefab is not assigned!"
**Solution:**
- Kiểm tra field **Cell Prefab** đã assign chưa
- Re-assign prefab nếu cần

### Problem 2: "No tile atlas or sprites assigned!"
**Solution:**
- Assign **Tile Atlas** trong Inspector
- Hoặc add sprites vào **Tile Sprites** array

### Problem 3: "Sprite 'tileXXX' not found in atlas"
**Solution:**
- Kiểm tra sprite name trong atlas (phải match TILE_SPRITE_MAP)
- Rebuild atlas nếu cần
- Check sprite files exist trong project

### Problem 4: Tiles bị rotation sai
**Solution:**
- Check TILE_SPRITE_MAP rotation values trong GenTest2.ts
- So sánh với TILEINFO file
- Adjust rotation values nếu cần

### Problem 5: "Cell prefab missing Sprite component!"
**Solution:**
- Mở CellPrefab.prefab
- Verify có Sprite component
- Re-create prefab nếu cần

### Problem 6: Map không hiển thị gì cả
**Solution:**
- Check Map Container position = (0,0,0)
- Check Camera có thấy Map Container không
- Enable Debug Mode xem logs
- Verify JSON file có data hợp lệ

### Problem 7: Tiles bị overlap hoặc spacing sai
**Solution:**
- Check Tile Size = 64 (match sprite size)
- Check UITransform của CellPrefab
- Adjust tileSize property nếu cần

---

## 📊 SO SÁNH: GenTest vs GenTest2

| Aspect | GenTest (Old) | GenTest2 (New) |
|--------|--------------|----------------|
| **Prefabs** | 16-20 prefabs | 1 prefab |
| **Inspector Setup** | Assign 16-20 fields | Assign 2-3 fields |
| **Sprite System** | Baked in prefabs | Dynamic loading |
| **Rotation** | Manual + code | TILEINFO + code |
| **Theme Switching** | Edit 20 prefabs | Swap 1 atlas |
| **Add New Tile** | Create prefab | Add to TILE_SPRITE_MAP |
| **Maintainability** | ⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🔄 MIGRATION TỪ GenTest

### Option 1: Dùng cả 2 (Recommended)
- Keep GenTest.ts trong project (backup)
- Test GenTest2 với scene mới
- So sánh kết quả
- Chuyển sang GenTest2 khi confident

### Option 2: Thay thế hoàn toàn
1. Backup project
2. Remove GenTest component từ scene
3. Add SmartMapGenerator2 component
4. Setup theo guide này
5. Test thoroughly

---

## ✅ CHECKLIST HOÀN THÀNH

### Setup Checklist
- [ ] Tạo CellPrefab.prefab với Sprite component
- [ ] Tạo TileAtlas với tất cả sprites cần thiết
- [ ] Tạo MapContainer node trong scene
- [ ] Add SmartMapGenerator2 component
- [ ] Assign Cell Prefab
- [ ] Assign Tile Atlas
- [ ] Assign Map Layout Json
- [ ] Assign Map Container
- [ ] Set Tile Size = 64
- [ ] Enable Context Aware Detection
- [ ] Enable Debug Mode (optional)

### Testing Checklist
- [ ] Scene plays without errors
- [ ] Console shows successful render logs
- [ ] Map displays correctly
- [ ] All tile types render
- [ ] Rotations are correct
- [ ] No missing sprites
- [ ] Performance acceptable

---

## 🎓 TIPS & BEST PRACTICES

### 1. Sprite Naming
- Giữ tên sprites match với TILE_SPRITE_MAP
- Không rename sprites sau khi add vào atlas
- Use clear, descriptive names

### 2. Atlas Organization
- Group sprites theo category nếu có nhiều
- Rebuild atlas sau khi add/remove sprites
- Check atlas size (không quá lớn)

### 3. Debug Mode
- Always enable khi setup lần đầu
- Disable trong production để tăng performance
- Check logs để debug issues

### 4. JSON Maps
- Test với map nhỏ trước (3x3, 5x5)
- Verify JSON format đúng
- Use test files trong project

### 5. Performance
- Tiles được cached trong atlas → fast rendering
- Dynamic loading minimal overhead
- No performance difference vs old system

---

## 📞 SUPPORT

### Nếu gặp vấn đề:
1. Check Console logs (enable Debug Mode)
2. Verify tất cả setup steps
3. Test với test_simple.json trước
4. Compare với GenTest.ts kết quả
5. Check TILEINFO mapping

### Common Issues Document
- Sprite not found → Check atlas & names
- Rotation wrong → Check TILE_SPRITE_MAP values
- Prefab missing → Check Sprite component
- Map empty → Check JSON & Container

---

## 🎉 DONE!

Nếu tất cả steps hoàn thành, bạn có:
- ✅ Dynamic sprite system hoạt động
- ✅ 1 prefab thay vì 20
- ✅ Dễ dàng thêm tiles mới
- ✅ Dễ dàng đổi theme
- ✅ Maintainable architecture

**Enjoy your new Dynamic Sprite System! 🚀**

---

**Version:** 1.0  
**Last Updated:** 2025-10-21  
**Status:** ✅ Complete & Ready to Use
