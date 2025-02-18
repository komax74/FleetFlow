import React from "react";
import VehicleCard from "./VehicleCard";
import QuickActions from "./QuickActions";
import BookingTable from "./BookingTable";
import { Vehicle } from "@/types/vehicles";
import { supabase } from "@/lib/supabase";
import { getStoredBookings } from "@/lib/localBookings";

interface VehicleGridProps {
  onBookVehicle?: (id: string) => void;
  onReturnVehicle?: (id: string) => void;
}

const VehicleGrid = ({
  onBookVehicle = () => {},
  onReturnVehicle = () => {},
}: VehicleGridProps) => {
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [bookings, setBookings] = React.useState<any[]>([]);

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

    const fetchBookings = async () => {
      try {
        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
            *,
            profiles!bookings_user_id_fkey(*)
          `,
          )
          .eq("status", "active");
        if (error) throw error;
        setBookings(data || []);
      } catch (error) {
        // Error handled by error boundary
      }
    };

    fetchVehicles();
    fetchBookings();

    // Set up real-time subscription for vehicles
    const vehiclesSubscription = supabase
      .channel("vehicles_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles" },
        (payload) => {
          // Handle change
          fetchVehicles();
        },
      )
      .subscribe();

    // Set up real-time subscription for bookings
    const bookingsSubscription = supabase
      .channel("bookings_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          fetchBookings();
        },
      )
      .subscribe();

    return () => {
      vehiclesSubscription.unsubscribe();
      bookingsSubscription.unsubscribe();
    };
  }, []);

  return (
    <div className="w-full p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto w-full rounded-[20px]">
        <div className="text-center mb-12">
          <div className="text-5xl font-bold mb-4">
            {new Date().toLocaleString("it-IT", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Europe/Rome",
            })}
          </div>
        </div>
        <QuickActions />
        <BookingTable />
        <div className="text-2xl text-gray-600 mt-12 mb-6">
          Disponibilità del giorno:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {vehicles.map((vehicle) => {
            // Get today's date in Italian timezone
            const today = new Date();
            const italianDate = new Date(
              today.toLocaleString("en-US", { timeZone: "Europe/Rome" }),
            );
            italianDate.setHours(0, 0, 0, 0);

            // Check if vehicle is in maintenance today
            const isInMaintenance =
              vehicle.status === "maintenance" &&
              vehicle.maintenance_start &&
              vehicle.maintenance_end &&
              italianDate >= new Date(vehicle.maintenance_start) &&
              italianDate <= new Date(vehicle.maintenance_end);

            // Find all bookings for today
            const todayBookings = bookings.filter((b) => {
              const bookingDate = new Date(b.start_date);
              return (
                b.vehicle_id === vehicle.id &&
                b.status === "active" &&
                bookingDate.toDateString() === italianDate.toDateString()
              );
            });

            // Calculate total booked hours for today
            const totalBookedHours = todayBookings.reduce((total, booking) => {
              const startHour = parseInt(booking.pickup_time.split(":")[0]);
              const endHour = parseInt(booking.return_time.split(":")[0]);
              return total + (endHour - startHour);
            }, 0);

            // Determine current status
            let currentStatus;
            if (isInMaintenance) {
              currentStatus = "maintenance";
            } else if (totalBookedHours >= 8) {
              // If booked for 8 or more hours
              currentStatus = "booked";
            } else if (todayBookings.length > 0) {
              // If has any bookings but less than 8 hours
              currentStatus = "partially_available";
            } else {
              currentStatus = "available";
            }

            // Format bookings data for display
            const currentUsers = todayBookings.map((booking) => ({
              name: booking.profiles?.full_name || `User ${booking.user_id}`,
              avatar:
                booking.profiles?.avatar_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.user_id}`,
            }));

            const bookingTimes = todayBookings.map(
              (booking) =>
                `${booking.pickup_time.slice(0, 5).padStart(5, "0")} - ${booking.return_time.slice(0, 5).padStart(5, "0")}`,
            );

            return (
              <VehicleCard
                key={vehicle.id}
                id={vehicle.id}
                image_url={vehicle.image_url}
                model={`${vehicle.brand} ${vehicle.model}`}
                license_plate={vehicle.license_plate}
                status={currentStatus}
                onBook={() => onBookVehicle(vehicle.id)}
                onReturn={() => onReturnVehicle(vehicle.id)}
                currentUser={currentUsers.length > 0 ? currentUsers : undefined}
                bookingTime={bookingTimes.length > 0 ? bookingTimes : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VehicleGrid;
