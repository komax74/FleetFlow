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

// Funzione per controllare le manutenzioni programmate
async function checkUpcomingMaintenance() {
  try {
    // Ottieni la data di 3 giorni da oggi
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysFromNowStr = threeDaysFromNow.toISOString().split("T")[0];

    // Ottieni le impostazioni di notifica
    const { data: settings } = await supabase
      .from("settings")
      .select("*")
      .eq("key", "notification_settings")
      .single();

    // Se le notifiche sono disabilitate, esci
    if (
      settings?.value &&
      !JSON.parse(settings.value).maintenance_notifications_enabled
    ) {
      console.log("Notifiche manutenzione disabilitate nelle impostazioni");
      return { success: true, skipped: true };
    }

    // Cerca veicoli con manutenzione programmata tra 3 giorni
    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("maintenance_start", threeDaysFromNowStr);

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

    if (vehicles && vehicles.length > 0) {
      // Ottieni tutti gli amministratori
      const { data: admins, error: adminsError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("role", "admin");

      if (adminsError) throw adminsError;

      // Invia notifiche a tutti gli amministratori
      let successCount = 0;
      for (const vehicle of vehicles) {
        for (const admin of admins || []) {
          try {
            // Prepara il messaggio email
            const subject = `Manutenzione programmata: ${vehicle.brand} ${vehicle.model}`;
            const message = `
              <p>Gentile ${admin.full_name},</p>
              <p>Ti ricordiamo che il veicolo ${vehicle.brand} ${vehicle.model} (${vehicle.license_plate}) 
              ha una manutenzione programmata tra 3 giorni, a partire dal ${new Date(vehicle.maintenance_start).toLocaleDateString()}.</p>
              <p>Motivo: ${vehicle.maintenance_reason || "Manutenzione programmata"}</p>
              <p>Cordiali saluti,<br>Il sistema FleetFlow</p>
            `;

            // Sostituisci i placeholder nel template
            const emailBody = template
              .replace(/\{\{subject\}\}/g, subject)
              .replace(/\{\{body\}\}/g, message);

            // Invia email di notifica
            await sendEmail(admin.email, subject, emailBody);

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

            successCount++;
            console.log(
              `Notifica di manutenzione inviata per ${vehicle.license_plate} all'admin ${admin.id}`,
            );
          } catch (notificationError) {
            console.error(
              `Errore nell'invio della notifica di manutenzione per ${vehicle.license_plate} all'admin ${admin.id}:`,
              notificationError,
            );
          }
        }
      }

      return { success: true, count: successCount };
    }

    return { success: true, count: 0 };
  } catch (error) {
    console.error("Errore nel controllo delle manutenzioni imminenti:", error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Gestisci le richieste OPTIONS (preflight CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Esegui il controllo delle manutenzioni
    const maintenanceResults = await checkUpcomingMaintenance();

    // Restituisci i risultati
    return new Response(
      JSON.stringify({
        success: true,
        maintenanceResults,
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
        error: "Failed to check maintenance",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
