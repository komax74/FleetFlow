import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useToast } from "../ui/use-toast";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Usa il token di Mapbox dalle variabili d'ambiente
mapboxgl.accessToken =
  import.meta.env.VITE_MAPBOX_TOKEN ||
  "pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA";

interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  created_at?: string;
}

interface DefaultMapSettings {
  lat: number;
  lng: number;
  name: string;
}

const LocationSettings = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [defaultMapSettings, setDefaultMapSettings] =
    useState<DefaultMapSettings>({
      name: "Milano",
      lat: 45.4642,
      lng: 9.19,
    });
  const [newLocation, setNewLocation] = useState<Partial<Location>>({
    name: "",
    lat: 45.4642, // Default to Milan
    lng: 9.19,
  });

  // Refs for map containers
  const addMapRef = useRef<HTMLDivElement>(null);
  const editMapRef = useRef<HTMLDivElement>(null);
  const defaultMapRef = useRef<HTMLDivElement>(null);

  // Map instances
  const [addMap, setAddMap] = useState<mapboxgl.Map | null>(null);
  const [editMap, setEditMap] = useState<mapboxgl.Map | null>(null);
  const [defaultMap, setDefaultMap] = useState<mapboxgl.Map | null>(null);

  // Markers
  const [addMarker, setAddMarker] = useState<mapboxgl.Marker | null>(null);
  const [editMarker, setEditMarker] = useState<mapboxgl.Marker | null>(null);
  const [defaultMarker, setDefaultMarker] = useState<mapboxgl.Marker | null>(
    null,
  );

  const { toast } = useToast();

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Supabase error details:", JSON.stringify(error));
        throw error;
      }
      setLocations(data || []);

      // Fetch default map settings
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from("settings")
          .select("*")
          .eq("key", "default_map_location");

        if (
          !settingsError &&
          settingsData &&
          settingsData.length > 0 &&
          settingsData[0]?.value
        ) {
          try {
            const mapSettings = JSON.parse(settingsData[0].value);
            setDefaultMapSettings({
              name: mapSettings.name || "Milano",
              lat: parseFloat(mapSettings.lat) || 45.4642,
              lng: parseFloat(mapSettings.lng) || 9.19,
            });

            // Update newLocation with default settings
            setNewLocation((prev) => ({
              ...prev,
              lat: parseFloat(mapSettings.lat) || 45.4642,
              lng: parseFloat(mapSettings.lng) || 9.19,
            }));
          } catch (e) {
            console.error("Error parsing default map settings:", e);
          }
        }
      } catch (settingsError) {
        console.error("Error fetching settings:", settingsError);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le posizioni",
        variant: "destructive",
      });
    }
  };

  // Initialize a Mapbox map
  const initializeMap = (
    container: HTMLElement,
    center: [number, number],
    onMapClick?: (lngLat: mapboxgl.LngLat) => void,
  ): Promise<{ map: mapboxgl.Map; marker: mapboxgl.Marker }> => {
    return new Promise((resolve) => {
      try {
        // Create the map
        const map = new mapboxgl.Map({
          container,
          style: "mapbox://styles/mapbox/streets-v11",
          center,
          zoom: 14,
        });

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), "top-right");

        // Create a marker
        const marker = new mapboxgl.Marker({ draggable: true })
          .setLngLat(center)
          .addTo(map);

        // Handle marker drag events
        marker.on("dragend", () => {
          const lngLat = marker.getLngLat();
          if (onMapClick) {
            onMapClick(lngLat);
          }
        });

        // Handle map click events
        if (onMapClick) {
          map.on("click", (e) => {
            marker.setLngLat(e.lngLat);
            onMapClick(e.lngLat);
          });
        }

        // Wait for the map to load
        map.on("load", () => {
          resolve({ map, marker });
        });

        // Handle errors
        map.on("error", (e) => {
          console.error("Mapbox error:", e);
          // Still resolve with the map and marker so we can use them
          resolve({ map, marker });
        });
      } catch (error) {
        console.error("Error initializing map:", error);
        // Create a fallback map and marker
        const fallbackMap = new mapboxgl.Map({
          container,
          style: "mapbox://styles/mapbox/streets-v11",
          center,
          zoom: 14,
        });
        const fallbackMarker = new mapboxgl.Marker()
          .setLngLat(center)
          .addTo(fallbackMap);
        resolve({ map: fallbackMap, marker: fallbackMarker });
      }
    });
  };

  // These functions are no longer needed as we're initializing maps directly in the dialog components
  // using refs and conditional rendering

  // Initialize the default map settings map
  const initializeDefaultMap = async () => {
    if (!defaultMapRef.current) return;

    const center: [number, number] = [
      defaultMapSettings.lng,
      defaultMapSettings.lat,
    ];
    const { map, marker } = await initializeMap(
      defaultMapRef.current,
      center,
      (lngLat) => {
        setDefaultMapSettings({
          ...defaultMapSettings,
          lat: lngLat.lat,
          lng: lngLat.lng,
        });
      },
    );

    setDefaultMap(map);
    setDefaultMarker(marker);
  };

  // Clean up maps when dialogs close
  const cleanupMap = (
    map: mapboxgl.Map | null,
    marker: mapboxgl.Marker | null,
  ) => {
    if (marker) marker.remove();
    if (map) map.remove();
  };

  const saveDefaultMapSettings = async () => {
    try {
      // First check if the setting already exists
      const { data, error: fetchError } = await supabase
        .from("settings")
        .select("*")
        .eq("key", "default_map_location");

      if (fetchError) throw fetchError;

      let upsertError;
      if (data && data.length > 0) {
        // Update existing record
        const { error } = await supabase
          .from("settings")
          .update({ value: JSON.stringify(defaultMapSettings) })
          .eq("key", "default_map_location");
        upsertError = error;
      } else {
        // Insert new record
        const { error } = await supabase.from("settings").insert({
          key: "default_map_location",
          value: JSON.stringify(defaultMapSettings),
        });
        upsertError = error;
      }

      if (upsertError) throw upsertError;

      toast({
        title: "Successo",
        description: "Impostazioni della mappa salvate con successo",
      });

      // Update newLocation with the new default settings
      setNewLocation((prev) => ({
        ...prev,
        lat: defaultMapSettings.lat,
        lng: defaultMapSettings.lng,
      }));
    } catch (error) {
      console.error("Error saving default map settings:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le impostazioni della mappa",
        variant: "destructive",
      });
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.name || !newLocation.lat || !newLocation.lng) {
      toast({
        title: "Errore",
        description: "Inserisci tutti i campi richiesti",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("locations")
        .insert([
          {
            name: newLocation.name,
            lat: newLocation.lat,
            lng: newLocation.lng,
          },
        ])
        .select();

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Posizione aggiunta con successo",
      });

      setIsAddDialogOpen(false);
      setNewLocation({
        name: "",
        lat: defaultMapSettings.lat,
        lng: defaultMapSettings.lng,
      });
      fetchLocations();
    } catch (error) {
      console.error("Error adding location:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiungere la posizione",
        variant: "destructive",
      });
    }
  };

  const handleEditLocation = async () => {
    if (
      !currentLocation ||
      !currentLocation.name ||
      !currentLocation.lat ||
      !currentLocation.lng
    ) {
      toast({
        title: "Errore",
        description: "Inserisci tutti i campi richiesti",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("locations")
        .update({
          name: currentLocation.name,
          lat: currentLocation.lat,
          lng: currentLocation.lng,
        })
        .eq("id", currentLocation.id);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Posizione aggiornata con successo",
      });

      setIsEditDialogOpen(false);
      setCurrentLocation(null);
      fetchLocations();
    } catch (error) {
      console.error("Error updating location:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la posizione",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLocation = async () => {
    if (!currentLocation) return;

    try {
      const { error } = await supabase
        .from("locations")
        .delete()
        .eq("id", currentLocation.id);

      if (error) {
        console.error("Supabase delete error:", error);
        throw error;
      }

      toast({
        title: "Successo",
        description: "Posizione eliminata con successo",
      });

      setIsDeleteDialogOpen(false);
      setCurrentLocation(null);

      // Refresh the locations list
      await fetchLocations();
    } catch (error) {
      console.error("Error deleting location:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la posizione",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow mb-8">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Posizioni di Restituzione</span>
          <Button
            onClick={() => {
              setNewLocation({
                name: "",
                lat: defaultMapSettings.lat,
                lng: defaultMapSettings.lng,
              });
              setIsAddDialogOpen(true);
            }}
            className="bg-black hover:bg-gray-800 text-white"
          >
            <Plus className="h-4 w-4 mr-2" /> Aggiungi Posizione
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {locations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nessuna posizione configurata. Aggiungi la tua prima posizione.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map((location) => (
              <Card key={location.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{location.name}</h3>
                      <p className="text-sm text-gray-500">
                        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setCurrentLocation(location);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setCurrentLocation(location);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-blue-500">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">Posizione standard</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-6 p-4 border border-gray-200">
          <CardTitle className="text-lg mb-4 flex justify-between items-center">
            <span>Impostazioni Predefinite Mappa</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                // Open a dialog to select default map location
                const dialogContainer = document.createElement("div");
                dialogContainer.className =
                  "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50";

                const dialogContent = document.createElement("div");
                dialogContent.className =
                  "bg-white rounded-lg p-6 w-[600px] max-w-[90vw]";
                dialogContent.innerHTML = `
                  <h3 class="text-lg font-semibold mb-4">Seleziona Posizione Predefinita</h3>
                  <div class="mb-4">
                    <label class="block text-sm font-medium mb-1" for="default-address-search">Cerca indirizzo</label>
                    <div class="flex gap-2">
                      <input id="default-address-search" placeholder="Inserisci un indirizzo" class="flex-1 px-3 py-2 border rounded-md" />
                      <button id="search-btn" class="px-4 py-2 bg-blue-500 text-white rounded-md">Cerca</button>
                    </div>
                  </div>
                  <div id="default-map-container" class="w-full h-[400px] rounded-lg mb-4"></div>
                  <div class="flex justify-end gap-2">
                    <button id="cancel-btn" class="px-4 py-2 border rounded-md">Annulla</button>
                    <button id="confirm-btn" class="px-4 py-2 bg-blue-500 text-white rounded-md">Conferma</button>
                  </div>
                `;

                dialogContainer.appendChild(dialogContent);
                document.body.appendChild(dialogContainer);

                // Initialize the map
                const mapContainer = document.getElementById(
                  "default-map-container",
                );
                if (mapContainer) {
                  const center: [number, number] = [
                    defaultMapSettings.lng,
                    defaultMapSettings.lat,
                  ];
                  let tempMap: mapboxgl.Map | null = null;
                  let tempMarker: mapboxgl.Marker | null = null;

                  const map = new mapboxgl.Map({
                    container: mapContainer,
                    style: "mapbox://styles/mapbox/streets-v11",
                    center,
                    zoom: 14,
                  });

                  map.addControl(new mapboxgl.NavigationControl(), "top-right");

                  const marker = new mapboxgl.Marker({ draggable: true })
                    .setLngLat(center)
                    .addTo(map);

                  tempMap = map;
                  tempMarker = marker;

                  // Handle marker drag events
                  marker.on("dragend", () => {
                    const lngLat = marker.getLngLat();
                    setDefaultMapSettings({
                      ...defaultMapSettings,
                      lat: lngLat.lat,
                      lng: lngLat.lng,
                    });
                  });

                  // Handle map click events
                  map.on("click", (e) => {
                    marker.setLngLat(e.lngLat);
                    setDefaultMapSettings({
                      ...defaultMapSettings,
                      lat: e.lngLat.lat,
                      lng: e.lngLat.lng,
                    });
                  });

                  // Handle button clicks
                  const cancelBtn = document.getElementById("cancel-btn");
                  const confirmBtn = document.getElementById("confirm-btn");
                  const searchBtn = document.getElementById("search-btn");

                  if (searchBtn) {
                    searchBtn.addEventListener("click", () => {
                      const input = document.getElementById(
                        "default-address-search",
                      ) as HTMLInputElement;
                      if (input && input.value) {
                        const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input.value)}.json?access_token=${mapboxgl.accessToken}`;
                        fetch(geocodingUrl)
                          .then((response) => response.json())
                          .then((data) => {
                            if (data.features && data.features.length > 0) {
                              const [lng, lat] = data.features[0].center;
                              setDefaultMapSettings({
                                ...defaultMapSettings,
                                lat,
                                lng,
                              });
                              if (tempMap && tempMarker) {
                                tempMap.flyTo({
                                  center: [lng, lat],
                                  zoom: 14,
                                });
                                tempMarker.setLngLat([lng, lat]);
                              }
                            }
                          })
                          .catch((error) =>
                            console.error("Error geocoding address:", error),
                          );
                      }
                    });
                  }

                  if (cancelBtn) {
                    cancelBtn.addEventListener("click", () => {
                      if (tempMap) tempMap.remove();
                      if (tempMarker) tempMarker.remove();
                      document.body.removeChild(dialogContainer);
                    });
                  }

                  if (confirmBtn) {
                    confirmBtn.addEventListener("click", () => {
                      if (tempMap) tempMap.remove();
                      if (tempMarker) tempMarker.remove();
                      document.body.removeChild(dialogContainer);
                      saveDefaultMapSettings();
                    });
                  }
                }
              }}
              title="Seleziona posizione sulla mappa"
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="default-name">Nome Posizione Predefinita</Label>
              <Input
                id="default-name"
                value={defaultMapSettings.name}
                onChange={(e) =>
                  setDefaultMapSettings({
                    ...defaultMapSettings,
                    name: e.target.value,
                  })
                }
                placeholder="es. Milano"
              />
            </div>
            <div>
              <Label htmlFor="default-lat">Latitudine Predefinita</Label>
              <Input
                id="default-lat"
                type="number"
                step="0.000001"
                value={defaultMapSettings.lat}
                onChange={(e) =>
                  setDefaultMapSettings({
                    ...defaultMapSettings,
                    lat: parseFloat(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="default-lng">Longitudine Predefinita</Label>
              <Input
                id="default-lng"
                type="number"
                step="0.000001"
                value={defaultMapSettings.lng}
                onChange={(e) =>
                  setDefaultMapSettings({
                    ...defaultMapSettings,
                    lng: parseFloat(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <Button onClick={saveDefaultMapSettings} className="w-full md:w-auto">
            Salva Impostazioni Mappa
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            Queste impostazioni definiscono la posizione iniziale della mappa
            quando si crea una nuova posizione.
          </p>
        </Card>

        {/* Add Location Dialog */}
        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              // Clean up any existing map when dialog closes
              if (addMap) addMap.remove();
              if (addMarker) addMarker.remove();
              setAddMap(null);
              setAddMarker(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Aggiungi Nuova Posizione</DialogTitle>
              <DialogDescription>
                Inserisci i dettagli della nuova posizione di restituzione.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome Posizione</Label>
                <Input
                  id="name"
                  value={newLocation.name}
                  onChange={(e) =>
                    setNewLocation({ ...newLocation, name: e.target.value })
                  }
                  placeholder="es. Fronte Ufficio"
                />
              </div>
              <div className="grid gap-2">
                <Label>Seleziona Posizione sulla Mappa</Label>
                <div className="mb-2">
                  <Label htmlFor="address-search">Cerca indirizzo</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="address-search"
                      placeholder="Inserisci un indirizzo"
                      className="flex-1"
                    />
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        const input = document.getElementById(
                          "address-search",
                        ) as HTMLInputElement;
                        if (input && input.value) {
                          const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input.value)}.json?access_token=${mapboxgl.accessToken}`;
                          fetch(geocodingUrl)
                            .then((response) => response.json())
                            .then((data) => {
                              if (data.features && data.features.length > 0) {
                                const [lng, lat] = data.features[0].center;
                                setNewLocation({
                                  ...newLocation,
                                  lat,
                                  lng,
                                });
                                if (addMap && addMarker) {
                                  addMap.flyTo({
                                    center: [lng, lat],
                                    zoom: 14,
                                  });
                                  addMarker.setLngLat([lng, lat]);
                                }
                              }
                            })
                            .catch((error) =>
                              console.error("Error geocoding address:", error),
                            );
                        }
                      }}
                    >
                      Cerca
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 mb-2">
                    Clicca sulla mappa o trascina il marker per impostare la
                    posizione esatta.
                  </p>
                </div>
                <div className="w-full h-[300px] rounded-md border">
                  {isAddDialogOpen && (
                    <div
                      id="add-map-container"
                      className="w-full h-full"
                      ref={(el) => {
                        if (el && !addMap) {
                          // Create the map
                          const center: [number, number] = [
                            newLocation.lng || defaultMapSettings.lng,
                            newLocation.lat || defaultMapSettings.lat,
                          ];

                          try {
                            const map = new mapboxgl.Map({
                              container: el,
                              style: "mapbox://styles/mapbox/streets-v11",
                              center,
                              zoom: 14,
                            });

                            // Add navigation controls
                            map.addControl(
                              new mapboxgl.NavigationControl(),
                              "top-right",
                            );

                            // Create a marker
                            const marker = new mapboxgl.Marker({
                              draggable: true,
                            })
                              .setLngLat(center)
                              .addTo(map);

                            // Handle marker drag events
                            marker.on("dragend", () => {
                              const lngLat = marker.getLngLat();
                              setNewLocation({
                                ...newLocation,
                                lat: lngLat.lat,
                                lng: lngLat.lng,
                              });
                            });

                            // Handle map click events
                            map.on("click", (e) => {
                              marker.setLngLat(e.lngLat);
                              setNewLocation({
                                ...newLocation,
                                lat: e.lngLat.lat,
                                lng: e.lngLat.lng,
                              });
                            });

                            setAddMap(map);
                            setAddMarker(marker);
                          } catch (error) {
                            console.error("Error initializing add map:", error);
                          }
                        }
                      }}
                    ></div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="lat">Latitudine</Label>
                    <Input
                      id="lat"
                      type="number"
                      step="0.000001"
                      value={newLocation.lat}
                      onChange={(e) => {
                        const lat = parseFloat(e.target.value);
                        setNewLocation({
                          ...newLocation,
                          lat,
                        });
                        // Update marker position if map exists
                        if (
                          addMarker &&
                          !isNaN(lat) &&
                          !isNaN(newLocation.lng || 0)
                        ) {
                          addMarker.setLngLat([newLocation.lng || 0, lat]);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lng">Longitudine</Label>
                    <Input
                      id="lng"
                      type="number"
                      step="0.000001"
                      value={newLocation.lng}
                      onChange={(e) => {
                        const lng = parseFloat(e.target.value);
                        setNewLocation({
                          ...newLocation,
                          lng,
                        });
                        // Update marker position if map exists
                        if (
                          addMarker &&
                          !isNaN(lng) &&
                          !isNaN(newLocation.lat || 0)
                        ) {
                          addMarker.setLngLat([lng, newLocation.lat || 0]);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Annulla
              </Button>
              <Button onClick={handleAddLocation}>Salva Posizione</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Location Dialog */}
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              // Clean up any existing map when dialog closes
              if (editMap) editMap.remove();
              if (editMarker) editMarker.remove();
              setEditMap(null);
              setEditMarker(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Modifica Posizione</DialogTitle>
              <DialogDescription>
                Modifica i dettagli della posizione di restituzione.
              </DialogDescription>
            </DialogHeader>
            {currentLocation && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Nome Posizione</Label>
                  <Input
                    id="edit-name"
                    value={currentLocation.name}
                    onChange={(e) =>
                      setCurrentLocation({
                        ...currentLocation,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Seleziona Posizione sulla Mappa</Label>
                  <div className="mb-2">
                    <Label htmlFor="edit-address-search">Cerca indirizzo</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="edit-address-search"
                        placeholder="Inserisci un indirizzo"
                        className="flex-1"
                      />
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          const input = document.getElementById(
                            "edit-address-search",
                          ) as HTMLInputElement;
                          if (input && input.value && currentLocation) {
                            const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input.value)}.json?access_token=${mapboxgl.accessToken}`;
                            fetch(geocodingUrl)
                              .then((response) => response.json())
                              .then((data) => {
                                if (data.features && data.features.length > 0) {
                                  const [lng, lat] = data.features[0].center;
                                  setCurrentLocation({
                                    ...currentLocation,
                                    lat,
                                    lng,
                                  });
                                  if (editMap && editMarker) {
                                    editMap.flyTo({
                                      center: [lng, lat],
                                      zoom: 14,
                                    });
                                    editMarker.setLngLat([lng, lat]);
                                  }
                                }
                              })
                              .catch((error) =>
                                console.error(
                                  "Error geocoding address:",
                                  error,
                                ),
                              );
                          }
                        }}
                      >
                        Cerca
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 mb-2">
                      Clicca sulla mappa o trascina il marker per impostare la
                      posizione esatta.
                    </p>
                  </div>
                  <div className="w-full h-[300px] rounded-md border">
                    {isEditDialogOpen && currentLocation && (
                      <div
                        id="edit-map-container"
                        className="w-full h-full"
                        ref={(el) => {
                          if (el && !editMap && currentLocation) {
                            // Create the map
                            const center: [number, number] = [
                              currentLocation.lng,
                              currentLocation.lat,
                            ];

                            try {
                              const map = new mapboxgl.Map({
                                container: el,
                                style: "mapbox://styles/mapbox/streets-v11",
                                center,
                                zoom: 14,
                              });

                              // Add navigation controls
                              map.addControl(
                                new mapboxgl.NavigationControl(),
                                "top-right",
                              );

                              // Create a marker
                              const marker = new mapboxgl.Marker({
                                draggable: true,
                              })
                                .setLngLat(center)
                                .addTo(map);

                              // Handle marker drag events
                              marker.on("dragend", () => {
                                const lngLat = marker.getLngLat();
                                setCurrentLocation({
                                  ...currentLocation,
                                  lat: lngLat.lat,
                                  lng: lngLat.lng,
                                });
                              });

                              // Handle map click events
                              map.on("click", (e) => {
                                marker.setLngLat(e.lngLat);
                                setCurrentLocation({
                                  ...currentLocation,
                                  lat: e.lngLat.lat,
                                  lng: e.lngLat.lng,
                                });
                              });

                              setEditMap(map);
                              setEditMarker(marker);
                            } catch (error) {
                              console.error(
                                "Error initializing edit map:",
                                error,
                              );
                            }
                          }
                        }}
                      ></div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label htmlFor="edit-lat">Latitudine</Label>
                      <Input
                        id="edit-lat"
                        type="number"
                        step="0.000001"
                        value={currentLocation.lat}
                        onChange={(e) => {
                          const lat = parseFloat(e.target.value);
                          setCurrentLocation({
                            ...currentLocation,
                            lat,
                          });
                          // Update marker position if map exists
                          if (
                            editMarker &&
                            !isNaN(lat) &&
                            !isNaN(currentLocation.lng)
                          ) {
                            editMarker.setLngLat([currentLocation.lng, lat]);
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-lng">Longitudine</Label>
                      <Input
                        id="edit-lng"
                        type="number"
                        step="0.000001"
                        value={currentLocation.lng}
                        onChange={(e) => {
                          const lng = parseFloat(e.target.value);
                          setCurrentLocation({
                            ...currentLocation,
                            lng,
                          });
                          // Update marker position if map exists
                          if (
                            editMarker &&
                            !isNaN(lng) &&
                            !isNaN(currentLocation.lat)
                          ) {
                            editMarker.setLngLat([lng, currentLocation.lat]);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Annulla
              </Button>
              <Button onClick={handleEditLocation}>Salva Modifiche</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Location Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Elimina posizione</AlertDialogTitle>
              <AlertDialogDescription>
                Sei sicuro di voler eliminare questa posizione? Questa azione
                non può essere annullata.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setCurrentLocation(null);
                }}
              >
                Annulla
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteLocation}
                className="bg-red-500 hover:bg-red-600"
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default LocationSettings;
