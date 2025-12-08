// Main application manager - coordinates all modules
class AppManager {
    constructor() {
        this.modules = new Map();
        this.activeModule = null;
        this.state = new StateManager();
        this.api = new APIClient();
        this.events = new EventBus();
        this.initialized = false;
    }
    
    /**
     * Initialize the application
     */
    async init() {
        if (this.initialized) return;
        
        console.log('Initializing AppManager...');
        
        // Check API connection
        const connected = await this.api.checkConnection();
        if (!connected) {
            console.warn('API connection failed - some features may not work');
        }
        
        // Setup global event listeners
        this.setupGlobalListeners();
        
        // Register all modules
        this.registerModules();
        
        // Initialize default module
        await this.activateModule('path');
        
        this.initialized = true;
        console.log('AppManager initialized');
    }
    
    /**
     * Register a module
     */
    registerModule(name, moduleClass) {
        if (this.modules.has(name)) {
            console.warn(`Module ${name} is already registered`);
            return;
        }
        
        const module = new moduleClass(this);
        this.modules.set(name, module);
        console.log(`Module ${name} registered`);
    }
    
    /**
     * Register all modules (called during init)
     */
    registerModules() {
        // Modules will be registered dynamically when their files are loaded
        // This is a placeholder - actual registration happens in app.js
    }
    
    /**
     * Activate a module (switch to a tab)
     */
    async activateModule(moduleName) {
        // Deactivate current module
        if (this.activeModule) {
            const current = this.modules.get(this.activeModule);
            if (current && typeof current.deactivate === 'function') {
                current.deactivate();
            }
        }
        
        // Activate new module
        const module = this.modules.get(moduleName);
        if (!module) {
            console.error(`Module ${moduleName} not found`);
            return;
        }
        
        this.activeModule = moduleName;
        this.state.update('currentMode', moduleName);
        
        // Initialize if needed
        if (typeof module.init === 'function') {
            await module.init();
        }
        
        // Activate
        if (typeof module.activate === 'function') {
            await module.activate();
        }
        
        // Emit event
        this.events.emit('module-activated', { module: moduleName });
    }
    
    /**
     * Get a module
     */
    getModule(moduleName) {
        return this.modules.get(moduleName);
    }
    
    /**
     * Get state manager
     */
    getState() {
        return this.state;
    }
    
    /**
     * Get API client
     */
    getAPI() {
        return this.api;
    }
    
    /**
     * Get event bus
     */
    getEventBus() {
        return this.events;
    }
    
    /**
     * Setup global event listeners
     */
    setupGlobalListeners() {
        // Listen for tab clicks
        document.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn) {
                const mode = tabBtn.dataset.mode;
                if (mode) {
                    this.activateModule(mode);
                }
            }
        });
        
        // Listen for state changes that affect UI
        this.state.subscribe('totalXP', () => {
            this.updateHeaderStats();
        });
        
        this.state.subscribe('studyStreak', () => {
            this.updateHeaderStats();
        });
    }
    
    /**
     * Update header statistics
     */
    updateHeaderStats() {
        const totalXP = this.state.get('totalXP');
        const streak = this.state.get('studyStreak');
        const hearts = this.state.get('hearts');
        
        const xpEl = document.getElementById('headerXP');
        const streakEl = document.getElementById('studyStreak');
        const heartsEl = document.getElementById('heartsCount');
        
        if (xpEl) xpEl.textContent = totalXP;
        if (streakEl) streakEl.textContent = streak;
        if (heartsEl) heartsEl.textContent = `${hearts}/5`;
    }
}

// Export singleton instance
if (typeof window !== 'undefined') {
    window.AppManager = AppManager;
}

