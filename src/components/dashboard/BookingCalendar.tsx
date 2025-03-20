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
import { createBooking } from "@/lib/bookings";

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

    // Reset date selection when vehicle changes
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    setDateRange({
      startDate: today,
      endDate: today,
      key: "selection",
    });
    setPickupTime("");
    setReturnTime("");
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

    // Check if any of the selected dates are in maintenance or fully booked
    const hasMaintenanceDates = dates.some((date) => getMaintenanceInfo(date));
    const hasFullyBookedDates = dates.some(
      (date) => isDateFullyBooked(date) && !getMaintenanceInfo(date),
    );

    // Handle single date click for maintenance, fully booked, or partially booked
    if (fixedStartDate.getTime() === fixedEndDate.getTime()) {
      const clickedDate = fixedStartDate;

      if (getMaintenanceInfo(clickedDate)) {
        // If maintenance date is clicked, show maintenance info
        setSelectedDayBookings({
          day: clickedDate,
          bookings: [],
          maintenanceReason: getMaintenanceInfo(clickedDate),
        });
        return; // Don't update selection for maintenance dates
      }

      if (isDateFullyBooked(clickedDate)) {
        // If fully booked date is clicked, show bookings
        const dayBookings = getBookingsForDay(clickedDate);
        setSelectedDayBookings({
          day: clickedDate,
          bookings: dayBookings,
        });
        return; // Don't update selection for fully booked dates
      }

      if (isDatePartiallyBooked(clickedDate)) {
        // If partially booked date is clicked, show bookings but allow selection
        const dayBookings = getBookingsForDay(clickedDate);
        setSelectedDayBookings({
          day: clickedDate,
          bookings: dayBookings,
        });
        // Continue with selection for partially booked dates
      }
    } else {
      // For date range selection
      if (hasMaintenanceDates) {
        // If maintenance date is in range, show maintenance info
        const maintenanceDate = dates.find((date) => getMaintenanceInfo(date));
        if (maintenanceDate) {
          setSelectedDayBookings({
            day: maintenanceDate,
            bookings: [],
            maintenanceReason: getMaintenanceInfo(maintenanceDate),
          });
        }
        return; // Don't update selection for maintenance dates
      }

      if (hasFullyBookedDates) {
        // If fully booked date is in range, show bookings
        const fullyBookedDate = dates.find((date) => isDateFullyBooked(date));
        if (fullyBookedDate) {
          const dayBookings = getBookingsForDay(fullyBookedDate);
          setSelectedDayBookings({
            day: fullyBookedDate,
            bookings: dayBookings,
          });
        }
        return; // Don't update selection for fully booked dates
      }
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
        // Re-apply the selection
        setDateRange(fixedRange);
      }, 50);
    }

    onDateSelect(fixedStartDate);
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

      // For multi-day bookings, middle days are considered fully booked
      if (date > bookingStart && date < bookingEnd) {
        return true;
      }

      // For start or end day, check if booking covers most of the day
      if (date.toDateString() === bookingStart.toDateString()) {
        const bookingStartHour = parseInt(booking.pickup_time.split(":")[0]);
        const bookingEndHour = parseInt(booking.return_time.split(":")[0]);
        // If booking covers most of the day (more than 6 hours)
        return bookingEndHour - bookingStartHour > 6;
      }

      // For end day of multi-day booking
      if (date.toDateString() === bookingEnd.toDateString()) {
        const bookingEndHour = parseInt(booking.return_time.split(":")[0]);
        // If return time is after noon, consider it fully booked
        return bookingEndHour >= 12;
      }

      return false;
    });
  };

  const isDatePartiallyBooked = (date: Date) => {
    if (!selectedVehicle) return false;

    // Check if date is in maintenance or fully booked first
    if (getMaintenanceInfo(date) || isDateFullyBooked(date)) {
      return false;
    }

    // Normalize the date for comparison (set to noon)
    const normalizedDate = new Date(date);
    normalizedDate.setHours(12, 0, 0, 0);

    // Check if there are any bookings for this date
    return bookings.some((booking) => {
      const bookingStart = new Date(booking.start_date);
      bookingStart.setHours(12, 0, 0, 0);

      const bookingEnd = new Date(booking.end_date);
      bookingEnd.setHours(12, 0, 0, 0);

      // Check if the date is within the booking range
      if (normalizedDate >= bookingStart && normalizedDate <= bookingEnd) {
        // For start date, check if booking is less than or equal to 6 hours (not fully booked)
        if (normalizedDate.getTime() === bookingStart.getTime()) {
          const bookingStartHour = parseInt(booking.pickup_time.split(":")[0]);
          const bookingEndHour = parseInt(booking.return_time.split(":")[0]);
          return bookingEndHour - bookingStartHour <= 6;
        }

        // For end date of multi-day booking
        if (normalizedDate.getTime() === bookingEnd.getTime()) {
          const bookingEndHour = parseInt(booking.return_time.split(":")[0]);
          // If return time is before noon, consider it partially booked
          return bookingEndHour < 12;
        }

        // For middle days of multi-day bookings, they are fully booked
        return false;
      }
      return false;
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

      // Ensure dates are compared properly by setting hours to noon
      const normalizedDay = new Date(day);
      normalizedDay.setHours(12, 0, 0, 0);

      const normalizedStart = new Date(bookingStart);
      normalizedStart.setHours(12, 0, 0, 0);

      const normalizedEnd = new Date(bookingEnd);
      normalizedEnd.setHours(12, 0, 0, 0);

      return normalizedDay >= normalizedStart && normalizedDay <= normalizedEnd;
    });
  };

  const customDayContent = (day: Date) => {
    const isInMaintenance = !!getMaintenanceInfo(day);
    const isFullyBooked = !isInMaintenance && isDateFullyBooked(day);
    const isPartiallyBooked =
      !isInMaintenance && !isFullyBooked && isDatePartiallyBooked(day);

    // Only allow selection if not in maintenance, not fully booked, and not a past date
    const isSelectable =
      !isInMaintenance &&
      !isFullyBooked &&
      day >= new Date(new Date().setHours(0, 0, 0, 0));

    const isSelected =
      isSelectable &&
      dateRange.startDate &&
      dateRange.endDate &&
      day >= dateRange.startDate &&
      day <= dateRange.endDate;

    const isToday = day.toDateString() === new Date().toDateString();
    const maintenanceReason = getMaintenanceInfo(day);
    const dayBookings = getBookingsForDay(day);
    const isPastDate = day < new Date(new Date().setHours(0, 0, 0, 0));

    // Calculate dynamic height based on number of bookings
    const bookingsCount = dayBookings.length;
    const minHeight = 40; // Base height
    const heightPerBooking = 5; // Additional height per booking
    const dynamicHeight = Math.max(
      minHeight,
      minHeight + bookingsCount * heightPerBooking,
    );

    // Add specific classes for maintenance and fully booked days
    const dayClasses = [
      "relative",
      isInMaintenance ? "maintenance-day cursor-not-allowed" : "",
      isFullyBooked ? "fully-booked-day cursor-not-allowed" : "",
      isPastDate ? "past-day cursor-not-allowed" : "cursor-pointer",
      isPartiallyBooked ? "partially-booked-day" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        className={dayClasses}
        style={{
          height: "100%",
          width: "100%",
          minHeight: `${dynamicHeight}px`,
          position: "relative",
        }}
        onClick={() => {
          if (isInMaintenance) {
            // Mostra finestra con info manutenzione
            setSelectedDayBookings({
              day,
              bookings: [],
              maintenanceReason: maintenanceReason,
            });
          } else if (isFullyBooked && dayBookings.length > 0) {
            // Mostra finestra con prenotazioni per giorni completamente prenotati
            setSelectedDayBookings({ day, bookings: dayBookings });
          } else if (isPartiallyBooked && dayBookings.length > 0) {
            // Mostra finestra con prenotazioni per giorni parzialmente prenotati
            setSelectedDayBookings({ day, bookings: dayBookings });
          }
        }}
      >
        <div
          className={`${isSelected && !isInMaintenance && !isFullyBooked && !isPastDate ? "selected-date" : ""}`}
          style={{
            height: "100%",
            width: "100%",
            backgroundColor: isInMaintenance
              ? "#dc2626" // Rosso scuro per manutenzione
              : isFullyBooked
                ? "#1e40af" // Blu scuro per completamente prenotato
                : isPartiallyBooked
                  ? "#fef3c7" // Giallo per parzialmente prenotato
                  : isPastDate
                    ? "#e5e7eb" // Grigio per date passate
                    : isSelected &&
                        !isInMaintenance &&
                        !isFullyBooked &&
                        !isPastDate
                      ? "#0ea5e9" // Blu selezione solo se non è in manutenzione o prenotato
                      : "transparent",
            position: "relative",
            zIndex: isInMaintenance || isFullyBooked || isPastDate ? 10 : 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "8px",
            border: isToday ? "2px solid #0ea5e9" : "none",
            pointerEvents:
              isInMaintenance || isFullyBooked || isPastDate ? "none" : "auto",
            fontWeight: isToday ? "bold" : "normal",
            width: "100%",
            height: "100%",
          }}
        >
          <span
            style={{
              color:
                isInMaintenance || isFullyBooked
                  ? "white"
                  : isPastDate
                    ? "#9ca3af"
                    : isPartiallyBooked
                      ? "#1e40af"
                      : isSelected &&
                          !isInMaintenance &&
                          !isFullyBooked &&
                          !isPastDate
                        ? "white"
                        : "inherit",
            }}
          >
            {day.getDate()}
          </span>
        </div>
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

  // Get booking details for a specific time slot
  const getBookingsForTimeSlot = (hour: number) => {
    const selectedDate = dateRange.startDate;
    return bookings.filter((booking) => {
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
    // Filter out hours that are already booked
    return Array.from({ length: 12 }, (_, i) => i + 8).filter((hour) => {
      // Check if this hour is available
      return isTimeSlotAvailable(hour);
    });
  };

  const getAvailableReturnTimes = () => {
    if (!pickupTime) return [];
    const pickupHour = parseInt(pickupTime);

    // Only show hours after pickup time that don't overlap with existing bookings
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
                          // Reset date selection when vehicle changes
                          const today = new Date();
                          today.setHours(12, 0, 0, 0);
                          setDateRange({
                            startDate: today,
                            endDate: today,
                            key: "selection",
                          });
                          setPickupTime("");
                          setReturnTime("");

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
                      // Increase calendar height to prevent cutting off last row
                      calendarClassName="custom-calendar-height"
                      fixedHeight={true}
                      color="#0ea5e9"
                      // Ensure consistent styling for all days in range
                      staticRanges={[]}
                      inputRanges={[]}
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

                      {(dateRange.startDate.toDateString() !==
                        dateRange.endDate.toDateString() ||
                        (selectedDayBookings &&
                          isDatePartiallyBooked(selectedDayBookings.day))) && (
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
                        {Array.from({ length: 12 }, (_, i) => i + 8).map(
                          (hour) => {
                            const isAvailable = isTimeSlotAvailable(hour);
                            const bookingsForSlot =
                              getBookingsForTimeSlot(hour);
                            return (
                              <SelectItem
                                key={hour}
                                value={hour.toString()}
                                disabled={!isAvailable}
                                className={
                                  !isAvailable
                                    ? "text-gray-400 cursor-not-allowed"
                                    : ""
                                }
                              >
                                {`${hour}:00`}
                                {!isAvailable &&
                                  bookingsForSlot.length > 0 &&
                                  " (Prenotato)"}
                              </SelectItem>
                            );
                          },
                        )}
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
                        {Array.from({ length: 12 }, (_, i) => i + 8)
                          .filter((hour) =>
                            pickupTime ? hour > parseInt(pickupTime) : true,
                          )
                          .map((hour) => {
                            const isAvailable = pickupTime
                              ? isTimeRangeAvailable(parseInt(pickupTime), hour)
                              : false;
                            const bookingsForSlot =
                              getBookingsForTimeSlot(hour);
                            return (
                              <SelectItem
                                key={hour}
                                value={hour.toString()}
                                disabled={!isAvailable}
                                className={
                                  !isAvailable
                                    ? "text-gray-400 cursor-not-allowed"
                                    : ""
                                }
                              >
                                {`${hour}:00`}
                                {!isAvailable &&
                                  bookingsForSlot.length > 0 &&
                                  " (Prenotato)"}
                              </SelectItem>
                            );
                          })}
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
                                // Ensure time format is correct for PostgreSQL time type
                                pickup_time: pickupTime.includes(":")
                                  ? pickupTime
                                  : `${pickupTime}:00`,
                                return_time: returnTime.includes(":")
                                  ? returnTime
                                  : `${returnTime}:00`,
                              };

                              try {
                                // Ensure time format is correct for PostgreSQL time type
                                const formattedBookingData = {
                                  ...bookingData,
                                  pickup_time: bookingData.pickup_time.includes(
                                    ":",
                                  )
                                    ? bookingData.pickup_time
                                    : `${bookingData.pickup_time}:00`,
                                  return_time: bookingData.return_time.includes(
                                    ":",
                                  )
                                    ? bookingData.return_time
                                    : `${bookingData.return_time}:00`,
                                };

                                // Use the simplified createBooking function that avoids all triggers
                                const result =
                                  await createBooking(formattedBookingData);
                                if (!result) {
                                  throw new Error(
                                    "Nessun dato restituito dalla funzione createBooking",
                                  );
                                }

                                toast({
                                  title: "Prenotazione Confermata",
                                  description:
                                    "Veicolo prenotato con successo! Puoi visualizzare i dettagli nella sezione 'Le mie prenotazioni'.",
                                  variant: "success",
                                });

                                // Chiudi il dialog di conferma
                                setConfirmBookingDialog({
                                  ...confirmBookingDialog,
                                  open: false,
                                });

                                // Mostra un messaggio di conferma più visibile
                                const successMessage =
                                  document.createElement("div");
                                successMessage.className =
                                  "fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm";
                                successMessage.innerHTML = `
                                  <div class="bg-white rounded-xl shadow-xl p-6 max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
                                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-600">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                      </svg>
                                    </div>
                                    <h3 class="text-xl font-bold mb-2">Prenotazione Confermata!</h3>
                                    <p class="text-gray-600 mb-6">Il veicolo ${confirmBookingDialog.vehicle?.brand} ${confirmBookingDialog.vehicle?.model} è stato prenotato con successo.</p>
                                    <div class="bg-gray-50 p-4 rounded-lg mb-6">
                                      <div class="grid grid-cols-2 gap-4">
                                        <div>
                                          <p class="text-sm font-medium text-gray-500">Ritiro:</p>
                                          <p class="font-medium">${confirmBookingDialog.startDate?.toLocaleDateString()} alle ore ${confirmBookingDialog.pickupTime}:00</p>
                                        </div>
                                        <div>
                                          <p class="text-sm font-medium text-gray-500">Riconsegna:</p>
                                          <p class="font-medium">${confirmBookingDialog.endDate?.toLocaleDateString()} alle ore ${confirmBookingDialog.returnTime}:00</p>
                                        </div>
                                      </div>
                                    </div>
                                    <button class="bg-black hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-full">Chiudi</button>
                                  </div>
                                `;
                                document.body.appendChild(successMessage);

                                // Aggiungi event listener al pulsante di chiusura
                                const closeButton =
                                  successMessage.querySelector("button");
                                if (closeButton) {
                                  closeButton.addEventListener("click", () => {
                                    document.body.removeChild(successMessage);
                                  });
                                }

                                // Rimuovi automaticamente dopo 5 secondi
                                setTimeout(() => {
                                  if (document.body.contains(successMessage)) {
                                    document.body.removeChild(successMessage);
                                  }
                                }, 5000);

                                return;
                              } catch (error) {
                                console.error(
                                  "Errore durante la creazione della prenotazione:",
                                  error,
                                );
                                throw error;
                              }
                            } catch (error) {
                              console.error("Error creating booking:", error);
                              console.error(
                                "Dettagli errore completo:",
                                JSON.stringify(error, null, 2),
                              );
                              toast({
                                title: "Errore",
                                description:
                                  "Impossibile creare la prenotazione. Controlla la console per i dettagli.",
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

                      {!isDateFullyBooked(selectedDayBookings.day) &&
                        !getMaintenanceInfo(selectedDayBookings.day) &&
                        isDatePartiallyBooked(selectedDayBookings.day) && (
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
                        )}
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
