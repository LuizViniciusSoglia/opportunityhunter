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
    errorMessage: document.getElementById('errorMessage')
};

/**
 * Initialize the page
 */
function initPage() {
    if (SECURITY.TOKEN_STORAGE_METHOD === 'cookie' && !areCookiesEnabled) {
        displayError("Error: Cookies are blocked or not supported by your browser.");
        return;
    }

    // Check if we're being redirected back from Google after login
    checkForAuthRedirect();

    // Check if user is already authenticated
    //checkSession();

    // Hide loading spinner and error message by default
    toggleElement(elements.loading, false);
    toggleElement(elements.errorMessage, false);

    // Set up event listeners
    if (elements.btnGoogleLogin) {
        elements.btnGoogleLogin.addEventListener('click', handleGoogleLogin);
    } else {
        console.error('Login button not found in the DOM');
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

/**
 * Check if user is already authenticated and redirect if needed
 */
function checkSession() {
    try {
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

        // Only redirect if there's a token AND we're not in a redirect loop
        if (token) {
            // Check if we were redirected from the index page to prevent loops
            const urlParams = new URLSearchParams(window.location.search);
            const authFailure = urlParams.get('auth_failure');
            const sessionEnd = urlParams.get('session_end');

            // If we have a token AND we're being redirected due to auth failure
            if (authFailure) {
                // Clear the invalid token to prevent future loops
                clearAuthData();
                // Display any auth error messages stored in session by previous page
                const authError = sessionStorage.getItem('auth_error');
                if (authError) {
                    displayError(authError);
                    sessionStorage.removeItem('auth_error');
                }
                // Remove the auth_failure parameter from URL
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);

            } else if (sessionEnd) { // logout request
                // Validate against stored session token
                const currentToken = sessionStorage.getItem('session_token');
                if (currentToken && currentToken === sessionEnd) {
                    // Valid logout - clear session completely and show logout message
                    clearAuthData();
                    sessionStorage.clear();
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

            } else { // If we have a token AND we're not being redirected due to auth failure or logout
                window.location.href = './index.html';
            }
        }
    } catch (e) {
        console.warn('Session check error:', e);
    }
}

/**
 * Clear all authentication data
 */
function clearAuthData() {
    // Clear based on the selected storage method
    switch (SECURITY.TOKEN_STORAGE_METHOD) {
        case 'sessionStorage':
            sessionStorage.removeItem('access_token');
            sessionStorage.removeItem('user_data');
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
 * Display error message to the user
 * 
 * @param {string} message - The error message to display
 */
function displayError(message) {
    toggleElement(elements.loading, false);

    if (elements.errorMessage) {
        toggleElement(elements.errorMessage, true);
        elements.errorMessage.textContent = message;
    }

    console.error('Authentication error:', message);
}

/**
 * Handle Google login button click
 */
function handleGoogleLogin() {
    try {
        // Hide error message and show loading spinner
        toggleElement(elements.errorMessage, false);
        toggleElement(elements.loading, true);

        // Generate a secure random state for CSRF protection
        const state = generateSecureState();
        sessionStorage.setItem(OAUTH_CONFIG.STATE_KEY, state);
        sessionStorage.setItem('session_token', state);

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
        displayError('Error redirecting to Google login' + error.message);
        console.error('Login redirect error:', error);
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
        displayError('Authentication error: ' + error);
        return;
    }

    // If we have an authorization code, process the login
    if (code && state) {
        // Verify state for security (CSRF protection)
        const savedState = sessionStorage.getItem(OAUTH_CONFIG.STATE_KEY);
        if (!savedState || state !== savedState) {
            displayError('Security error: invalid state parameter');
            return;
        }

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
        toggleElement(elements.loading, true);

        // Validate code before sending
        if (!code || typeof code !== 'string') {
            throw new Error('Invalid authorization code');
        }

        const response = await fetch(OAUTH_CONFIG.APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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
            displayError(data.message || 'Authentication failed');
        }
    } catch (error) {
        displayError('Error processing authentication: ' + error.message);
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
}

// Initialize the page when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    initPage();
}