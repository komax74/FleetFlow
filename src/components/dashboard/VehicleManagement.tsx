import React from "react";
import { Button } from "../ui/button";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Plus, Settings, AlertTriangle, X } from "lucide-react";
import { ImageUpload } from "../ui/image-upload";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Vehicle } from "@/types/vehicles";
import { Textarea } from "../ui/textarea";
import Header from "./Header";

const VehicleManagement = () => {
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);

  React.useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const { data, error } = await supabase.from("vehicles").select("*");

        if (error) throw error;
        setVehicles(data || []);
      } catch (error) {
        // Error handled by error boundary
      }
    };

    fetchVehicles();
  }, []);

  const [newVehicle, setNewVehicle] = React.useState({
    brand: "",
    model: "",
    license_plate: "",
    mileage: 0,
    image_url: "",
  });

  const [editingVehicle, setEditingVehicle] = React.useState<Vehicle | null>(
    null,
  );
  const [maintenanceVehicle, setMaintenanceVehicle] =
    React.useState<Vehicle | null>(null);
  const [maintenanceInfo, setMaintenanceInfo] = React.useState({
    dateRange: {
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    },
    reason: "",
  });

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);

  const addVehicle = async () => {
    if (!newVehicle.brand || !newVehicle.model || !newVehicle.license_plate)
      return;

    try {
      const { data, error } = await supabase
        .from("vehicles")
        .insert([
          {
            brand: newVehicle.brand,
            model: newVehicle.model,
            license_plate: newVehicle.license_plate,
            mileage: newVehicle.mileage,
            image_url: newVehicle.image_url,
            status: "available",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setVehicles([...vehicles, data]);
      setNewVehicle({
        brand: "",
        model: "",
        license_plate: "",
        mileage: 0,
        image_url: "",
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      // Error handled by error boundary
    }
  };

  const updateVehicle = async () => {
    if (!editingVehicle) return;

    try {
      const { error } = await supabase
        .from("vehicles")
        .update({
          brand: editingVehicle.brand,
          model: editingVehicle.model,
          license_plate: editingVehicle.license_plate,
          mileage: editingVehicle.mileage,
          image_url: editingVehicle.image_url,
        })
        .eq("id", editingVehicle.id);

      if (error) throw error;

      const updatedVehicles = vehicles.map((v) =>
        v.id === editingVehicle.id ? editingVehicle : v,
      );
      setVehicles(updatedVehicles);
      setEditingVehicle(null);
    } catch (error) {
      // Error handled by error boundary
    }
  };

  const setMaintenance = async () => {
    if (!maintenanceVehicle || !maintenanceInfo.reason) return;

    try {
      const { error } = await supabase
        .from("vehicles")
        .update({
          status: "maintenance",
          maintenance_start: maintenanceInfo.dateRange.startDate.toISOString(),
          maintenance_end: maintenanceInfo.dateRange.endDate.toISOString(),
          maintenance_reason: maintenanceInfo.reason,
        })
        .eq("id", maintenanceVehicle.id);

      if (error) throw error;

      const updatedVehicle = {
        ...maintenanceVehicle,
        status: "maintenance" as const,
        maintenance_start: maintenanceInfo.dateRange.startDate.toISOString(),
        maintenance_end: maintenanceInfo.dateRange.endDate.toISOString(),
        maintenance_reason: maintenanceInfo.reason,
      };

      const updatedVehicles = vehicles.map((v) =>
        v.id === maintenanceVehicle.id ? updatedVehicle : v,
      );

      setVehicles(updatedVehicles);
      setMaintenanceVehicle(null);
      setMaintenanceInfo({
        dateRange: {
          startDate: new Date(),
          endDate: new Date(),
          key: "selection",
        },
        reason: "",
      });
    } catch (error) {
      // Error handled by error boundary
    }
  };

  const cancelMaintenance = (vehicle: Vehicle) => {
    const updatedVehicle = {
      ...vehicle,
      status: "available" as const,
      maintenanceInfo: undefined,
    };

    const updatedVehicles = vehicles.map((v) =>
      v.id === vehicle.id ? updatedVehicle : v,
    );

    setVehicles(updatedVehicles);
    localStorage.setItem("fleet_vehicles", JSON.stringify(updatedVehicles));
  };

  return (
    <div>
      <Header />
      <div className="pt-[72px] px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Gestione Veicoli</h1>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full bg-black text-white hover:bg-gray-800">
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi Veicolo
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[20px]">
                <DialogHeader>
                  <DialogTitle>Aggiungi Nuovo Veicolo</DialogTitle>
                  <DialogDescription>
                    Aggiungi un nuovo veicolo alla flotta
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      value={newVehicle.brand}
                      onChange={(e) =>
                        setNewVehicle({ ...newVehicle, brand: e.target.value })
                      }
                      placeholder="es. Toyota"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={newVehicle.model}
                      onChange={(e) =>
                        setNewVehicle({ ...newVehicle, model: e.target.value })
                      }
                      placeholder="es. Camry"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="license_plate">License Plate</Label>
                    <Input
                      id="license_plate"
                      value={newVehicle.license_plate}
                      onChange={(e) =>
                        setNewVehicle({
                          ...newVehicle,
                          license_plate: e.target.value,
                        })
                      }
                      placeholder="es. ABC123"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="mileage">Mileage (km)</Label>
                    <Input
                      id="mileage"
                      type="number"
                      value={newVehicle.mileage}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        if (value >= 0 && value <= 2147483647) {
                          setNewVehicle({
                            ...newVehicle,
                            mileage: value,
                          });
                        }
                      }}
                      placeholder="es. 50000"
                    />
                  </div>
                  <div className="grid gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={
                          newVehicle.image_url ||
                          "https://via.placeholder.com/150"
                        }
                        alt="Vehicle preview"
                        className="w-32 h-24 object-cover rounded-lg"
                      />
                      <ImageUpload
                        onUpload={(file, url) => {
                          setNewVehicle({
                            ...newVehicle,
                            image_url: url,
                          });
                        }}
                        maxSizeMB={1}
                        maxWidthOrHeight={800}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="image_url">
                        o inserisci URL immagine
                      </Label>
                      <Input
                        id="image_url"
                        value={newVehicle.image_url}
                        onChange={(e) =>
                          setNewVehicle({
                            ...newVehicle,
                            image_url: e.target.value,
                          })
                        }
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      addVehicle();
                      const dialogTrigger =
                        document.querySelector('[role="dialog"]');
                      if (dialogTrigger) {
                        const closeButton = dialogTrigger.querySelector(
                          'button[aria-label="Close"]',
                        );
                        if (closeButton) {
                          closeButton.click();
                        }
                      }
                    }}
                  >
                    Aggiungi Veicolo
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <Card
                key={vehicle.id}
                className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardHeader className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-medium">
                        {vehicle.brand} {vehicle.model}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {vehicle.license_plate}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-gray-50 rounded-full"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-[20px]">
                          <DialogHeader>
                            <DialogTitle>Modifica Veicolo</DialogTitle>
                            <DialogDescription>
                              Aggiorna le informazioni del veicolo
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="brand">Marca</Label>
                              <Input
                                id="brand"
                                value={editingVehicle?.brand || vehicle.brand}
                                onChange={(e) =>
                                  setEditingVehicle({
                                    ...vehicle,
                                    brand: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="model">Modello</Label>
                              <Input
                                id="model"
                                value={editingVehicle?.model || vehicle.model}
                                onChange={(e) =>
                                  setEditingVehicle({
                                    ...vehicle,
                                    model: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="license_plate">Targa</Label>
                              <Input
                                id="license_plate"
                                value={
                                  editingVehicle?.license_plate ||
                                  vehicle.license_plate
                                }
                                onChange={(e) =>
                                  setEditingVehicle({
                                    ...vehicle,
                                    license_plate: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="mileage">
                                Chilometraggio (km)
                              </Label>
                              <Input
                                id="mileage"
                                type="number"
                                value={
                                  editingVehicle?.mileage || vehicle.mileage
                                }
                                onChange={(e) =>
                                  setEditingVehicle({
                                    ...vehicle,
                                    mileage: parseInt(e.target.value) || 0,
                                  })
                                }
                              />
                            </div>
                            <div className="grid gap-4">
                              <div className="flex items-center gap-4">
                                <img
                                  src={
                                    editingVehicle?.image_url ||
                                    vehicle.image_url ||
                                    "https://via.placeholder.com/150"
                                  }
                                  alt="Vehicle preview"
                                  className="w-32 h-24 object-cover rounded-lg"
                                />
                                <ImageUpload
                                  onUpload={(file, url) => {
                                    setEditingVehicle({
                                      ...vehicle,
                                      image_url: url,
                                    });
                                  }}
                                  maxSizeMB={1}
                                  maxWidthOrHeight={800}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="image_url">
                                  o inserisci URL immagine
                                </Label>
                                <Input
                                  id="image_url"
                                  value={
                                    editingVehicle?.image_url ||
                                    vehicle.image_url
                                  }
                                  onChange={(e) =>
                                    setEditingVehicle({
                                      ...vehicle,
                                      image_url: e.target.value,
                                    })
                                  }
                                  placeholder="https://example.com/image.jpg"
                                />
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={updateVehicle}>
                              Salva Modifiche
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-gray-50 rounded-full"
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-[20px]">
                          <DialogHeader>
                            <DialogTitle>
                              {vehicle.status === "maintenance"
                                ? "Manutenzione Veicolo"
                                : "Imposta Manutenzione"}
                            </DialogTitle>
                            <DialogDescription>
                              {vehicle.status === "maintenance"
                                ? "Visualizza o annulla la manutenzione corrente"
                                : "Programma la manutenzione per questo veicolo"}
                            </DialogDescription>
                          </DialogHeader>
                          {vehicle.status === "maintenance" &&
                          vehicle.maintenance_start ? (
                            <div className="grid gap-4 py-4">
                              <div className="p-4 bg-red-50 rounded-lg">
                                <h4 className="font-medium text-red-900 mb-2">
                                  Periodo di Manutenzione Attuale
                                </h4>
                                <p className="text-sm text-red-800 mb-1">
                                  {new Date(
                                    vehicle.maintenance_start,
                                  ).toLocaleDateString()}{" "}
                                  -{" "}
                                  {new Date(
                                    vehicle.maintenance_end,
                                  ).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-red-800">
                                  Motivo: {vehicle.maintenance_reason}
                                </p>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="destructive"
                                  onClick={() => cancelMaintenance(vehicle)}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Annulla Manutenzione
                                </Button>
                              </DialogFooter>
                            </div>
                          ) : (
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label>Periodo di Manutenzione</Label>
                                <DateRange
                                  ranges={[maintenanceInfo.dateRange]}
                                  onChange={(ranges: any) =>
                                    setMaintenanceInfo({
                                      ...maintenanceInfo,
                                      dateRange: ranges.selection,
                                    })
                                  }
                                  minDate={new Date()}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="reason">Motivo</Label>
                                <Textarea
                                  id="reason"
                                  value={maintenanceInfo.reason}
                                  onChange={(e) =>
                                    setMaintenanceInfo({
                                      ...maintenanceInfo,
                                      reason: e.target.value,
                                    })
                                  }
                                  placeholder="Inserisci il motivo della manutenzione"
                                />
                              </div>
                              <DialogFooter>
                                <Button
                                  onClick={() => {
                                    setMaintenanceVehicle(vehicle);
                                    setTimeout(() => setMaintenance(), 0);
                                  }}
                                >
                                  Programma Manutenzione
                                </Button>
                              </DialogFooter>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <img
                    src={vehicle.image_url}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    className="w-full h-48 object-cover rounded-[16px] mb-4"
                  />
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Chilometraggio: {vehicle.mileage?.toLocaleString() || "0"}{" "}
                      km
                    </p>
                    <div className="flex justify-between items-center">
                      <span
                        className={`px-3 py-1 rounded-full text-sm
                        ${
                          vehicle.status === "available"
                            ? "bg-green-100 text-green-800"
                            : vehicle.status === "booked"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {vehicle.status === "available"
                          ? "Disponibile"
                          : vehicle.status === "booked"
                            ? "Prenotato"
                            : "In Manutenzione"}
                      </span>
                    </div>
                    {vehicle.status === "maintenance" &&
                      vehicle.maintenance_start && (
                        <div className="mt-2 p-2 bg-red-50 rounded-[12px]">
                          <p className="text-sm font-medium text-red-800">
                            In Manutenzione
                          </p>
                          <p className="text-xs text-red-600 mt-1">
                            {new Date(
                              vehicle.maintenance_start,
                            ).toLocaleDateString()}{" "}
                            -{" "}
                            {new Date(
                              vehicle.maintenance_end,
                            ).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-red-600 mt-1">
                            {vehicle.maintenance_reason}
                          </p>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleManagement;
