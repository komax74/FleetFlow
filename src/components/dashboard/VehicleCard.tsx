import React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Calendar, Car, Clock, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

type VehicleStatus =
  | "available"
  | "partially_available"
  | "booked"
  | "maintenance";

interface VehicleCardProps {
  id?: string;
  image_url?: string;
  model?: string;
  license_plate?: string | null;
  status?: VehicleStatus;
  currentUser?: {
    name: string;
    avatar: string;
  };
  bookingTime?: string;
  onBook?: () => void;
  onReturn?: () => void;
}

const getStatusText = (status: VehicleStatus) => {
  switch (status) {
    case "available":
      return "Disponibile";
    case "partially_available":
      return "Parzialmente Disponibile";
    case "booked":
      return "Non Disponibile";
    case "maintenance":
      return "In Manutenzione";
    default:
      return "Sconosciuto";
  }
};

const getStatusStyles = (status: VehicleStatus) => {
  switch (status) {
    case "available":
      return "bg-green-500";
    case "partially_available":
      return "bg-emerald-600";
    case "booked":
      return "bg-red-500";
    case "maintenance":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

const getCurrentUserBooking = () => {
  const bookings = JSON.parse(
    localStorage.getItem("car_fleet_bookings") || "[]",
  );
  const currentUserId = "current-user"; // In a real app, this would come from auth
  return bookings.find(
    (b) =>
      b.user_id === currentUserId &&
      b.status === "active" &&
      new Date(b.end_date) >= new Date(),
  );
};

const VehicleCard = ({
  id = "1",
  image_url,
  model = "Sample Vehicle",
  license_plate,
  status = "available",
  currentUser,
  bookingTime,
  onBook = () => {},
  onReturn = () => {},
}: VehicleCardProps) => {
  const currentUserBooking = getCurrentUserBooking();
  const isUserBooking = currentUserBooking?.vehicle_id === id;
  const isDisabled =
    status === "maintenance" || (status === "booked" && !isUserBooking);

  return (
    <Card className="w-full sm:max-w-[340px] bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-[20px] overflow-hidden border-0">
      <CardHeader className="p-0">
        <div className="relative h-48 w-full overflow-hidden bg-gray-100">
          {image_url ? (
            <img
              src={image_url}
              alt={model}
              className="w-full h-full object-cover"
              onError={(e) => {
                const img = e.currentTarget;
                img.style.display = "none";
                const placeholder =
                  img.parentElement?.querySelector(".placeholder");
                if (placeholder) placeholder.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className="placeholder w-full h-full flex items-center justify-center bg-gray-100"
            style={{ display: image_url ? "none" : "flex" }}
          >
            <Car className="h-12 w-12 text-gray-400" />
            <span className="ml-2 text-gray-600">{model}</span>
          </div>
          <Badge
            className={`absolute top-4 right-4 ${getStatusStyles(status)}`}
          >
            {getStatusText(status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Car className="h-5 w-5 text-gray-500" />
            <div>
              <h3 className="font-semibold text-lg">{model}</h3>
              {license_plate && (
                <p className="text-sm text-gray-500">{license_plate}</p>
              )}
            </div>
          </div>
        </div>

        {status === "booked" && currentUser && bookingTime && (
          <div className="space-y-2">
            {Array.isArray(currentUser) ? (
              currentUser.map((user, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <span>{user.name}</span>
                  <span>•</span>
                  <span>{bookingTime[index]}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{currentUser.name}</span>
                <span>•</span>
                <span>{bookingTime}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        {isUserBooking ? (
          <Button variant="secondary" className="w-full" onClick={onReturn}>
            Restituisci Veicolo
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={() =>
              !isDisabled && (window.location.href = `/booking?vehicle=${id}`)
            }
            disabled={isDisabled}
            variant={
              isDisabled
                ? "ghost"
                : status === "partially_available"
                  ? "secondary"
                  : "default"
            }
            className={`w-full ${status === "partially_available" ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}`}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {status === "maintenance"
              ? "In Manutenzione"
              : status === "booked"
                ? "Non Disponibile"
                : "Prenota Ora"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default VehicleCard;
