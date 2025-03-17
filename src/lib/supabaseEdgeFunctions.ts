import { supabase } from "./supabase";

/**
 * Funzione per inviare un'email tramite Supabase Edge Function
 */
export const sendEmailViaEdgeFunction = async (
  to: string,
  subject: string,
  body: string,
  from?: string,
  replyTo?: string,
): Promise<boolean> => {
  try {
    // Ottieni l'URL di Supabase dalle variabili d'ambiente
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    // Ottieni il token di autenticazione dell'utente corrente
    const { data: authData } = await supabase.auth.getSession();
    const token = authData?.session?.access_token;

    if (!token) {
      throw new Error("Utente non autenticato");
    }

    // Chiama la Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to, subject, body, from, replyTo }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error sending email: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error("Error sending email via Edge Function:", error);
    return false;
  }
};

/**
 * Funzione per eseguire manualmente il controllo delle prenotazioni
 */
export const triggerBookingsCheck = async (): Promise<any> => {
  try {
    // Ottieni l'URL di Supabase dalle variabili d'ambiente
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    // Ottieni il token di autenticazione dell'utente corrente
    const { data: authData } = await supabase.auth.getSession();
    const token = authData?.session?.access_token;

    if (!token) {
      throw new Error("Utente non autenticato");
    }

    // Chiama la Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/check-bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Error checking bookings: ${response.status} ${errorText}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error triggering bookings check:", error);
    throw error;
  }
};
