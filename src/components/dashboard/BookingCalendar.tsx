import React from "react";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { it } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
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
  const [selectedDayBookings, setSelectedDayBookings] = React.useState<{
    day: Date;
    bookings: Booking[];
    maintenanceReason?: string | null;
  } | null>(null);

  const [confirmBookingDialog, setConfirmBookingDialog] = React.useState<{
    open: boolean;
    vehicle?: Vehicle;
    startDate?: Date;
    endDate?: Date;
    pickupTime?: string;
    returnTime?: string;
  }>({ open: false });

  // State to track if there are overlapping bookings with different vehicles
  const [hasDifferentVehicleOverlap, setHasDifferentVehicleOverlap] =
    React.useState(false);

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
          .select("*, profiles!bookings_user_id_fkey(*), vehicles(*)")
          .eq("vehicle_id", selectedVehicle)
          .eq("status", "active");

        if (error) throw error;

        // Ensure profiles data is loaded correctly
        const bookingsWithProfiles = await Promise.all(
          (data || []).map(async (booking) => {
            if (!booking.profiles) {
              // If profiles is missing, fetch it separately
              const { data: profileData } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", booking.user_id)
                .single();

              return { ...booking, profiles: profileData };
            }
            return booking;
          }),
        );

        setBookings(bookingsWithProfiles);
      } catch (error) {
        console.error("Error loading bookings:", error);
      }
    };

    fetchBookings();
  }, [selectedVehicle]);

  // Reset times when date changes
  React.useEffect(() => {
    // Reset times when date changes and ensure the date is properly set
    setPickupTime("");
    setReturnTime("");

    // Ensure the date is set to noon to avoid timezone issues
    const fixedStartDate = new Date(dateRange.startDate);
    fixedStartDate.setHours(12, 0, 0, 0);

    const fixedEndDate = new Date(dateRange.endDate);
    fixedEndDate.setHours(12, 0, 0, 0);

    // Only update if the dates are different to avoid infinite loop
    if (
      fixedStartDate.getTime() !== dateRange.startDate.getTime() ||
      fixedEndDate.getTime() !== dateRange.endDate.getTime()
    ) {
      setDateRange({
        startDate: fixedStartDate,
        endDate: fixedEndDate,
        key: "selection",
      });
    }
  }, [dateRange.startDate, dateRange.endDate]);

  const handleSelect = (ranges: any) => {
    const range = ranges.selection;

    // Fix timezone issue: ensure dates are set to noon to avoid timezone shifts
    const fixedStartDate = new Date(range.startDate);
    fixedStartDate.setHours(12, 0, 0, 0);

    const fixedEndDate = new Date(range.endDate);
    fixedEndDate.setHours(12, 0, 0, 0);

    const fixedRange = {
      startDate: fixedStartDate,
      endDate: fixedEndDate,
      key: "selection",
    };

    const dates = getDatesInRange(fixedStartDate, fixedEndDate);

    // Check if any of the selected dates are fully booked
    const hasUnavailableDates = dates.some((date) => isDateFullyBooked(date));
    if (hasUnavailableDates) {
      return; // Don't update the selection if any date is unavailable
    }

    // If clicking the same date again, clear the selection
    if (
      dateRange.startDate &&
      dateRange.endDate &&
      fixedStartDate.getTime() === dateRange.startDate.getTime() &&
      fixedEndDate.getTime() === dateRange.endDate.getTime()
    ) {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      setDateRange({
        startDate: today,
        endDate: today,
        key: "selection",
      });
      return;
    }

    // Always update the dateRange immediately for UI feedback
    setDateRange(fixedRange);

    // Reset times when dates change
    setPickupTime("");
    setReturnTime("");

    // Additional fix for cross-month selection
    if (fixedStartDate.getMonth() !== fixedEndDate.getMonth()) {
      // Force a re-render to ensure the calendar updates correctly
      setTimeout(() => {
        // Update the DOM directly to fix hover effect
        const rangeElements = document.querySelectorAll(".rbc-day-bg");
        rangeElements.forEach((el) => {
          if (el.classList.contains("rbc-in-range-selection")) {
            el.style.backgroundColor = "rgba(14, 165, 233, 0.2)";
          }
        });

        // Re-apply the selection
        setDateRange(fixedRange);
      }, 50);
    }

    onDateSelect(fixedStartDate);
    onDatesChange(dates);

    // Log the selected dates for debugging
    console.log("Selected date range:", {
      startDate: fixedStartDate.toLocaleDateString(),
      endDate: fixedEndDate.toLocaleDateString(),
    });
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
    const isInMaintenance = !!maintenanceReason;

    return (
      <div
        className={`relative ${isFullyBooked || isInMaintenance ? "cursor-not-allowed" : "cursor-pointer"}`}
        style={{
          height: "100%",
          width: "100%",
        }}
        onClick={() => {
          if (isInMaintenance) {
            // Mostra finestra con info manutenzione
            setSelectedDayBookings({
              day,
              bookings: [],
              maintenanceReason: maintenanceReason,
            });
          } else if (isPartiallyBooked && dayBookings.length > 0) {
            // Mostra finestra con prenotazioni
            setSelectedDayBookings({ day, bookings: dayBookings });
          }
        }}
      >
        <div
          style={{
            height: "100%",
            width: "100%",
            backgroundColor: isSelected
              ? "#0ea5e9" // Blu selezione sempre sopra
              : isInMaintenance
                ? "#dc2626" // Rosso scuro per manutenzione
                : isFullyBooked
                  ? "#1e40af" // Blu scuro per completamente prenotato
                  : isPartiallyBooked
                    ? "#fef3c7" // Giallo per parzialmente prenotato
                    : "transparent",
            position: "relative",
            zIndex: isSelected ? 10 : 0, // Aumentato z-index per la selezione
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "8px",
            color: isSelected
              ? "white"
              : isToday
                ? "#0ea5e9"
                : isInMaintenance || isFullyBooked
                  ? "white"
                  : isPartiallyBooked
                    ? "#1e40af" // Testo blu su sfondo giallo
                    : "inherit",
            pointerEvents: isFullyBooked || isInMaintenance ? "none" : "auto",
            fontWeight: isToday ? "bold" : "normal",
          }}
        >
          {day.getDate()}
        </div>
        {isPartiallyBooked && dayBookings.length > 0 && (
          <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full mr-1 mt-1"></div>
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

  // Check if a time range overlaps with existing bookings
  const isTimeRangeAvailable = (startHour: number, endHour: number) => {
    const selectedDate = dateRange.startDate;
    return !bookings.some((booking) => {
      if (
        new Date(booking.start_date).toDateString() ===
        selectedDate.toDateString()
      ) {
        const bookingStart = parseInt(booking.pickup_time.split(":")[0]);
        const bookingEnd = parseInt(booking.return_time.split(":")[0]);

        // Check if there's any overlap between the ranges
        return startHour <= bookingEnd && endHour >= bookingStart;
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
      (hour) => hour > pickupHour && isTimeRangeAvailable(pickupHour, hour),
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
                <div className="relative overflow-visible">
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
                      className="border-0 overflow-visible"
                      dayContentRenderer={customDayContent}
                      locale={it}
                      // Add these props to improve hover effect
                      showSelectionPreview={true}
                      moveRangeOnFirstSelection={false}
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
                    <div className="w-4 h-4 rounded bg-[#dc2626]"></div>
                    <span className="text-sm text-gray-600">
                      In manutenzione
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[#1e40af]"></div>
                    <span className="text-sm text-gray-600">
                      Completamente occupata
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
                  {isDateSelected && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Data di prelievo:
                        </span>
                        <Select
                          value={
                            dateRange.startDate
                              ? `${dateRange.startDate.getFullYear()}-${String(dateRange.startDate.getMonth() + 1).padStart(2, "0")}-${String(dateRange.startDate.getDate()).padStart(2, "0")}`
                              : ""
                          }
                          onValueChange={(value) => {
                            const newStartDate = new Date(value);
                            setDateRange({
                              ...dateRange,
                              startDate: newStartDate,
                              endDate:
                                dateRange.endDate < newStartDate
                                  ? newStartDate
                                  : dateRange.endDate,
                            });
                            setPickupTime("");
                            setReturnTime("");
                          }}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Seleziona data" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 30 }, (_, i) => {
                              const date = new Date();
                              date.setDate(date.getDate() + i);
                              return date;
                            }).map((date) => (
                              <SelectItem
                                key={date.toISOString()}
                                value={date.toISOString().split("T")[0]}
                                disabled={isDateFullyBooked(date)}
                              >
                                {date.toLocaleDateString()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {dateRange.startDate.toDateString() !==
                        dateRange.endDate.toDateString() && (
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-medium">
                            Data di riconsegna:
                          </span>
                          <Select
                            value={
                              dateRange.endDate
                                ? `${dateRange.endDate.getFullYear()}-${String(dateRange.endDate.getMonth() + 1).padStart(2, "0")}-${String(dateRange.endDate.getDate()).padStart(2, "0")}`
                                : ""
                            }
                            onValueChange={(value) => {
                              const newEndDate = new Date(value);
                              setDateRange({
                                ...dateRange,
                                endDate: newEndDate,
                              });
                              setReturnTime("");
                            }}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Seleziona data" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 30 }, (_, i) => {
                                const date = new Date(dateRange.startDate);
                                date.setDate(date.getDate() + i);
                                return date;
                              }).map((date) => (
                                <SelectItem
                                  key={date.toISOString()}
                                  value={date.toISOString().split("T")[0]}
                                  disabled={isDateFullyBooked(date)}
                                >
                                  {date.toLocaleDateString()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}

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
              <Button
                size="lg"
                className="w-[300px] h-12 rounded-full bg-black hover:bg-gray-800"
                onClick={async () => {
                  // Trova il veicolo selezionato
                  const vehicle = vehicles.find(
                    (v) => v.id === selectedVehicle,
                  );

                  // Check for overlapping bookings with different vehicles
                  try {
                    if (user) {
                      const { data: existingBookings } = await supabase
                        .from("bookings")
                        .select("*")
                        .eq("user_id", user.id)
                        .eq("status", "active");

                      if (existingBookings) {
                        const overlappingBookings = existingBookings.filter(
                          (booking) => {
                            const bookingStart = new Date(
                              `${booking.start_date}T${booking.pickup_time}`,
                            );
                            const bookingEnd = new Date(
                              `${booking.end_date}T${booking.return_time}`,
                            );
                            const newBookingStart = new Date(
                              `${dateRange.startDate.toISOString().split("T")[0]}T${pickupTime}:00`,
                            );
                            const newBookingEnd = new Date(
                              `${dateRange.endDate.toISOString().split("T")[0]}T${returnTime}:00`,
                            );

                            return (
                              newBookingStart <= bookingEnd &&
                              newBookingEnd >= bookingStart &&
                              booking.vehicle_id !== selectedVehicle
                            );
                          },
                        );

                        setHasDifferentVehicleOverlap(
                          overlappingBookings.length > 0,
                        );
                      }
                    }
                  } catch (error) {
                    console.error(
                      "Error checking overlapping bookings:",
                      error,
                    );
                    setHasDifferentVehicleOverlap(false);
                  }

                  setConfirmBookingDialog({
                    open: true,
                    vehicle: vehicle,
                    startDate: dateRange.startDate,
                    endDate: dateRange.endDate,
                    pickupTime: pickupTime,
                    returnTime: returnTime,
                  });
                }}
              >
                Prenota Veicolo
              </Button>

              {/* Custom Confirmation Dialog */}
              {confirmBookingDialog.open && (
                <div
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                  onClick={() =>
                    setConfirmBookingDialog({
                      ...confirmBookingDialog,
                      open: false,
                    })
                  }
                >
                  <div
                    className="bg-white rounded-xl shadow-xl max-w-md w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-xl font-semibold">
                          Confermi di prenotare il veicolo{" "}
                          {confirmBookingDialog.vehicle?.license_plate}?
                        </h3>
                        <button
                          className="text-gray-400 hover:text-gray-600"
                          onClick={() =>
                            setConfirmBookingDialog({
                              ...confirmBookingDialog,
                              open: false,
                            })
                          }
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="mb-6">
                        <p className="text-gray-700 mb-4">
                          Stai confermando l'auto per queste date:
                        </p>

                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              Ritiro:
                            </p>
                            <p className="font-medium">
                              {confirmBookingDialog.startDate?.toLocaleDateString()}{" "}
                              alle ore {confirmBookingDialog.pickupTime}:00
                            </p>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              Riconsegna:
                            </p>
                            <p className="font-medium">
                              {confirmBookingDialog.endDate?.toLocaleDateString()}{" "}
                              alle ore {confirmBookingDialog.returnTime}:00
                            </p>
                          </div>
                        </div>

                        {/* Warning for overlapping bookings with different vehicles */}
                        {hasDifferentVehicleOverlap && (
                          <div className="mt-4 bg-red-50 p-4 rounded-lg border border-red-200 flex items-start gap-3">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-red-500 flex-shrink-0 mt-0.5"
                            >
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                              <line x1="12" y1="9" x2="12" y2="13" />
                              <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <div>
                              <h4 className="font-medium text-red-800 mb-1">
                                Attenzione
                              </h4>
                              <p className="text-red-700 text-sm">
                                Hai già un altro veicolo prenotato per queste
                                date.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() =>
                            setConfirmBookingDialog({
                              ...confirmBookingDialog,
                              open: false,
                            })
                          }
                        >
                          Annulla
                        </Button>
                        <Button
                          className="bg-blue-500 hover:bg-blue-600 text-white"
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
                              // Check if user already has a booking for this time period
                              const {
                                data: existingBookings,
                                error: checkError,
                              } = await supabase
                                .from("bookings")
                                .select("*")
                                .eq("user_id", user.id)
                                .eq("status", "active");

                              if (checkError) throw checkError;

                              // Check for overlapping bookings
                              const overlappingBookings =
                                existingBookings.filter((booking) => {
                                  const bookingStart = new Date(
                                    `${booking.start_date}T${booking.pickup_time}`,
                                  );
                                  const bookingEnd = new Date(
                                    `${booking.end_date}T${booking.return_time}`,
                                  );
                                  const newBookingStart = new Date(
                                    `${dateRange.startDate.toISOString().split("T")[0]}T${pickupTime}:00`,
                                  );
                                  const newBookingEnd = new Date(
                                    `${dateRange.endDate.toISOString().split("T")[0]}T${returnTime}:00`,
                                  );

                                  return (
                                    newBookingStart <= bookingEnd &&
                                    newBookingEnd >= bookingStart
                                  );
                                });

                              // Check if the overlapping booking is for the same vehicle
                              const sameVehicleOverlap =
                                overlappingBookings.some(
                                  (booking) =>
                                    booking.vehicle_id === selectedVehicle,
                                );

                              // If there's an overlap with the same vehicle, prevent booking
                              if (sameVehicleOverlap) {
                                toast({
                                  title: "Errore",
                                  description:
                                    "Hai già una prenotazione attiva per questo veicolo in questo periodo",
                                  variant: "destructive",
                                });
                                return;
                              }

                              // Ensure we're working with the correct dates by setting them to noon
                              // to avoid any timezone issues
                              const localStartDate = new Date(
                                dateRange.startDate,
                              );
                              localStartDate.setHours(12, 0, 0, 0);

                              const localEndDate = new Date(dateRange.endDate);
                              localEndDate.setHours(12, 0, 0, 0);

                              // Format dates in YYYY-MM-DD format
                              // Formato YYYY-MM-DD richiesto per il database
                              const start_date = `${localStartDate.getFullYear()}-${String(localStartDate.getMonth() + 1).padStart(2, "0")}-${String(localStartDate.getDate()).padStart(2, "0")}`;
                              const end_date = `${localEndDate.getFullYear()}-${String(localEndDate.getMonth() + 1).padStart(2, "0")}-${String(localEndDate.getDate()).padStart(2, "0")}`;

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

                              // Invia notifica agli amministratori
                              try {
                                // Trova tutti gli admin
                                const { data: admins } = await supabase
                                  .from("profiles")
                                  .select("id")
                                  .eq("role", "admin");

                                if (admins && admins.length > 0) {
                                  // Ottieni i dettagli del veicolo e dell'utente per la notifica
                                  const vehicle = vehicles.find(
                                    (v) => v.id === selectedVehicle,
                                  );
                                  const { data: userData } = await supabase
                                    .from("profiles")
                                    .select("*")
                                    .eq("id", user.id)
                                    .single();

                                  // Crea il messaggio di notifica con date in formato italiano
                                  const startDateFormatted = `${String(localStartDate.getDate()).padStart(2, "0")}/${String(localStartDate.getMonth() + 1).padStart(2, "0")}/${localStartDate.getFullYear()}`;
                                  const endDateFormatted = `${String(localEndDate.getDate()).padStart(2, "0")}/${String(localEndDate.getMonth() + 1).padStart(2, "0")}/${localEndDate.getFullYear()}`;

                                  const notificationMessage = `Nuova prenotazione: ${userData?.full_name} ha prenotato ${vehicle?.brand} ${vehicle?.model} (${vehicle?.license_plate}) dal ${startDateFormatted} al ${endDateFormatted}, dalle ${pickupTime}:00 alle ${returnTime}:00.`;

                                  // Invia notifica a ciascun admin
                                  for (const admin of admins) {
                                    await supabase
                                      .from("notifications")
                                      .insert([
                                        {
                                          user_id: admin.id,
                                          title: "Nuova prenotazione veicolo",
                                          message: notificationMessage,
                                          type: "booking",
                                          read: false,
                                          created_at: new Date().toISOString(),
                                          action_url: "/booking-history",
                                        },
                                      ]);
                                  }
                                }
                              } catch (notificationError) {
                                console.error(
                                  "Error sending notification:",
                                  notificationError,
                                );
                                // Non blocchiamo il flusso se la notifica fallisce
                              }

                              toast({
                                title: "Successo",
                                description: "Veicolo prenotato con successo",
                              });

                              window.location.href = "/";
                            } catch (error) {
                              console.error("Error creating booking:", error);
                              toast({
                                title: "Errore",
                                description:
                                  "Impossibile creare la prenotazione",
                                variant: "destructive",
                              });
                            } finally {
                              setConfirmBookingDialog({
                                ...confirmBookingDialog,
                                open: false,
                              });
                            }
                          }}
                        >
                          Conferma
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Booking Details Modal */}
          {selectedDayBookings && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedDayBookings(null)}
            >
              <div
                className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold">
                      {selectedDayBookings.maintenanceReason
                        ? "Veicolo non disponibile"
                        : `Prenotazioni del ${selectedDayBookings.day.toLocaleDateString()}`}
                    </h3>
                    <button
                      className="text-gray-400 hover:text-gray-600"
                      onClick={() => setSelectedDayBookings(null)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>

                  {selectedDayBookings.maintenanceReason ? (
                    <div className="space-y-4">
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h4 className="font-medium text-red-800 mb-2">
                          In Manutenzione
                        </h4>
                        <p className="text-red-700">
                          {selectedDayBookings.maintenanceReason}
                        </p>
                      </div>
                      <p className="text-gray-600 text-sm">
                        Il veicolo non è disponibile in questa data a causa di
                        manutenzione programmata.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-6">
                        {selectedDayBookings.bookings.map((booking, index) => (
                          <div
                            key={index}
                            className="border-b pb-4 last:border-0 last:pb-0 pt-2"
                          >
                            <div className="flex items-start gap-4 mb-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.profiles?.full_name || booking.user_id}`}
                                />
                                <AvatarFallback>U</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {booking.profiles?.full_name || "Utente"}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {booking.profiles?.company || ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-4 mb-3">
                              <img
                                src={
                                  booking.vehicles?.image_url ||
                                  "https://via.placeholder.com/150?text=Auto"
                                }
                                alt={booking.vehicles?.model || "Veicolo"}
                                className="w-20 h-14 object-cover rounded-md"
                              />
                              <div>
                                <p className="font-medium">
                                  {booking.vehicles?.brand}{" "}
                                  {booking.vehicles?.model}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {booking.vehicles?.license_plate}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                              <div>
                                <p className="text-sm font-medium text-gray-500">
                                  Prelievo
                                </p>
                                <p className="text-sm">
                                  {new Date(
                                    booking.start_date,
                                  ).toLocaleDateString()}
                                  <br />
                                  {booking.pickup_time.slice(0, 5)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">
                                  Riconsegna
                                </p>
                                <p className="text-sm">
                                  {new Date(
                                    booking.end_date,
                                  ).toLocaleDateString()}
                                  <br />
                                  {booking.return_time.slice(0, 5)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 flex justify-center">
                        <Button
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                          onClick={() => {
                            // Seleziona la data e chiudi il modale
                            const range = {
                              startDate: selectedDayBookings.day,
                              endDate: selectedDayBookings.day,
                              key: "selection",
                            };
                            setDateRange(range);
                            setSelectedDayBookings(null);
                          }}
                        >
                          Prenota ugualmente l'auto
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingCalendar;
