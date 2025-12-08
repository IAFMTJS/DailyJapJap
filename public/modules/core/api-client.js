// Centralized API client for all modules
// Compatible with existing utils/api.js structure
class APIClient {
    constructor(baseURL) {
        // baseURL should be the server root, not including /api
        // We'll prepend /api in buildURL when needed
        this.baseURL = baseURL || (window.location.hostname === 'localhost' 
            ? 'http://localhost:3000' 
            : '');
        this.API_BASE = this.baseURL + '/api'; // Alias for compatibility
    }
    
    /**
     * Make a GET request
     */
    async get(endpoint, params = {}) {
        const url = this.buildURL(endpoint, params);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API GET error (${endpoint}):`, error);
            throw error;
        }
    }
    
    /**
     * Make a POST request
     */
    async post(endpoint, data = {}, params = {}) {
        const url = this.buildURL(endpoint, params);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API POST error (${endpoint}):`, error);
            throw error;
        }
    }
    
    /**
     * Make a PUT request
     */
    async put(endpoint, data = {}, params = {}) {
        const url = this.buildURL(endpoint, params);
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API PUT error (${endpoint}):`, error);
            throw error;
        }
    }
    
    /**
     * Make a DELETE request
     */
    async delete(endpoint, params = {}) {
        const url = this.buildURL(endpoint, params);
        try {
            const response = await fetch(url, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API DELETE error (${endpoint}):`, error);
            throw error;
        }
    }
    
    /**
     * Build URL with query parameters
     */
    buildURL(endpoint, params = {}) {
        // Handle absolute URLs
        if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
            const url = new URL(endpoint);
            Object.entries(params).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    url.searchParams.append(key, value);
                }
            });
            return url.toString();
        }
        
        // Ensure endpoint starts with /api
        let fullEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
        if (!fullEndpoint.startsWith('/api')) {
            fullEndpoint = '/api' + fullEndpoint;
        }
        
        // Build full URL
        const base = this.baseURL || window.location.origin;
        const url = new URL(fullEndpoint, base);
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                url.searchParams.append(key, value);
            }
        });
        return url.toString();
    }
    
    /**
     * Check API connection
     */
    async checkConnection() {
        try {
            await this.get('/stats');
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Export singleton instance
if (typeof window !== 'undefined') {
    window.APIClient = APIClient;
}

