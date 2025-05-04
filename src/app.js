(function () {

  // DOM Elements Cache - will only be used if authentication passes
  let userName, userAvatar, logoutBtn, queryInput, countrySelect, companySelect,
    searchBtn, loader, resultsContainer, matchesFound, resultsSearch;

  // Cache DOM elements after authentication
  function cacheElements() {
    userName = document.getElementById('userName');
    userAvatar = document.getElementById('userAvatar');
    logoutBtn = document.getElementById('logoutBtn');
    queryInput = document.getElementById('query');
    countrySelect = document.getElementById('country');
    companySelect = document.getElementById('company');
    searchBtn = document.getElementById('searchBtn');
    loader = document.getElementById('loader');
    resultsContainer = document.getElementById('resultsContainer');
    matchesFound = document.getElementById('matchesFound');
    resultsSearch = document.getElementById('resultsSearch');
  }

  // Execute authentication check immediately when script loads
  // before any DOM content is shown to user
  checkAuthenticationEarly();

  // Authentication check that runs before DOM is fully loaded
  function checkAuthenticationEarly() {
    const token = typeof Cookies !== 'undefined' && typeof Cookies.get === 'function' ? Cookies.get('access_token') : null;

    if (!isValidJWT(token)) {
      // Redirect to login page immediately if not authenticated
      const currentUrl = encodeURIComponent(window.location.href);
      window.location.href = `./login.html?origin=${currentUrl}`;
      // Stop further execution
      return;
    }

    // If authenticated, add event listener to initialize app once DOM is loaded
    if (document.readyState === "loading") {
      document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
      initializeApp();
    }
  }

  // Initialize app only after authentication is confirmed
  function initializeApp() {
    // Only cache DOM elements after authentication is confirmed
    cacheElements();
    // Now it's safe to initialize the app
    logoutBtn.addEventListener('click', logoutUser);
    loadInfo();
    searchBtn.addEventListener('click', searchOpport);
    loadUserInfo();
    // Show the main content now that authentication is confirmed
    document.getElementById('mainContent').style.display = 'block';
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

  // Load user information from user_data cookie stored
  function loadUserInfo() {
    try {
      const user = typeof Cookies !== 'undefined' && typeof Cookies.get === 'function' ? JSON.parse(Cookies.get('user_data') || '{}') : null;

      if (!user || typeof user !== 'object') {
        console.log('User data not found in cookies');
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
    catch (error) {
      console.error('Error loading user data:', error);
      userName.textContent = 'User';
    }
  }

  // Handle logout
  function logoutUser() {
    // Clear cookies
    if (typeof Cookies !== 'undefined' && typeof Cookies.remove === 'function') {
      Cookies.remove('access_token');
      Cookies.remove('user_data');
    } else {
      console.warn('Cookies library is not available. Unable to clear cookies.');
    }
    // Redirect to login page
    const currentUrl = encodeURIComponent(window.location.href); // Encode the current URL for redirection
    window.location.href = `./login.html?origin=${currentUrl}`; // Redirect to login page with the current URL as origin parameter
  }

  //=================================================================================

  // Search Functionality
  // This part handles the search functionality of the application.
  // It allows users to search for opportunities based on a query, country, and company.
  // The results are displayed dynamically on the page.

  // URL of the API endpoint (Google Apps Script Web App)
  const APPS_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbxLqZsBoKxmM2c7Bxkw8d3HQmGP3gdqzQx7j_mmVmlnfqHn0pE29fRoBcmwBoNzXg1Gzg/exec';

  // Controls the display of loader vs results
  const toggleLoader = show => {
    loader.style.display = show ? 'block' : 'none';
    resultsContainer.style.display = show ? 'none' : 'block';
  };

  // Generates <option> tags from an array
  const genOptions = arr =>
    arr.length
      ? arr.map(item => `<option value="${item}">${item}</option>`).join('')
      : '<option value="">No Options</option>';

  // Loads country and company selects and injects query string values
  async function loadInfo() {
    try {
      countrySelect.innerHTML = genOptions(listCountries);
      companySelect.innerHTML = genOptions(listCompanies);
    } catch {
      countrySelect.innerHTML = companySelect.innerHTML = '<option value="">Error loading</option>';
    }

    // If there are parameters in the URL, set values in the fields
    const params = new URLSearchParams(window.location.search);
    const queryParam = params.get('query');
    const countryParam = params.get('country');
    const companyParam = params.get('company');
    if (queryParam) {
      queryInput.value = queryParam;
    }
    if (countryParam && listCountries.includes(countryParam)) {
      countrySelect.value = countryParam;
    }
    if (companyParam && listCompanies.includes(companyParam)) {
      companySelect.value = companyParam;
    }
  }

  // Calls the API and displays results
  async function searchOpport() {
    try {
      // Show loader while fetching data
      toggleLoader(true);

      // Retrieve the token from cookies
      const token = typeof Cookies !== 'undefined' && typeof Cookies.get === 'function' ? Cookies.get('access_token') : null;

      // Validate the token; redirect to login if invalid
      if (!isValidJWT(token)) {
        // Redirect to login page if not authenticated
        const currentUrl = encodeURIComponent(window.location.href);
        window.location.href = `./login.html?origin=${currentUrl}`;
        return;
      }

      // Construct API parameters
      const params = new URLSearchParams({
        action: 'getOpportunities',
        query: queryInput.value,
        country: countrySelect.value,
        company: companySelect.value,
        token: token // Pass token as URL parameter instead of header
      });

      let res;
      try {
        // Make the API call with the token
        res = await fetch(`${APPS_SCRIPT_API_URL}?${params}`, {
          method: 'GET',
          // No Authorization header - headers causes CORS issues with Apps Script Web App (avoiding CORS preflight)
          /*headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }*/
        });
      } catch (networkError) {
        // Handle network errors
        throw new Error('Network error occurred. Please check your connection.');
      }

      // Check if the response is not OK
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

      let status, response;
      try {
        // Parse the JSON response
        ({ status, message, response } = await res.json());
      } catch (e) {
        // Handle invalid JSON responses
        throw new Error('Invalid JSON response from API');
      }

      // Display the results
      displayResults(status, message, response, companySelect.value);
    } catch (e) {
      // Handle errors and display user-friendly messages
      const userFriendlyMessage = e.message.includes('404')
        ? 'No results found. Please refine your search criteria.'
        : 'An unexpected error occurred. Please try again later.';
      matchesFound.innerHTML = `<strong>${userFriendlyMessage}</strong>`;
    } finally {
      // Hide the loader and scroll to the results container
      toggleLoader(false);
      if ('scrollBehavior' in document.documentElement.style) {
        resultsContainer.scrollIntoView({ behavior: "smooth" }); // Smooth scroll for supported browsers
      } else {
        resultsContainer.scrollIntoView(); // Fallback for older browsers
      }
    }
  }

  // Displays results using DocumentFragment
  function displayResults(status, message, response = [], companyFilter) {
    resultsSearch.innerHTML = '';

    if (status !== 200) {
      matchesFound.innerHTML = `<strong>${status} - ${message}.</strong>`;
      if (status === 401) {
        // If the status is 401, it means the token is invalid or expired
        logoutUser(); // // Handle unauthorized access - log out the user immediately
      }
      return;
    }

    const filtered = (
      !companyFilter || companyFilter === 'All'
        ? response
        : response.map(([title, location, url]) => [title, location, url, companyFilter])
    );

    if (!filtered.length) {
      matchesFound.innerHTML = '<strong>No Results Found.</strong>';
      return;
    }

    const frag = document.createDocumentFragment();
    filtered.forEach(([title, loc, url, comp]) => {
      const div = document.createElement('div');
      div.className = 'resultElement';
      div.innerHTML = `
        <a href="${url ? url + '" target="_blank"' : '#mainContent" target="_self"'}>${title || 'N/A'}</a><br>
        Company: ${comp || 'N/A'}<br>
        Location: ${loc || 'N/A'}
      `;
      frag.appendChild(div);
    });
    resultsSearch.appendChild(frag);

    matchesFound.innerHTML = `<strong>${filtered.length} Result${filtered.length > 1 ? 's' : ''} Found:</strong>`;
  }

  // Lists of countries and companies
  const listCountries = ["All", "Global", "Other", "Afghanistan", "Åland Islands", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegowina", "Botswana", "Brazil", "Brunei Darussalam", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Democratic Republic)", "Congo (People’s Republic)", "Costa Rica", "Cote d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Greenland", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "North Korea", "South Korea", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Puerto Rico", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Príncipe", "Saudi Arabia", "Senegal", "Serbia", "Serbia and Montenegro", "Seychelles", "Sierra Leone", "Singapore", "Slovak Republic", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "Spain", "Sri Lanka", "Sudan", "Suriname", "Swaziland", "Sweden", "Switzerland", "Syrian Arab Republic", "Tajikistan", "Tanzania", "Taiwan", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Türkiye", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam", "British Virgin Islands", "Virgin Islands", "Wallis and Futuna", "Western Sahara", "Yemen", "Zambia", "Zimbabwe"];
  const listCompanies = ["All", "TELUS", "Welocalize", "CrowdGen", "Outlier"];
})();