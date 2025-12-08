# 🔄 Modular Migration Guide

## Overview

This guide helps you migrate from the monolithic `app.js` to the new modular architecture.

## Step-by-Step Migration

### Step 1: Load Core Modules First

Update `index.html` to load modules in order:

```html
<!-- Core modules (must load first) -->
<script src="modules/core/state-manager.js"></script>
<script src="modules/core/event-bus.js"></script>
<script src="modules/core/api-client.js"></script>
<script src="modules/core/app-manager.js"></script>

<!-- Utility modules -->
<script src="utils/helpers.js"></script>

<!-- Feature modules -->
<script src="modules/path/path-module.js"></script>
<script src="modules/exercise/exercise-module.js"></script>
<!-- Add other modules as created -->

<!-- Components -->
<script src="components/audio-player.js"></script>
<script src="components/matching-exercise.js"></script>

<!-- Entry point -->
<script src="app-modular.js"></script>
```

### Step 2: Migrate Each Tab/Module

For each module (Path, Study, Kana, etc.):

1. **Extract module-specific code** from `app.js`
2. **Create module file** in `modules/[module-name]/[module-name]-module.js`
3. **Follow the module template** structure
4. **Register module** in `app-modular.js`

### Step 3: Update Shared Functions

Move shared functions to:
- `utils/helpers.js` - Pure utility functions
- `modules/core/` - Core functionality
- Keep module-specific functions in their modules

### Step 4: Replace Direct Calls with Events

**Before:**
```javascript
// Direct function call
updateXPDisplay();
```

**After:**
```javascript
// Event-based
this.events.emit('xp-updated', { amount: 10 });
// Or state update
this.state.update('totalXP', newValue);
```

## Module Migration Checklist

For each module, ensure:

- [ ] Module class created
- [ ] `init()` method implemented
- [ ] `activate()` method implemented
- [ ] `deactivate()` method implemented
- [ ] `render()` method implemented
- [ ] Event listeners set up
- [ ] API calls use `this.api`
- [ ] State updates use `this.state`
- [ ] Events use `this.events`
- [ ] Module registered in `app-modular.js`
- [ ] Old code removed from `app.js`

## Common Patterns

### Accessing Other Modules

```javascript
// Get another module
const pathModule = this.appManager.getModule('path');
if (pathModule) {
    pathModule.someMethod();
}
```

### Emitting Events

```javascript
// Emit event
this.events.emit('word-studied', { wordId: '123', xp: 10 });

// Listen for event
this.events.on('word-studied', (data) => {
    console.log('Word studied:', data);
});
```

### State Management

```javascript
// Update state
this.state.update('totalXP', 100);

// Subscribe to state changes
this.state.subscribe('totalXP', (newValue, oldValue) => {
    console.log(`XP changed from ${oldValue} to ${newValue}`);
});
```

## Testing Each Module

1. **Isolate module** - Test module independently
2. **Check initialization** - Module initializes correctly
3. **Check activation** - Module activates when tab clicked
4. **Check deactivation** - Module cleans up when switching tabs
5. **Check events** - Events fire and are received correctly
6. **Check state** - State updates correctly

## Benefits

✅ **Easier debugging** - Know exactly which module has issues
✅ **Better organization** - Each feature in its own file
✅ **Independent testing** - Test modules separately
✅ **Easier maintenance** - Change one module without affecting others
✅ **Code reusability** - Modules can be reused or replaced
✅ **Team collaboration** - Multiple developers can work on different modules

## Next Steps

1. Complete core modules (StateManager, EventBus, APIClient, AppManager) ✅
2. Migrate Path module ✅
3. Migrate Exercise module ✅
4. Migrate remaining modules (Study, Kana, Flashcards, Quiz, Practice, Achievements, Quests, Stats)
5. Remove old `app.js` code
6. Update documentation

