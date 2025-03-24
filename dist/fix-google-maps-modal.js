// This script specifically fixes Google Maps in modal dialogs
(function () {
  console.log("Modal Maps fix script loaded");

  // Function to force map rendering in modals
  function fixMapsInModals() {
    // Find all dialog content elements that might contain maps
    const dialogContents = document.querySelectorAll(
      '[class*="DialogContent"], [role="dialog"]',
    );

    console.log(`Found ${dialogContents.length} dialog elements to check`);

    dialogContents.forEach((dialog, index) => {
      // Find map containers within this dialog
      const mapContainers = dialog.querySelectorAll(
        '[ref="mapRef"], [ref="editMapRef"], [ref="mapPickerRef"], [class*="map"]',
      );

      console.log(
        `Dialog ${index}: Found ${mapContainers.length} map containers`,
      );

      if (mapContainers.length > 0) {
        // Force the dialog to be visible and have dimensions
        if (dialog.style.display === "none") {
          dialog.style.display = "block";
        }

        // Process each map container
        mapContainers.forEach((container, mapIndex) => {
          console.log(
            `Processing map container ${mapIndex} in dialog ${index}`,
          );

          // Force container to have dimensions
          if (container.offsetHeight < 100) {
            container.style.height = "300px";
          }
          if (container.offsetWidth < 100) {
            container.style.width = "100%";
          }

          // Force visibility
          container.style.opacity = "1";
          container.style.visibility = "visible";

          // Trigger resize event on the window to force Google Maps to recalculate dimensions
          setTimeout(() => {
            window.dispatchEvent(new Event("resize"));
            console.log(
              `Triggered resize for map ${mapIndex} in dialog ${index}`,
            );

            // If Google Maps exists, try to force redraw of any maps
            if (window.google && window.google.maps) {
              const maps = Object.values(window.google.maps).filter(
                (item) =>
                  item &&
                  typeof item === "object" &&
                  item.setZoom &&
                  typeof item.setZoom === "function",
              );

              console.log(`Found ${maps.length} map instances to refresh`);

              maps.forEach((map) => {
                try {
                  const currentZoom = map.getZoom();
                  map.setZoom(currentZoom - 1);
                  setTimeout(() => map.setZoom(currentZoom), 50);
                  console.log("Forced map redraw by changing zoom");
                } catch (e) {
                  console.log("Error forcing map redraw:", e);
                }
              });
            }
          }, 200);
        });
      }
    });
  }

  // Run when dialogs might open
  document.addEventListener("click", function () {
    setTimeout(fixMapsInModals, 300);
  });

  // Monitor DOM changes to detect when dialogs are added
  const observer = new MutationObserver(function (mutations) {
    let shouldCheck = false;

    mutations.forEach(function (mutation) {
      if (mutation.addedNodes.length) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.nodeType === 1) {
            // Element node
            if (
              node.classList &&
              (node.classList.contains("DialogContent") ||
                node.getAttribute("role") === "dialog" ||
                node.querySelector('[role="dialog"]'))
            ) {
              shouldCheck = true;
              break;
            }
          }
        }
      }
    });

    if (shouldCheck) {
      setTimeout(fixMapsInModals, 300);
    }
  });

  // Start observing the document body for dialog additions
  observer.observe(document.body, { childList: true, subtree: true });

  // Also run on window load and after a short delay
  window.addEventListener("load", function () {
    setTimeout(fixMapsInModals, 500);
    setTimeout(fixMapsInModals, 1000);
    setTimeout(fixMapsInModals, 2000);
  });
})();
