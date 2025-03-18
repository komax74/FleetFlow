import React, { useState } from "react";
import Header from "./dashboard/Header";
import VehicleGrid from "./dashboard/VehicleGrid";
import BookingCalendar from "./dashboard/BookingCalendar";
import { Dialog, DialogContent } from "./ui/dialog";
import MapboxMap from "./dashboard/MapboxMap";

interface HomeProps {
  initialView?: "grid" | "calendar";
}

const Home = ({ initialView = "grid" }: HomeProps) => {
  const [selectedVehicle, setSelectedVehicle] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("vehicle") || "";
  });
  const [view, setView] = useState<"grid" | "calendar">(initialView);
  const [showBookingDialog, setShowBookingDialog] = useState(false);

  const handleBookVehicle = () => {
    setShowBookingDialog(true);
  };

  const handleReturnVehicle = (id: string) => {
    // Handle vehicle return
  };

  return (
    <div>
      <Header />
      <main className="pt-[72px] px-4 md:px-6 lg:px-8">
        {view === "grid" ? (
          <VehicleGrid
            onBookVehicle={handleBookVehicle}
            onReturnVehicle={handleReturnVehicle}
          />
        ) : view === "calendar" ? (
          <BookingCalendar
            selectedVehicle={selectedVehicle}
            onDateSelect={() => {}}
          />
        ) : (
          <MapboxMap />
        )}
      </main>

      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="grid gap-4 py-4">
            <h2 className="text-lg font-semibold">Prenota un Veicolo</h2>
            <p className="text-sm text-gray-500">
              Seleziona i dettagli della prenotazione qui sotto.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;
