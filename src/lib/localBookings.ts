import { Booking } from "../types/bookings";

const BOOKINGS_KEY = "car_fleet_bookings";

export function getStoredBookings(): Booking[] {
  const bookings = localStorage.getItem(BOOKINGS_KEY);
  return bookings ? JSON.parse(bookings) : [];
}

export function createBooking(
  booking: Omit<Booking, "id" | "status">,
): Booking {
  const bookings = getStoredBookings();
  const newBooking = {
    ...booking,
    id: Math.random().toString(36).substr(2, 9),
    status: "active" as const,
  };

  bookings.push(newBooking);
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  return newBooking;
}

export function getVehicleBookings(vehicleId: string): Booking[] {
  const bookings = getStoredBookings();
  return bookings.filter(
    (b) => b.vehicle_id === vehicleId && b.status === "active",
  );
}

export function isDateBooked(date: Date, bookings: Booking[]): boolean {
  const dateStr = date.toISOString().split("T")[0];
  return bookings.some((booking) => {
    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    const current = new Date(dateStr);
    return current >= start && current <= end;
  });
}
