import React from "react";
import { Button } from "@/components/ui/button";
import { sendNotification } from "@/lib/notificationService";
import { useAuth } from "@/lib/auth";
import NotificationSystem from "./NotificationSystem";

const NotificationTest = () => {
  const { user } = useAuth();

  const sendTestNotification = async () => {
    if (!user) return;

    try {
      await sendNotification({
        user_id: user.id,
        title: "Notifica di test",
        message: "Questa è una notifica di test inviata manualmente.",
        type: "system",
      });

      // Force refresh local storage
      const storedNotifications = localStorage.getItem(
        `notifications_${user.id}`,
      );
      if (storedNotifications) {
        const parsedNotifications = JSON.parse(storedNotifications);
        const updatedNotifications = [
          {
            id: `local-${Date.now()}`,
            user_id: user.id,
            title: "Notifica di test locale",
            message: "Questa è una notifica di test locale.",
            type: "system",
            read: false,
            created_at: new Date().toISOString(),
          },
          ...parsedNotifications,
        ];
        localStorage.setItem(
          `notifications_${user.id}`,
          JSON.stringify(updatedNotifications),
        );
      }

      alert("Notifica inviata! Controlla l'icona delle notifiche.");

      // Force reload notifications by simulating a user change
      window.dispatchEvent(new Event("storage"));
    } catch (error) {
      console.error("Errore nell'invio della notifica:", error);
      alert("Errore nell'invio della notifica. Controlla la console.");
    }
  };

  const clearLocalNotifications = () => {
    if (!user) return;
    localStorage.removeItem(`notifications_${user.id}`);
    alert("Notifiche locali cancellate!");
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Test Notifiche In-App</h2>
        <NotificationSystem />
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded border border-blue-200">
          <h3 className="font-medium mb-2">Stato attuale:</h3>
          <p>Utente: {user ? user.email : "Non autenticato"}</p>
          <p>ID Utente: {user ? user.id : "N/A"}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded border">
            <h3 className="font-medium mb-2">Test Notifica Supabase</h3>
            <p className="text-sm text-gray-600 mb-4">
              Invia una notifica di test tramite Supabase e il servizio di
              notifiche.
            </p>
            <Button onClick={sendTestNotification}>
              Invia Notifica di Test
            </Button>
          </div>

          <div className="p-4 bg-gray-50 rounded border">
            <h3 className="font-medium mb-2">Gestione Cache Locale</h3>
            <p className="text-sm text-gray-600 mb-4">
              Cancella le notifiche memorizzate in localStorage.
            </p>
            <Button variant="outline" onClick={clearLocalNotifications}>
              Cancella Notifiche Locali
            </Button>
          </div>
        </div>

        <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
          <h3 className="font-medium mb-2">Debugging:</h3>
          <p className="text-sm">Se le notifiche non appaiono, controlla:</p>
          <ul className="list-disc list-inside text-sm mt-2 space-y-1">
            <li>La connessione a Supabase è attiva</li>
            <li>Gli eventi di storage vengono gestiti correttamente</li>
            <li>Il localStorage contiene le notifiche nel formato corretto</li>
            <li>
              I componenti NotificationSystem e NotificationPage utilizzano lo
              stesso formato di dati
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NotificationTest;
