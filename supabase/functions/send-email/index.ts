// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Configurazione SendGrid
const SENDGRID_API_KEY =
  Deno.env.get("SENDGRID_API_KEY") ||
  "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";
const DEFAULT_FROM_EMAIL = "noreply@fleetflow.com";

serve(async (req) => {
  // Gestisci le richieste OPTIONS (preflight CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verifica che sia una richiesta POST
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Estrai i dati dalla richiesta
    const { to, subject, body, from, replyTo } = await req.json();

    // Verifica che i campi obbligatori siano presenti
    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Prepara i dati per l'API di SendGrid
    const data = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: subject,
        },
      ],
      from: { email: from || DEFAULT_FROM_EMAIL },
      content: [{ type: "text/html", value: body }],
    };

    if (replyTo) {
      data.reply_to = { email: replyTo };
    }

    // Invia la richiesta all'API di SendGrid
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SendGrid API error: ${response.status} ${errorText}`);
    }

    // Restituisci una risposta di successo
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // Restituisci una risposta di errore
    return new Response(
      JSON.stringify({
        error: "Failed to send email",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
