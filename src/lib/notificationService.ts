import { supabase } from "./supabase";
import { getMessaging, getToken } from "firebase/messaging";
import { app } from "./firebase";

// Interfaccia per le notifiche
interface NotificationData {
  user_id: string | null;
  title: string;
  message: string;
  type: "system" | "booking" | "reminder" | "maintenance";
  action_url?: string | null;
}

// Funzione per inviare una notifica a un utente o a tutti gli utenti
export const sendNotification = async (notification: NotificationData) => {
  try {
    // Crea un ID locale per la notifica se non siamo connessi a Supabase
    const localNotificationId = `local-${Date.now()}`;

    // Prova a salvare la notifica nel database Supabase
    try {
      const { data, error } = await supabase
        .from("notifications")
        .insert([
          {
            ...notification,
            read: false,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      // Aggiorna anche il localStorage per garantire la sincronizzazione
      if (notification.user_id) {
        updateLocalNotifications(notification.user_id, data[0]);
      }

      // Invia anche una notifica push tramite Firebase
      await sendPushNotification(notification);

      // Invia anche un'email
      if (notification.user_id) {
        try {
          const { data: userData } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", notification.user_id)
            .single();

          if (userData?.email) {
            await sendEmailNotification(
              userData.email,
              notification.title,
              notification.message,
            );
          }
        } catch (emailError) {
          console.error("Error sending email notification:", emailError);
        }
      }
    } catch (dbError) {
      console.error("Error saving notification to database:", dbError);

      // Se fallisce il salvataggio nel database, salva localmente
      if (notification.user_id) {
        const localNotification = {
          id: localNotificationId,
          user_id: notification.user_id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          action_url: notification.action_url || null,
          read: false,
          created_at: new Date().toISOString(),
        };

        updateLocalNotifications(notification.user_id, localNotification);
      }
    }

    return true;
  } catch (error) {
    console.error("Error sending notification:", error);
    return false;
  }
};

// Helper function to update localStorage notifications
const updateLocalNotifications = (userId: string, newNotification: any) => {
  try {
    const storedNotifications = localStorage.getItem(`notifications_${userId}`);
    let notifications = [];

    if (storedNotifications) {
      try {
        notifications = JSON.parse(storedNotifications);
      } catch (e) {
        console.error("Error parsing stored notifications:", e);
        notifications = [];
      }
    }

    // Add the new notification at the beginning
    notifications = [newNotification, ...notifications];

    // Save back to localStorage
    localStorage.setItem(
      `notifications_${userId}`,
      JSON.stringify(notifications),
    );

    // Trigger a storage event to notify other components
    window.dispatchEvent(new Event("storage"));
  } catch (error) {
    console.error("Error updating local notifications:", error);
  }
};

// Funzione per inviare una notifica push tramite Firebase Cloud Messaging
const sendPushNotification = async (notification: NotificationData) => {
  try {
    // Ottieni i token FCM degli utenti a cui inviare la notifica
    let tokens: string[] = [];

    if (notification.user_id) {
      // Se la notifica è per un utente specifico, ottieni i suoi token
      const { data, error } = await supabase
        .from("user_devices")
        .select("token")
        .eq("user_id", notification.user_id);

      if (error) throw error;
      tokens = data?.map((d) => d.token) || [];
    } else {
      // Se la notifica è per tutti, ottieni tutti i token
      const { data, error } = await supabase
        .from("user_devices")
        .select("token");

      if (error) throw error;
      tokens = data?.map((d) => d.token) || [];
    }

    // Se non ci sono token, non inviare notifiche push
    if (tokens.length === 0) {
      return true;
    }

    // Prepara il payload della notifica
    const message = {
      notification: {
        title: notification.title,
        body: notification.message,
      },
      data: {
        type: notification.type,
        action_url: notification.action_url || "",
      },
      tokens: tokens,
    };

    // Invia la notifica tramite Firebase Cloud Messaging
    // Nota: in un'implementazione reale, dovresti avere un endpoint sul tuo server
    // che utilizza Firebase Admin SDK per inviare notifiche push

    // Simula l'invio della notifica
    // In un ambiente di produzione, dovresti utilizzare Firebase Admin SDK
    // o un servizio serverless per inviare le notifiche
    setTimeout(() => {}, 500);

    return true;
  } catch (error) {
    console.error("Errore durante l'invio della notifica push:", error);
    return false;
  }
};

// Funzione per inviare una notifica a tutti gli amministratori
export const sendNotificationToAdmins = async (
  notification: Omit<NotificationData, "user_id">,
) => {
  try {
    // Ottieni tutti gli amministratori
    const { data: admins, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (error) throw error;

    // Invia la notifica a ciascun amministratore
    if (admins && admins.length > 0) {
      for (const admin of admins) {
        await sendNotification({
          ...notification,
          user_id: admin.id,
        });
      }
    }

    return true;
  } catch (error) {
    console.error(
      "Errore durante l'invio della notifica agli amministratori:",
      error,
    );
    return false;
  }
};

// Funzione per inviare una notifica via email
export const sendEmailNotification = async (
  to: string,
  subject: string,
  body: string,
) => {
  try {
    // Importa il servizio email
    const { sendNotificationEmail } = await import("./emailService");

    // Invia l'email utilizzando il servizio configurato
    const result = await sendNotificationEmail(to, subject, body);

    if (result) {
    } else {
    }

    return result;
  } catch (error) {
    console.error("Errore durante l'invio dell'email:", error);
    return false;
  }
};

// Funzione per salvare il token FCM nel database
export const saveFCMToken = async (userId: string, token: string) => {
  try {
    // Verifica se esiste già un record per questo utente
    const { data, error: fetchError } = await supabase
      .from("user_devices")
      .select("*")
      .eq("user_id", userId)
      .eq("token", token);

    if (fetchError) throw fetchError;

    // Se il token non esiste già, salvalo
    if (!data || data.length === 0) {
      const { error } = await supabase.from("user_devices").insert([
        {
          user_id: userId,
          token,
          device_type: "web",
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error("Errore durante il salvataggio del token FCM:", error);
    return false;
  }
};

// Funzione per ottenere il token FCM corrente
export const getCurrentFCMToken = async () => {
  try {
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });
    return token;
  } catch (error) {
    console.error("Errore durante il recupero del token FCM:", error);
    return null;
  }
};
