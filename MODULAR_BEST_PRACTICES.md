# 📚 Modular Architecture Best Practices

## 🎯 Core Principles

### 1. Single Responsibility
Each module should have one clear purpose:
- **Path Module** - Display and manage learning path
- **Exercise Module** - Handle exercise sessions
- **Study Module** - Browse and study words
- **Flashcards Module** - Flashcard functionality

### 2. Dependency Injection
Always inject dependencies through constructor:
```javascript
class MyModule {
    constructor(appManager) {
        this.state = appManager.getState();
        this.api = appManager.getAPI();
        this.events = appManager.getEventBus();
    }
}
```

### 3. Loose Coupling
Modules communicate via events, not direct calls:
```javascript
// ❌ Bad - Direct call
appManager.getModule('stats').updateStats();

// ✅ Good - Event-based
this.events.emit('stats-update', { data });
```

### 4. State Management
Use StateManager for shared data:
```javascript
// Update state
this.state.update('totalXP', 100);

// Subscribe to changes
this.state.subscribe('totalXP', (newValue) => {
    console.log('XP updated:', newValue);
});
```

## 📝 Module Template

```javascript
class MyModule {
    constructor(appManager) {
        // Inject dependencies
        this.appManager = appManager;
        this.state = appManager.getState();
        this.api = appManager.getAPI();
        this.events = appManager.getEventBus();
        this.initialized = false;
        
        // Module-specific state
        this.moduleData = null;
    }
    
    // Initialize module (called once)
    async init() {
        if (this.initialized) return;
        
        this.setupEventListeners();
        await this.loadData();
        this.initialized = true;
    }
    
    // Activate module (when tab clicked)
    async activate() {
        await this.init();
        this.render();
    }
    
    // Deactivate module (when switching tabs)
    deactivate() {
        // Clean up if needed
    }
    
    // Render module UI
    render() {
        // Update DOM
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Module-specific listeners
        // Listen to global events
        this.events.on('some-event', (data) => {
            this.handleEvent(data);
        });
    }
    
    // Load module data
    async loadData() {
        try {
            const data = await this.api.get('/endpoint');
            this.moduleData = data;
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
}
```

## 🔄 Communication Patterns

### Pattern 1: Event Bus
```javascript
// Module A emits
this.events.emit('word-studied', { wordId: '123', xp: 10 });

// Module B listens
this.events.on('word-studied', (data) => {
    this.updateStats(data);
});
```

### Pattern 2: State Updates
```javascript
// Module A updates state
this.state.update('totalXP', 100);

// Module B subscribes
this.state.subscribe('totalXP', (newValue) => {
    this.updateUI(newValue);
});
```

### Pattern 3: Direct Module Access (use sparingly)
```javascript
// Only when necessary
const otherModule = this.appManager.getModule('otherModule');
if (otherModule) {
    otherModule.someMethod();
}
```

## 🎨 UI Rendering

### Keep DOM manipulation in render()
```javascript
render() {
    const container = document.getElementById('myContainer');
    if (!container) return;
    
    container.innerHTML = this.generateHTML();
    this.attachEventListeners();
}
```

### Use helper functions
```javascript
generateHTML() {
    return this.data.map(item => `
        <div class="item">
            ${window.utils.escapeHtml(item.text)}
        </div>
    `).join('');
}
```

## 🐛 Error Handling

### Always handle errors
```javascript
async loadData() {
    try {
        const data = await this.api.get('/endpoint');
        this.moduleData = data;
    } catch (error) {
        console.error('Error:', error);
        this.showError('Failed to load data');
    }
}
```

### Show user-friendly errors
```javascript
showError(message) {
    const container = document.getElementById('errorContainer');
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                ${window.utils.escapeHtml(message)}
            </div>
        `;
    }
}
```

## 🧹 Cleanup

### Always clean up event listeners
```javascript
deactivate() {
    // Remove event listeners
    this.events.off('some-event', this.handler);
    
    // Clear timers
    if (this.timer) {
        clearInterval(this.timer);
    }
}
```

## 📊 Data Flow

```
User Action
    ↓
Module Method
    ↓
API Call / State Update
    ↓
Event Emission
    ↓
Other Modules React
    ↓
UI Updates
```

## ✅ Checklist for New Modules

- [ ] Module class created
- [ ] Constructor injects dependencies
- [ ] `init()` method implemented
- [ ] `activate()` method implemented
- [ ] `deactivate()` method implemented
- [ ] `render()` method implemented
- [ ] Event listeners set up
- [ ] Error handling added
- [ ] Module registered in `app-modular.js`
- [ ] Script tag added to `index.html`
- [ ] Tested independently
- [ ] Tested with other modules

## 🚫 Common Mistakes to Avoid

1. **Direct DOM manipulation outside render()**
   - ❌ Bad: `document.getElementById('x').innerHTML = '...'` in random method
   - ✅ Good: Update in `render()` method

2. **Tight coupling between modules**
   - ❌ Bad: `appManager.getModule('stats').updateStats()`
   - ✅ Good: `this.events.emit('stats-update', data)`

3. **Not cleaning up**
   - ❌ Bad: Event listeners never removed
   - ✅ Good: Remove in `deactivate()`

4. **Synchronous API calls**
   - ❌ Bad: `const data = fetch(...)`
   - ✅ Good: `const data = await this.api.get(...)`

5. **Not handling errors**
   - ❌ Bad: No try/catch
   - ✅ Good: Try/catch with user feedback

## 📖 Example: Complete Module

See `modules/path/path-module.js` and `modules/exercise/exercise-module.js` for complete examples.

## 🔗 Module Dependencies

```
AppManager (Core)
    ├── StateManager
    ├── EventBus
    └── APIClient

PathModule
    └── Uses: StateManager, APIClient, EventBus

ExerciseModule
    └── Uses: StateManager, APIClient, EventBus
    └── Can call: PathModule.startLesson()

StudyModule
    └── Uses: StateManager, APIClient, EventBus
```

## 🎓 Learning Resources

- Study existing modules (`path-module.js`, `exercise-module.js`)
- Follow the template structure
- Use events for communication
- Keep modules independent
- Test each module separately

