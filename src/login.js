// Import the cookie utilities
import { setCookie, setJSONCookie } from './cookie-utils.js';

// OAuth2 Configuration
const OAUTH_CONFIG = {
    CLIENT_ID: '877506323603-9fhfhbia4vdm3odosobiouf4n019vhar.apps.googleusercontent.com',
    REDIRECT_URI: 'https://luizviniciussoglia.github.io/opportunityhunter/login.html',
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbySg3bwEA0H7L5cY57TnfCyamoylcHsjFLXKZdvtQJHB5AqaOB1bFSNSSC8H1COnqUl/exec',
    SCOPES: 'email profile'
};

// Cache DOM elements for better performance
const elements = {
    btnGoogleLogin: document.getElementById('btnGoogleLogin'),
    loading: document.getElementById('loading'),
    errorMessage: document.getElementById('errorMessage')
};

// Initialize the page
function initPage() {
    // Hide loading spinner and error message by default
    elements.loading.style.display = 'none';
    elements.errorMessage.style.display = 'none';

    // Set up event listeners
    elements.btnGoogleLogin.addEventListener('click', handleGoogleLogin);

    // Check if we're being redirected back from Google after login
    checkForAuthRedirect();
}

// Generate a cryptographically secure random state for OAuth
function generateSecureState() {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Display error message
function displayError(message) {
    elements.loading.style.display = 'none';
    elements.errorMessage.style.display = 'block';
    elements.errorMessage.textContent = message;
    console.error(message);
}

// Handle Google login button click
function handleGoogleLogin() {
    try {
        // Hide error message and show loading spinner
        elements.errorMessage.style.display = 'none';
        elements.loading.style.display = 'block';

        // Generate a secure random state for security
        const state = generateSecureState();
        localStorage.setItem('oauth_state', state);

        // Handle the redirect URL
        const redirect = determineRedirectUrl();
        localStorage.setItem('redirect_after_login', redirect);

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
        displayError('Error redirecting to Google consent page');
        console.error('Error:', error);
    }
}

// Determine the redirect URL after successful login
function determineRedirectUrl() {
    let redirect = './index.html'; // Default redirect URL
    const urlParams = new URLSearchParams(window.location.search);
    const origin = urlParams.get('origin');

    if (origin) {
        try {
            const decodedOrigin = decodeURIComponent(origin);
            const currentSiteUrl = window.location.origin;

            // Verify the origin is from our site
            if (haveSameProtocolAndHost(decodedOrigin, currentSiteUrl)) {
                redirect = decodedOrigin;
            } else {
                console.log('Redirect blocked: Origin is from a different domain');
            }
        } catch (error) {
            console.error('Invalid redirect URL parameter:', error);
        }
    }

    return redirect;
}

// Check if two URLs have the same protocol and host (security measure)
function haveSameProtocolAndHost(url1, url2) {
    try {
        const parsedUrl1 = new URL(url1);
        const parsedUrl2 = new URL(url2);

        return (
            parsedUrl1.protocol === parsedUrl2.protocol &&
            parsedUrl1.host === parsedUrl2.host
        );
    } catch (error) {
        return false;
    }
}

// Check if we've been redirected back from Google OAuth
async function checkForAuthRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    // Check if there's an error
    if (error) {
        displayError('Authentication error: ' + error);
        return;
    }

    // If we have an authorization code, process the login
    if (code && state) {
        // Verify state for security
        const savedState = localStorage.getItem('oauth_state');
        if (state !== savedState) {
            displayError('Security error: invalid state');
            return;
        }

        await processAuthCode(code);
    }
}

// Process the authentication code from Google
async function processAuthCode(code) {
    try {
        elements.loading.style.display = 'block';

        const response = await fetch(OAUTH_CONFIG.APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                code: code,
                redirect_uri: OAUTH_CONFIG.REDIRECT_URI
            })
        });

        const data = await response.json();

        if (data.success) {
            // Successfully authenticated, store tokens and user data
            storeAuthData(data);

            // Redirect to the page the user came from
            const redirect = localStorage.getItem('redirect_after_login') || './index.html';
            window.location.href = redirect;
        } else {
            displayError(data.message || 'Authentication error');
        }
    } catch (error) {
        displayError('Error processing authentication');
        console.error('Error:', error);
    } finally {
        elements.loading.style.display = 'none';

        // Clean up local storage
        localStorage.removeItem('oauth_state');
        localStorage.removeItem('redirect_after_login');
    }
}

// Store authentication data in cookies
function storeAuthData(data) {
    // Store the access token in cookie
    setCookie('access_token', data.access_token, {
        expires: 0.5, // 12 hours (0.5 days)
        secure: true,
        sameSite: 'strict',
        partitioned: false  // Since sameSite is 'strict', partitioned is set to false
    });

    // Store the user data in cookie - using the JSON helper function
    setJSONCookie('user_data', data.user, {
        expires: 0.5, // 12 hours (0.5 days)
        secure: true,
        sameSite: 'strict',
        partitioned: false  // Since sameSite is 'strict', partitioned is set to false
    });
}

// Initialize the page when the window loads
window.addEventListener('load', initPage);