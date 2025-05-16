/**
 * Cookie utility functions with support for SameSite=None; Secure; Partitioned attributes
 * to address Chrome's third-party cookie deprecation
 */

// Set a cookie with all necessary attributes
function setCookie(name, value, options = {}) {
    // Default options
    const defaultOptions = {
        path: '/',
        sameSite: 'none',
        secure: true,
        partitioned: true,
        maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    };

    // Merge provided options with defaults
    const cookieOptions = { ...defaultOptions, ...options };

    // Build the cookie string
    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    // Add path if specified
    if (cookieOptions.path) {
        cookieString += `; Path=${cookieOptions.path}`;
    }

    // Add domain if specified
    if (cookieOptions.domain) {
        cookieString += `; Domain=${cookieOptions.domain}`;
    }

    // Add maxAge if specified
    if (cookieOptions.maxAge) {
        cookieString += `; Max-Age=${cookieOptions.maxAge}`;
    }

    // Add expires if specified
    if (cookieOptions.expires) {
        const expiresDate = cookieOptions.expires instanceof Date
            ? cookieOptions.expires
            : new Date(Date.now() + cookieOptions.expires * 24 * 60 * 60 * 1000);
        cookieString += `; Expires=${expiresDate.toUTCString()}`;
    }

    // Add SameSite attribute
    if (cookieOptions.sameSite) {
        cookieString += `; SameSite=${cookieOptions.sameSite}`;
    }

    // Add Secure attribute if specified
    if (cookieOptions.secure) {
        cookieString += `; Secure`;
    }

    // Add Partitioned attribute if specified
    if (cookieOptions.partitioned) {
        cookieString += `; Partitioned`;
    }

    // Set the cookie
    document.cookie = cookieString;
}

// Get a cookie value by name
function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        // Check if this cookie starts with the name we're looking for
        if (cookie.startsWith(name + '=')) {
            return decodeURIComponent(cookie.substring(name.length + 1));
        }
    }
    return null;
}

// Remove a cookie
function removeCookie(name, options = {}) {
    // To delete a cookie, set its expiration date to the past
    const deleteOptions = {
        ...options,
        maxAge: -1
    };
    setCookie(name, '', deleteOptions);
}

// Check if a cookie exists
function cookieExists(name) {
    return getCookie(name) !== null;
}

// Get a parsed JSON object from a cookie
function getJSONCookie(name) {
    const value = getCookie(name);
    if (!value) return null;

    try {
        return JSON.parse(value);
    } catch (error) {
        console.error(`Error parsing JSON from cookie ${name}:`, error);
        return null;
    }
}

// Set a JSON object as a cookie value
function setJSONCookie(name, value, options = {}) {
    try {
        const jsonValue = JSON.stringify(value);
        setCookie(name, jsonValue, options);
    } catch (error) {
        console.error(`Error stringifying object for cookie ${name}:`, error);
    }
}

// Compatibility layer for js-cookie API users
const CookieUtils = {
    get: getCookie,
    set: setCookie,
    remove: removeCookie,
    getJSON: getJSONCookie
};

// Export all functions
export {
    setCookie,
    getCookie,
    removeCookie,
    cookieExists,
    getJSONCookie,
    setJSONCookie,
    CookieUtils as default
};