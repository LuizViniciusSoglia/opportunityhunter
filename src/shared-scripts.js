// Authentication check that runs before DOM is fully loaded
function checkAuthenticationEarly() {
    try {

        if (!checkStorageSecurity()) {
            // Redirect to login page immediately if not have localStorage and sessionStorage
            redirectToLogin('This application requires localStorage and sessionStorage to function properly.')
            return false;
        }

        // First, ensure we have a session token
        initializeSessionSecurity();

        // Then check if we have a valid token
        const token = getAuthToken();

        if (!isValidJWT(token)) {
            // Redirect to login page immediately if not authenticated
            redirectToLogin('Authentication failed. Expired credentials.');
            return false;
        }

        // If authenticated, add event listener to initialize app once DOM is loaded
        if (document.readyState === "loading") {
            document.addEventListener('DOMContentLoaded', initializeApp);
        } else {
            initializeApp();
        }
        return true; // Authentication check passed
    }
    catch (error) {
        console.error('Authentication check error:', error);
        // Use generic error message that doesn't reveal system details
        redirectToLogin('Authentication failed. Please log in again.');
        return false;
    }
}

// =========================================================================

// Enhanced auth security for GitHub Pages (no server-side support)

// Since GitHub Pages can't generate CSRF tokens, we'll implement 
// alternative security measures that work with static sites

// Generate a pseudo-random token for the current session
function generateSessionToken() {
    try {
        const array = new Uint8Array(16);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        console.error('Error generating secure state:', error);
        // Fallback to a less secure but functional alternative
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
}

// Local storage safety check
function checkStorageSecurity() {
    try {
        const testKey = 'security_test';
        const testValue = 'test_' + Date.now();

        // Test if localStorage/sessionStorage works
        localStorage.setItem(testKey, testValue);
        localStorage.removeItem(testKey);

        sessionStorage.setItem(testKey, testValue);
        sessionStorage.removeItem(testKey);

        return true;
    } catch (e) {
        console.error('Storage security check failed:', e);
        // If storage is disabled or throws errors, we need to warn users
        //alert('This application requires localStorage and sessionStorage to function properly. Please enable them in your browser settings.');
        return false;
    }
}

// Store the token in sessionStorage (persists only for current tab)
function initializeSessionSecurity() {
    // Only generate a new token if one doesn't exist
    if (!sessionStorage.getItem('session_token')) {
        const token = generateSessionToken();
        sessionStorage.setItem('session_token', token);
    }
    return sessionStorage.getItem('session_token');
}

// Add the token to all relevant requests
function getSessionToken() {
    return sessionStorage.getItem('session_token') || initializeSessionSecurity();
}

// Validate that token is present and matches the stored version
function validateSessionToken(tokenToCheck) {
    const storedToken = sessionStorage.getItem('session_token');
    return storedToken && storedToken === tokenToCheck;
}

// =========================================================================

// Get authentication token from cookies with error handling
function getAuthToken() {
    if (typeof Cookies !== 'undefined' && typeof Cookies.get === 'function') {
        return Cookies.get('access_token');
    }
    return null;
}

// Cache for user data to avoid multiple cookie reads
let cachedUserData = null;

// Get user data from cookies with caching
function getUserData() {
    if (cachedUserData) return cachedUserData;

    if (typeof Cookies !== 'undefined' && typeof Cookies.get === 'function') {
        try {
            const userData = JSON.parse(Cookies.get('user_data') || '{}');
            cachedUserData = userData;
            return userData;
        } catch (e) {
            console.error('Failed to parse user data:', e);
            return {};
        }
    }
    return {};
}

// Redirect to login page with optional error message
function redirectToLogin(message = null) {
    const currentUrl = encodeURIComponent(window.location.href);
    let redirectUrl = `./login.html?origin=${currentUrl}`

    if (message) {
        // Store error message in sessionStorage - can be used in login page
        sessionStorage.setItem('auth_error', message);
        // Redirect to login page with auth_failure parameter to prevent loops
        redirectUrl += '&auth_failure=true';
    }

    // Use replace to prevent back button returning to protected page
    window.location.replace(redirectUrl);
}

// Validate if the token is a valid JWT and not expired
function isValidJWT(token) {
    if (typeof token !== 'string') {
        return false;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
        return false;
    }

    try {
        // Base64Url decode the payload
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));

        // Check token expiration
        if (payload.exp && Date.now() >= payload.exp * 1000) {
            // Token is expired
            clearAuthData(); // Delete Token
            return false;
        }

        // TODO: Add signature verification here for complete security
        // This would require the public key or secret from your auth server

        return true;
    } catch (error) {
        console.error('Error decoding token payload:', error);
        return false;
    }
}

// Handle logout with CSRF protection
function logoutUser() {
    // Get CSRF token (you would need to implement the function checkCSRFToken)
    //const csrfToken = getCSRFToken();

    // Get the current session token (pseudo CSRF token)
    const csrfToken = getSessionToken();

    // Clear cookies with proper security attributes
    if (typeof Cookies !== 'undefined' && typeof Cookies.remove === 'function') {

        /*if(checkCSRFToken(csrfToken)) {
            // Clear authentication data
            clearAuthData();
            // Redirect to login page
            redirectToLogin();
        }*/

        // Redirect to login with session token as a parameter
        // This prevents CSRF attacks by requiring the token to match
        const currentUrl = encodeURIComponent(window.location.href);
        window.location.replace(`./login.html?origin=${currentUrl}&session_end=${csrfToken}`);
    } else {
        console.warn('Cookies library is not available. Unable to clear cookies.');
        // Fallback: redirect anyway

        //redirectToLogin();

        // Redirect to login with session token as a parameter (because does't exist a real CSRF token)
        // This prevents CSRF attacks by requiring the token to match
        const currentUrl = encodeURIComponent(window.location.href);
        window.location.replace(`./login.html?origin=${currentUrl}&session_end=${csrfToken}`);
    }
}

// Get CSRF token (this is a placeholder - implement based on your backend)
/*function getCSRFToken() {
    // This would typically come from a meta tag or a cookie set by your server
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}*/
// Get CSRF token from meta tag
function getCSRFToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (!metaTag) {
        //console.error('CSRF token meta tag not found');
        //return '';

        // Generate a pseudo-random token - GitHub Pages can't generate CSRF tokens
        // (basic alternative security measure that work with static sites as GitHub Pages)
        return getSessionToken();
    }
    return metaTag.getAttribute('content');
}

function clearAuthData() {
    // Clear cache first
    cachedUserData = null;

    // Remove cookies with available options
    // Note: GitHub Pages doesn't control cookie attributes, but we set what we can
    if (typeof Cookies !== 'undefined' && typeof Cookies.remove === 'function') {
        Cookies.remove('access_token', { path: '/' });
        Cookies.remove('user_data', { path: '/' });
    }

    // Also clear session storage except for the session token
    // (we need to preserve it for logout verification)
    const sessionToken = sessionStorage.getItem('session_token');
    sessionStorage.clear();
    sessionStorage.setItem('session_token', sessionToken);
}

// Initialize app only after authentication is confirmed
function initializeApp() {
    // Insert common UI elements
    renderCommonElements();

    // Setup event listeners
    document.getElementById('logoutBtn')?.addEventListener('click', logoutUser);
    document.getElementById('logoutLink')?.addEventListener('click', logoutUser);

    // Load user profile information
    loadUserInfo();

    // Initialize the hamburger menu
    initializeHamburgerMenu();

    // Show the app content now that authentication is confirmed
    document.getElementById('appHeader').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'block';

    // Hide the loading screen
    const loadingScreen = document.getElementById('authLoadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

// Use a template for common elements to improve performance
function renderCommonElements() {
    // Check if elements already exist to prevent duplicate rendering
    if (document.getElementById('navOverlay')) {
        return;
    }

    const template = `
    <div id="navOverlay" class="nav-overlay">
        <div class="nav-menu">
            <div class="nav-header">
                <img src="./img/logo.png" alt="GenZ Crowd AI" class="nav-logo">
                <button type="button" id="closeNavBtn" class="close-nav-btn" aria-label="Close navigation menu">
                    <span class="close-line"></span>
                    <span class="close-line"></span>
                </button>
            </div>
            <ul class="nav-links">
                <li><a href="./index.html" class="nav-link"><span class="nav-icon">&#x1F3E0;</span>Main Menu</a></li>
                <li><a href="./opportunity-hunter.html" class="nav-link"><span class="nav-icon">&#x1F48E;</span>Opportunity Hunter</a></li>
                <li><a href="./resume-maker-ai.html" class="nav-link"><span class="nav-icon">&#x1F916;</span>Resume Maker AI</a></li>
                <li><a href="./academy.html" class="nav-link"><span class="nav-icon">&#x1F4A1;</span>GenZ Academy</a></li>
                <li><a href="#" id="logoutLink" class="nav-link sign-out"><span class="nav-icon">&#x27A1;&#xFE0F;</span>Sign Out</a></li>
            </ul>
        </div>
    </div>

    <header id="appHeader" aria-label="Application Header">
        <div class="hamburger-menu-container">
            <button type="button" id="hamburgerBtn" class="hamburger-btn" aria-label="Open navigation menu">
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
            </button>
        </div>

        <div class="user-info">
            <img id="userAvatar" src="./img/avatardefault.png" alt="User avatar">
            <span id="userName" class="user-name">Loading...</span>
            <button type="button" id="logoutBtn" class="logout-btn" aria-label="Sign out">SIGN OUT</button>
        </div>
    </header>`;

    // Create container and insert template
    const container = document.createElement('div');
    container.className = 'header-container';
    container.innerHTML = template;

    // Insert into DOM
    const placeholder = document.getElementById('navMenuAndHeaderElement');
    if (placeholder) {
        placeholder.replaceWith(container);
    } else {
        document.body.insertBefore(container, document.body.firstChild);
    }
}

// Load user information from cached user data
function loadUserInfo() {
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');

    if (!userName || !userAvatar) return;

    // Get user data from cache
    const user = getUserData();

    if (!user || Object.keys(user).length === 0) {
        userName.textContent = 'User';
        return;
    }

    // Update interface with user information
    const name = user.name ? user.name : (user.email || 'User');
    userName.textContent = name;

    // Handle user avatar with proper error fallback
    if (user.picture) {
        // Add cache-busting parameter but with a timestamp to reduce network requests
        const cacheBuster = `?t=${Date.now()}`;
        userAvatar.src = user.picture + cacheBuster;
    }

    userAvatar.alt = name + ' Avatar';
    userAvatar.onerror = function () {
        this.onerror = null; // Remove error handler to prevent infinite loop
        this.src = './img/avatardefault.png'; // Use default image on error
    };
}

// Initialize hamburger menu functionality
function initializeHamburgerMenu() {
    // Menu elements
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeNavBtn = document.getElementById('closeNavBtn');
    const navOverlay = document.getElementById('navOverlay');

    if (!hamburgerBtn || !closeNavBtn || !navOverlay) return;

    // Open menu when hamburger button is clicked
    hamburgerBtn.addEventListener('click', () => {
        navOverlay.classList.add('active');
        hamburgerBtn.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
    });

    // Close menu when close button is clicked
    closeNavBtn.addEventListener('click', () => {
        closeMenu();
    });

    // Close menu when clicking outside the menu
    navOverlay.addEventListener('click', (e) => {
        if (e.target === navOverlay) {
            closeMenu();
        }
    });

    // Close menu when pressing escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navOverlay.classList.contains('active')) {
            closeMenu();
        }
    });

    // Add hover effect to menu items for better UX
    document.querySelectorAll('.menuItem').forEach(item => {
        const btn = item.querySelector('.btn');
        if (!btn) return;

        // Use event delegation to reduce event listeners
        item.addEventListener('mouseenter', () => {
            btn.style.opacity = '1';
            btn.style.transform = 'translateY(0)';
        });

        item.addEventListener('mouseleave', () => {
            btn.style.opacity = '0';
            btn.style.transform = 'translateY(20px)';
        });

        // Touch support for mobile devices
        item.addEventListener('touchstart', () => {
            btn.style.opacity = '1';
            btn.style.transform = 'translateY(0)';
        }, { passive: true });
    });

    // Helper function to close menu
    function closeMenu() {
        navOverlay.classList.remove('active');
        hamburgerBtn.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// =========================================================================

/*
// Example of using CSRF token for API requests

function secureApiRequest(url, method, data) {
    const csrfToken = getCSRFToken();
    
    return fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
        },
        credentials: 'same-origin', // Include cookies
        body: method !== 'GET' ? JSON.stringify(data) : undefined
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    });
}

// Use this for logout
function logoutUser() {
    // Get CSRF token
    const csrfToken = getCSRFToken();
    
    // If using an API endpoint for logout
    secureApiRequest('/api/logout', 'POST', {})
        .then(() => {
            // Clear cookies with secure attributes
            clearAuthData();
            // Redirect to login page
            redirectToLogin();
        })
        .catch(error => {
            console.error('Logout failed:', error);
            // Fallback: clear client-side data and redirect anyway
            clearAuthData();
            redirectToLogin();
        });
    
    // If not using an API for logout, just clear client-side data
    clearAuthData();
    redirectToLogin();
}
*/