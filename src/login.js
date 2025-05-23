// OAuth2 Configuration - Moved to a separate file for easier management
const OAUTH_CONFIG = {
    CLIENT_ID: '877506323603-9fhfhbia4vdm3odosobiouf4n019vhar.apps.googleusercontent.com',
    REDIRECT_URI: 'https://luizviniciussoglia.github.io/opportunityhunter/login.html',
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbySg3bwEA0H7L5cY57TnfCyamoylcHsjFLXKZdvtQJHB5AqaOB1bFSNSSC8H1COnqUl/exec',
    SCOPES: 'email profile',
    STATE_KEY: 'oauth_state',
    REDIRECT_KEY: 'redirect_after_login'
};

// Security Constants
const SECURITY = {
    TOKEN_STORAGE_METHOD: 'cookie', // Options: 'cookie', 'sessionStorage', 'localStorage'
    COOKIE_EXPIRY: 0.5, // 12 hours (0.5 days)
    MAX_REDIRECT_LENGTH: 1000 // Maximum length for redirect URLs
};

// Cache DOM elements for better performance
const elements = {
    btnGoogleLogin: document.getElementById('btnGoogleLogin'),
    loading: document.getElementById('loading'),
    statusMessage: document.getElementById('statusMessage')
};

/**
 * Initialize the page
 */
function initPage() {
    // Hide loading spinner and status message by default
    toggleElement(elements.loading, false);
    toggleElement(elements.statusMessage, false);

    // Set up event listeners
    if (elements.btnGoogleLogin) {
        elements.btnGoogleLogin.addEventListener('click', handleGoogleLogin);
    } else {
        console.error('Login button not found in the DOM');
    }

    // Check if cookies are blocked
    if (SECURITY.TOKEN_STORAGE_METHOD === 'cookie' && !areCookiesEnabled) {
        displayMessage("Error: Cookies are blocked or not supported by your browser.", "error");
        return;
    }

    // Session and Local storages safety check
    if (!checkStorageSecurity()) {
        displayMessage("Error: This application requires localStorage and sessionStorage to function properly.", "error");
        return;
    }

    // Check if user is already authenticated
    checkSession();

    // Check if we're being redirected back from Google after login
    checkForAuthRedirect();
}

/**
 * Toggle element visibility
 * 
 * @param {HTMLElement} element - The element to toggle
 * @param {boolean} show - Whether to show or hide the element
 */
function toggleElement(element, show) {
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

// Check if cookies are enabled in the browser
function areCookiesEnabled() {
    if (navigator.cookieEnabled) {
        return true;
    }
    // Fallback to older browsers that might not support navigator.cookieEnabled
    try {
        // Try to set a test cookie
        document.cookie = "cookietest=1";
        const result = document.cookie.indexOf("cookietest=") !== -1;
        // Clean up the test cookie
        document.cookie = "cookietest=1; expires=Thu, 01 Jan 1970 00:00:00 UTC";
        return result;
    } catch (e) {
        return false;
    }
}

// Session and Local storages safety check
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

/**
 * Check if user is already authenticated and redirect if needed
 */
function checkSession() {
    try {
        // Get the URL parameters
        const urlParams = new URLSearchParams(window.location.search);

        // If we have a token AND we're being redirected due to auth failure
        // (check if we were redirected from the index page with auth_failure to prevent loops)
        const authFailure = urlParams.get('auth_failure');
        if (authFailure) {
            // Clear the invalid token to prevent future loops
            //clearAuthData(); // DISABLED BECAUSE IT CAN CAUSE A LOGOUT USING MALICIOUS auth_failure=true
            // Display any auth error messages stored in session by previous page (which returned an auth_failure)
            const authError = sessionStorage.getItem('auth_error');
            if (authError) {
                displayMessage(authError, "error");
                sessionStorage.removeItem('auth_error');
            }
            try {
                // Remove the auth_failure parameter from URL
                // (this prevents leaking message code in browser history)
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
            } catch (e) {
                console.warn('Could not clean URL parameters:', e);
            }
            return;
        }

        // If there was a logout request
        const sessionEnd = urlParams.get('session_end');
        if (sessionEnd) { // logout request
            // Validate against stored session token - to avoid CSRF attack
            const currentToken = sessionStorage.getItem('session_token');
            if (currentToken && currentToken === sessionEnd) {
                // Valid logout - clear session completely and show logout message
                clearAuthData();
                displayMessage("Logged out.", "success");
                try {
                    // Remove sensitive parameters from URL for security
                    // This prevents leaking authorization code in browser history
                    const cleanUrl = window.location.pathname;
                    window.history.replaceState({}, document.title, cleanUrl);
                } catch (e) {
                    console.warn('Could not clean URL parameters:', e);
                }
            } else {
                // Invalid logout attempt - could be CSRF
                console.warn('Invalid session token in logout');
            }
            return;
        }

        let token = null;
        // Get token based on the selected storage method
        switch (SECURITY.TOKEN_STORAGE_METHOD) {
            case 'sessionStorage':
                token = sessionStorage.getItem('access_token');
                break;
            case 'localStorage':
                token = localStorage.getItem('access_token');
                break;
            case 'cookie':
            default:
                token = Cookies.get('access_token');
                break;
        }

        if (!token) { // If there's not a token, finalize the function
            return;
        }

        // If we have a token AND we're not being redirected due to auth failure or logout
        window.location.href = './index.html';

    } catch (e) {
        console.warn('Session check error:', e);
    }
}

/**
 * Handle Google login button click
 */
function handleGoogleLogin() {
    try {
        // Hide status message and show loading spinner
        toggleElement(elements.statusMessage, false);
        toggleElement(elements.loading, true);

        // Clear all previous auth data
        clearAuthData();

        // Generate a secure random state for CSRF protection
        const state = generateSecureState();
        sessionStorage.setItem(OAUTH_CONFIG.STATE_KEY, state);

        // Determine and store the redirect URL
        const redirect = determineRedirectUrl();
        sessionStorage.setItem(OAUTH_CONFIG.REDIRECT_KEY, redirect);

        // Build OAuth2 request parameters
        const authParams = new URLSearchParams({
            client_id: OAUTH_CONFIG.CLIENT_ID,
            redirect_uri: OAUTH_CONFIG.REDIRECT_URI,
            response_type: 'code',
            scope: OAUTH_CONFIG.SCOPES,
            state: state,
            access_type: 'offline',
            prompt: 'consent'
        });

        // Redirect to Google consent page
        window.location.replace(`https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`);
    } catch (error) {
        displayMessage('Error redirecting to Google login.', 'error');
        console.error('Login redirect error:', error);
    }
}

/**
 * Generate a cryptographically secure random state for OAuth
 * 
 * @returns {string} A secure random state string
 */
function generateSecureState() {
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

/**
 * Determine the redirect URL after successful login with security validation
 * 
 * @returns {string} The validated redirect URL
 */
function determineRedirectUrl() {
    let redirect = './index.html'; // Default redirect URL
    const urlParams = new URLSearchParams(window.location.search);
    const origin = urlParams.get('origin');

    if (origin) {
        try {
            // Validate the origin parameter
            if (origin.length > SECURITY.MAX_REDIRECT_LENGTH) {
                console.warn('Redirect URL exceeds maximum length');
                return redirect;
            }

            const decodedOrigin = decodeURIComponent(origin);
            const currentSiteUrl = window.location.origin;

            // Verify the origin is from our site
            if (haveSameProtocolAndHost(decodedOrigin, currentSiteUrl)) {
                redirect = decodedOrigin;
            } else {
                console.warn('Redirect blocked: Origin is from a different domain');
            }
        } catch (error) {
            console.error('Invalid redirect URL parameter:', error);
        }
    }

    return redirect;
}

/**
 * Check if two URLs have the same protocol and host (security measure)
 * 
 * @param {string} url1 - First URL to compare
 * @param {string} url2 - Second URL to compare
 * @returns {boolean} Whether the URLs have the same protocol and host
 */
function haveSameProtocolAndHost(url1, url2) {
    try {
        const parsedUrl1 = new URL(url1);
        const parsedUrl2 = new URL(url2);

        return (
            parsedUrl1.protocol === parsedUrl2.protocol &&
            parsedUrl1.host === parsedUrl2.host
        );
    } catch (error) {
        console.error('URL validation error:', error);
        return false;
    }
}

/**
 * Check if we've been redirected back from Google OAuth
 */
async function checkForAuthRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    // Clear the URL parameters for security
    if (code || state || error) {
        try {
            // Remove sensitive parameters from URL for security
            // This prevents leaking authorization code in browser history
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        } catch (e) {
            console.warn('Could not clean URL parameters:', e);
        }
    }

    // Check if there's an error
    if (error) {
        displayMessage('Authentication error.', 'error');
        return;
    }

    // If we have an authorization code, process the login
    if (code && state) {
        // Verify state for security (CSRF protection)
        const savedState = sessionStorage.getItem(OAUTH_CONFIG.STATE_KEY);
        if (!savedState || state !== savedState) {
            displayMessage('Security error: invalid state parameter.', 'error');
            return;
        }
        toggleElement(elements.loading, true);
        await processAuthCode(code);
    }
}

/**
 * Process the authentication code from Google
 * 
 * @param {string} code - The authorization code from Google OAuth
 */
async function processAuthCode(code) {
    try {
        // Validate code before sending
        if (!code || typeof code !== 'string') {
            throw new Error('Invalid authorization code');
        }

        const response = await fetch(OAUTH_CONFIG.APPS_SCRIPT_URL, {
            method: 'POST',
            /*headers: { // To avoid CORS problems (Google Apps script doesn't need headers)
                'Content-Type': 'application/json'
            },*/
            body: JSON.stringify({
                code: code,
                redirect_uri: OAUTH_CONFIG.REDIRECT_URI
            })
        });

        // Check for HTTP errors
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            // Successfully authenticated, store tokens and user data
            storeAuthData(data);

            // Redirect to the page the user came from
            const redirect = sessionStorage.getItem(OAUTH_CONFIG.REDIRECT_KEY) || './index.html';
            window.location.href = redirect;
        } else {
            //displayMessage(data.message || 'Authentication failed.', 'error'); // Avoid exposing server errors
            displayMessage('Authentication failed.', 'error');
        }
    } catch (error) {
        displayMessage('Error processing authentication.', 'error');
        console.error('Authentication processing error:', error);
    } finally {
        toggleElement(elements.loading, false);

        // Clean up storage
        sessionStorage.removeItem(OAUTH_CONFIG.STATE_KEY);
        sessionStorage.removeItem(OAUTH_CONFIG.REDIRECT_KEY);
    }
}

/**
 * Store authentication data securely
 * 
 * @param {Object} data - The authentication data to store
 */
function storeAuthData(data) {
    // Store tokens based on the selected storage method
    switch (SECURITY.TOKEN_STORAGE_METHOD) {
        case 'sessionStorage':
            // Session storage is cleared when the browser tab is closed
            sessionStorage.setItem('access_token', data.access_token);
            sessionStorage.setItem('user_data', JSON.stringify(data.user));
            break;

        case 'localStorage':
            // Local storage persists even when the browser is closed
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('user_data', JSON.stringify(data.user));
            break;

        case 'cookie':
        default:
            // Store in cookies with security flags
            Cookies.set('access_token', data.access_token, {
                expires: SECURITY.COOKIE_EXPIRY,
                path: '/',
                secure: location.protocol === 'https:', // Only if on HTTPS
                sameSite: 'strict'
            });

            Cookies.set('user_data', JSON.stringify(data.user), {
                expires: SECURITY.COOKIE_EXPIRY,
                path: '/',
                secure: location.protocol === 'https:', // Only if on HTTPS
                sameSite: 'strict'
            });
            break;
    }
    const state = sessionStorage.getItem(OAUTH_CONFIG.STATE_KEY);
    // Store the session token - for validating future requests to avoid CSRF attacks
    sessionStorage.setItem('session_token', state);
}

/**
 * Clear all authentication data
 */
function clearAuthData() {
    sessionStorage.clear(); // Clear access_token (if exist), user_data (if exist), session_token, auth_error
    // Clear based on the selected storage method
    switch (SECURITY.TOKEN_STORAGE_METHOD) {
        case 'sessionStorage':
            //sessionStorage.removeItem('access_token'); // Already deleted above
            //sessionStorage.removeItem('user_data');
            break;
        case 'localStorage':
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_data');
            break;
        case 'cookie':
        default:
            Cookies.remove('access_token');
            Cookies.remove('user_data');
            break;
    }
}

/**
 * Display status message to the user
 * 
 * @param {string} message - The status message to display
 */
function displayMessage(message = 'Error.', type = 'error') {
    toggleElement(elements.loading, false);

    if (elements.statusMessage) {
        if (type === 'error') {
            elements.statusMessage.className = 'status-message error-message';
            console.error(message);
        }
        else {
            elements.statusMessage.className = 'status-message success-message';
        }
        elements.statusMessage.textContent = message;
        toggleElement(elements.statusMessage, true);
    }
}

// Initialize the page when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    initPage();
}