import { supabase } from "./supabase";
import { sendNotificationEmail, sendReminderEmail } from "./emailService";

/**
 * Questa funzione dovrebbe essere eseguita da un cron job sul server
 * per inviare promemoria per le prenotazioni imminenti
 */
export const checkUpcomingBookings = async () => {
  try {
    // Ottieni la data di domani
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Cerca prenotazioni che iniziano domani
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        profiles!bookings_user_id_fkey(id, email, full_name),
        vehicles(*)
      `,
      )
      .eq("start_date", tomorrowStr)
      .eq("status", "active");

    if (error) throw error;

    // Invia promemoria per ogni prenotazione
    for (const booking of bookings || []) {
      try {
        // Invia email di promemoria
        await sendReminderEmail(
          booking.profiles.email,
          booking.profiles.full_name,
          `${booking.vehicles.brand} ${booking.vehicles.model} (${booking.vehicles.license_plate})`,
          new Date(booking.start_date).toLocaleDateString(),
          booking.pickup_time,
        );

        // Crea una notifica in-app
        await supabase.from("notifications").insert([
          {
            user_id: booking.user_id,
            title: "Promemoria prenotazione",
            message: `Hai una prenotazione programmata per domani: ${booking.vehicles.brand} ${booking.vehicles.model} alle ore ${booking.pickup_time.substring(0, 5)}.`,
            type: "reminder",
            read: false,
            created_at: new Date().toISOString(),
            action_url: "/my-bookings",
          },
        ]);

        console.log(`Promemoria inviato per la prenotazione ${booking.id}`);
      } catch (bookingError) {
        console.error(
          `Errore nell'invio del promemoria per la prenotazione ${booking.id}:`,
          bookingError,
        );
      }
    }

    return { success: true, count: bookings?.length || 0 };
  } catch (error) {
    console.error("Errore nel controllo delle prenotazioni imminenti:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Questa funzione dovrebbe essere eseguita da un cron job sul server
 * per inviare notifiche di manutenzione programmata
 */
export const checkUpcomingMaintenance = async () => {
  try {
    // Ottieni la data di 3 giorni da oggi
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysFromNowStr = threeDaysFromNow.toISOString().split("T")[0];

    // Cerca veicoli con manutenzione programmata tra 3 giorni
    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("maintenance_start", threeDaysFromNowStr);

    if (error) throw error;

    if (vehicles && vehicles.length > 0) {
      // Ottieni tutti gli amministratori
      const { data: admins, error: adminsError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("role", "admin");

      if (adminsError) throw adminsError;

      // Invia notifiche a tutti gli amministratori
      for (const vehicle of vehicles) {
        for (const admin of admins || []) {
          try {
            // Invia email di notifica
            await sendNotificationEmail(
              admin.email,
              `Manutenzione programmata: ${vehicle.brand} ${vehicle.model}`,
              `<p>Gentile ${admin.full_name},</p>
              <p>Ti ricordiamo che il veicolo ${vehicle.brand} ${vehicle.model} (${vehicle.license_plate}) 
              ha una manutenzione programmata tra 3 giorni, a partire dal ${new Date(vehicle.maintenance_start).toLocaleDateString()}.</p>
              <p>Motivo: ${vehicle.maintenance_reason || "Manutenzione programmata"}</p>
              <p>Cordiali saluti,<br>Il sistema FleetFlow</p>`,
            );

            // Crea una notifica in-app
            await supabase.from("notifications").insert([
              {
                user_id: admin.id,
                title: `Manutenzione programmata: ${vehicle.brand} ${vehicle.model}`,
                message: `Il veicolo ${vehicle.brand} ${vehicle.model} (${vehicle.license_plate}) ha una manutenzione programmata tra 3 giorni.`,
                type: "maintenance",
                read: false,
                created_at: new Date().toISOString(),
                action_url: "/fleet-management",
              },
            ]);
          } catch (notificationError) {
            console.error(
              `Errore nell'invio della notifica di manutenzione per ${vehicle.license_plate} all'admin ${admin.id}:`,
              notificationError,
            );
          }
        }
      }
    }

    return { success: true, count: vehicles?.length || 0 };
  } catch (error) {
    console.error("Errore nel controllo delle manutenzioni imminenti:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Questa funzione dovrebbe essere eseguita da un cron job sul server
 * per inviare notifiche di prenotazioni scadute
 */
export const checkExpiredBookings = async () => {
  try {
    // Ottieni la data di oggi
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Cerca prenotazioni scadute (data fine è ieri o prima) ma ancora attive
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        profiles!bookings_user_id_fkey(id, email, full_name),
        vehicles(*)
      `,
      )
      .lt("end_date", todayStr) // end_date < today
      .eq("status", "active");

    if (error) throw error;

    // Invia promemoria per ogni prenotazione scaduta
    for (const booking of bookings || []) {
      try {
        // Invia email di notifica
        await sendNotificationEmail(
          booking.profiles.email,
          "Prenotazione scaduta - Azione richiesta",
          `<p>Gentile ${booking.profiles.full_name},</p>
          <p>La tua prenotazione per ${booking.vehicles.brand} ${booking.vehicles.model} (${booking.vehicles.license_plate}) 
          è scaduta il ${new Date(booking.end_date).toLocaleDateString()}.</p>
          <p>Ti preghiamo di completare la procedura di riconsegna del veicolo il prima possibile.</p>
          <p>Cordiali saluti,<br>Il sistema FleetFlow</p>`,
        );

        // Crea una notifica in-app
        await supabase.from("notifications").insert([
          {
            user_id: booking.user_id,
            title: "Prenotazione scaduta - Azione richiesta",
            message: `La tua prenotazione per ${booking.vehicles.brand} ${booking.vehicles.model} è scaduta. Completa la procedura di riconsegna.`,
            type: "booking",
            read: false,
            created_at: new Date().toISOString(),
            action_url: "/my-bookings",
          },
        ]);

        console.log(
          `Notifica di scadenza inviata per la prenotazione ${booking.id}`,
        );
      } catch (bookingError) {
        console.error(
          `Errore nell'invio della notifica di scadenza per la prenotazione ${booking.id}:`,
          bookingError,
        );
      }
    }

    return { success: true, count: bookings?.length || 0 };
  } catch (error) {
    console.error("Errore nel controllo delle prenotazioni scadute:", error);
    return { success: false, error: error.message };
  }
};
