// Event bus for inter-module communication
class EventBus {
    constructor() {
        this.events = new Map();
    }
    
    /**
     * Subscribe to an event
     * @param {string} eventName - Event name
     * @param {function} callback - Callback function
     * @returns {function} Unsubscribe function
     */
    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }
        
        this.events.get(eventName).add(callback);
        
        // Return unsubscribe function
        return () => {
            const callbacks = this.events.get(eventName);
            if (callbacks) {
                callbacks.delete(callback);
            }
        };
    }
    
    /**
     * Subscribe to an event once
     */
    once(eventName, callback) {
        const wrapper = (...args) => {
            callback(...args);
            this.off(eventName, wrapper);
        };
        return this.on(eventName, wrapper);
    }
    
    /**
     * Unsubscribe from an event
     */
    off(eventName, callback) {
        const callbacks = this.events.get(eventName);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }
    
    /**
     * Emit an event
     */
    emit(eventName, data) {
        const callbacks = this.events.get(eventName);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for ${eventName}:`, error);
                }
            });
        }
    }
    
    /**
     * Remove all listeners for an event
     */
    removeAllListeners(eventName) {
        if (eventName) {
            this.events.delete(eventName);
        } else {
            this.events.clear();
        }
    }
    
    /**
     * Get all event names
     */
    getEventNames() {
        return Array.from(this.events.keys());
    }
}

// Export singleton instance
if (typeof window !== 'undefined') {
    window.EventBus = EventBus;
}

