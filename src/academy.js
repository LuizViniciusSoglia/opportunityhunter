(function () {
  // Execute authentication check immediately when script loads
  // before any DOM content is shown to user
  if(!checkAuthenticationEarly()) { return; } // Stop execution if authentication check fails
  // Initialize app only after authentication is confirmed
  // Add Event listeners and other initialization codes
})();