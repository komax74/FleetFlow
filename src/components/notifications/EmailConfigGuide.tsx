import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import Header from "../dashboard/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Code } from "lucide-react";

const EmailConfigGuide = () => {
  return (
    <div>
      <Header />
      <div className="pt-[72px] px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Configurazione Email</h1>
          </div>

          <Card className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow mb-8">
            <CardHeader>
              <CardTitle>Configurazione del servizio email</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <Code className="h-4 w-4" />
                <AlertTitle>Importante</AlertTitle>
                <AlertDescription>
                  L'invio di email richiede una configurazione server-side. In
                  ambiente di sviluppo, le email vengono solo simulate e non
                  effettivamente inviate.
                </AlertDescription>
              </Alert>

              <Tabs defaultValue="overview">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Panoramica</TabsTrigger>
                  <TabsTrigger value="firebase">Firebase</TabsTrigger>
                  <TabsTrigger value="sendgrid">SendGrid</TabsTrigger>
                  <TabsTrigger value="mailgun">Mailgun</TabsTrigger>
                  <TabsTrigger value="ses">Amazon SES</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Come funziona l'invio email
                  </h3>
                  <p className="text-gray-700 mb-4">
                    L'invio di email richiede un servizio di posta elettronica
                    configurato sul server. A differenza delle notifiche push
                    che possono essere gestite direttamente dal browser, le
                    email devono essere inviate attraverso un servizio SMTP o
                    un'API dedicata.
                  </p>

                  <h4 className="text-md font-medium mt-6">
                    Flusso di invio email
                  </h4>
                  <ol className="list-decimal pl-5 space-y-3 mt-2">
                    <li>
                      <strong>Richiesta di invio</strong>: L'applicazione client
                      (browser) richiede l'invio di un'email
                    </li>
                    <li>
                      <strong>Elaborazione server</strong>: La richiesta viene
                      inviata a un endpoint server (Cloud Function, API, ecc.)
                    </li>
                    <li>
                      <strong>Servizio email</strong>: Il server utilizza un
                      servizio di invio email (SendGrid, Mailgun, Amazon SES,
                      ecc.)
                    </li>
                    <li>
                      <strong>Consegna</strong>: Il servizio email si occupa
                      della consegna effettiva dell'email al destinatario
                    </li>
                  </ol>

                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-6">
                    <h4 className="font-medium text-yellow-800 mb-2">
                      Ambiente di sviluppo
                    </h4>
                    <p className="text-yellow-700">
                      In ambiente di sviluppo, le email vengono solo simulate.
                      Quando clicchi su "Invia Email di Test", viene mostrato un
                      messaggio di successo e registrato un log, ma nessuna
                      email viene effettivamente inviata.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="firebase" className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Configurazione con Firebase
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Firebase non offre un servizio di invio email diretto, ma
                    puoi utilizzare Firebase Cloud Functions insieme a un
                    servizio di terze parti come SendGrid o Nodemailer.
                  </p>

                  <h4 className="text-md font-medium mt-4">
                    Passaggi per la configurazione:
                  </h4>
                  <ol className="list-decimal pl-5 space-y-3 mt-2">
                    <li>
                      <strong>Crea una Cloud Function</strong>: Implementa una
                      funzione che gestisce l'invio di email
                    </li>
                    <li>
                      <strong>Integra un servizio email</strong>: Utilizza
                      SendGrid, Nodemailer o un altro servizio all'interno della
                      Cloud Function
                    </li>
                    <li>
                      <strong>Configura le variabili d'ambiente</strong>: Salva
                      le chiavi API e le configurazioni come variabili
                      d'ambiente in Firebase
                    </li>
                    <li>
                      <strong>Implementa la sicurezza</strong>: Assicurati che
                      solo gli utenti autorizzati possano chiamare la funzione
                    </li>
                  </ol>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4 font-mono text-sm">
                    <pre>{`// Esempio di Cloud Function per l'invio di email con SendGrid
const functions = require('firebase-functions');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.sendEmail = functions.https.onCall(async (data, context) => {
  // Verifica che l'utente sia autenticato
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Utente non autenticato');
  }

  const { to, subject, body } = data;
  
  const msg = {
    to,
    from: 'noreply@fleetflow.com', // Email mittente verificata
    subject,
    html: body,
  };
  
  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('Errore invio email:', error);
    throw new functions.https.HttpsError('internal', 'Errore invio email');
  }
});`}</pre>
                  </div>
                </TabsContent>

                <TabsContent value="sendgrid" className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Configurazione con SendGrid
                  </h3>
                  <p className="text-gray-700 mb-4">
                    SendGrid è uno dei servizi più popolari per l'invio di email
                    transazionali. Offre un'API semplice da integrare e un piano
                    gratuito con un limite di 100 email al giorno.
                  </p>

                  <div className="bg-red-50 p-4 rounded-lg border border-red-200 mt-4">
                    <h4 className="font-medium text-red-800 mb-2">
                      Problema di configurazione rilevato
                    </h4>
                    <p className="text-red-700 mb-2">
                      È stato rilevato un problema con la configurazione di
                      SendGrid. Le email non vengono inviate a causa di
                      restrizioni CORS quando si chiama direttamente l'API
                      SendGrid dal browser.
                    </p>
                    <p className="text-red-700 mb-2">
                      <strong>Soluzione:</strong> È necessario implementare una
                      funzione serverless che faccia da proxy per l'invio delle
                      email. Abbiamo preparato un file di esempio in{" "}
                      <code>src/lib/emailServerless.js</code> che può essere
                      utilizzato come base.
                    </p>
                    <p className="text-red-700">
                      Per una soluzione immediata, considera l'utilizzo di
                      servizi come EmailJS che supportano l'invio diretto dal
                      browser, o configura un endpoint serverless su Netlify,
                      Vercel o AWS Lambda.
                    </p>
                  </div>

                  <h4 className="text-md font-medium mt-4">
                    Configurazione attuale:
                  </h4>
                  <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-700">
                    <li>
                      <strong>Account SendGrid</strong>: Configurato e attivo
                    </li>
                    <li>
                      <strong>Dominio verificato</strong>: Configurato
                      correttamente
                    </li>
                    <li>
                      <strong>API Key</strong>: Generata e salvata in modo
                      sicuro
                    </li>
                    <li>
                      <strong>Integrazione</strong>: Implementata nel backend
                      dell'applicazione
                    </li>
                  </ul>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
                    <h4 className="font-medium text-blue-800 mb-2">
                      Vantaggi di SendGrid
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-blue-700">
                      <li>Piano gratuito con 100 email al giorno</li>
                      <li>
                        Dashboard per monitorare le consegne e le aperture
                      </li>
                      <li>Template email personalizzabili</li>
                      <li>Supporto per email transazionali e marketing</li>
                      <li>Facile integrazione con Firebase e altri servizi</li>
                    </ul>
                  </div>
                </TabsContent>

                <TabsContent value="mailgun" className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Configurazione con Mailgun
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Mailgun è un servizio di invio email progettato
                    specificamente per sviluppatori, con un'API robusta e
                    funzionalità avanzate di tracciamento.
                  </p>

                  <h4 className="text-md font-medium mt-4">
                    Passaggi per la configurazione:
                  </h4>
                  <ol className="list-decimal pl-5 space-y-3 mt-2">
                    <li>
                      <strong>Crea un account Mailgun</strong>: Registrati su{" "}
                      <a
                        href="https://mailgun.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        mailgun.com
                      </a>
                    </li>
                    <li>
                      <strong>Aggiungi e verifica un dominio</strong>: Configura
                      il tuo dominio per l'invio di email
                    </li>
                    <li>
                      <strong>Ottieni le credenziali API</strong>: Trova la tua
                      chiave API e il dominio nella dashboard
                    </li>
                    <li>
                      <strong>Integra nel backend</strong>: Utilizza la libreria
                      Mailgun nel tuo backend
                    </li>
                  </ol>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4 font-mono text-sm">
                    <pre>{`// Esempio di integrazione Mailgun in Node.js
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);

const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
});

async function sendEmail(to, subject, html) {
  try {
    const result = await mg.messages.create('your-domain.com', {
      from: "FleetFlow <noreply@your-domain.com>",
      to: [to],
      subject: subject,
      html: html
    });
    return result;
  } catch (error) {
    console.error('Errore invio email:', error);
    throw error;
  }
}`}</pre>
                  </div>
                </TabsContent>

                <TabsContent value="ses" className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Configurazione con Amazon SES
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Amazon Simple Email Service (SES) è un servizio di invio
                    email scalabile e conveniente, particolarmente adatto per
                    volumi elevati.
                  </p>

                  <h4 className="text-md font-medium mt-4">
                    Passaggi per la configurazione:
                  </h4>
                  <ol className="list-decimal pl-5 space-y-3 mt-2">
                    <li>
                      <strong>Crea un account AWS</strong>: Se non ne hai già
                      uno, registrati su{" "}
                      <a
                        href="https://aws.amazon.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        aws.amazon.com
                      </a>
                    </li>
                    <li>
                      <strong>Configura Amazon SES</strong>: Verifica il tuo
                      dominio e gli indirizzi email
                    </li>
                    <li>
                      <strong>Crea credenziali IAM</strong>: Genera chiavi di
                      accesso con permessi limitati per SES
                    </li>
                    <li>
                      <strong>Integra nel backend</strong>: Utilizza l'SDK AWS
                      nel tuo backend
                    </li>
                    <li>
                      <strong>Richiedi l'uscita dalla sandbox</strong>: Per
                      inviare a destinatari non verificati
                    </li>
                  </ol>

                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 mt-4">
                    <h4 className="font-medium text-green-800 mb-2">
                      Vantaggi di Amazon SES
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-green-700">
                      <li>
                        Prezzo molto competitivo (circa $0.10 per 1000 email)
                      </li>
                      <li>Alta scalabilità per volumi elevati</li>
                      <li>Integrazione con altri servizi AWS</li>
                      <li>Metriche dettagliate e monitoraggio</li>
                      <li>Gestione avanzata della reputazione del mittente</li>
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmailConfigGuide;
