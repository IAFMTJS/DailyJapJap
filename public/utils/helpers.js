// Shared utility functions

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Shuffle array
 */
export function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Format number with commas
 */
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format date
 */
export function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Calculate percentage
 */
export function calculatePercentage(part, total) {
    if (total === 0) return 0;
    return Math.round((part / total) * 100);
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Sleep/delay function
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if element is in viewport
 */
export function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Show loading state
 */
export function showLoading(element, message = 'Loading...') {
    if (!element) return;
    element.innerHTML = `
        <div class="loading-state">
            <div class="premium-spinner"></div>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}

/**
 * Show error message
 */
export function showError(message, element = null) {
    const errorHtml = `
        <div class="empty-state">
            <h2>⚠️ Error</h2>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
    
    if (element) {
        element.innerHTML = errorHtml;
    } else {
        // Show as toast/notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--danger, #e74c3c); color: white; padding: 1rem; border-radius: 8px; z-index: 10000; max-width: 400px;';
        errorDiv.innerHTML = `<p>${escapeHtml(message)}</p>`;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// Export for use in modules (backward compatibility)
if (typeof window !== 'undefined') {
    window.utils = {
        escapeHtml,
        shuffleArray,
        formatNumber,
        formatDate,
        calculatePercentage,
        debounce,
        throttle,
        sleep,
        isInViewport,
        showLoading,
        showError
    };
}
