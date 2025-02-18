import React from "react";
import { Button } from "../ui/button";
import { Plus, CarFront, Calendar } from "lucide-react";

interface QuickActionsProps {
  onBookVehicle?: () => void;
  onReturnVehicle?: () => void;
  onViewCalendar?: () => void;
}

const QuickActions = ({
  onBookVehicle = () => {},
  onReturnVehicle = () => {},
  onViewCalendar = () => {},
}: QuickActionsProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20 px-4 sm:px-0">
      <Button
        size="lg"
        className="h-12 px-6 shadow-lg hover:shadow-xl bg-primary text-white rounded-[20px] w-full sm:w-[200px]"
        onClick={() => (window.location.href = "/book")}
      >
        <Plus className="h-5 w-5 mr-2" />
        Prenota Veicolo
      </Button>
      <Button
        size="lg"
        variant="secondary"
        className="h-12 px-6 shadow-lg hover:shadow-xl rounded-[20px] w-full sm:w-[200px]"
        onClick={() => (window.location.href = "/my-bookings")}
      >
        <CarFront className="h-5 w-5 mr-2" />
        Restituisci Veicolo
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="h-12 px-6 shadow-lg hover:shadow-xl bg-white rounded-[20px] w-full sm:w-[200px]"
        onClick={() => (window.location.href = "/calendar")}
      >
        <Calendar className="h-5 w-5 mr-2" />
        Vedi Calendario
      </Button>
    </div>
  );
};

export default QuickActions;
