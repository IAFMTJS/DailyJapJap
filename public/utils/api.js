// API service - handles all API calls
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

export const api = {
    API_BASE, // Export for use in other modules
    
    async get(endpoint) {
        const response = await fetch(`${API_BASE}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    },
    
    async post(endpoint, data) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    },
    
    async put(endpoint, data = null) {
        const options = {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        };
        if (data) {
            options.body = JSON.stringify(data);
        }
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }
};

export default api;

