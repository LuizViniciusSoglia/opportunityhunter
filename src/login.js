// OAuth2 Configuration
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE'; // Google Client ID
const REDIRECT_URI = 'URL_OF_YOUR_CALLBACK_PAGE'; // URL where Google will redirect after login
const APPS_SCRIPT_URL = 'URL_OF_YOUR_APPS_SCRIPT_WEB_APP'; // URL of Web App in Apps Script that handles the OAuth2 flow
const SCOPES = 'email profile'; // Scopes for the OAuth2 request

// Function to login with Google
document.getElementById('btnGoogleLogin').addEventListener('click', function () {
    // Show loading spinner
    document.getElementById('loading').style.display = 'block';

    // Generate a random state for security
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('oauth_state', state);

    // OAuth2 request parameters
    const authParams = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: SCOPES,
        state: state,
        access_type: 'offline',
        prompt: 'consent'
    });

    // Redirect to Google consent page
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`;
});

// Check if we're being redirected back from Google after login
window.addEventListener('load', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    // Check if there's an error
    if (error) {
        document.getElementById('errorMessage').style.display = 'block';
        document.getElementById('errorMessage').textContent = 'Authentication error: ' + error;
        return;
    }

    // If we have an authorization code, process the login
    if (code && state) {
        // Verify state for security
        const savedState = localStorage.getItem('oauth_state');
        if (state !== savedState) {
            document.getElementById('errorMessage').style.display = 'block';
            document.getElementById('errorMessage').textContent = 'Security error: invalid state';
            return;
        }

        // Show loading
        document.getElementById('loading').style.display = 'block';

        // Send the code to the backend for processing
        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: code, redirect_uri: REDIRECT_URI })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Store the access token in cookie
                    Cookies.set('access_token', data.access_token, {
                        expires: 0.5, // 12 hours (0.5 days)
                        secure: true,
                        sameSite: 'strict'
                    });

                    // Redirect to main application page
                    window.location.href = './index.html';
                } else {
                    document.getElementById('errorMessage').style.display = 'block';
                    document.getElementById('errorMessage').textContent = data.message || 'Authentication error';
                }
            })
            .catch(error => {
                document.getElementById('errorMessage').style.display = 'block';
                document.getElementById('errorMessage').textContent = 'Error processing authentication';
                console.error('Error:', error);
            })
            .finally(() => {
                // Hide loading
                document.getElementById('loading').style.display = 'none';
                // Clear state
                localStorage.removeItem('oauth_state');
            });
    }
});