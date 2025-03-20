import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Header from "./Header";
import { Vehicle } from "@/types/vehicles";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useToast } from "../ui/use-toast";

// Usa un token pubblico di Mapbox (pk.*)
// I token segreti (sk.*) non possono essere usati nel frontend
// Usa il token dall'env o un token di fallback
try {
  mapboxgl.accessToken =
    import.meta.env.VITE_MAPBOX_TOKEN ||
    "pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA";
  // Token set successfully
} catch (error) {
  console.error("Error setting Mapbox token:", error);
}

interface VehicleWithLocation extends Vehicle {
  last_location?: string;
  location_lat?: number;
  location_lng?: number;
  custom_location?: boolean;
}

const MapboxMap = () => {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<VehicleWithLocation[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [clusteringEnabled, setClusteringEnabled] = useState(false);

  // State for default map settings
  const [defaultMapSettings, setDefaultMapSettings] = useState({
    lat: 45.4642, // Default to Milan
    lng: 9.19,
  });

  // Fetch vehicles on component mount and set up subscriptions
  useEffect(() => {
    // Component mounted, fetching settings and setting up subscriptions
    // Fetch default map settings
    fetchDefaultMapSettings();

    // Set up a subscription to vehicle updates
    const vehiclesSubscription = supabase
      .channel("vehicles-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "vehicles",
        },
        () => {
          // Vehicle update detected, refreshing vehicles
          // Refresh vehicles when there's an update
          fetchVehicles();
        },
      )
      .subscribe();

    // Set up a subscription to booking updates to detect vehicles in transit
    const bookingsSubscription = supabase
      .channel("bookings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          // Refresh vehicles when there's a booking update
          fetchVehicles();
        },
      )
      .subscribe();

    return () => {
      // Clean up map and subscriptions when component unmounts
      if (map) {
        markers.forEach((marker) => marker.remove());
        map.remove();
      }
      supabase.removeChannel(vehiclesSubscription);
      supabase.removeChannel(bookingsSubscription);
    };
  }, []);

  // Initialize map when container is available and data is loaded
  useEffect(() => {
    if (mapContainer.current && !map && dataLoaded) {
      try {
        initializeMap();
      } catch (error) {
        console.error("Error initializing map:", error);
        setMapError("Errore nell'inizializzazione della mappa");
        setIsLoading(false);
      }
    }
  }, [mapContainer.current, dataLoaded]);

  // Update markers when vehicles or selected vehicle changes
  useEffect(() => {
    if (map && mapLoaded) {
      // Map and mapLoaded are true, updating markers
      // Clear existing markers first
      markers.forEach((marker) => marker.remove());
      setMarkers([]);

      if (clusteringEnabled) {
        updateClusteredMarkers();
      } else {
        // Use our new custom markers with labels instead of the old updateMarkers
        updateCustomMarkers();
      }
    } else {
      // Map or mapLoaded is false, not updating markers
    }
  }, [map, vehicles, selectedVehicleId, mapLoaded, clusteringEnabled]);

  // Fetch default map settings from Supabase
  const fetchDefaultMapSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("key", "default_map_location");

      if (!error && data && data.length > 0 && data[0]?.value) {
        try {
          const mapSettings = JSON.parse(data[0].value);
          setDefaultMapSettings({
            lat: parseFloat(mapSettings.lat) || 45.4642,
            lng: parseFloat(mapSettings.lng) || 9.19,
          });
          // Default map settings loaded
        } catch (e) {
          console.error("Error parsing default map settings:", e);
        }
      }

      // After loading settings, fetch vehicles
      await fetchVehicles();
    } catch (error) {
      console.error("Error fetching default map settings:", error);
      // Still try to fetch vehicles even if settings fail
      await fetchVehicles();
    }
  };

  const fetchVehicles = async () => {
    try {
      setIsLoading(true);

      // First fetch locations to use for vehicles without GPS coordinates
      const { data: locationsData, error: locationsError } = await supabase
        .from("locations")
        .select("*")
        .order("name", { ascending: true });

      if (locationsError) {
        console.error("Error fetching locations:", locationsError);
      }

      // Get current date and time for checking active bookings
      const now = new Date();

      // Fetch all vehicles with their bookings
      const { data, error } = await supabase
        .from("vehicles")
        .select(
          "*, bookings(pickup_time, return_time, return_location, status, location_lat, location_lng, custom_location, created_at)",
        )
        .order("brand", { ascending: true });

      if (error) throw error;

      // Process the data to get the last location for each vehicle
      const processedVehicles = data?.map((vehicle) => {
        // Check if vehicle is in maintenance and if the maintenance has already started
        if (vehicle.status === "maintenance" && vehicle.maintenance_start) {
          const maintenanceStartDate = new Date(vehicle.maintenance_start);
          const now = new Date();

          // Only mark as in maintenance if the maintenance period has started
          if (maintenanceStartDate <= now) {
            return {
              ...vehicle,
              last_location: "In manutenzione",
              has_valid_location: false,
              in_maintenance: true,
            };
          }
          // If maintenance is scheduled for the future, treat as normal vehicle but mark it
          // We need to process location data for vehicles with future maintenance
          // First check if the vehicle has direct GPS coordinates
          if (vehicle.location_lat && vehicle.location_lng) {
            return {
              ...vehicle,
              future_maintenance: true,
              last_location: vehicle.last_location || "Posizione GPS veicolo",
              custom_location: true,
              has_valid_location: true,
            };
          }

          // If no direct coordinates, try to get location from the last completed booking
          const lastCompletedBooking = vehicle.bookings
            ?.filter((booking: any) => booking.status === "completed")
            .sort((a: any, b: any) => {
              return (
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
              );
            })[0];

          // If booking has location data, use it
          if (
            lastCompletedBooking?.location_lat &&
            lastCompletedBooking?.location_lng
          ) {
            return {
              ...vehicle,
              future_maintenance: true,
              last_location:
                lastCompletedBooking.return_location ||
                "Ultima posizione prenotazione",
              location_lat: lastCompletedBooking.location_lat,
              location_lng: lastCompletedBooking.location_lng,
              custom_location: lastCompletedBooking.custom_location || false,
              has_valid_location: true,
            };
          }

          // No valid location data available
          return {
            ...vehicle,
            future_maintenance: true,
            last_location: "Nessuna posizione",
            has_valid_location: false,
          };
        }

        // Check if vehicle is currently in transit (has active booking)
        const activeBooking = vehicle.bookings?.find((booking: any) => {
          if (booking.status !== "confirmed") return false;

          const pickupTime = new Date(booking.pickup_time);
          const returnTime = new Date(booking.return_time);

          // Fix: Use only the date part for comparison to ensure it works correctly
          const nowDate = new Date(now.toDateString());
          const pickupDate = new Date(pickupTime.toDateString());
          const returnDate = new Date(returnTime.toDateString());

          return nowDate >= pickupDate && nowDate <= returnDate;
        });

        if (activeBooking) {
          // Vehicle is in transit, don't show on map
          return {
            ...vehicle,
            last_location: "In viaggio",
            has_valid_location: false, // This ensures it won't be displayed on the map
            in_transit: true,
          };
        }

        // Only include vehicles with valid coordinates
        if (vehicle.location_lat && vehicle.location_lng) {
          return {
            ...vehicle,
            last_location: vehicle.last_location || "Posizione GPS veicolo",
            custom_location: true,
            has_valid_location: true,
          };
        }

        // Find the most recent completed booking for this vehicle
        const lastCompletedBooking = vehicle.bookings
          ?.filter((booking: any) => booking.status === "completed")
          .sort((a: any, b: any) => {
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
          })[0];

        // If booking has location data, use it
        if (
          lastCompletedBooking?.location_lat &&
          lastCompletedBooking?.location_lng
        ) {
          return {
            ...vehicle,
            last_location:
              lastCompletedBooking.return_location ||
              "Ultima posizione prenotazione",
            location_lat: lastCompletedBooking.location_lat,
            location_lng: lastCompletedBooking.location_lng,
            custom_location: lastCompletedBooking.custom_location || false,
            has_valid_location: true,
          };
        }

        // No valid location data available
        return {
          ...vehicle,
          last_location: "Nessuna posizione",
          has_valid_location: false,
        };
      });

      setVehicles(processedVehicles || []);
      setDataLoaded(true);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      setIsLoading(false);
      setDataLoaded(true); // Still mark as loaded to prevent infinite loading
    }
  };

  const initializeMap = () => {
    if (!mapContainer.current) return;

    try {
      if (!mapboxgl.accessToken) {
        console.error("Mapbox token is not set");
        setMapError("Token Mapbox non valido o mancante");
        setIsLoading(false);
        return;
      }

      // Initializing map with public token

      // Calculate initial bounds from vehicles with valid locations
      const bounds = new mapboxgl.LngLatBounds();
      let hasValidVehicles = false;

      vehicles.forEach((vehicle) => {
        if (
          vehicle.has_valid_location &&
          vehicle.location_lat &&
          vehicle.location_lng
        ) {
          bounds.extend([vehicle.location_lng, vehicle.location_lat]);
          hasValidVehicles = true;
        }
      });

      // Use the default map settings from state if no valid vehicles
      const defaultCenter = [defaultMapSettings.lng, defaultMapSettings.lat]; // Mapbox uses [lng, lat] format

      const newMap = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v11",
        center: defaultCenter,
        zoom: 14, // Higher initial zoom level
        attributionControl: false,
      });

      // Add navigation controls
      newMap.addControl(new mapboxgl.NavigationControl(), "top-right");
      newMap.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        "bottom-right",
      );

      newMap.on("load", () => {
        // Mapbox map initialized successfully
        setMap(newMap);
        setMapLoaded(true);

        // Add sources and layers for clustering
        newMap.addSource("vehicles", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
          cluster: true,
          clusterMaxZoom: 14, // At zoom level 15 and above, points will not be clustered
          clusterRadius: 50,
        });

        // Add cluster circles
        newMap.addLayer({
          id: "clusters",
          type: "circle",
          source: "vehicles",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#51bbd6", // 0-4 points: blue
              5,
              "#f1f075", // 5-9 points: yellow
              10,
              "#f28cb1", // 10+ points: pink
            ],
            "circle-radius": [
              "step",
              ["get", "point_count"],
              20, // 0-4 points: 20px radius
              5,
              25, // 5-9 points: 25px radius
              10,
              30, // 10+ points: 30px radius
            ],
            "circle-stroke-width": 1,
            "circle-stroke-color": "#fff",
          },
        });

        // Add cluster count labels
        newMap.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "vehicles",
          filter: ["has", "point_count"],
          layout: {
            "text-field": "{point_count_abbreviated}",
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 12,
          },
          paint: {
            "text-color": "#ffffff",
          },
        });

        // Add unclustered point layer
        newMap.addLayer({
          id: "unclustered-point",
          type: "circle",
          source: "vehicles",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "#3b82f6",
            "circle-radius": 8,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
            // Fixed opacity value
            "circle-opacity": 0.9,
          },
        });

        // Fit bounds to show all vehicles with valid locations
        if (hasValidVehicles && !bounds.isEmpty()) {
          const validVehiclesCount = vehicles.filter(
            (v) => v.has_valid_location && v.location_lat && v.location_lng,
          ).length;
          const padding = validVehiclesCount <= 3 ? 30 : 60;

          newMap.fitBounds(bounds, {
            padding: {
              top: padding,
              bottom: padding,
              left: padding,
              right: padding,
            },
            maxZoom: 18,
            duration: 0, // No animation on initial load
          });
        }

        // Add click event for clusters
        newMap.on("click", "clusters", (e) => {
          const features = newMap.queryRenderedFeatures(e.point, {
            layers: ["clusters"],
          });
          const clusterId = features[0].properties.cluster_id;
          (
            newMap.getSource("vehicles") as mapboxgl.GeoJSONSource
          ).getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;

            newMap.easeTo({
              center: (features[0].geometry as any).coordinates,
              zoom: zoom,
            });
          });
        });

        // Change cursor when hovering over clusters or points
        newMap.on("mouseenter", "clusters", () => {
          if (newMap) newMap.getCanvas().style.cursor = "pointer";
        });
        newMap.on("mouseleave", "clusters", () => {
          if (newMap) newMap.getCanvas().style.cursor = "";
        });
        newMap.on("mouseenter", "unclustered-point", () => {
          if (newMap) newMap.getCanvas().style.cursor = "pointer";
        });
        newMap.on("mouseleave", "unclustered-point", () => {
          if (newMap) newMap.getCanvas().style.cursor = "";
        });

        // Add click event for unclustered points
        newMap.on("click", "unclustered-point", (e) => {
          if (!e.features || e.features.length === 0) return;

          const feature = e.features[0];
          const vehicleId = feature.properties?.id;

          if (vehicleId) {
            setSelectedVehicleId(
              selectedVehicleId === vehicleId ? null : vehicleId,
            );

            // Create popup
            const vehicle = vehicles.find((v) => v.id === vehicleId);
            if (vehicle) {
              const popupContent = `
                <div style="padding: 10px; max-width: 200px;">
                  <h3 style="margin: 0 0 5px; font-weight: bold;">${vehicle.brand} ${vehicle.model}</h3>
                  <p style="margin: 0 0 5px;">Targa: ${vehicle.license_plate}</p>
                  <p style="margin: 0 0 5px;">Posizione: ${vehicle.last_location}</p>
                  <p style="margin: 0; font-size: 12px; color: #666;">
                    ${vehicle.custom_location ? "Posizione GPS precisa" : "Posizione standard"}
                  </p>
                </div>
              `;

              new mapboxgl.Popup({ offset: 0 })
                .setLngLat([vehicle.location_lng!, vehicle.location_lat!])
                .setHTML(popupContent)
                .addTo(newMap);

              // Zoom to the selected vehicle
              newMap.flyTo({
                center: [vehicle.location_lng!, vehicle.location_lat!],
                zoom: 20,
                essential: true,
                duration: 1000,
              });
            }
          }
        });

        // Add markers after map is loaded and positioned
        setTimeout(() => {
          // Timeout callback executing
          if (clusteringEnabled) {
            updateClusteredMarkers();
          } else {
            updateCustomMarkers();
          }
        }, 500); // Increased timeout to ensure map is fully loaded

        // Add zoom change event to update custom markers based on zoom level
        newMap.on("zoomend", () => {
          const currentZoom = newMap.getZoom();
          // Zoom changed

          // If we switch between clustering modes, make sure markers are updated
          if (!clusteringEnabled) {
            updateCustomMarkers();
          }
        });
      });

      newMap.on("error", (e) => {
        console.error("Mapbox error:", e);
        // More detailed error message
        let errorMessage = "Errore nel caricamento della mappa";
        if (e.error && e.error.message) {
          errorMessage += ": " + e.error.message;
        }
        setMapError(errorMessage);
        setIsLoading(false);
      });
    } catch (error) {
      console.error("Error initializing Mapbox map:", error);
      // More detailed error message
      let errorMessage = "Errore nell'inizializzazione della mappa";
      if (error instanceof Error) {
        errorMessage += ": " + error.message;
      }
      setMapError(errorMessage);
      setIsLoading(false);
    }
  };

  // Function to add custom markers with images and labels using GeoJSON approach
  const updateCustomMarkers = () => {
    if (!map || !mapLoaded) return;

    // Updating custom markers with GeoJSON approach

    // Clear existing markers
    markers.forEach((marker) => marker.remove());
    setMarkers([]);

    // Only add markers when clustering is disabled
    if (!clusteringEnabled) {
      // First, check if the GeoJSON source exists, if not create it
      if (!map.getSource("vehicle-points")) {
        map.addSource("vehicle-points", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        // Add a symbol layer for the markers
        map.addLayer({
          id: "vehicle-markers",
          type: "circle",
          source: "vehicle-points",
          paint: {
            "circle-radius": 10,
            "circle-color": [
              "case",
              ["==", ["get", "custom_location"], true],
              "#ff4d4f", // Red for GPS
              "#3b82f6", // Blue for standard
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-opacity": 1,
          },
        });

        // Add a symbol layer for the labels
        map.addLayer({
          id: "vehicle-labels",
          type: "symbol",
          source: "vehicle-points",
          layout: {
            "text-field": ["get", "label"],
            "text-size": 14,
            "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            "text-offset": [0, 1.5],
            "text-anchor": "top",
          },
          paint: {
            "text-color": "#000000",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.5,
          },
        });

        // Add click event for the markers
        map.on("click", "vehicle-markers", (e) => {
          if (!e.features || e.features.length === 0) return;

          const feature = e.features[0];
          const vehicleId = feature.properties?.id;
          const coordinates = feature.geometry.coordinates.slice();

          setSelectedVehicleId(
            selectedVehicleId === vehicleId ? null : vehicleId,
          );

          // Create popup content
          const vehicle = vehicles.find((v) => v.id === vehicleId);
          if (vehicle) {
            const popupContent = `
              <div style="padding: 10px; max-width: 200px;">
                <h3 style="margin: 0 0 5px; font-weight: bold;">${vehicle.brand} ${vehicle.model}</h3>
                <p style="margin: 0 0 5px;">Targa: ${vehicle.license_plate}</p>
                <p style="margin: 0 0 5px;">Posizione: ${vehicle.last_location}</p>
                <p style="margin: 0; font-size: 12px; color: #666;">
                  ${vehicle.custom_location ? "Posizione GPS precisa" : "Posizione standard"}
                </p>
              </div>
            `;

            // Show popup
            new mapboxgl.Popup({ offset: [0, 0] })
              .setLngLat(coordinates)
              .setHTML(popupContent)
              .addTo(map);

            // Zoom to the selected vehicle
            map.flyTo({
              center: coordinates,
              zoom: 20,
              essential: true,
              duration: 1000,
            });
          }
        });

        // Change cursor when hovering over markers
        map.on("mouseenter", "vehicle-markers", () => {
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", "vehicle-markers", () => {
          map.getCanvas().style.cursor = "";
        });
      }

      // Create GeoJSON data from vehicles
      const features = vehicles
        .filter(
          (vehicle) =>
            vehicle.has_valid_location &&
            vehicle.location_lat &&
            vehicle.location_lng,
        )
        .map((vehicle) => ({
          type: "Feature",
          properties: {
            id: vehicle.id,
            brand: vehicle.brand,
            model: vehicle.model,
            license_plate: vehicle.license_plate,
            last_location: vehicle.last_location,
            custom_location: vehicle.custom_location,
            selected: selectedVehicleId === vehicle.id,
            // Use actual vehicle data for the label
            label: `${vehicle.brand} - ${vehicle.license_plate}`,
          },
          geometry: {
            type: "Point",
            coordinates: [vehicle.location_lng, vehicle.location_lat],
          },
        }));

      // Update the GeoJSON source with the new data
      const source = map.getSource("vehicle-points") as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({
          type: "FeatureCollection",
          features,
        });
      }

      // If a specific vehicle is selected, highlight it
      if (map.getLayer("vehicle-markers")) {
        map.setPaintProperty("vehicle-markers", "circle-stroke-color", [
          "case",
          ["==", ["get", "id"], selectedVehicleId || ""],
          "#3b82f6", // Blue stroke for selected
          "#ffffff", // White stroke for others
        ]);

        map.setPaintProperty("vehicle-markers", "circle-stroke-width", [
          "case",
          ["==", ["get", "id"], selectedVehicleId || ""],
          4, // Thicker stroke for selected
          2, // Normal stroke for others
        ]);
      }

      // Updated GeoJSON with vehicles
    }
  };

  // Function to update clustered markers
  const updateClusteredMarkers = () => {
    if (!map || !mapLoaded) return;

    // Updating clustered markers

    // Create GeoJSON data from vehicles
    const features = vehicles
      .filter(
        (vehicle) =>
          vehicle.has_valid_location &&
          vehicle.location_lat &&
          vehicle.location_lng,
      )
      .map((vehicle) => ({
        type: "Feature",
        properties: {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          license_plate: vehicle.license_plate,
          last_location: vehicle.last_location,
          custom_location: vehicle.custom_location,
          image_url: vehicle.image_url,
          selected: selectedVehicleId === vehicle.id,
          clusteringEnabled: clusteringEnabled,
        },
        geometry: {
          type: "Point",
          coordinates: [vehicle.location_lng, vehicle.location_lat],
        },
      }));

    const geojsonData = {
      type: "FeatureCollection",
      features,
    };

    // Update the source data
    const source = map.getSource("vehicles") as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(geojsonData as any);
    }

    // If a specific vehicle is selected, zoom to it
    if (selectedVehicleId) {
      const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
      if (selectedVehicle?.location_lat && selectedVehicle?.location_lng) {
        map.flyTo({
          center: [selectedVehicle.location_lng, selectedVehicle.location_lat],
          zoom: 20, // Much higher zoom level for better visibility of the selected vehicle
          essential: true,
          duration: 1000, // Smooth animation duration in milliseconds
        });
      }
    }
  };

  const fitMapToVehicles = () => {
    if (!map || !mapLoaded) return;

    const bounds = new mapboxgl.LngLatBounds();
    let hasValidVehicles = false;

    vehicles.forEach((vehicle) => {
      if (
        vehicle.has_valid_location &&
        vehicle.location_lat &&
        vehicle.location_lng
      ) {
        bounds.extend([vehicle.location_lng, vehicle.location_lat]);
        hasValidVehicles = true;
      }
    });

    if (hasValidVehicles && !bounds.isEmpty()) {
      // Calculate appropriate padding based on number of vehicles
      // Less padding for fewer vehicles to zoom in more
      const validVehiclesCount = vehicles.filter(
        (v) => v.has_valid_location && v.location_lat && v.location_lng,
      ).length;
      const padding = validVehiclesCount <= 3 ? 30 : 60; // Reduced padding for better visibility

      // Fitting map to vehicles

      map.fitBounds(bounds, {
        padding: {
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
        },
        maxZoom: 18,
        duration: 1000, // Smooth animation
      });
    } else {
      // No valid vehicles to fit map to
    }
  };

  const updateMarkers = () => {
    if (!map || !mapLoaded) return;

    // Updating markers

    // Clear existing markers
    markers.forEach((marker) => marker.remove());

    const newMarkers: mapboxgl.Marker[] = [];

    vehicles.forEach((vehicle) => {
      if (
        vehicle.has_valid_location &&
        vehicle.location_lat &&
        vehicle.location_lng
      ) {
        const position = new mapboxgl.LngLat(
          vehicle.location_lng,
          vehicle.location_lat,
        );

        // Create a custom HTML element for the marker
        const el = document.createElement("div");
        el.className = "vehicle-marker";
        el.style.width = "48px";
        el.style.height = "48px";
        el.style.position = "relative";
        el.style.transform = "translate(-50%, -50%)"; // Center the marker on the exact point

        // Create vehicle image or fallback pin if no image
        if (vehicle.image_url) {
          // Use only the vehicle image (no pin)
          const img = document.createElement("div");
          img.style.width = "40px"; // Larger image
          img.style.height = "40px"; // Larger image
          img.style.borderRadius = "50%";
          img.style.backgroundImage = `url('${vehicle.image_url}')`;
          img.style.backgroundSize = "cover";
          img.style.backgroundPosition = "center";
          img.style.position = "absolute";
          img.style.top = "50%";
          img.style.left = "50%";
          img.style.transform = "translate(-50%, -50%)"; // Center the image
          img.style.border =
            selectedVehicleId === vehicle.id
              ? "3px solid #3b82f6" // Blue border for selected vehicle
              : "3px solid white";
          img.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
          el.appendChild(img);
        } else {
          // Fallback to pin if no image
          const pin = document.createElement("div");
          pin.style.width = "32px";
          pin.style.height = "32px";
          pin.style.backgroundImage = vehicle.custom_location
            ? `url('data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>')`
            : `url('data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="blue" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>')`;
          pin.style.backgroundSize = "cover";
          pin.style.position = "absolute";
          pin.style.top = "50%";
          pin.style.left = "50%";
          pin.style.transform = "translate(-50%, -50%)"; // Center the pin
          pin.style.filter =
            selectedVehicleId === vehicle.id
              ? "drop-shadow(0 0 5px #3b82f6)"
              : "none";
          el.appendChild(pin);
        }

        // Create label with vehicle info
        const label = document.createElement("div");
        label.style.position = "absolute";
        label.style.top = "-25px";
        label.style.left = "50%";
        label.style.transform = "translateX(-50%)";
        label.style.backgroundColor = "rgba(255,255,255,0.9)";
        label.style.padding = "2px 5px";
        label.style.borderRadius = "3px";
        label.style.fontSize = "10px";
        label.style.fontWeight = "bold";
        label.style.whiteSpace = "nowrap";
        label.style.boxShadow = "0 1px 2px rgba(0,0,0,0.2)";
        label.textContent = `${vehicle.brand} - ${vehicle.license_plate}`;
        el.appendChild(label);

        el.style.cursor = "pointer";

        // Use offset to ensure the marker is positioned correctly
        const marker = new mapboxgl.Marker({
          element: el,
          anchor: "center", // This ensures the marker is centered on the coordinates
        })
          .setLngLat(position)
          .addTo(map);

        // Create popup content
        const popupContent = `
          <div style="padding: 10px; max-width: 200px;">
            <h3 style="margin: 0 0 5px; font-weight: bold;">${vehicle.brand} ${vehicle.model}</h3>
            <p style="margin: 0 0 5px;">Targa: ${vehicle.license_plate}</p>
            <p style="margin: 0 0 5px;">Posizione: ${vehicle.last_location}</p>
            <p style="margin: 0; font-size: 12px; color: #666;">
              ${vehicle.custom_location ? "Posizione GPS precisa" : "Posizione standard"}
            </p>
          </div>
        `;

        // Create popup but don't add it to the map yet
        const popup = new mapboxgl.Popup({ offset: 0 }).setHTML(popupContent);

        // Add popup to marker on click
        marker.setPopup(popup);

        // Add click event to marker
        el.addEventListener("click", () => {
          setSelectedVehicleId(
            selectedVehicleId === vehicle.id ? null : vehicle.id,
          );
        });

        newMarkers.push(marker);
      }
    });

    setMarkers(newMarkers);

    // If a specific vehicle is selected, zoom to it
    if (selectedVehicleId) {
      const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
      if (selectedVehicle?.location_lat && selectedVehicle?.location_lng) {
        map.flyTo({
          center: [selectedVehicle.location_lng, selectedVehicle.location_lat],
          zoom: 20, // Much higher zoom level for better visibility of the selected vehicle
          essential: true,
          duration: 1000, // Smooth animation duration in milliseconds
        });
      }
    }
  };

  const handleVehicleClick = (vehicleId: string) => {
    const newSelectedId = vehicleId === selectedVehicleId ? null : vehicleId;
    setSelectedVehicleId(newSelectedId);

    // If deselecting, fit to all vehicles
    if (newSelectedId === null && map && mapLoaded) {
      setTimeout(() => fitMapToVehicles(), 100);
    } else if (newSelectedId !== null && map && mapLoaded) {
      // If selecting a vehicle, zoom to it
      const selectedVehicle = vehicles.find((v) => v.id === newSelectedId);
      if (selectedVehicle?.location_lat && selectedVehicle?.location_lng) {
        map.flyTo({
          center: [selectedVehicle.location_lng, selectedVehicle.location_lat],
          zoom: 20,
          essential: true,
          duration: 1000,
        });
      }
    }
  };

  return (
    <div>
      <Header />
      <div className="pt-[72px] px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Mappa Veicoli</h1>
          </div>

          <div className="flex gap-3 mb-6 flex-wrap">
            {vehicles.map((vehicle) => (
              <Button
                key={vehicle.id}
                variant={
                  selectedVehicleId === vehicle.id ? "default" : "outline"
                }
                className={`rounded-full 
                  ${selectedVehicleId === vehicle.id ? "bg-blue-500 hover:bg-blue-600" : ""} 
                  ${!vehicle.has_valid_location && vehicle.in_maintenance ? "border-red-500 text-red-500" : ""}
                  ${!vehicle.has_valid_location && vehicle.in_transit ? "border-blue-500 text-blue-500" : ""}
                  ${vehicle.future_maintenance ? "border-yellow-500 text-yellow-500" : ""}
                  ${!vehicle.has_valid_location && !vehicle.in_maintenance && !vehicle.in_transit && !vehicle.future_maintenance ? "border-red-500 text-red-500" : ""}
                `}
                onClick={() => handleVehicleClick(vehicle.id)}
                disabled={!vehicle.has_valid_location}
                title={vehicle.last_location || ""}
              >
                {vehicle.brand} {vehicle.model} - {vehicle.license_plate}
                {vehicle.in_maintenance && " (In manutenzione)"}
                {vehicle.future_maintenance && " (Manutenzione programmata)"}
                {vehicle.in_transit && " (In viaggio)"}
                {!vehicle.has_valid_location &&
                  !vehicle.in_maintenance &&
                  !vehicle.in_transit &&
                  !vehicle.future_maintenance &&
                  " (No GPS)"}
              </Button>
            ))}
            {selectedVehicleId && (
              <Button
                variant="outline"
                className="rounded-full ml-2"
                onClick={() => {
                  setSelectedVehicleId(null);
                  fitMapToVehicles();
                }}
              >
                Mostra tutti
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-3">
              <Card>
                <CardContent className="p-0 relative">
                  {isLoading && (
                    <div className="absolute inset-0 bg-white bg-opacity-80 z-10 flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                        <p className="text-blue-500 font-medium">
                          Caricamento mappa...
                        </p>
                      </div>
                    </div>
                  )}
                  {mapError ? (
                    <div className="w-full h-[600px] rounded-lg bg-gray-200 flex items-center justify-center">
                      <div className="text-center p-6">
                        <h3 className="text-xl font-semibold mb-2">
                          {mapError}
                        </h3>
                        <p className="text-sm text-red-500 mb-4">
                          Token utilizzato:{" "}
                          {mapboxgl.accessToken.substring(0, 12)}...
                        </p>
                        <p className="text-gray-600 mb-4">
                          Visualizzazione alternativa dei veicoli:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                          {vehicles.map((vehicle) => (
                            <div
                              key={vehicle.id}
                              className={`p-4 rounded-lg border ${selectedVehicleId === vehicle.id ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
                              onClick={() => handleVehicleClick(vehicle.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <MapPin className="text-blue-500" />
                                </div>
                                <div>
                                  <h4 className="font-medium">
                                    {vehicle.brand} {vehicle.model}
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {vehicle.license_plate}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {vehicle.last_location}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      ref={mapContainer}
                      className="w-full h-[600px] rounded-lg"
                      style={{ background: "#e5e7eb" }}
                    ></div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Legenda</h2>
            <div className="flex flex-wrap gap-6">
              {clusteringEnabled ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#51bbd6] border-2 border-white"></div>
                    <span>Cluster con 1-4 veicoli</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#f1f075] border-2 border-white"></div>
                    <span>Cluster con 5-9 veicoli</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#f28cb1] border-2 border-white"></div>
                    <span>Cluster con 10+ veicoli</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#3b82f6] border-2 border-white"></div>
                    <span>Veicolo singolo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full bg-cover bg-center border-2 border-white"
                      style={{
                        backgroundImage:
                          "url('https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=60&q=80')",
                      }}
                    ></div>
                    <span>Immagine veicolo (visibile senza clustering)</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white"></div>
                    <span>Pin per veicoli (posizione standard)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white"></div>
                    <span>Pin per veicoli (posizione GPS)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center">
                      <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white"></div>
                      <div className="bg-white px-2 py-1 text-xs font-bold rounded border shadow-sm mt-1">
                        Fiat - AB123CD
                      </div>
                    </div>
                    <span>Etichetta con marca e targa</span>
                  </div>
                </>
              )}
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 border border-red-500 text-red-500 rounded-full text-sm">
                  Veicolo
                </span>
                <span>Veicolo senza posizione valida</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 border border-blue-500 text-blue-500 rounded-full text-sm">
                  Veicolo
                </span>
                <span>Veicolo in viaggio (non mostrato in mappa)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 border border-red-500 text-red-500 rounded-full text-sm">
                  Veicolo
                </span>
                <span>Veicolo in manutenzione (non mostrato in mappa)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 border border-yellow-500 text-yellow-500 rounded-full text-sm">
                  Veicolo
                </span>
                <span>
                  Veicolo con manutenzione programmata (mostrato in mappa)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapboxMap;
