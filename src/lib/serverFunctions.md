# Implementazione delle funzioni server per FleetFlow

Questo documento descrive come implementare le funzioni server necessarie per il corretto funzionamento delle notifiche automatiche e dell'invio email in FleetFlow.

## Panoramica

FleetFlow richiede alcune funzioni che devono essere eseguite sul server per:
1. Inviare email tramite SendGrid
2. Inviare notifiche programmate (promemoria, manutenzioni, ecc.)
3. Gestire le notifiche push

## Opzioni di implementazione

### 1. Supabase Edge Functions

Se stai utilizzando Supabase, puoi implementare Edge Functions che vengono eseguite sul server:

```bash
# Installa Supabase CLI se non l'hai già fatto
npm install -g supabase

# Inizializza le funzioni Edge
supabase functions new send-email
supabase functions new check-bookings

# Implementa le funzioni (copia il codice da src/lib/emailServerless.js e notificationScheduler.ts)

# Distribuisci le funzioni
supabase functions deploy send-email
supabase functions deploy check-bookings
```

### 2. Netlify/Vercel Functions

Se utilizzi Netlify o Vercel per l'hosting, puoi implementare funzioni serverless:

#### Netlify

Crea una cartella `netlify/functions` e aggiungi i file delle funzioni:

```javascript
// netlify/functions/send-email.js
// Copia il codice da src/lib/emailServerless.js

// netlify/functions/check-bookings.js
// Converti il codice da src/lib/notificationScheduler.ts in JavaScript
```

Configura i trigger di pianificazione in `netlify.toml`:

```toml
[functions]
  directory = "netlify/functions"

[[plugins]]
  package = "@netlify/plugin-functions-scheduled-functions"

[[scheduled-functions]]
  name = "check-bookings"
  schedule = "0 8 * * *" # Esegui ogni giorno alle 8:00
```

#### Vercel

Crea una cartella `api` e aggiungi i file delle funzioni:

```javascript
// api/send-email.js
// Copia il codice da src/lib/emailServerless.js

// api/check-bookings.js
// Converti il codice da src/lib/notificationScheduler.ts in JavaScript
```

Per le funzioni pianificate, puoi utilizzare Vercel Cron Jobs configurandoli in `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/check-bookings",
    "schedule": "0 8 * * *"
  }]
}
```

### 3. Server Node.js dedicato

Se preferisci un server dedicato, puoi creare un'applicazione Node.js separata:

```javascript
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const sgMail = require('@sendgrid/mail');

const app = express();
app.use(cors());
app.use(express.json());

// Configura Supabase e SendGrid
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Endpoint per l'invio di email
app.post('/api/send-email', async (req, res) => {
  // Implementa la logica di invio email
});

// Pianifica i job
cron.schedule('0 8 * * *', async () => {
  // Implementa la logica di controllo prenotazioni
});

app.listen(process.env.PORT || 3000);
```

## Implementazione dell'invio email

Indipendentemente dall'opzione scelta, l'invio di email tramite SendGrid dovrebbe essere implementato sul server:

```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(to, subject, html, from = 'noreply@fleetflow.com') {
  const msg = {
    to,
    from,
    subject,
    html,
  };
  
  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}
```

## Configurazione delle notifiche automatiche

Per le notifiche automatiche, implementa funzioni che vengono eseguite periodicamente:

```javascript
async function checkUpcomingBookings() {
  // Implementa la logica per controllare le prenotazioni imminenti
  // e inviare promemoria (vedi src/lib/notificationScheduler.ts)
}

async function checkUpcomingMaintenance() {
  // Implementa la logica per controllare le manutenzioni programmate
  // e inviare notifiche (vedi src/lib/notificationScheduler.ts)
}

async function checkExpiredBookings() {
  // Implementa la logica per controllare le prenotazioni scadute
  // e inviare notifiche (vedi src/lib/notificationScheduler.ts)
}
```

## Conclusione

L'implementazione delle funzioni server è essenziale per il corretto funzionamento delle notifiche automatiche e dell'invio email in FleetFlow. Scegli l'opzione che meglio si adatta alla tua infrastruttura e implementa le funzioni necessarie.

Ricorda che l'invio di email e le notifiche push richiedono sempre un componente server, non possono essere gestiti direttamente dal browser a causa di limitazioni di sicurezza e CORS.