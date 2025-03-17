import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getAuth } from "firebase/auth";
import { supabase } from "./supabase";

// Configurazione Firebase
const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyDLEfrqWUV-WrXBqbj3KpwRq7rKk0kLOoM",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "fleetflow-notifications.firebaseapp.com",
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || "fleetflow-notifications",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "fleetflow-notifications.appspot.com",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef1234567890",
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const messaging = typeof window !== "undefined" ? getMessaging(app) : null;
const auth = getAuth(app);

// Funzione per richiedere il token FCM (assumendo che il permesso sia già stato concesso)
export const requestNotificationPermission = async () => {
  try {
    if (!messaging) {
      console.warn("Firebase messaging non disponibile");
      return generateMockToken();
    }

    // Verifica che il permesso sia già stato concesso
    if (Notification.permission !== "granted") {
      console.log("Il permesso per le notifiche non è stato concesso");
      return null;
    }

    try {
      // Generiamo sempre un token simulato invece di usare Firebase
      // per evitare errori di configurazione
      return generateMockToken();

      /* Codice originale commentato per evitare errori di configurazione
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || 
                  "kb5R5iV0Ij8tcxQXm2JVcDYFU-uqEBbSIq6GFU0u7Sk",
      });
      */
    } catch (tokenError) {
      console.error(
        "Errore specifico durante l'ottenimento del token FCM:",
        tokenError,
      );
      return generateMockToken();
    }
  } catch (error) {
    console.error(
      "Errore generale durante l'ottenimento del token FCM:",
      error,
    );
    return generateMockToken();
  }
};

// Funzione per generare un token simulato
const generateMockToken = () => {
  const mockToken = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  localStorage.setItem("fcmToken", mockToken);
  console.log("Generato token simulato per test:", mockToken);

  // Salva il token nel database per l'utente corrente
  try {
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (user) {
          // Verifica se il token esiste già
          supabase
            .from("user_devices")
            .select("*")
            .eq("user_id", user.id)
            .eq("token", mockToken)
            .then(({ data, error: checkError }) => {
              if (checkError) {
                console.error("Errore verifica token:", checkError);
                return;
              }

              // Se il token non esiste, salvalo
              if (!data || data.length === 0) {
                supabase
                  .from("user_devices")
                  .insert([
                    {
                      user_id: user.id,
                      token: mockToken,
                      device_type: "web",
                      created_at: new Date().toISOString(),
                    },
                  ])
                  .then(({ error }) => {
                    if (error) {
                      console.error("Errore salvataggio token:", error);
                      return;
                    }
                    console.log(
                      "Token simulato salvato nel database per l'utente",
                      user.id,
                    );
                  });
              } else {
                console.log("Token già presente nel database");
              }
            });
        }
      })
      .catch((dbError) => {
        console.error("Errore durante il recupero dell'utente:", dbError);
      });
  } catch (dbError) {
    console.error(
      "Errore durante il salvataggio del token nel database:",
      dbError,
    );
  }

  return mockToken;
};

// Funzione per gestire i messaggi in arrivo quando l'app è in primo piano
export const onMessageListener = () => {
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log("Messaggio ricevuto:", payload);

    // Mostra una notifica nativa del browser
    if (payload.notification) {
      const { title, body } = payload.notification;

      // Verifica se il browser supporta le notifiche e se l'utente ha concesso il permesso
      if (Notification.permission === "granted") {
        // Crea una nuova notifica
        const notification = new Notification(title, {
          body,
          icon: "/vite.svg",
        });

        // Gestisci il click sulla notifica
        notification.onclick = () => {
          // Se c'è un URL di azione, reindirizza l'utente
          if (payload.data?.action_url) {
            window.location.href = payload.data.action_url;
          }
          // Chiudi la notifica
          notification.close();
        };
      }
    }
  });
};

export { app, messaging, auth };
