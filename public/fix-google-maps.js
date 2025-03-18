// This script helps prevent multiple Google Maps API loading issues
(function () {
  // Keep track of whether we've already loaded the API
  window.googleMapsLoaded = window.googleMapsLoaded || false;

  // Store the original appendChild method
  const originalAppendChild = Document.prototype.appendChild;

  // Override appendChild to intercept Google Maps script additions
  Document.prototype.appendChild = function (element) {
    // Check if this is a script element loading Google Maps
    if (
      element.tagName === "SCRIPT" &&
      element.src &&
      element.src.includes("maps.googleapis.com")
    ) {
      console.log("Intercepted Google Maps script load attempt");

      // If we've already loaded the API, don't add another script
      if (window.googleMapsLoaded || (window.google && window.google.maps)) {
        console.log("Google Maps already loaded, preventing duplicate load");
        window.googleMapsLoaded = true;

        // Extract the callback name from the URL
        const callbackMatch = element.src.match(/callback=([^&]*)/i);
        if (callbackMatch && callbackMatch[1]) {
          const callbackName = callbackMatch[1];
          console.log(`Executing callback ${callbackName} directly`);

          // If the callback exists, call it directly
          if (
            window[callbackName] &&
            typeof window[callbackName] === "function"
          ) {
            setTimeout(() => {
              window[callbackName]();
            }, 0);
          }
        }

        // Return a dummy element to prevent errors
        return document.createComment("Prevented duplicate Google Maps load");
      }

      // If this is the first load, mark as loaded and proceed normally
      console.log("Loading Google Maps API for the first time");
      window.googleMapsLoaded = true;
    }

    // Call the original method for normal behavior
    return originalAppendChild.call(this, element);
  };
})();
