// Versione di debug della funzione send-email
// Questo file può essere usato per sostituire index.ts nella funzione send-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Configurazione SendGrid
const SENDGRID_API_KEY =
  Deno.env.get("SENDGRID_API_KEY") ||
  "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";
const DEFAULT_FROM_EMAIL = "noreply@fleetflow.com";

serve(async (req) => {
  console.log("DEBUG: Richiesta ricevuta alla funzione send-email");
  console.log("DEBUG: Method:", req.method);
  console.log("DEBUG: Headers:", Object.fromEntries(req.headers.entries()));

  // Gestisci le richieste OPTIONS (preflight CORS)
  if (req.method === "OPTIONS") {
    console.log("DEBUG: Richiesta OPTIONS, rispondo con CORS headers");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verifica che sia una richiesta POST
    if (req.method !== "POST") {
      console.log("DEBUG: Metodo non consentito:", req.method);
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Estrai i dati dalla richiesta
    let requestBody;
    try {
      const text = await req.text();
      console.log("DEBUG: Body della richiesta (raw):", text);
      requestBody = JSON.parse(text);
      console.log("DEBUG: Body della richiesta (parsed):", requestBody);
    } catch (parseError) {
      console.error("DEBUG: Errore parsing JSON:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { to, subject, body, from, replyTo } = requestBody;

    // Verifica che i campi obbligatori siano presenti
    if (!to || !subject || !body) {
      console.log("DEBUG: Campi obbligatori mancanti", { to, subject, body });
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

    console.log("DEBUG: Dati preparati per SendGrid:", JSON.stringify(data));
    console.log(
      "DEBUG: SendGrid API Key (primi 10 caratteri):",
      SENDGRID_API_KEY.substring(0, 10) + "...",
    );

    // Invia la richiesta all'API di SendGrid
    console.log("DEBUG: Invio richiesta a SendGrid API");
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    console.log("DEBUG: Risposta SendGrid status:", response.status);
    console.log(
      "DEBUG: Risposta SendGrid headers:",
      Object.fromEntries(response.headers.entries()),
    );

    let responseText = "";
    try {
      responseText = await response.text();
      console.log("DEBUG: Risposta SendGrid body:", responseText);
    } catch (textError) {
      console.error("DEBUG: Errore lettura risposta:", textError);
    }

    if (!response.ok) {
      console.error(
        "DEBUG: Errore SendGrid API:",
        response.status,
        responseText,
      );
      return new Response(
        JSON.stringify({
          error: `SendGrid API error: ${response.status}`,
          details: responseText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Restituisci una risposta di successo
    console.log("DEBUG: Email inviata con successo");
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log dettagliato dell'errore
    console.error("DEBUG: Errore generale:", error);
    console.error("DEBUG: Stack trace:", error.stack);

    // Restituisci una risposta di errore
    return new Response(
      JSON.stringify({
        error: "Failed to send email",
        details: error.message || String(error),
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
