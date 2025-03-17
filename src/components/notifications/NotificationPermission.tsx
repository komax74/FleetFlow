import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Bell } from "lucide-react";
import { requestNotificationPermission } from "@/lib/firebase";
import { useToast } from "../ui/use-toast";
import { supabase } from "@/lib/supabase";

const NotificationPermission = () => {
  const [permissionState, setPermissionState] = useState<string>("default");
  const { toast } = useToast();

  useEffect(() => {
    // Controlla se il browser supporta le notifiche
    if (!("Notification" in window)) {
      setPermissionState("unsupported");
      return;
    }

    // Verifica il browser e il sistema operativo
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Safari su iOS ha un comportamento diverso per le notifiche
    if (isSafari && isMobile) {
      console.log(
        "Safari Mobile rilevato - le notifiche potrebbero non funzionare correttamente",
      );
      // Su Safari iOS, mostriamo comunque il popup ma con un messaggio diverso
      setPermissionState("safari_ios");
      return;
    }

    // Controlla lo stato attuale del permesso
    setPermissionState(Notification.permission);

    // Controlla se abbiamo già un token FCM salvato
    const fcmToken = localStorage.getItem("fcmToken");
    if (fcmToken && Notification.permission === "granted") {
      setPermissionState("granted");
    }

    // Controlla se è il primo login o se l'utente ha ignorato la richiesta precedente
    const hasIgnoredNotifications = localStorage.getItem(
      "notifications_ignored",
    );

    // Forza la visualizzazione del popup di richiesta permesso
    localStorage.removeItem("notifications_ignored");

    // Richiedi automaticamente il permesso solo se è il primo login o se non ha esplicitamente ignorato
    if (Notification.permission === "default" && !hasIgnoredNotifications) {
      // Ritarda leggermente la richiesta per dare tempo alla pagina di caricarsi
      const timer = setTimeout(() => {
        handleRequestPermission();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleRequestPermission = async () => {
    try {
      // Richiedi il permesso per le notifiche
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        try {
          // Solo dopo aver ottenuto il permesso, richiedi il token FCM
          const token = await requestNotificationPermission();

          if (token) {
            setPermissionState("granted");
            toast({
              title: "Notifiche push attivate",
              description:
                "Riceverai notifiche push per gli aggiornamenti importanti",
            });

            // Invia una notifica di test
            try {
              const { user } = await supabase.auth.getUser();
              if (user) {
                await supabase.from("notifications").insert([
                  {
                    user_id: user.id,
                    title: "Notifiche push attivate con successo",
                    message:
                      "Ora riceverai notifiche push per gli aggiornamenti importanti della piattaforma.",
                    type: "system",
                    read: false,
                    created_at: new Date().toISOString(),
                  },
                ]);
              }
            } catch (notificationError) {
              console.error(
                "Errore nell'invio della notifica di test:",
                notificationError,
              );
            }
          } else {
            console.log(
              "Token FCM non ottenuto nonostante il permesso concesso",
            );
            setPermissionState("granted"); // Comunque consideriamo il permesso concesso
            toast({
              title: "Notifiche push attivate",
              description:
                "Riceverai notifiche push per gli aggiornamenti importanti",
            });
          }
        } catch (tokenError) {
          console.error(
            "Errore durante l'ottenimento del token FCM:",
            tokenError,
          );
          // Anche se c'è un errore con FCM, il permesso è stato concesso
          setPermissionState("granted");
          toast({
            title: "Notifiche push attivate",
            description:
              "Riceverai notifiche push per gli aggiornamenti importanti",
          });
        }
      } else if (permission === "denied") {
        setPermissionState("denied");
        toast({
          title: "Notifiche push bloccate",
          description:
            "Non riceverai notifiche push. Puoi modificare questa impostazione nelle preferenze del browser.",
          variant: "destructive",
        });
      } else {
        // Se l'utente ha cliccato "Non ora", salviamo questa preferenza
        setPermissionState("ignored");
        localStorage.setItem("notifications_ignored", "true");
      }
    } catch (error) {
      console.error("Errore durante la richiesta del permesso:", error);
      toast({
        title: "Errore",
        description:
          "Si è verificato un errore durante l'attivazione delle notifiche push",
        variant: "destructive",
      });
    }
  };

  const handleIgnore = () => {
    setPermissionState("ignored");
    localStorage.setItem("notifications_ignored", "true");
  };

  // Non mostrare nulla se le notifiche sono già attivate o non supportate
  if (
    permissionState === "granted" ||
    permissionState === "unsupported" ||
    permissionState === "denied"
  ) {
    return null;
  }

  // Messaggio speciale per Safari iOS
  if (permissionState === "safari_ios") {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white rounded-lg shadow-lg p-4 max-w-md border border-gray-200">
          <div className="flex items-start gap-3">
            <div className="bg-yellow-100 p-2 rounded-full">
              <Bell className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-1">Safari su iOS rilevato</h3>
              <p className="text-sm text-gray-600 mb-3">
                Su Safari iOS, devi abilitare le notifiche nelle impostazioni
                del browser. Vai in Impostazioni &gt; Safari &gt; Notifiche e
                abilita le notifiche per questo sito.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleIgnore}>
                  Non ora
                </Button>
                <Button size="sm" onClick={handleIgnore}>
                  Ho capito
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 max-w-md border border-gray-200">
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 p-2 rounded-full">
            <Bell className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium mb-1">Attiva le notifiche push</h3>
            <p className="text-sm text-gray-600 mb-3">
              Ricevi notifiche push per prenotazioni, promemoria e aggiornamenti
              importanti direttamente sul tuo dispositivo.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleIgnore}>
                Non ora
              </Button>
              <Button size="sm" onClick={handleRequestPermission}>
                Attiva notifiche push
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPermission;
