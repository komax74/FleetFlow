// Questo file contiene la logica per inviare email tramite un serverless function
// Può essere utilizzato come base per creare una funzione serverless su Netlify, Vercel, AWS Lambda, ecc.

const sendgridMail = require("@sendgrid/mail");

// Configurazione SendGrid
const SENDGRID_API_KEY =
  process.env.SENDGRID_API_KEY ||
  "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";
const DEFAULT_FROM_EMAIL = "noreply@fleetflow.com";

sendgridMail.setApiKey(SENDGRID_API_KEY);

/**
 * Funzione serverless per inviare email tramite SendGrid
 * @param {Object} event - L'evento che ha attivato la funzione
 * @param {Object} context - Il contesto della funzione
 */
exports.handler = async (event, context) => {
  // Abilita CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Gestisci le richieste OPTIONS (preflight)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  // Verifica che sia una richiesta POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    // Estrai i dati dalla richiesta
    const requestBody = JSON.parse(event.body);
    const { to, subject, body, from, replyTo } = requestBody;

    // Verifica che i campi obbligatori siano presenti
    if (!to || !subject || !body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    // Prepara l'email
    const msg = {
      to,
      from: from || DEFAULT_FROM_EMAIL,
      subject,
      html: body,
    };

    if (replyTo) {
      msg.replyTo = replyTo;
    }

    // Invia l'email tramite SendGrid
    await sendgridMail.send(msg);

    // Restituisci una risposta di successo
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Email sent successfully",
      }),
    };
  } catch (error) {
    console.error("Error sending email:", error);

    // Restituisci una risposta di errore
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to send email",
        details: error.message,
      }),
    };
  }
};
