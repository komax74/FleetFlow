import { supabase } from "./supabase";

// Interfaccia per le email
interface EmailData {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
}

/**
 * Funzione per inviare un'email tramite la funzione SQL di Supabase
 * Questo approccio evita i problemi CORS perché usa l'API di Supabase
 * invece di chiamare direttamente SendGrid o le Edge Functions
 */
export const sendEmailViaProxy = async (
  emailData: EmailData,
): Promise<boolean> => {
  try {
    console.log("Invio email tramite proxy SQL", emailData);

    // Registra prima il tentativo nel database
    try {
      // Assicuriamoci che body non sia mai null
      const safeBody = emailData.body || "Contenuto email non disponibile";

      const { error: logError } = await supabase.from("email_logs").insert([
        {
          recipient: emailData.to,
          subject: emailData.subject,
          body: safeBody,
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ]);

      if (logError) {
        console.error("Errore nella registrazione del log:", logError);
      }
    } catch (logError) {
      console.error("Eccezione durante la registrazione del log:", logError);
      // Continue with the email sending even if logging fails
    }

    // Chiama la funzione SQL che abbiamo creato
    // Assicuriamoci che body non sia mai null
    const safeBody = emailData.body || "Contenuto email non disponibile";

    const { data, error } = await supabase.rpc("send_email_proxy", {
      to_email: emailData.to,
      subject_text: emailData.subject,
      body: safeBody,
      from_email: emailData.from || "noreply@fleetflow.com",
    });

    console.log("Risposta da send_email_proxy:", { data, error });

    if (error) {
      console.error("Errore nell'invio dell'email tramite proxy SQL:", error);
      // Aggiorna il log con l'errore
      await supabase
        .from("email_logs")
        .update({
          status: "error",
          error_message: error.message,
          updated_at: new Date().toISOString(),
        })
        .eq("recipient", emailData.to)
        .eq("subject", emailData.subject)
        .eq("status", "pending");
      return false;
    }

    // Aggiorna il log con il successo
    await supabase
      .from("email_logs")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("recipient", emailData.to)
      .eq("subject", emailData.subject)
      .eq("status", "pending");

    console.log("Risultato invio email:", data);
    return true;
  } catch (error) {
    console.error(
      "Errore durante l'invio dell'email tramite proxy SQL:",
      error,
    );
    // Aggiorna il log con l'errore
    await supabase
      .from("email_logs")
      .update({
        status: "error",
        error_message: error.message || "Unknown error",
        updated_at: new Date().toISOString(),
      })
      .eq("recipient", emailData.to)
      .eq("subject", emailData.subject)
      .eq("status", "pending");
    return false;
  }
};

// Funzione per inviare un'email di notifica
export const sendNotificationEmail = async (
  to: string,
  subject: string,
  message: string,
): Promise<boolean> => {
  try {
    // Ottieni il template email dalle impostazioni
    let emailTemplate = localStorage.getItem("email_template");

    if (!emailTemplate) {
      // Template di default se non è stato configurato
      emailTemplate = `
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
    }

    // Sostituisci i placeholder nel template
    const emailBody = emailTemplate
      .replace(/\{\{subject\}\}/g, subject)
      .replace(/\{\{body\}\}/g, message);

    // Invia l'email tramite il proxy SQL
    return await sendEmailViaProxy({
      to,
      subject,
      body: emailBody,
    });
  } catch (error) {
    console.error("Errore durante l'invio dell'email di notifica:", error);
    return false;
  }
};

// Funzione per inviare un'email di conferma prenotazione
export const sendBookingConfirmationEmail = async (
  to: string,
  name: string,
  vehicleInfo: string,
  startDate: string,
  endDate: string,
): Promise<boolean> => {
  const subject = "Conferma prenotazione veicolo";
  const message = `
    <p>Ciao ${name},</p>
    <p>La tua prenotazione è stata confermata con successo.</p>
    <p><strong>Dettagli della prenotazione:</strong></p>
    <ul>
      <li><strong>Veicolo:</strong> ${vehicleInfo}</li>
      <li><strong>Data inizio:</strong> ${startDate}</li>
      <li><strong>Data fine:</strong> ${endDate}</li>
    </ul>
    <p>Puoi visualizzare i dettagli della prenotazione nella sezione "Le mie prenotazioni".</p>
    <p>Cordiali saluti,<br>Il team di FleetFlow</p>
  `;

  return await sendNotificationEmail(to, subject, message);
};
