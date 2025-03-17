import { supabase } from "./supabase";

// Interfaccia per le email
interface EmailData {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
}

// Configurazione SendGrid
const SENDGRID_API_KEY =
  "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";
const DEFAULT_FROM_EMAIL = "noreply@fleetflow.com";

// Importa la funzione per inviare email tramite Edge Function
import { sendEmailViaEdgeFunction } from "./supabaseEdgeFunctions";

// Funzione per inviare un'email tramite SendGrid con debug avanzato
export const sendEmail = async (emailData: EmailData): Promise<boolean> => {
  try {
    console.log("DEBUG: Inizio processo di invio email", emailData);

    // Registra il tentativo di invio nel database
    try {
      const { data: logData, error: logError } = await supabase
        .from("email_logs")
        .insert([
          {
            recipient: emailData.to,
            subject: emailData.subject,
            body: emailData.body,
            status: "pending",
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      console.log("DEBUG: Log email creato", logData, logError);

      if (logError) {
        console.error(
          "DEBUG: Errore durante la creazione del log email:",
          logError,
        );
      }
    } catch (logDbError) {
      console.error(
        "DEBUG: Eccezione durante la creazione del log email:",
        logDbError,
      );
    }

    // Verifica se siamo in ambiente di produzione
    const isProduction = import.meta.env.PROD;
    console.log("DEBUG: Ambiente di produzione?", isProduction);

    if (isProduction) {
      console.log("DEBUG: Tentativo di invio tramite Edge Function");
      // In produzione, usa la Edge Function di Supabase
      try {
        const result = await sendEmailViaEdgeFunction(
          emailData.to,
          emailData.subject,
          emailData.body,
          emailData.from,
          emailData.replyTo,
        );

        console.log("DEBUG: Risultato invio Edge Function:", result);

        // Aggiorna il log email
        try {
          const { error: updateError } = await supabase
            .from("email_logs")
            .update({
              status: result ? "sent" : "error",
              sent_at: new Date().toISOString(),
              error_message: result ? null : "Edge Function failed",
            })
            .eq("recipient", emailData.to)
            .eq("subject", emailData.subject)
            .eq("status", "pending");

          if (updateError) {
            console.error(
              "DEBUG: Errore aggiornamento log dopo Edge Function:",
              updateError,
            );
          }
        } catch (updateError) {
          console.error(
            "DEBUG: Eccezione aggiornamento log dopo Edge Function:",
            updateError,
          );
        }

        return result;
      } catch (edgeFunctionError) {
        console.error("DEBUG: Errore Edge Function:", edgeFunctionError);

        // Aggiorna il log con l'errore
        try {
          await supabase
            .from("email_logs")
            .update({
              status: "error",
              error_message: `Edge Function error: ${edgeFunctionError.message || JSON.stringify(edgeFunctionError)}`,
              updated_at: new Date().toISOString(),
            })
            .eq("recipient", emailData.to)
            .eq("subject", emailData.subject)
            .eq("status", "pending");
        } catch (updateError) {
          console.error(
            "DEBUG: Errore aggiornamento log dopo errore Edge Function:",
            updateError,
          );
        }

        throw edgeFunctionError;
      }
    } else {
      // In ambiente di sviluppo, simula l'invio
      console.log("DEBUG: Simulazione invio email in ambiente di sviluppo");
      console.log("DEBUG: Simulazione invio email a", emailData.to);
      console.log("DEBUG: Oggetto:", emailData.subject);
      console.log("DEBUG: Contenuto:", emailData.body);

      // Simula un ritardo di rete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Log per debug
      console.log("DEBUG: Email simulata inviata con successo a", emailData.to);

      // Aggiorna il log email per la simulazione
      try {
        const { error: updateError } = await supabase
          .from("email_logs")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("recipient", emailData.to)
          .eq("subject", emailData.subject)
          .eq("status", "pending");

        if (updateError) {
          console.error(
            "DEBUG: Errore aggiornamento log dopo simulazione:",
            updateError,
          );
        }
      } catch (updateError) {
        console.error(
          "DEBUG: Eccezione aggiornamento log dopo simulazione:",
          updateError,
        );
      }
    }

    return true;
  } catch (error) {
    console.error("DEBUG: Errore generale durante l'invio dell'email:", error);

    // Registra l'errore nel database
    try {
      await supabase.from("email_logs").insert([
        {
          recipient: emailData.to,
          subject: emailData.subject,
          status: "error",
          error_message: error.message || "Unknown error",
          sent_at: new Date().toISOString(),
        },
      ]);
    } catch (dbError) {
      console.error(
        "DEBUG: Errore durante il salvataggio del log email di errore:",
        dbError,
      );
    }

    return false;
  }
};

// Le altre funzioni rimangono invariate
export const sendNotificationEmail = async (
  to: string,
  subject: string,
  message: string,
  templateId?: string,
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

    // Invia l'email
    return await sendEmail({
      to,
      subject,
      body: emailBody,
    });
  } catch (error) {
    console.error("Errore durante l'invio dell'email di notifica:", error);
    return false;
  }
};

export const sendWelcomeEmail = async (
  to: string,
  name: string,
): Promise<boolean> => {
  const subject = "Benvenuto in FleetFlow";
  const message = `
    <p>Ciao ${name},</p>
    <p>Benvenuto in FleetFlow, la piattaforma per la gestione della flotta aziendale.</p>
    <p>Ora puoi prenotare veicoli, visualizzare le tue prenotazioni e ricevere notifiche importanti.</p>
    <p>Per iniziare, accedi alla piattaforma e completa il tuo profilo.</p>
    <p>Cordiali saluti,<br>Il team di FleetFlow</p>
  `;

  return await sendNotificationEmail(to, subject, message);
};

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

export const sendReminderEmail = async (
  to: string,
  name: string,
  vehicleInfo: string,
  startDate: string,
  startTime: string,
): Promise<boolean> => {
  const subject = "Promemoria prenotazione veicolo";
  const message = `
    <p>Ciao ${name},</p>
    <p>Ti ricordiamo che hai una prenotazione in programma per domani.</p>
    <p><strong>Dettagli della prenotazione:</strong></p>
    <ul>
      <li><strong>Veicolo:</strong> ${vehicleInfo}</li>
      <li><strong>Data:</strong> ${startDate}</li>
      <li><strong>Ora:</strong> ${startTime}</li>
    </ul>
    <p>Puoi visualizzare i dettagli della prenotazione nella sezione "Le mie prenotazioni".</p>
    <p>Cordiali saluti,<br>Il team di FleetFlow</p>
  `;

  return await sendNotificationEmail(to, subject, message);
};
