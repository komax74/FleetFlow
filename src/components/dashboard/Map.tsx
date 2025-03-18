import React, { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Header from "./Header";
import { Vehicle } from "@/types/vehicles";

interface VehicleWithLocation extends Vehicle {
  last_location?: string;
  location_lat?: number;
  location_lng?: number;
  custom_location?: boolean;
}

const Map = () => {
  const [vehicles, setVehicles] = useState<VehicleWithLocation[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<
    VehicleWithLocation[]
  >([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Load Google Maps API
    const loadGoogleMapsAPI = () => {
      // Check if Google Maps API is already loaded
      if (window.google && window.google.maps) {
        console.log("Map.tsx: Google Maps API already loaded, skipping load");
        setMapLoaded(true);
        return;
      }

      // Create a unique callback name to avoid conflicts
      const callbackName =
        "initMap_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

      window[callbackName] = () => {
        console.log("Map.tsx: Google Maps API loaded via callback");
        setMapLoaded(true);
        // Clean up the callback
        setTimeout(() => {
          delete window[callbackName];
        }, 1000);
      };

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyBNLrJhOMz6idD05pzfn5lhA-TAw-mAZCU"}&callback=${callbackName}&loading=async&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    };

    loadGoogleMapsAPI();
    fetchVehicles();

    return () => {
      // Clean up markers when component unmounts
      markers.forEach((marker) => marker.setMap(null));
    };
  }, []);

  useEffect(() => {
    if (mapLoaded) {
      initializeMap();
    }
  }, [mapLoaded]);

  useEffect(() => {
    if (map && vehicles.length > 0) {
      updateMarkers();
    }
  }, [map, vehicles, selectedVehicleId]);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*, bookings(return_location, status)")
        .order("brand", { ascending: true });

      if (error) throw error;

      // Process the data to get the last location for each vehicle
      const processedVehicles = data?.map((vehicle) => {
        // Find the most recent completed booking for this vehicle
        const lastCompletedBooking = vehicle.bookings
          ?.filter((booking: any) => booking.status === "completed")
          .sort((a: any, b: any) => {
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
          })[0];

        return {
          ...vehicle,
          last_location:
            lastCompletedBooking?.return_location || "Posizione sconosciuta",
          location_lat: lastCompletedBooking?.location_lat || 45.4642, // Default to Milan coordinates
          location_lng: lastCompletedBooking?.location_lng || 9.19,
          custom_location: lastCompletedBooking?.custom_location || false,
        };
      });

      setVehicles(processedVehicles || []);
      setFilteredVehicles(processedVehicles || []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  const initializeMap = () => {
    // Default center on Milan, Italy
    const defaultCenter = { lat: 45.4642, lng: 9.19 };

    const mapElement = document.getElementById("map");
    console.log("Map.tsx: Map element details:", {
      exists: !!mapElement,
      dimensions: mapElement
        ? {
            offsetWidth: mapElement.offsetWidth,
            offsetHeight: mapElement.offsetHeight,
            clientWidth: mapElement.clientWidth,
            clientHeight: mapElement.clientHeight,
          }
        : "not available",
      isVisible: mapElement ? mapElement.offsetParent !== null : "unknown",
      style: mapElement ? mapElement.getAttribute("style") : "none",
    });
    if (mapElement) {
      try {
        const newMap = new google.maps.Map(mapElement, {
          zoom: 14,
          center: defaultCenter,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          // Add these options to help with API restrictions
          gestureHandling: "cooperative",
          restriction: {
            latLngBounds: {
              north: 47.0,
              south: 36.0,
              east: 18.0,
              west: 6.0,
            },
            strictBounds: false,
          },
        });

        setMap(newMap);
        console.log("Map initialized successfully");
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    }
  };

  const updateMarkers = () => {
    // Clear existing markers
    markers.forEach((marker) => marker.setMap(null));

    const newMarkers: google.maps.Marker[] = [];
    const bounds = new google.maps.LatLngBounds();
    let selectedVehicleMarker: google.maps.Marker | null = null;
    let selectedVehiclePosition: google.maps.LatLng | null = null;

    filteredVehicles.forEach((vehicle) => {
      if (vehicle.location_lat && vehicle.location_lng) {
        const position = {
          lat: vehicle.location_lat,
          lng: vehicle.location_lng,
        };

        const marker = new google.maps.Marker({
          position,
          map,
          title: `${vehicle.brand} ${vehicle.model} - ${vehicle.license_plate}`,
          icon: {
            url: "https://maps.google.com/mapfiles/ms/icons/car.png",
            scaledSize: new google.maps.Size(32, 32),
          },
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 10px; max-width: 200px;">
              <h3 style="margin: 0 0 5px; font-weight: bold;">${vehicle.brand} ${vehicle.model}</h3>
              <p style="margin: 0 0 5px;">Targa: ${vehicle.license_plate}</p>
              <p style="margin: 0 0 5px;">Posizione: ${vehicle.last_location}</p>
              <p style="margin: 0; font-size: 12px; color: #666;">
                ${vehicle.custom_location ? "Posizione GPS precisa" : "Posizione standard"}
              </p>
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindow.open(map, marker);
        });

        newMarkers.push(marker);
        bounds.extend(position);

        // Store the selected vehicle marker and position
        if (selectedVehicleId === vehicle.id) {
          selectedVehicleMarker = marker;
          selectedVehiclePosition = new google.maps.LatLng(
            position.lat,
            position.lng,
          );
        }
      }
    });

    setMarkers(newMarkers);

    // If a vehicle is selected, center and zoom to it
    if (selectedVehicleId && selectedVehiclePosition && map) {
      map.setCenter(selectedVehiclePosition);
      map.setZoom(17);

      // Open info window for selected vehicle
      if (selectedVehicleMarker) {
        google.maps.event.trigger(selectedVehicleMarker, "click");
      }
    } else if (newMarkers.length > 0 && map) {
      // Otherwise fit all markers
      map.fitBounds(bounds);
    }
  };

  const handleVehicleClick = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId === selectedVehicleId ? null : vehicleId);
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
                className={`rounded-full ${selectedVehicleId === vehicle.id ? "bg-blue-500 hover:bg-blue-600" : ""}`}
                onClick={() => handleVehicleClick(vehicle.id)}
              >
                {vehicle.brand} {vehicle.model} - {vehicle.license_plate}
              </Button>
            ))}
            {selectedVehicleId && (
              <Button
                variant="outline"
                className="rounded-full ml-2"
                onClick={() => setSelectedVehicleId(null)}
              >
                Mostra tutti
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-3">
              <Card>
                <CardContent className="p-0">
                  <div id="map" className="w-full h-[600px] rounded-lg"></div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Legenda</h2>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <MapPin className="text-blue-500" />
                <span>Posizione standard</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="text-red-500" />
                <span>Posizione GPS precisa</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map;
