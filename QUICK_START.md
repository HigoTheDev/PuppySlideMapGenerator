# ⚡ Quick Start Guide

Get up and running in 5 minutes!

---

## 🚀 3 Steps to Success

### Step 1: Open Project (30 seconds)

```
1. Open Cocos Creator 3.8.7
2. File → Open Project
3. Select: D:\gamedinhcao\COCOS\PlayfulKittyMapGen
4. Wait for project to load
```

### Step 2: Setup Component (2 minutes)

```
1. Open scene.scene
2. Find MapContainer node
3. In Inspector, find SmartMapGenerator component
4. Assign all 16 prefabs (drag from assets/Prefab):
   
   Borders & Corners:
   ✓ upper_left_corner
   ✓ upper_right_corner  
   ✓ below_left_corner
   ✓ below_right_corner
   ✓ border_upper
   ✓ border_below
   ✓ border_left
   ✓ border_right
   
   Obstacles:
   ✓ upper_start_obstacle
   ✓ below_start_obstacle
   ✓ obstacle
   ✓ side_obstacle
   ✓ upper_end_obstacle
   ✓ below_end_obstacle
   ✓ left_end_obstacle
   ✓ right_end_obstacle

5. Set Map Layout Json = test_simple.json
6. Set Map Container = MapContainer node
7. Check "Use Context Aware Detection" = true
8. Check "Debug Mode" = true
```

### Step 3: Test (30 seconds)

```
1. Click Play button
2. Check Console for:
   [SmartMapGenerator] Component loaded
   [SmartMapGenerator] All prefabs validated successfully
   [SmartMapGenerator] Map rendered: X tiles in Xms
3. Verify map displays correctly
```

---

## ✅ Success Checklist

After setup, you should see:

- ✅ 5x5 map displayed
- ✅ 4 corners visible
- ✅ 4 borders visible
- ✅ Empty space in middle
- ✅ No console errors
- ✅ Debug logs showing success

---

## 🎯 Your First Custom Map

### Create JSON File

```json
{
  "version": "1.0",
  "name": "My First Map",
  "data": [
    ["1", "1", "1", "1", "1"],
    ["1", "0", "0", "0", "1"],
    ["1", "0", "1", "0", "1"],
    ["1", "0", "0", "0", "1"],
    ["1", "1", "1", "1", "1"]
  ]
}
```

**Rules:**
- `"1"` = Wall
- `"0"` = Empty space
- First row/column/last row/column should be `"1"` (borders)

### Use Your Map

```
1. Save as my_map.json in assets/Scripts/
2. Restart Cocos Creator (to detect new file)
3. In Inspector: Map Layout Json = my_map.json
4. Click Play
5. Your map appears!
```

---

## 🐛 Troubleshooting

### Problem: Component not found

**Solution:** Restart Cocos Creator

### Problem: Prefabs not showing

**Solution:** Check assets/Prefab folder, refresh assets

### Problem: Map not displaying

**Solution:** 
1. Check console for errors
2. Verify all 16 prefabs assigned
3. Verify JSON is valid

### Problem: JSON file not appearing

**Solution:**
1. Save JSON in correct folder
2. Restart Cocos Creator
3. Refresh assets folder

---

## 📚 Learn More

- **Full Guide:** README.md
- **Testing:** TESTING_GUIDE.md  
- **Setup Details:** SETUP_CHECKLIST.md
- **What Changed:** REFACTOR_SUMMARY.md

---

## 💡 Pro Tips

1. **Use test files** - Start with test_simple.json
2. **Enable debug** - See what's happening
3. **Test incrementally** - Small maps first
4. **Read errors** - Console tells you what's wrong
5. **Check examples** - 4 test JSONs included

---

## 🎮 Ready to Build?

### Production Checklist

```
1. Disable Debug Mode (important!)
2. Test your map thoroughly
3. Build project
4. Test build
5. Ship it! 🚀
```

---

## 📞 Need Help?

1. Check console errors (debugMode = true)
2. Read README.md § Troubleshooting
3. Try test_simple.json first
4. Verify all prefabs assigned

---

**Time to First Map:** 5 minutes  
**Difficulty:** Easy  
**Fun Level:** 100%  

**Happy Mapping! 🗺️**
