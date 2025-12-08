// Global state management for the application
class StateManager {
    constructor() {
        this.state = {
            // User stats
            totalXP: 0,
            dailyXP: 0,
            studyStreak: 0,
            lastStudyDate: null,
            
            // Progress
            dayProgress: {},
            kanaProgress: {},
            skillProgress: {},
            
            // Learning data
            learningPlan: [],
            wordsData: {},
            
            // Game mechanics
            hearts: 5,
            lastHeartLoss: Date.now(),
            achievements: [],
            dailyQuests: {},
            
            // Current session
            currentMode: 'path',
            currentDay: null,
            currentExercise: null,
            
            // Spaced repetition
            spacedRepetition: {},
        };
        
        this.listeners = new Map();
        this.loadFromStorage();
    }
    
    /**
     * Get state value
     */
    get(key) {
        return this.state[key];
    }
    
    /**
     * Get entire state
     */
    getAll() {
        return { ...this.state };
    }
    
    /**
     * Update state value
     */
    update(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        this.saveToStorage();
        this.notifyListeners(key, value, oldValue);
    }
    
    /**
     * Update multiple state values
     */
    updateMultiple(updates) {
        const oldValues = {};
        for (const [key, value] of Object.entries(updates)) {
            oldValues[key] = this.state[key];
            this.state[key] = value;
        }
        this.saveToStorage();
        for (const [key, value] of Object.entries(updates)) {
            this.notifyListeners(key, value, oldValues[key]);
        }
    }
    
    /**
     * Subscribe to state changes
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
        
        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(key);
            if (callbacks) {
                callbacks.delete(callback);
            }
        };
    }
    
    /**
     * Notify listeners of state change
     */
    notifyListeners(key, newValue, oldValue) {
        const callbacks = this.listeners.get(key);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    console.error(`Error in state listener for ${key}:`, error);
                }
            });
        }
    }
    
    /**
     * Load state from localStorage
     * Also loads from existing studyStats structure for compatibility
     */
    loadFromStorage() {
        try {
            // Try new format first
            const saved = localStorage.getItem('appState');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults
                this.state = { ...this.state, ...parsed };
            }
            
            // Also load from existing format for compatibility
            this.loadLegacyStorage();
        } catch (error) {
            console.error('Error loading state from storage:', error);
        }
    }
    
    /**
     * Load from legacy localStorage format (compatibility)
     */
    loadLegacyStorage() {
        // Load from existing studyStats format
        const totalXP = parseInt(localStorage.getItem('totalXP') || '0');
        const dailyXP = parseInt(localStorage.getItem('dailyXP') || '0');
        const studyStreak = parseInt(localStorage.getItem('studyStreak') || '0');
        const lastStudyDate = localStorage.getItem('lastStudyDate');
        const hearts = parseInt(localStorage.getItem('hearts') || '5');
        const lastHeartLoss = parseInt(localStorage.getItem('lastHeartLoss') || Date.now());
        
        // Merge if not already set
        if (totalXP > 0 && !this.state.totalXP) this.state.totalXP = totalXP;
        if (dailyXP > 0 && !this.state.dailyXP) this.state.dailyXP = dailyXP;
        if (studyStreak > 0 && !this.state.studyStreak) this.state.studyStreak = studyStreak;
        if (lastStudyDate && !this.state.lastStudyDate) this.state.lastStudyDate = lastStudyDate;
        if (hearts !== 5 && !this.state.hearts) this.state.hearts = hearts;
        if (lastHeartLoss && !this.state.lastHeartLoss) this.state.lastHeartLoss = lastHeartLoss;
        
        // Load complex objects
        const dayProgress = localStorage.getItem('dayProgress');
        if (dayProgress && !this.state.dayProgress) {
            this.state.dayProgress = JSON.parse(dayProgress);
        }
        
        const skillProgress = localStorage.getItem('skillProgress');
        if (skillProgress && !this.state.skillProgress) {
            this.state.skillProgress = JSON.parse(skillProgress);
        }
        
        const achievements = localStorage.getItem('achievements');
        if (achievements && !this.state.achievements) {
            this.state.achievements = JSON.parse(achievements);
        }
    }
    
    /**
     * Save state to localStorage
     */
    saveToStorage() {
        try {
            // Only save persistent data, not session data
            const persistent = {
                totalXP: this.state.totalXP,
                dailyXP: this.state.dailyXP,
                studyStreak: this.state.studyStreak,
                lastStudyDate: this.state.lastStudyDate,
                dayProgress: this.state.dayProgress,
                kanaProgress: this.state.kanaProgress,
                skillProgress: this.state.skillProgress,
                hearts: this.state.hearts,
                lastHeartLoss: this.state.lastHeartLoss,
                achievements: this.state.achievements,
                dailyQuests: this.state.dailyQuests,
                spacedRepetition: this.state.spacedRepetition,
            };
            localStorage.setItem('appState', JSON.stringify(persistent));
        } catch (error) {
            console.error('Error saving state to storage:', error);
        }
    }
    
    /**
     * Reset state (for testing/logout)
     */
    reset() {
        this.state = {
            totalXP: 0,
            dailyXP: 0,
            studyStreak: 0,
            lastStudyDate: null,
            dayProgress: {},
            kanaProgress: {},
            skillProgress: {},
            learningPlan: [],
            wordsData: {},
            hearts: 5,
            lastHeartLoss: Date.now(),
            achievements: [],
            dailyQuests: {},
            currentMode: 'path',
            currentDay: null,
            currentExercise: null,
            spacedRepetition: {},
        };
        this.saveToStorage();
    }
}

// Export singleton instance
if (typeof window !== 'undefined') {
    window.StateManager = StateManager;
}

