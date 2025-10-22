# Pattern Analysis from request.md

## Pattern 1: Tile016
```
Row 0: [1][1][1][1][1][1]
Row 1: [1][0][1][0][0][1]
Row 2: [1][0][1][1][0][1]  ----> dùng Tile016
Row 3: [1][0][0][0][0][1]
Row 4: [1][1][1][1][1][1]
```
Tile được chỉ ở row 2. Các tile "1" trong row 2: [2,2] và [3,2]
- [2,2]: left=0, right=1, top=1, bottom=0 → TOP + RIGHT
- [3,2]: left=1, right=0, top=0, bottom=0 → LEFT only
→ **Tile016 là [2,2] với pattern: TOP + RIGHT (L-corner)**

## Pattern 2: Tile023
```
Row 0: [1][1][1][1][1][1]
Row 1: [1][0][0][1][0][1]
Row 2: [1][0][1][1][0][1]  ----> dùng Tile023
Row 3: [1][0][0][0][0][1]
Row 4: [1][1][1][1][1][1]
```
Tile được chỉ ở row 2. Các tile "1": [2,2] và [3,2]
- [2,2]: left=0, right=1, top=0, bottom=0 → RIGHT only
- [3,2]: left=1, right=0, top=1, bottom=0 → LEFT + TOP
→ **Tile023 là [3,2] với pattern: TOP + LEFT (L-corner)**

## Pattern 3: Tile038 (case 1)
```
Row 0: [1][1][1][1][1][1]
Row 1: [1][0][0][0][0][1]
Row 2: [1][0][1][1][1][1]  ----> dùng Tile038
Row 3: [1][0][0][1][0][1]
Row 4: [1][0][0][0][0][1]
Row 5: [1][1][1][1][1][1]
```
Row 2 có tiles: [2,2], [3,2], [4,2], [5,2]=border
Focus vào [2,2] và [3,2]:
- [2,2]: left=0, right=1, top=0, bottom=0 → RIGHT only
- [3,2]: left=1, right=1, top=0, bottom=1 → LEFT + RIGHT + BOTTOM
→ **Tile038 là [3,2] với pattern: LEFT + RIGHT + BOTTOM (T-junction)**

## Pattern 4: Tile038 (case 2)
```
Row 0: [1][1][1][1][1][1]
Row 1: [1][0][0][0][0][1]
Row 2: [1][1][1][1][0][1]  ----> dùng Tile038
Row 3: [1][0][1][0][0][1]
Row 4: [1][0][0][0][0][1]
Row 5: [1][1][1][1][1][1]
```
Row 2 có tiles: [1,2]=border, [2,2], [3,2]
- [2,2]: left=1(border), right=1, top=0, bottom=0 → LEFT + RIGHT
- [3,2]: left=1, right=0, top=0, bottom=1 → LEFT + BOTTOM
Nhưng check neighbors không border:
- [2,2]: left=inner?, right=1, top=0, bottom=0
- [3,2]: left=1, right=0, top=0, bottom=1 → LEFT + BOTTOM
Wait, need to check inner obstacles...
Actually [2,2] neighbors: left=1(border inner), right=1, top=0, bottom=1(có [2,3]=1)
→ [2,2]: LEFT + RIGHT + BOTTOM
→ **Tile038 case 2 cũng là LEFT + RIGHT + BOTTOM**

## Pattern 5: Tile054 (case 1)
```
Row 0: [1][1][1][1][1][1]
Row 1: [1][0][0][0][0][1]
Row 2: [1][0][0][1][1][1]  ----> dùng Tile054
Row 3: [1][0][0][1][0][1]
Row 4: [1][0][0][0][0][1]
Row 5: [1][1][1][1][1][1]
```
Row 2 có tiles: [3,2], [4,2], [5,2]=border
- [3,2]: left=0, right=1, top=0, bottom=1 → RIGHT + BOTTOM
→ **Tile054 là RIGHT + BOTTOM (L-corner)**

## Pattern 6: Tile055 (case 1)
```
Row 0: [1][1][1][1][1][1]
Row 1: [1][0][0][0][0][1]
Row 2: [1][1][1][0][0][1]  ----> dùng Tile055
Row 3: [1][0][1][0][0][1]
Row 4: [1][0][0][0][0][1]
Row 5: [1][1][1][1][1][1]
```
Row 2 có tiles: [1,2]=border, [2,2], [3,2]
- [2,2]: left=1(border), right=0, top=0, bottom=1 → LEFT + BOTTOM (nếu ko tính border thì chỉ BOTTOM)
- [3,2]: left=1, right=0, top=0, bottom=0 → LEFT only
Check [2,3]: có [2,3]=1
→ **Tile055 là [2,2] với LEFT + BOTTOM (L-corner)**

## Pattern 7: Tile055 (case 2)
```
Row 0: [1][1][1][1][1][1]
Row 1: [1][0][0][1][0][1]
Row 2: [1][0][1][1][0][1]  ----> dùng Tile055
Row 3: [1][0][0][1][0][1]
Row 4: [1][0][0][0][0][1]
Row 5: [1][1][1][1][1][1]
```
Row 2 có tiles: [2,2], [3,2]
- [2,2]: left=0, right=1, top=0, bottom=0 → RIGHT only
- [3,2]: left=1, right=0, top=1, bottom=1 → LEFT + TOP + BOTTOM
→ **Tile055 case 2 là [3,2] với LEFT + TOP + BOTTOM (T-junction)**

## Pattern 8: Tile054 (case 2)
```
Row 0: [1][1][1][1][1][1]
Row 1: [1][0][0][1][0][1]
Row 2: [1][0][0][1][1][1]  ----> dùng Tile054
Row 3: [1][0][0][1][0][1]
Row 4: [1][0][0][0][0][1]
Row 5: [1][1][1][1][1][1]
```
Row 2 có tiles: [3,2], [4,2], [5,2]=border
- [3,2]: left=0, right=1, top=1, bottom=1 → RIGHT + TOP + BOTTOM
→ **Tile054 case 2 là [3,2] với RIGHT + TOP + BOTTOM (T-junction)**

---

## SUMMARY

| Tile | Pattern | Neighbors | Type |
|------|---------|-----------|------|
| tile016 | TOP + RIGHT | 2 | L-corner |
| tile023 | TOP + LEFT | 2 | L-corner |
| tile038 | LEFT + RIGHT + BOTTOM | 3 | T-junction |
| tile054 (L) | RIGHT + BOTTOM | 2 | L-corner |
| tile054 (T) | RIGHT + TOP + BOTTOM | 3 | T-junction |
| tile055 (L) | LEFT + BOTTOM | 2 | L-corner |
| tile055 (T) | LEFT + TOP + BOTTOM | 3 | T-junction |
