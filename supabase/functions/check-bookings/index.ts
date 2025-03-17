// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Crea un client Supabase con la chiave di servizio per accesso completo al database
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Funzione per inviare un'email tramite la Edge Function send-email
async function sendEmail(
  to: string,
  subject: string,
  body: string,
  from?: string,
  replyTo?: string,
) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ to, subject, body, from, replyTo }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error sending email: ${response.status} ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
}

// Funzione per controllare le prenotazioni imminenti
async function checkUpcomingBookings() {
  try {
    // Ottieni la data di domani
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Ottieni le impostazioni di notifica
    const { data: settings } = await supabase
      .from("settings")
      .select("*")
      .eq("key", "notification_settings")
      .single();

    // Se le notifiche sono disabilitate, esci
    if (
      settings?.value &&
      !JSON.parse(settings.value).booking_reminders_enabled
    ) {
      console.log(
        "Notifiche promemoria prenotazioni disabilitate nelle impostazioni",
      );
      return { success: true, skipped: true };
    }

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

    // Ottieni il template email
    const { data: emailTemplate } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "email_template")
      .single();

    let template =
      emailTemplate?.value ||
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="background-color: #f5f5f5; padding: 10px; border-radius: 5px;">
          <h2 style="color: #333; margin: 0;">{{subject}}</h2>
        </div>
        <div style="padding: 20px 0;">
          <p style="color: #555; line-height: 1.5;">{{body}}</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 12px; color: #777;">
          <p>Questa è un'email automatica, si prega di non rispondere.</p>
          <p>© 2024 FleetFlow - Gestione flotta aziendale</p>
        </div>
      </div>
    `;

    // Invia promemoria per ogni prenotazione
    let successCount = 0;
    for (const booking of bookings || []) {
      try {
        // Prepara il messaggio email
        const subject = "Promemoria prenotazione veicolo";
        const message = `
          <p>Ciao ${booking.profiles.full_name},</p>
          <p>Ti ricordiamo che hai una prenotazione in programma per domani.</p>
          <p><strong>Dettagli della prenotazione:</strong></p>
          <ul>
            <li><strong>Veicolo:</strong> ${booking.vehicles.brand} ${booking.vehicles.model} (${booking.vehicles.license_plate})</li>
            <li><strong>Data:</strong> ${new Date(booking.start_date).toLocaleDateString()}</li>
            <li><strong>Ora:</strong> ${booking.pickup_time.substring(0, 5)}</li>
          </ul>
          <p>Puoi visualizzare i dettagli della prenotazione nella sezione "Le mie prenotazioni".</p>
          <p>Cordiali saluti,<br>Il team di FleetFlow</p>
        `;

        // Sostituisci i placeholder nel template
        const emailBody = template
          .replace(/\{\{subject\}\}/g, subject)
          .replace(/\{\{body\}\}/g, message);

        // Invia email di promemoria
        await sendEmail(booking.profiles.email, subject, emailBody);

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

        successCount++;
        console.log(`Promemoria inviato per la prenotazione ${booking.id}`);
      } catch (bookingError) {
        console.error(
          `Errore nell'invio del promemoria per la prenotazione ${booking.id}:`,
          bookingError,
        );
      }
    }

    return { success: true, count: successCount };
  } catch (error) {
    console.error("Errore nel controllo delle prenotazioni imminenti:", error);
    return { success: false, error: error.message };
  }
}

// Funzione per controllare le prenotazioni scadute
async function checkExpiredBookings() {
  try {
    // Ottieni la data di oggi
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Ottieni le impostazioni di notifica
    const { data: settings } = await supabase
      .from("settings")
      .select("*")
      .eq("key", "notification_settings")
      .single();

    // Se le notifiche sono disabilitate, esci
    if (
      settings?.value &&
      !JSON.parse(settings.value).expired_bookings_notifications_enabled
    ) {
      console.log(
        "Notifiche prenotazioni scadute disabilitate nelle impostazioni",
      );
      return { success: true, skipped: true };
    }

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

    // Ottieni il template email
    const { data: emailTemplate } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "email_template")
      .single();

    let template =
      emailTemplate?.value ||
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="background-color: #f5f5f5; padding: 10px; border-radius: 5px;">
          <h2 style="color: #333; margin: 0;">{{subject}}</h2>
        </div>
        <div style="padding: 20px 0;">
          <p style="color: #555; line-height: 1.5;">{{body}}</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 12px; color: #777;">
          <p>Questa è un'email automatica, si prega di non rispondere.</p>
          <p>© 2024 FleetFlow - Gestione flotta aziendale</p>
        </div>
      </div>
    `;

    // Invia notifiche per ogni prenotazione scaduta
    let successCount = 0;
    for (const booking of bookings || []) {
      try {
        // Prepara il messaggio email
        const subject = "Prenotazione scaduta - Azione richiesta";
        const message = `
          <p>Gentile ${booking.profiles.full_name},</p>
          <p>La tua prenotazione per ${booking.vehicles.brand} ${booking.vehicles.model} (${booking.vehicles.license_plate}) 
          è scaduta il ${new Date(booking.end_date).toLocaleDateString()}.</p>
          <p>Ti preghiamo di completare la procedura di riconsegna del veicolo il prima possibile.</p>
          <p>Cordiali saluti,<br>Il sistema FleetFlow</p>
        `;

        // Sostituisci i placeholder nel template
        const emailBody = template
          .replace(/\{\{subject\}\}/g, subject)
          .replace(/\{\{body\}\}/g, message);

        // Invia email di notifica
        await sendEmail(booking.profiles.email, subject, emailBody);

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

        successCount++;
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

    return { success: true, count: successCount };
  } catch (error) {
    console.error("Errore nel controllo delle prenotazioni scadute:", error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Gestisci le richieste OPTIONS (preflight CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Esegui i controlli delle prenotazioni
    const upcomingResults = await checkUpcomingBookings();
    const expiredResults = await checkExpiredBookings();

    // Restituisci i risultati
    return new Response(
      JSON.stringify({
        success: true,
        upcomingBookings: upcomingResults,
        expiredBookings: expiredResults,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    // Restituisci una risposta di errore
    return new Response(
      JSON.stringify({
        error: "Failed to check bookings",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
