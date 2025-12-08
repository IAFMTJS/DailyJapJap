# 🏗️ Modular Architecture Guide

## Overview

This document outlines the modular architecture for the Daily Japanese Learning app. Each tab/mode is a separate module that can function independently.

## 📁 Directory Structure

```
public/
├── modules/
│   ├── core/
│   │   ├── app-manager.js       # Main app coordinator
│   │   ├── state-manager.js      # Shared state management
│   │   ├── api-client.js         # API communication
│   │   └── event-bus.js          # Event system for inter-module communication
│   ├── path/
│   │   ├── path-module.js        # Learning path module
│   │   └── path.css              # Path-specific styles
│   ├── study/
│   │   ├── study-module.js       # Study mode module
│   │   └── study.css
│   ├── kana/
│   │   ├── kana-module.js        # Kana learning module
│   │   └── kana.css
│   ├── exercise/
│   │   ├── exercise-module.js    # Exercise system module
│   │   └── exercise.css
│   ├── flashcards/
│   │   ├── flashcards-module.js  # Flashcards module
│   │   └── flashcards.css
│   ├── quiz/
│   │   ├── quiz-module.js        # Quiz module
│   │   └── quiz.css
│   ├── practice/
│   │   ├── practice-module.js    # Practice hub module
│   │   └── practice.css
│   ├── achievements/
│   │   ├── achievements-module.js # Achievements module
│   │   └── achievements.css
│   ├── quests/
│   │   ├── quests-module.js      # Daily quests module
│   │   └── quests.css
│   └── stats/
│       ├── stats-module.js       # Statistics module
│       └── stats.css
├── components/
│   ├── audio-player.js           # Shared components
│   ├── matching-exercise.js
│   └── ...
├── utils/
│   ├── validation.js             # Shared utilities
│   ├── storage.js
│   └── helpers.js
├── styles/
│   ├── main.css                  # Global styles
│   ├── variables.css             # CSS variables
│   └── animations.css            # Animations
└── app.js                        # Entry point (minimal)
```

## 🎯 Module Structure Template

Each module follows this structure:

```javascript
// modules/path/path-module.js
class PathModule {
    constructor(appManager) {
        this.appManager = appManager;
        this.state = appManager.getState();
        this.api = appManager.getAPI();
        this.events = appManager.getEventBus();
        this.initialized = false;
    }
    
    // Initialize module
    async init() {
        if (this.initialized) return;
        
        this.setupEventListeners();
        await this.loadData();
        this.initialized = true;
    }
    
    // Cleanup when module is deactivated
    destroy() {
        // Remove event listeners
        // Clear timers
        // Clean up resources
    }
    
    // Activate module (when tab is clicked)
    async activate() {
        await this.init();
        this.render();
    }
    
    // Deactivate module (when switching tabs)
    deactivate() {
        // Hide UI
        // Pause operations
    }
    
    // Render module UI
    render() {
        // Update DOM
    }
    
    // Setup module-specific event listeners
    setupEventListeners() {
        // Module-specific events
    }
    
    // Load module data
    async loadData() {
        // Fetch data from API
    }
}
```

## 🔄 Module Lifecycle

1. **Registration** - Module registers with AppManager
2. **Init** - Module initializes (loads data, sets up listeners)
3. **Activate** - Module becomes active (tab clicked)
4. **Render** - Module renders its UI
5. **Deactivate** - Module becomes inactive (tab switched)
6. **Destroy** - Module cleans up (optional, for memory management)

## 📡 Inter-Module Communication

### Event Bus Pattern
```javascript
// Module A emits event
this.events.emit('word-studied', { wordId: '123', xp: 10 });

// Module B listens
this.events.on('word-studied', (data) => {
    this.updateStats(data);
});
```

### Shared State
```javascript
// Module A updates state
this.state.update('totalXP', 100);

// Module B reads state
const xp = this.state.get('totalXP');
```

## ✅ Best Practices

1. **Single Responsibility** - Each module handles one feature
2. **Loose Coupling** - Modules communicate via events/state, not direct calls
3. **Dependency Injection** - Pass dependencies through constructor
4. **Async/Await** - Use async for all data loading
5. **Error Handling** - Each module handles its own errors
6. **Cleanup** - Always clean up event listeners and timers
7. **Lazy Loading** - Load module data only when activated
8. **State Management** - Use shared state for cross-module data

## 🔌 Module Interface

Every module must implement:
- `init()` - Initialize module
- `activate()` - Activate module
- `deactivate()` - Deactivate module
- `destroy()` - Cleanup (optional)
- `render()` - Render UI

## 📦 Shared Resources

- **StateManager** - Global state
- **APIClient** - API calls
- **EventBus** - Event system
- **Storage** - LocalStorage wrapper
- **Utils** - Helper functions

