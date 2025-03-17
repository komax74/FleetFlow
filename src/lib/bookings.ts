import { supabase } from "./supabase";
import { Booking } from "../types/bookings";

// Metodo ultra-semplificato per la creazione di prenotazioni - NESSUN trigger, NESSUNA email
export async function createBooking(booking: Omit<Booking, "id" | "status">) {
  try {
    // Validate required fields
    if (
      !booking.vehicle_id ||
      !booking.user_id ||
      !booking.start_date ||
      !booking.end_date ||
      !booking.pickup_time ||
      !booking.return_time
    ) {
      throw new Error("Campi obbligatori mancanti nella prenotazione");
    }

    // Format times correctly for PostgreSQL
    const pickup_time = booking.pickup_time.includes(":")
      ? booking.pickup_time
      : `${booking.pickup_time}:00`;
    const return_time = booking.return_time.includes(":")
      ? booking.return_time
      : `${booking.return_time}:00`;

    // Inserimento diretto senza tentare le RPC che non sono state create
    try {
      // Inserimento diretto con .insert() ma senza select per evitare trigger
      const { error } = await supabase.from("bookings").insert([
        {
          vehicle_id: booking.vehicle_id,
          user_id: booking.user_id,
          start_date: booking.start_date,
          end_date: booking.end_date,
          pickup_time: pickup_time,
          return_time: return_time,
          status: "active",
        },
      ]);

      if (error) {
        console.error("Inserimento diretto fallito:", error);
        throw error;
      }

      // Recupera l'ID separatamente per evitare trigger
      const { data: idData } = await supabase
        .from("bookings")
        .select("id")
        .eq("vehicle_id", booking.vehicle_id)
        .eq("user_id", booking.user_id)
        .eq("start_date", booking.start_date)
        .eq("end_date", booking.end_date)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return idData;
    } catch (innerError) {
      console.error("Inner error:", innerError);
      throw innerError;
    }
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
  }
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
