// Adapter to bridge ES6 modules with class-based modules
// Allows existing ES6 page modules to work with new core systems

class ModuleAdapter {
    constructor(es6Module, moduleName) {
        this.es6Module = es6Module;
        this.moduleName = moduleName;
        this.initialized = false;
    }
    
    async init() {
        if (this.initialized) return;
        
        if (this.es6Module.init) {
            await this.es6Module.init();
        }
        this.initialized = true;
    }
    
    async activate() {
        await this.init();
        if (this.es6Module.load) {
            await this.es6Module.load();
        }
    }
    
    deactivate() {
        // ES6 modules don't typically have deactivate
        // But we can add cleanup if needed
    }
    
    render() {
        // ES6 modules handle their own rendering
        // This is a placeholder
    }
}

// Helper to create adapters for ES6 modules
export function createModuleAdapter(es6Module, moduleName) {
    return new ModuleAdapter(es6Module, moduleName);
}

// Export for use
if (typeof window !== 'undefined') {
    window.ModuleAdapter = ModuleAdapter;
    window.createModuleAdapter = createModuleAdapter;
}

