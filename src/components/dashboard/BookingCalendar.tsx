import React from "react";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useToast } from "../ui/use-toast";
import { Booking } from "@/types/bookings";
import { Vehicle } from "@/types/vehicles";
import Header from "./Header";

interface BookingCalendarProps {
  selectedVehicle?: string;
  onDateSelect?: (date: Date) => void;
  onVehicleSelect?: (vehicle: string) => void;
  onDatesChange?: (dates: Date[]) => void;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({
  selectedVehicle: initialVehicle,
  onDateSelect = () => {},
  onVehicleSelect = () => {},
  onDatesChange = () => {},
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = React.useState<{
    startDate: Date;
    endDate: Date;
    key: string;
  }>({
    startDate: new Date(),
    endDate: new Date(),
    key: "selection",
  });

  const [selectedVehicle, setSelectedVehicle] = React.useState("");
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [pickupTime, setPickupTime] = React.useState("");
  const [returnTime, setReturnTime] = React.useState("");

  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);

  React.useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const { data, error } = await supabase.from("vehicles").select("*");
        if (error) throw error;
        setVehicles(data || []);
      } catch (error) {
        console.error("Error loading vehicles:", error);
      }
    };

    fetchVehicles();
  }, []);

  React.useEffect(() => {
    // Get vehicle ID from URL if present
    const params = new URLSearchParams(window.location.search);
    const vehicleId = params.get("vehicle");
    if (vehicleId) {
      setSelectedVehicle(vehicleId);
    } else if (initialVehicle) {
      setSelectedVehicle(initialVehicle);
    }
  }, [initialVehicle]);

  React.useEffect(() => {
    const fetchBookings = async () => {
      if (!selectedVehicle) return;
      try {
        const { data, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("vehicle_id", selectedVehicle)
          .eq("status", "active");

        if (error) throw error;
        setBookings(data || []);
      } catch (error) {
        console.error("Error loading bookings:", error);
      }
    };

    fetchBookings();
  }, [selectedVehicle]);

  // Reset times when date changes
  React.useEffect(() => {
    setPickupTime("");
    setReturnTime("");
  }, [dateRange.startDate]);

  const handleSelect = (ranges: any) => {
    const range = ranges.selection;
    const dates = getDatesInRange(range.startDate, range.endDate);

    // Check if any of the selected dates are fully booked
    const hasUnavailableDates = dates.some((date) => isDateFullyBooked(date));
    if (hasUnavailableDates) {
      return; // Don't update the selection if any date is unavailable
    }

    // If clicking the same date again, clear the selection
    if (
      dateRange.startDate &&
      dateRange.endDate &&
      range.startDate.getTime() === dateRange.startDate.getTime() &&
      range.endDate.getTime() === dateRange.endDate.getTime()
    ) {
      setDateRange({
        startDate: new Date(),
        endDate: new Date(),
        key: "selection",
      });
      return;
    }

    setDateRange(range);
    onDateSelect(range.startDate);
    onDatesChange(dates);
  };

  const getDatesInRange = (start: Date, end: Date) => {
    const dates: Date[] = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  };

  const isDateFullyBooked = (date: Date) => {
    if (!selectedVehicle) return false;

    // Check if date is in maintenance period
    const vehicle = vehicles.find((v) => v.id === selectedVehicle);
    if (
      vehicle?.status === "maintenance" &&
      vehicle.maintenance_start &&
      vehicle.maintenance_end
    ) {
      const maintenanceStart = new Date(vehicle.maintenance_start);
      const maintenanceEnd = new Date(vehicle.maintenance_end);
      if (date >= maintenanceStart && date <= maintenanceEnd) {
        return true;
      }
    }

    // Check if date is fully booked
    return bookings.some((booking) => {
      const bookingStart = new Date(booking.start_date);
      const bookingEnd = new Date(booking.end_date);
      const bookingStartHour = parseInt(booking.pickup_time.split(":")[0]);
      const bookingEndHour = parseInt(booking.return_time.split(":")[0]);

      if (date.toDateString() === bookingStart.toDateString()) {
        // If booking covers most of the day (more than 6 hours)
        return bookingEndHour - bookingStartHour > 6;
      }
      return false;
    });
  };

  const isDatePartiallyBooked = (date: Date) => {
    if (!selectedVehicle) return false;

    return bookings.some((booking) => {
      const bookingStart = new Date(booking.start_date);
      const bookingEnd = new Date(booking.end_date);
      return date >= bookingStart && date <= bookingEnd;
    });
  };

  const getMaintenanceInfo = (day: Date) => {
    if (!selectedVehicle) return null;
    const vehicle = vehicles.find((v) => v.id === selectedVehicle);
    if (
      vehicle?.status === "maintenance" &&
      vehicle.maintenance_start &&
      vehicle.maintenance_end
    ) {
      const maintenanceStart = new Date(vehicle.maintenance_start);
      const maintenanceEnd = new Date(vehicle.maintenance_end);
      if (day >= maintenanceStart && day <= maintenanceEnd) {
        return vehicle.maintenance_reason;
      }
    }
    return null;
  };

  const getBookingsForDay = (day: Date) => {
    return bookings.filter((booking) => {
      const bookingStart = new Date(booking.start_date);
      const bookingEnd = new Date(booking.end_date);
      return day >= bookingStart && day <= bookingEnd;
    });
  };

  const customDayContent = (day: Date) => {
    const isFullyBooked = isDateFullyBooked(day);
    const isPartiallyBooked = !isFullyBooked && isDatePartiallyBooked(day);
    const isSelected =
      dateRange.startDate &&
      dateRange.endDate &&
      day >= dateRange.startDate &&
      day <= dateRange.endDate;
    const isToday = day.toDateString() === new Date().toDateString();
    const maintenanceReason = getMaintenanceInfo(day);
    const dayBookings = getBookingsForDay(day);

    return (
      <div
        className={`relative group ${isFullyBooked ? "cursor-not-allowed" : "cursor-pointer"}`}
        style={{
          height: "100%",
          width: "100%",
        }}
      >
        <div
          style={{
            height: "100%",
            width: "100%",
            backgroundColor: isFullyBooked
              ? "#fee2e2"
              : isPartiallyBooked
                ? "#fef3c7"
                : "transparent",
            position: "relative",
            zIndex: isSelected ? 2 : 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "8px",
            color:
              isSelected ||
              (isToday && day.getTime() === dateRange.startDate.getTime())
                ? "white"
                : "inherit",
            pointerEvents: isFullyBooked ? "none" : "auto",
          }}
        >
          {day.getDate()}
        </div>
        {maintenanceReason && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {maintenanceReason}
          </div>
        )}
        {isPartiallyBooked && dayBookings.length > 0 && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            <div className="font-medium mb-1">Prenotazioni:</div>
            {dayBookings.map((booking, index) => (
              <div key={index} className="whitespace-nowrap">
                {booking.pickup_time.slice(0, 5).padStart(5, "0")} -{" "}
                {booking.return_time.slice(0, 5).padStart(5, "0")}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const isTimeSlotAvailable = (hour: number) => {
    const selectedDate = dateRange.startDate;
    return !bookings.some((booking) => {
      if (
        new Date(booking.start_date).toDateString() ===
        selectedDate.toDateString()
      ) {
        const bookingStart = parseInt(booking.pickup_time.split(":")[0]);
        const bookingEnd = parseInt(booking.return_time.split(":")[0]);
        return hour >= bookingStart && hour <= bookingEnd;
      }
      return false;
    });
  };

  const getAvailablePickupTimes = () => {
    return Array.from({ length: 12 }, (_, i) => i + 8).filter((hour) =>
      isTimeSlotAvailable(hour),
    );
  };

  const getAvailableReturnTimes = () => {
    if (!pickupTime) return [];
    const pickupHour = parseInt(pickupTime);
    return Array.from({ length: 12 }, (_, i) => i + 8).filter(
      (hour) => hour > pickupHour && isTimeSlotAvailable(hour),
    );
  };

  const areDatesAvailable = () => {
    const dates = getDatesInRange(dateRange.startDate, dateRange.endDate);
    return !dates.some((date) => isDateFullyBooked(date));
  };

  const isDateSelected = dateRange.startDate && dateRange.endDate;
  const isDateAvailable = areDatesAvailable();
  const isFormComplete =
    selectedVehicle &&
    isDateSelected &&
    isDateAvailable &&
    pickupTime &&
    returnTime;

  return (
    <div>
      <Header />
      <div className="pt-[72px] px-6">
        <div className="max-w-[1400px] mx-auto">
          <h1 className="text-3xl font-bold mb-6">Prenota un'auto</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Vehicle Selection */}
            <Card className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Scegli Veicolo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    {vehicles.map((vehicle) => (
                      <button
                        key={vehicle.id}
                        onClick={() => {
                          setSelectedVehicle(vehicle.id);
                          onVehicleSelect(vehicle.id);
                        }}
                        className={`flex items-center p-2 rounded-lg border-2 transition-all ${
                          selectedVehicle === vehicle.id
                            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <img
                          src={vehicle.image_url}
                          alt={`${vehicle.brand} ${vehicle.model}`}
                          className="w-[60px] h-[40px] rounded object-cover"
                        />
                        <div className="ml-3 text-left">
                          <span className="text-sm font-medium block">
                            {vehicle.brand} {vehicle.model}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Date Selection */}
            <Card className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Scegli la data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div
                    className={`${!selectedVehicle ? "opacity-40 pointer-events-none cursor-not-allowed" : ""}`}
                  >
                    <DateRange
                      ranges={[dateRange]}
                      onChange={selectedVehicle ? handleSelect : undefined}
                      months={1}
                      direction="vertical"
                      minDate={new Date()}
                      rangeColors={["#0ea5e9"]}
                      showDateDisplay={false}
                      className="border-0"
                      dayContentRenderer={customDayContent}
                    />
                  </div>
                  {!selectedVehicle && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/75 text-white px-4 py-2 rounded-lg text-sm">
                        Seleziona auto prima di scegliere la data
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[#fee2e2]"></div>
                    <span className="text-sm text-gray-600">
                      Non disponibile
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[#fef3c7]"></div>
                    <span className="text-sm text-gray-600">
                      Parzialmente disponibile
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Selection */}
            <Card className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Scegli l'orario</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-4">
                    <Select
                      value={pickupTime}
                      onValueChange={(value) => {
                        setPickupTime(value);
                        setReturnTime(""); // Reset return time when pickup time changes
                      }}
                      disabled={!isDateSelected || !isDateAvailable}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Orario di ritiro" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailablePickupTimes().map((hour) => (
                          <SelectItem key={hour} value={hour.toString()}>
                            {`${hour}:00`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={returnTime}
                      onValueChange={setReturnTime}
                      disabled={!pickupTime}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Orario di consegna" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableReturnTimes().map((hour) => (
                          <SelectItem key={hour} value={hour.toString()}>
                            {`${hour}:00`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Book Vehicle Button */}
          {isFormComplete && (
            <div className="flex justify-center">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="lg"
                    className="w-[300px] h-12 rounded-full bg-black hover:bg-gray-800"
                  >
                    Prenota Veicolo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[20px]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Conferma Prenotazione</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <span>
                        Confermi di voler prenotare questo veicolo per
                        <span className="block mt-2 font-medium">
                          {dateRange.startDate.toLocaleDateString()} dalle ore{" "}
                          {pickupTime}:00 alle ore {returnTime}:00
                        </span>
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full">
                      Annulla
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-full bg-black hover:bg-gray-800"
                      onClick={async () => {
                        if (!selectedVehicle || !user) {
                          toast({
                            title: "Errore",
                            description: "Seleziona un veicolo",
                            variant: "destructive",
                          });
                          return;
                        }

                        try {
                          // Create a new date at midnight in the local timezone
                          const localStartDate = new Date(dateRange.startDate);
                          localStartDate.setHours(0, 0, 0, 0);
                          const localEndDate = new Date(dateRange.endDate);
                          localEndDate.setHours(0, 0, 0, 0);

                          // Format dates in YYYY-MM-DD format
                          const start_date =
                            localStartDate.toLocaleDateString("en-CA");
                          const end_date =
                            localEndDate.toLocaleDateString("en-CA");

                          const bookingData = {
                            vehicle_id: selectedVehicle,
                            user_id: user.id,
                            start_date,
                            end_date,
                            pickup_time: `${pickupTime}:00`,
                            return_time: `${returnTime}:00`,
                            status: "active",
                          };

                          const { data, error } = await supabase
                            .from("bookings")
                            .insert([bookingData])
                            .select();

                          if (error) throw error;

                          toast({
                            title: "Successo",
                            description: "Veicolo prenotato con successo",
                          });

                          window.location.href = "/";
                        } catch (error) {
                          console.error("Error creating booking:", error);
                          toast({
                            title: "Errore",
                            description: "Impossibile creare la prenotazione",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Conferma
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingCalendar;
