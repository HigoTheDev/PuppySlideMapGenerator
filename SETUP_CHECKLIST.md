# ✅ Setup Checklist - Smart Map Generator

Use this checklist để verify setup hoàn chỉnh.

---

## 📋 Pre-Flight Checklist

### 1. Files Verification

- [ ] GenTest.ts (refactored) - 850 lines
- [ ] tsconfig.json - strict mode enabled
- [ ] README.md - complete guide
- [ ] CHANGELOG.md - version history
- [ ] TESTING_GUIDE.md - test procedures
- [ ] REFACTOR_SUMMARY.md - what changed

### 2. Test Files

- [ ] test_minimal.json (3x3)
- [ ] test_simple.json (5x5)
- [ ] test_obstacles.json (10x10)
- [ ] test_complex.json (15x15)
- [ ] mem.json (original)

---

## 🎮 Cocos Creator Setup

### Step 1: Open Project

- [ ] Open Cocos Creator 3.8.7
- [ ] Open PlayfulKittyMapGen project
- [ ] Wait for project to load completely

### Step 2: Check Scene

- [ ] Open `scene.scene`
- [ ] Verify MapContainer node exists
- [ ] Verify component is attached

### Step 3: Verify Component

- [ ] Component name shows "SmartMapGenerator" or "GenTest"
- [ ] All sections visible in Inspector:
  - [ ] Map Prefabs
  - [ ] Map Layout Json
  - [ ] Map Container
  - [ ] Tile Size
  - [ ] Use Context Aware Detection
  - [ ] Debug Mode

### Step 4: Assign Prefabs

**Map Prefabs section (16 prefabs):**

Borders & Corners (8):
- [ ] upper_left_corner
- [ ] upper_right_corner
- [ ] below_left_corner
- [ ] below_right_corner
- [ ] border_upper
- [ ] border_below
- [ ] border_left
- [ ] border_right

Obstacles (8):
- [ ] upper_start_obstacle
- [ ] below_start_obstacle
- [ ] obstacle
- [ ] side_obstacle
- [ ] upper_end_obstacle
- [ ] below_end_obstacle
- [ ] left_end_obstacle
- [ ] right_end_obstacle

### Step 5: Assign Assets

- [ ] Map Layout Json → test_simple.json (or any test file)
- [ ] Map Container → MapContainer node

### Step 6: Configure Settings

- [ ] Tile Size = 64 (or your preference)
- [ ] Use Context Aware Detection = true (recommended)
- [ ] Debug Mode = true (for testing)

---

## 🧪 First Test

### Test 1: Simple Map

1. Configuration:
   - [ ] Map Layout Json = test_simple.json
   - [ ] Debug Mode = true

2. Run Scene:
   - [ ] Click Play
   - [ ] Check Console for logs

3. Expected Console Output:
   ```
   [SmartMapGenerator] Component loaded
   [SmartMapGenerator] All prefabs validated successfully
   [SmartMapGenerator] Prefab map initialized with 16 entries
   [SmartMapGenerator] Map data validated: 5x5
   [SmartMapGenerator] Loaded map: 5x5, tile size: 64px
   [SmartMapGenerator] Map name: Simple 5x5 Map
   [SmartMapGenerator] Map rendered: X tiles in Xms (Y skipped)
   ```

4. Visual Check:
   - [ ] Map displays correctly
   - [ ] 4 corners visible
   - [ ] 4 borders visible
   - [ ] No gaps
   - [ ] Centered

### Test 2: Minimal Map

1. Change:
   - [ ] Map Layout Json = test_minimal.json

2. Run Scene:
   - [ ] Click Play

3. Expected:
   - [ ] 3x3 map displays
   - [ ] 4 corners correct
   - [ ] All tiles aligned

### Test 3: Complex Map

1. Change:
   - [ ] Map Layout Json = test_complex.json

2. Run Scene:
   - [ ] Click Play

3. Expected:
   - [ ] 15x15 map displays
   - [ ] No console errors
   - [ ] Performance < 50ms

---

## 🐛 Troubleshooting Tests

### Test Error Handling

1. **Test Missing Prefab:**
   - [ ] Remove one prefab (e.g., obstacle)
   - [ ] Run scene
   - [ ] Expected error: "Missing prefabs: obstacle"
   - [ ] Component should disable
   - [ ] Re-assign prefab

2. **Test Invalid JSON:**
   - [ ] Create invalid.json: `{"data": "invalid"}`
   - [ ] Assign to Map Layout Json
   - [ ] Run scene
   - [ ] Expected error: "Map data.data is not an array"
   - [ ] Switch back to valid JSON

3. **Test Missing Container:**
   - [ ] Set Map Container = null
   - [ ] Run scene
   - [ ] Expected error: "Map container is not assigned!"
   - [ ] Re-assign container

---

## ⚡ Performance Check

### Benchmark Tests

1. **Small Map (3x3):**
   - [ ] Load test_minimal.json
   - [ ] Check console: Should be < 5ms

2. **Medium Map (10x10):**
   - [ ] Load test_obstacles.json
   - [ ] Check console: Should be < 20ms

3. **Large Map (15x15):**
   - [ ] Load test_complex.json
   - [ ] Check console: Should be < 50ms

---

## 🔧 Advanced Configuration

### Test Context-Aware Mode

1. **Enable:**
   - [ ] Use Context Aware Detection = true
   - [ ] Load any test file
   - [ ] Verify auto-detection works

2. **Disable (Legacy Mode):**
   - [ ] Use Context Aware Detection = false
   - [ ] Need JSON with tile codes (cul, bu, etc.)
   - [ ] Verify manual codes work

### Test Debug Mode

1. **Enable:**
   - [ ] Debug Mode = true
   - [ ] Verbose console logs appear

2. **Disable:**
   - [ ] Debug Mode = false
   - [ ] Clean console (only errors)

---

## 📱 Build Test

### Development Build

1. **Web Build:**
   - [ ] Build Settings → Web Mobile
   - [ ] Build
   - [ ] Test in browser
   - [ ] No console errors
   - [ ] Map renders correctly

2. **Native Build (Optional):**
   - [ ] Build Settings → Native
   - [ ] Build
   - [ ] Test on device
   - [ ] Performance acceptable

---

## ✅ Production Readiness

### Before Production

- [ ] All prefabs assigned and working
- [ ] All test files work correctly
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Debug Mode = false
- [ ] Your actual map JSON works

### Production Checklist

- [ ] Debug Mode = false (important!)
- [ ] Use Context Aware Detection = true/false (your choice)
- [ ] Map Layout Json = your production map
- [ ] Tile Size = your desired size
- [ ] Build and test
- [ ] Performance check
- [ ] Memory check (no leaks)
- [ ] Visual check (all devices)

---

## 📚 Documentation Check

### Read These Files

- [ ] README.md - Complete usage guide
- [ ] CHANGELOG.md - Version history
- [ ] TESTING_GUIDE.md - Test procedures
- [ ] REFACTOR_SUMMARY.md - What changed

### Understand Key Concepts

- [ ] Context-aware detection
- [ ] Validation system
- [ ] Error handling
- [ ] Debug mode
- [ ] Public API methods

---

## 🎯 Final Verification

### Functional Tests

- [ ] Map loads correctly
- [ ] All tiles render
- [ ] No visual glitches
- [ ] No console errors
- [ ] Good performance

### Code Quality

- [ ] TypeScript strict mode enabled
- [ ] No type errors
- [ ] All validations working
- [ ] Error messages clear

### Documentation

- [ ] README is clear
- [ ] Examples work
- [ ] Test cases documented

---

## 🎉 Completion

When all checkboxes are checked:

✅ **Project is ready for development**  
✅ **Code is production-ready**  
✅ **Team can start using it**

---

## 📞 If Something Goes Wrong

### Common Issues

**Issue: Component not found**
- Solution: Restart Cocos Creator

**Issue: Prefabs not showing**
- Solution: Check assets/Prefab folder exists

**Issue: JSON not loading**
- Solution: Check JSON format is valid

**Issue: Map not centered**
- Solution: Check Map Container position

**Issue: Performance slow**
- Solution: Reduce map size or disable debug mode

### Get Help

1. Check console errors (debugMode = true)
2. Read TESTING_GUIDE.md
3. Check README.md troubleshooting section
4. Review example test files

---

## 📊 Success Criteria

### You're ready when:

✅ All checklist items completed  
✅ Test map displays correctly  
✅ No console errors  
✅ Performance acceptable  
✅ You understand the code  
✅ Documentation makes sense  

---

**Last Updated:** 2025-10-20  
**Version:** 2.0.0  

**Good luck! 🚀**
