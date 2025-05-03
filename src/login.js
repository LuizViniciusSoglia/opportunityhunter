// OAuth2 Configuration
const CLIENT_ID = '877506323603-9fhfhbia4vdm3odosobiouf4n019vhar.apps.googleusercontent.com'; // Google Client ID
const REDIRECT_URI = 'https://luizviniciussoglia.github.io/opportunityhunter/login.html'; // URL where Google will redirect after login (back to login page)
// URL of Web App in Apps Script that handles the OAuth2 flow (backend)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbykRiacN1DrYLUSwW4blHC9IUi1CNy4Er8SznzT5vC3T-7oLZAJOBzNmj_p4c1HTk5Q/exec';
// Scopes for the OAuth2 request
const SCOPES = 'email profile';

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
            /*headers: { // headers causes CORS issues with Apps Script Web App (avoiding CORS preflight)
                'Content-Type': 'application/json'
            },*/
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
                    // Store the user data in cookie
                    Cookies.set('user_data', data.user, {
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