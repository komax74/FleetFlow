// This script helps ensure Google Maps loads and renders correctly
(function () {
  console.log("Maps API fix script loaded");

  // Function to check if maps are visible and force redraw if needed
  function checkAndFixMaps() {
    console.log("Checking map elements...");

    // Find all potential map containers
    const mapElements = document.querySelectorAll(
      '[id="map"], [class*="map"], [ref="mapRef"], [ref="editMapRef"], [ref="mapPickerRef"]',
    );

    console.log(`Found ${mapElements.length} potential map elements`);

    mapElements.forEach((element, index) => {
      console.log(`Map element ${index}:`, {
        id: element.id,
        className: element.className,
        dimensions: {
          offsetWidth: element.offsetWidth,
          offsetHeight: element.offsetHeight,
          clientWidth: element.clientWidth,
          clientHeight: element.clientHeight,
        },
        isVisible: element.offsetParent !== null,
      });

      // If element has zero dimensions but should be visible, try to fix
      if (element.offsetWidth === 0 || element.offsetHeight === 0) {
        console.log(`Attempting to fix map element ${index}`);

        // Force display and dimensions if needed
        if (element.style.display === "none") {
          element.style.display = "block";
        }

        // Ensure minimum dimensions
        if (element.offsetHeight < 10) {
          element.style.height = "300px";
        }
        if (element.offsetWidth < 10) {
          element.style.width = "100%";
        }

        // Trigger resize event to help Google Maps recalculate dimensions
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));
          console.log(`Triggered resize for map element ${index}`);
        }, 100);
      }
    });
  }

  // Run the check after the page has loaded and components have rendered
  window.addEventListener("load", function () {
    setTimeout(checkAndFixMaps, 1000);
    setTimeout(checkAndFixMaps, 2000); // Run again after 2 seconds
    setTimeout(checkAndFixMaps, 5000); // And again after 5 seconds
  });

  // Also run when dialogs might open
  document.addEventListener("click", function () {
    setTimeout(checkAndFixMaps, 500);
  });
})();
