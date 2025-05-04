// OAuth2 Configuration
const CLIENT_ID = '877506323603-9fhfhbia4vdm3odosobiouf4n019vhar.apps.googleusercontent.com'; // Google Client ID
const REDIRECT_URI = 'https://luizviniciussoglia.github.io/opportunityhunter/login.html'; // URL where Google will redirect after login (back to login page)
// URL of Web App in Apps Script that handles the OAuth2 flow (backend)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbykRiacN1DrYLUSwW4blHC9IUi1CNy4Er8SznzT5vC3T-7oLZAJOBzNmj_p4c1HTk5Q/exec';
// Scopes for the OAuth2 request
const SCOPES = 'email profile';

// Function to login with Google
document.getElementById('btnGoogleLogin').addEventListener('click', function () {
    try {
        // Hide error message and show loading spinner
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('loading').style.display = 'block';

        // Generate a random state for security
        const state = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('oauth_state', state);

        // Store the URL that the user came from to redirect them back after successful login
        let redirect = './index.html'; // Default redirect URL if origin is not allowed
        const urlParams = new URLSearchParams(window.location.search);
        const origin = urlParams.get('origin');
        if (origin) {
            try {
                const decodedOrigin = decodeURIComponent(origin);
                const currentSiteUrl = window.location.origin; // protocol + "//" + host of the current page (login.html)
                // Use the haveSameProtocolAndHost function to verify the origin is from our site
                if (haveSameProtocolAndHost(decodedOrigin, currentSiteUrl)) {
                    redirect = decodedOrigin; // Only set redirect if origin has the same protocol and host as our site
                } else {
                    console.log('Redirect blocked: Origin is from a different domain');
                }
            } catch (error) {
                console.error('Invalid redirect URL parameter:', error);
                // Keep the default redirect if there was an error
            }
        }

        localStorage.setItem('redirect_after_login', redirect);

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
        // Simulate a mouse click:
        //window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`;
        // Simulate an HTTP redirect (removes the URL from the document history, so it is not possible to use the "back" button)
        window.location.replace(`https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`);
    } catch (error) {
        document.getElementById('loading').style.display = 'none'; // Hide loading
        document.getElementById('errorMessage').style.display = 'block';
        document.getElementById('errorMessage').textContent = 'Error redirecting to Google consent page';
        console.error('Error:', error);
    }
});

function haveSameProtocolAndHost(url1, url2) {
    try {
        const parsedUrl1 = new URL(url1); // Create URL objects to parse the URLs
        const parsedUrl2 = new URL(url2);

        return ( // Compare protocol (e.g., 'https:') and host (e.g., 'example.com')
            parsedUrl1.protocol === parsedUrl2.protocol &&
            parsedUrl1.host === parsedUrl2.host
        );
    } catch (error) { // Handle invalid URLs
        return false;
    }
}

// Check if we're being redirected back from Google after login
// code, state and error are URL parameters returned by Google after login (not use these names for other purposes)
window.addEventListener('load', function () {

    document.getElementById('loading').style.display = 'none'; // Hide loading spinner by default
    document.getElementById('errorMessage').style.display = 'none'; // Hide error message by default

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
                    Cookies.set('user_data', JSON.stringify(data.user), {
                        expires: 0.5, // 12 hours (0.5 days)
                        secure: true,
                        sameSite: 'strict'
                    });
                    // Redirect to the page the user came from (origin) or default to index.html
                    const redirect = localStorage.getItem('redirect_after_login') || './index.html';
                    window.location.href = redirect; // Redirect to the original page
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
                document.getElementById('loading').style.display = 'none'; // Hide loading
                localStorage.removeItem('oauth_state'); // Clear state
                localStorage.removeItem('redirect_after_login'); // Clear the redirect location to avoid redirect loops
            });
    }
});