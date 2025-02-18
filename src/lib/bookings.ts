import { supabase } from "./supabase";
import { Booking } from "../types/bookings";

export async function createBooking(booking: Omit<Booking, "id" | "status">) {
  const { data, error } = await supabase
    .from("bookings")
    .insert([{ ...booking, status: "active" }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getVehicleBookings(vehicleId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .eq("status", "active");

  if (error) throw error;
  return data as Booking[];
}

export function isDateBooked(date: Date, bookings: Booking[]) {
  const dateStr = date.toISOString().split("T")[0];
  return bookings.some((booking) => {
    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    const current = new Date(dateStr);
    return current >= start && current <= end;
  });
}
