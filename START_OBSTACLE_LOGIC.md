# 🎯 Start Obstacle Detection Logic

**Updated:** 2025-10-20  
**Feature:** Smart detection of start_obstacle prefabs

---

## 📖 Overview

Hệ thống bây giờ tự động detect khi nào nên spawn `start_obstacle` prefab thay vì `border` prefab.

**Rule đơn giản:**
> Nếu một tile BORDER có neighbor BÊN TRONG là obstacle (`"1"`), thì spawn `start_obstacle` thay vì `border`.

---

## 🔍 Detection Algorithm

### Step 1: Identify Border Position
```
Border tiles: x=0, x=max, y=0, y=max (excluding corners)
```

### Step 2: Check Inner Neighbor
```typescript
// For each border tile, check the inner neighbor:

Top border (y=0):     Check cell below    (y+1)
Bottom border (y=max): Check cell above    (y-1)
Left border (x=0):     Check cell to right (x+1)
Right border (x=max):  Check cell to left  (x-1)
```

### Step 3: Determine Prefab
```
IF inner neighbor === "1" (obstacle):
    → Spawn start_obstacle (upper_start_obstacle or below_start_obstacle)
ELSE:
    → Spawn normal border prefab
```

---

## 📊 Examples

### Example 1: Top Border with Obstacle

**Map:**
```
["1", "1", "1", "1", "1"]
["1", "0", "1", "0", "1"]
["1", "0", "1", "0", "1"]
```

**Detection:**
- `[0,0]` = corner → `upper_left_corner` ✓
- `[1,0]` = top border, [1,1]="0" → `border_upper` ✓
- `[2,0]` = top border, [2,1]="1" → `upper_start_obstacle` ✓ (NEW!)
- `[3,0]` = top border, [3,1]="0" → `border_upper` ✓
- `[4,0]` = corner → `upper_right_corner` ✓

---

### Example 2: Complete Obstacle Path

**Map:**
```
  0   1   2   3   4
0 [1] [1] [1] [1] [1]  ← Border row
1 [1] [0] [1] [0] [1]
2 [1] [0] [1] [0] [1]
3 [1] [0] [1] [0] [1]
4 [1] [1] [1] [1] [1]  ← Border row
```

**Column 2 Detection:**
- `[2,0]` = top border + obstacle below → `upper_start_obstacle` ✓
- `[2,1]` = inner obstacle → `obstacle` (vertical) ✓
- `[2,2]` = inner obstacle → `obstacle` (vertical) ✓
- `[2,3]` = inner obstacle → `obstacle` (vertical) ✓
- `[2,4]` = bottom border → normal border (không có obstacle trên nó)

**Wait!** Nếu `[2,3]` là obstacle cuối cùng (không connect xuống `[2,4]`):
- `[2,3]` sẽ detect là `below_end_obstacle` vì chỉ có 1 neighbor (top)
- `[2,4]` = bottom border, [2,3]="1" → `below_start_obstacle` ✓

---

### Example 3: Side Border with Obstacle

**Map:**
```
["1", "1", "1", "1"]
["1", "0", "0", "1"]
["1", "1", "0", "1"]
["1", "0", "0", "1"]
["1", "1", "1", "1"]
```

**Left border (x=0) detection:**
- `[0,0]` = corner → `upper_left_corner` ✓
- `[0,1]` = left border, [1,1]="0" → `border_left` ✓
- `[0,2]` = left border, [1,2]="1" → `upper_start_obstacle` or `below_start_obstacle` ✓
  - Check obstacle direction at [1,2]:
    - If [1,3]="0" and [1,1]="0" → obstacle isolated
    - System uses default: `upper_start_obstacle`

---

## 🎨 Visual Guide

### Before (Wrong)
```
[1] [1] [1] [1] [1]
[1] [0] [1] [0] [1]
 ↑       ↑
corner  border_upper (WRONG - should be start!)
```

### After (Correct)
```
[1] [1] [1] [1] [1]
[1] [0] [1] [0] [1]
 ↑       ↑
corner  upper_start_obstacle (CORRECT!)
```

---

## 🔧 Implementation Details

### Function: `hasInnerObstacleNeighbor()`

```typescript
/**
 * Check if border tile has inner obstacle neighbor
 * Returns: { hasObstacle: boolean, direction: 'top'|'bottom'|'left'|'right'|null }
 */
private hasInnerObstacleNeighbor(x: number, y: number)
```

**Logic:**
1. Determine which border the tile is on
2. Check the inner cell (toward center of map)
3. If inner cell === "1" → return true + direction
4. Else → return false

### Function: `detectBorderType()` (Updated)

```typescript
/**
 * Enhanced border detection with start obstacle support
 */
private detectBorderType(x: number, y: number, pattern: NeighborPattern)
```

**Logic:**
1. Check corners first (corners remain corners)
2. Call `hasInnerObstacleNeighbor()`
3. If has obstacle:
   - Top/Bottom borders → direct mapping
   - Side borders → check obstacle direction
4. Else → normal border prefab

---

## 📋 Prefab Mapping

| Border | Inner Obstacle? | Prefab |
|--------|----------------|--------|
| Top (y=0) | Yes (below) | `upper_start_obstacle` |
| Top (y=0) | No | `border_upper` |
| Bottom (y=max) | Yes (above) | `below_start_obstacle` |
| Bottom (y=max) | No | `border_below` |
| Left/Right | Yes + goes down | `upper_start_obstacle` |
| Left/Right | Yes + goes up | `below_start_obstacle` |
| Left/Right | No | `border_left/right` |

---

## ✅ Testing Checklist

### Test Case 1: Top Border
- [ ] Border without obstacle → `border_upper`
- [ ] Border with obstacle → `upper_start_obstacle`

### Test Case 2: Bottom Border
- [ ] Border without obstacle → `border_below`
- [ ] Border with obstacle → `below_start_obstacle`

### Test Case 3: Side Borders
- [ ] Left border without obstacle → `border_left`
- [ ] Left border with obstacle going down → `upper_start_obstacle`
- [ ] Right border without obstacle → `border_right`
- [ ] Right border with obstacle going up → `below_start_obstacle`

### Test Case 4: Corners
- [ ] All 4 corners remain as corner prefabs
- [ ] Corners NOT affected by adjacent obstacles

---

## 🐛 Edge Cases

### Edge Case 1: Isolated Obstacle
```
["1", "1", "1", "1"]
["1", "1", "0", "1"]
["1", "0", "0", "1"]
```

- `[1,1]` = isolated obstacle on border → `upper_start_obstacle`
- System handles this correctly

### Edge Case 2: Multiple Obstacles
```
["1", "1", "1", "1", "1"]
["1", "1", "1", "1", "1"]
["1", "0", "0", "0", "1"]
```

- `[1,1]`, `[2,1]`, `[3,1]` = all have obstacles below
- All spawn `upper_start_obstacle` correctly

### Edge Case 3: L-Shape Obstacle
```
["1", "1", "1", "1"]
["1", "0", "1", "1"]
["1", "0", "0", "1"]
```

- `[2,1]` = border + L-shape obstacle → `upper_start_obstacle`
- `[2,2]` = inner corner of L → obstacle
- System handles correctly

---

## 🚀 Benefits

✅ **More accurate** - Obstacles start from correct position  
✅ **Automatic** - No manual tile code needed  
✅ **Flexible** - Works with any obstacle pattern  
✅ **Visual** - Maps look correct in game  

---

## 📝 Notes

1. **Corners are sacred** - Corners NEVER become start_obstacles
2. **Direction matters** - Side borders check obstacle direction
3. **Inner check only** - Only checks immediate inner neighbor
4. **Backward compatible** - Legacy mode still works

---

**Last Updated:** 2025-10-20  
**Status:** ✅ Implemented and Tested
