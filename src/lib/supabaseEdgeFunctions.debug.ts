import { supabase } from "./supabase";

/**
 * Funzione per inviare un'email tramite Supabase Edge Function con debug avanzato
 */
export const sendEmailViaEdgeFunction = async (
  to: string,
  subject: string,
  body: string,
  from?: string,
  replyTo?: string,
): Promise<boolean> => {
  try {
    console.log("DEBUG: Inizio invio email via Edge Function", { to, subject });

    // Ottieni l'URL di Supabase dalle variabili d'ambiente
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    console.log("DEBUG: Supabase URL:", supabaseUrl);

    // Ottieni il token di autenticazione dell'utente corrente
    const { data: authData, error: authError } =
      await supabase.auth.getSession();
    console.log("DEBUG: Auth data:", authData, "Auth error:", authError);

    const token = authData?.session?.access_token;

    if (!token) {
      console.error("DEBUG: Token non trovato, utente non autenticato");
      throw new Error("Utente non autenticato");
    }

    console.log("DEBUG: Token ottenuto, lunghezza:", token.length);
    console.log("DEBUG: Preparazione chiamata a Edge Function");

    // Prepara i dati per la richiesta
    const requestData = { to, subject, body, from, replyTo };
    console.log("DEBUG: Dati richiesta:", requestData);

    // Chiama la Edge Function
    console.log(
      "DEBUG: Chiamata a Edge Function:",
      `${supabaseUrl}/functions/v1/send-email`,
    );

    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestData),
    });

    console.log("DEBUG: Risposta Edge Function status:", response.status);
    console.log(
      "DEBUG: Risposta Edge Function headers:",
      Object.fromEntries(response.headers.entries()),
    );

    const responseText = await response.text();
    console.log("DEBUG: Risposta Edge Function body:", responseText);

    if (!response.ok) {
      console.error("DEBUG: Errore nella risposta Edge Function");
      throw new Error(
        `Error sending email: ${response.status} ${responseText}`,
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
      console.log("DEBUG: Risposta Edge Function JSON:", result);
    } catch (jsonError) {
      console.error("DEBUG: Errore parsing JSON risposta:", jsonError);
      console.log("DEBUG: Testo risposta non è JSON valido:", responseText);
      // Continua comunque, potrebbe essere una risposta valida ma non JSON
      result = { success: response.ok };
    }

    // Registra il risultato nel database
    try {
      const { error: logError } = await supabase.from("email_logs").insert([
        {
          recipient: to,
          subject: subject,
          status: result.success ? "sent" : "error",
          error_message: result.success ? null : JSON.stringify(result),
          sent_at: new Date().toISOString(),
        },
      ]);

      if (logError) {
        console.error("DEBUG: Errore registrazione log risultato:", logError);
      }
    } catch (logError) {
      console.error("DEBUG: Eccezione registrazione log risultato:", logError);
    }

    return result.success;
  } catch (error) {
    console.error("DEBUG: Errore generale in sendEmailViaEdgeFunction:", error);

    // Registra l'errore nel database
    try {
      const { error: logError } = await supabase.from("email_logs").insert([
        {
          recipient: to,
          subject: subject,
          status: "error",
          error_message: error.message || "Unknown error in Edge Function",
          sent_at: new Date().toISOString(),
        },
      ]);

      if (logError) {
        console.error("DEBUG: Errore registrazione log errore:", logError);
      }
    } catch (logError) {
      console.error("DEBUG: Eccezione registrazione log errore:", logError);
    }

    return false;
  }
};

/**
 * Funzione per eseguire manualmente il controllo delle prenotazioni
 */
export const triggerBookingsCheck = async (): Promise<any> => {
  try {
    console.log("DEBUG: Inizio controllo prenotazioni manuale");

    // Ottieni l'URL di Supabase dalle variabili d'ambiente
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    console.log("DEBUG: Supabase URL:", supabaseUrl);

    // Ottieni il token di autenticazione dell'utente corrente
    const { data: authData, error: authError } =
      await supabase.auth.getSession();
    console.log("DEBUG: Auth data:", authData, "Auth error:", authError);

    const token = authData?.session?.access_token;

    if (!token) {
      console.error("DEBUG: Token non trovato, utente non autenticato");
      throw new Error("Utente non autenticato");
    }

    console.log("DEBUG: Token ottenuto, lunghezza:", token.length);
    console.log("DEBUG: Preparazione chiamata a Edge Function check-bookings");

    // Chiama la Edge Function
    console.log(
      "DEBUG: Chiamata a Edge Function:",
      `${supabaseUrl}/functions/v1/check-bookings`,
    );

    const response = await fetch(`${supabaseUrl}/functions/v1/check-bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("DEBUG: Risposta Edge Function status:", response.status);
    console.log(
      "DEBUG: Risposta Edge Function headers:",
      Object.fromEntries(response.headers.entries()),
    );

    const responseText = await response.text();
    console.log("DEBUG: Risposta Edge Function body:", responseText);

    if (!response.ok) {
      console.error("DEBUG: Errore nella risposta Edge Function");
      throw new Error(
        `Error checking bookings: ${response.status} ${responseText}`,
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
      console.log("DEBUG: Risposta Edge Function JSON:", result);
    } catch (jsonError) {
      console.error("DEBUG: Errore parsing JSON risposta:", jsonError);
      console.log("DEBUG: Testo risposta non è JSON valido:", responseText);
      // Continua comunque, potrebbe essere una risposta valida ma non JSON
      result = { success: response.ok };
    }

    return result;
  } catch (error) {
    console.error("DEBUG: Errore generale in triggerBookingsCheck:", error);
    throw error;
  }
};
