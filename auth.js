// ============================================
// AI-SHIELD AUTHENTICATION HELPER
// Funções para gerenciar autenticação no frontend
// ============================================

const AUTH_CONFIG = {
    API_URL: 'https://ai-shield-backend-production.up.railway.app',
    TOKEN_KEY: 'authToken',
    USER_KEY: 'user',
    COMPANY_KEY: 'company'
};

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
function isAuthenticated() {
    const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
    return !!token;
}

/**
 * Get authentication token
 * @returns {string|null}
 */
function getToken() {
    return localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
}

/**
 * Get current user data
 * @returns {object|null}
 */
function getCurrentUser() {
    const userJson = localStorage.getItem(AUTH_CONFIG.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
}

/**
 * Get current company data
 * @returns {object|null}
 */
function getCurrentCompany() {
    const companyJson = localStorage.getItem(AUTH_CONFIG.COMPANY_KEY);
    return companyJson ? JSON.parse(companyJson) : null;
}

/**
 * Logout user
 */
function logout() {
    localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
    localStorage.removeItem(AUTH_CONFIG.USER_KEY);
    localStorage.removeItem(AUTH_CONFIG.COMPANY_KEY);
    window.location.href = '/login';
}

/**
 * Redirect to login if not authenticated
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

/**
 * Make authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/api/detections')
 * @param {object} options - Fetch options
 * @returns {Promise}
 */
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    
    if (!token) {
        throw new Error('Not authenticated');
    }
    
    const url = `${AUTH_CONFIG.API_URL}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, mergedOptions);
        
        // Handle unauthorized
        if (response.status === 401 || response.status === 403) {
            logout();
            throw new Error('Session expired');
        }
        
        // Handle other errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('API Request error:', error);
        throw error;
    }
}

/**
 * Verify token is still valid
 * @returns {Promise<boolean>}
 */
async function verifyToken() {
    try {
        await apiRequest('/api/auth/me');
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Refresh user data from API
 * @returns {Promise<object>}
 */
async function refreshUserData() {
    try {
        const data = await apiRequest('/api/auth/me');
        
        localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(data.user));
        localStorage.setItem(AUTH_CONFIG.COMPANY_KEY, JSON.stringify(data.company));
        
        return data;
    } catch (error) {
        console.error('Error refreshing user data:', error);
        throw error;
    }
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================

/**
 * Display user info in UI
 * @param {string} selector - CSS selector for element
 */
function displayUserInfo(selector) {
    const user = getCurrentUser();
    const element = document.querySelector(selector);
    
    if (element && user) {
        element.textContent = user.fullName || user.email;
    }
}

/**
 * Display company info in UI
 * @param {string} selector - CSS selector for element
 */
function displayCompanyInfo(selector) {
    const company = getCurrentCompany();
    const element = document.querySelector(selector);
    
    if (element && company) {
        element.textContent = company.name;
    }
}

/**
 * Show loading state
 * @param {HTMLElement} button - Button element
 * @param {string} text - Loading text
 */
function showLoading(button, text = 'Loading...') {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = text;
}

/**
 * Hide loading state
 * @param {HTMLElement} button - Button element
 */
function hideLoading(button) {
    button.disabled = false;
    button.textContent = button.dataset.originalText || 'Submit';
}

/**
 * Show error message
 * @param {string} message - Error message
 * @param {string} selector - CSS selector for error element
 */
function showError(message, selector = '#errorMessage') {
    const element = document.querySelector(selector);
    if (element) {
        element.textContent = message;
        element.classList.add('show');
        element.style.display = 'block';
    }
}

/**
 * Hide error message
 * @param {string} selector - CSS selector for error element
 */
function hideError(selector = '#errorMessage') {
    const element = document.querySelector(selector);
    if (element) {
        element.textContent = '';
        element.classList.remove('show');
        element.style.display = 'none';
    }
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize authentication on page load
 */
function initAuth() {
    // Auto-verify token on protected pages
    const protectedPages = ['/company-dashboard', '/dashboard', '/settings'];
    const currentPath = window.location.pathname;
    
    if (protectedPages.some(path => currentPath.includes(path))) {
        requireAuth();
        
        // Verify token in background
        verifyToken().then(valid => {
            if (!valid) {
                logout();
            }
        });
    }
    
    // Setup logout buttons
    document.querySelectorAll('[data-logout]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                logout();
            }
        });
    });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}

// ============================================
// EXPORT FOR USE IN OTHER SCRIPTS
// ============================================

// Make functions globally available
window.authHelper = {
    isAuthenticated,
    getToken,
    getCurrentUser,
    getCurrentCompany,
    logout,
    requireAuth,
    apiRequest,
    verifyToken,
    refreshUserData,
    displayUserInfo,
    displayCompanyInfo,
    showLoading,
    hideLoading,
    showError,
    hideError
};
