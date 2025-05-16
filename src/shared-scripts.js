// Import the cookie utilities
import {
    getCookie,
    removeCookie,
    getJSONCookie
} from './cookie-utils.js';

// Authentication check that runs before DOM is fully loaded
function checkAuthenticationEarly() {
    try {
        const token = getCookie('access_token');

        /*if (!isValidJWT(token)) {
            // Redirect to login page immediately if not authenticated
            const currentUrl = encodeURIComponent(window.location.href);
            // Simulate an HTTP redirect (removes the URL from the document history, so it is not possible to use the "back" button)
            window.location.replace(`./login.html?origin=${currentUrl}`);
            // Stop further execution
            return false;
        }*/

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
        alert('An error occurred while checking authentication. Please try again later.');
        // Redirect to login page if an error occurs during authentication check
        const currentUrl = encodeURIComponent(window.location.href);
        window.location.replace(`./login.html?origin=${currentUrl}`);
        return false;
    }
}

// Validate if the token is a valid JWT and not expired
function isValidJWT(token) {
    if (typeof token !== 'string') {
        return false;
    }
    const parts = token.split('.');
    if (parts.length !== 3 || !parts.every(part => /^[A-Za-z0-9-_]+$/.test(part))) {
        return false;
    }
    try {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && Date.now() >= payload.exp * 1000) {
            return false; // Token is expired
        }
        return true;
    } catch (error) {
        console.error('Error decoding token payload:', error);
        return false;
    }
}

// Initialize app only after authentication is confirmed
function initializeApp() {
    // Now it's safe to initialize the app
    putCommonElements(); // Insert common UI elements
    // Add event listeners for the hamburger menu and close button
    document.getElementById('logoutBtn').addEventListener('click', logoutUser);
    document.getElementById('logoutLink').addEventListener('click', logoutUser);
    loadUserInfo(); // Load user information from cookies
    HamburgerMenuConfig(); // Initialize the hamburger menu and nav bar overlay
    // Show the appHeader and appContainer now that authentication is confirmed
    document.getElementById('appHeader').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'block';
    // Hide the loading screen
    document.getElementById('authLoadingScreen').style.display = 'none';
}

// Dynamically inserts common UI elements
function putCommonElements() {
    // Create a container for the elements
    const navMenuAndHeader = document.createElement('div');
    navMenuAndHeader.className = 'header-container';

    navMenuAndHeader.innerHTML = `
    <div id="navOverlay" class="nav-overlay">
        <div class="nav-menu">
        <div class="nav-header">
            <img src="./img/logo.png" alt="GenZ Crowd AI" class="nav-logo">
            <button id="closeNavBtn" class="close-nav-btn" aria-label="Close navigation menu">
            <span class="close-line"></span>
            <span class="close-line"></span>
            </button>
        </div>
        <ul class="nav-links">
            <li><a href="./index.html" class="nav-link"><span class="nav-icon">&#x1F3E0;</span>Main Menu</a></li>
            <li><a href="./opportunity-hunter.html" class="nav-link"><span class="nav-icon">&#x1F48E;</span>Opportunity
                Hunter</a>
            </li>
            <li><a href="./resume-maker-ai.html" class="nav-link"><span class="nav-icon">&#x1F916;</span>Resume Maker AI</a>
            </li>
            <li><a href="./academy.html" class="nav-link"><span class="nav-icon">&#x1F4A1;</span>GenZ Academy</a>
            </li>
            <li><a href="#" id="logoutLink" class="nav-link sign-out"><span
                class="nav-icon">&#x27A1;&#xFE0F;</span>Sign
                Out</a></li>
        </ul>
        </div>
    </div>

    <header id="appHeader" aria-label="Application Header">
        <!-- Hamburger Menu Button -->
        <div class="hamburger-menu-container">
        <button id="hamburgerBtn" class="hamburger-btn" aria-label="Open navigation menu">
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
        </button>
        </div>

        <div class="user-info">
        <img id="userAvatar" src="./img/avatardefault.png" alt="User avatar">
        <span id="userName" class="user-name">Loading...</span>
        <button id="logoutBtn" class="logout-btn" aria-label="Sign out">SIGN OUT</button>
        </div>
    </header>`;

    const placeholder = document.getElementById('navMenuAndHeaderElement');
    if (placeholder) {
        placeholder.replaceWith(navMenuAndHeader);
    } else {
        document.body.insertBefore(navMenuAndHeader, document.body.firstChild);
    }
}

// Load user information from user_data cookie stored
function loadUserInfo() {
    // DOM elements for user information
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');

    // Get user data from cookie
    const user = getJSONCookie('user_data');

    if (!user || typeof user !== 'object') {
        //console.log('User data not found in cookies');
        userName.textContent = 'User';
        return;
    }

    // Update interface with user information
    const name = user.name ? user.name : (user.email || 'User'); // Use email as fallback if name is not available
    userName.textContent = name;

    // If the user's image URL exists in user_data cookie, a trick is used to avoid cache use, which results in a CORS error.
    // Use the default image if it is not available.
    if (user.picture) {
        userAvatar.src = user.picture + '?not-from-cache';
    }
    userAvatar.alt = name + ' Avatar';
    userAvatar.onerror = function () {
        this.onerror = null; // Remove error handler to prevent infinite loop
        this.src = './img/avatardefault.png'; // Use default image on error
    };
}

// Handle logout
function logoutUser() {
    // Clear cookies
    removeCookie('access_token');
    removeCookie('user_data');

    // Redirect to login page
    const currentUrl = encodeURIComponent(window.location.href); // Encode the current URL for redirection
    // Simulate an HTTP redirect (removes the URL from the document history, so it is not possible to use the "back" button)
    window.location.replace(`./login.html?origin=${currentUrl}`);
}

// Handle with the hamburger menu and nav bar overlay - Add event listeners to menu items
function HamburgerMenuConfig() {
    // Add hover effect to menu items
    document.querySelectorAll('.menuItem').forEach(item => {

        item.addEventListener('mouseenter', () => {
            item.querySelector('.btn').style.opacity = '1';
            item.querySelector('.btn').style.transform = 'translateY(0)';
        });

        item.addEventListener('mouseleave', () => {
            item.querySelector('.btn').style.opacity = '0';
            item.querySelector('.btn').style.transform = 'translateY(20px)';
        });

        item.addEventListener('touchstart', () => {
            item.querySelector('.btn').style.opacity = '1';
            item.querySelector('.btn').style.transform = 'translateY(0)';
        }, { passive: true });
    });

    // Hamburger menu functionality
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeNavBtn = document.getElementById('closeNavBtn');
    const navOverlay = document.getElementById('navOverlay');

    // Open menu when hamburger button is clicked
    hamburgerBtn.addEventListener('click', () => {
        navOverlay.classList.add('active');
        hamburgerBtn.classList.add('active'); // Add active class
        document.body.style.overflow = 'hidden';
    });

    // Close menu when close button is clicked
    closeNavBtn.addEventListener('click', () => {
        navOverlay.classList.remove('active');
        hamburgerBtn.classList.remove('active'); // Remove active class
        document.body.style.overflow = '';
    });

    // Close menu when clicking outside the menu
    navOverlay.addEventListener('click', (e) => {
        if (e.target === navOverlay) {
            navOverlay.classList.remove('active');
            hamburgerBtn.classList.remove('active'); // Remove active class
            document.body.style.overflow = '';
        }
    });

    // Close menu when pressing escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navOverlay.classList.contains('active')) {
            navOverlay.classList.remove('active');
            hamburgerBtn.classList.remove('active'); // Remove active class
            document.body.style.overflow = '';
            document.activeElement.blur(); // Focus back on the body to avoid still focusing on the menu
        }
    });
}

// Export functions that need to be accessible from other modules
export {
    checkAuthenticationEarly,
    isValidJWT,
    logoutUser
};