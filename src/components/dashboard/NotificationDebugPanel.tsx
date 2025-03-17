import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useToast } from "../ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Code, RefreshCw, Trash2 } from "lucide-react";
import { triggerBookingsCheck } from "@/lib/supabaseEdgeFunctions";
import EmailDebugPanel from "./EmailDebugPanel";
import EmailProxyPanel from "./EmailProxyPanel";

const NotificationDebugPanel = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fcmToken, setFcmToken] = useState("");
  const [userDevices, setUserDevices] = useState([]);
  const [testNotification, setTestNotification] = useState({
    title: "Test Notification",
    message: "This is a test notification",
    type: "system",
  });
  const [emailTemplate, setEmailTemplate] = useState(
    localStorage.getItem("email_template") ||
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
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
</div>`,
  );
  const [notificationLogs, setNotificationLogs] = useState([]);
  const [notificationSettings, setNotificationSettings] = useState({
    booking_reminders_enabled: true,
    expired_bookings_notifications_enabled: true,
    maintenance_notifications_enabled: true,
    reminder_days_before: 1,
    maintenance_days_before: 3,
  });
  const [firebaseConfig, setFirebaseConfig] = useState({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || "",
  });

  useEffect(() => {
    if (profile?.role !== "admin") return;

    const fetchFCMToken = async () => {
      try {
        // Prova a ottenere il token FCM dal localStorage
        const token = localStorage.getItem("fcmToken");
        if (token) {
          setFcmToken(token);
        }
      } catch (error) {
        console.error("Error fetching FCM token:", error);
      }
    };

    const fetchUserDevices = async () => {
      try {
        const { data, error } = await supabase.from("user_devices").select("*");
        if (error) throw error;
        setUserDevices(data || []);
      } catch (error) {
        console.error("Error fetching user devices:", error);
      }
    };

    const fetchNotificationLogs = async () => {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        setNotificationLogs(data || []);
      } catch (error) {
        console.error("Error fetching notification logs:", error);
      }
    };

    const fetchNotificationSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("settings")
          .select("*")
          .eq("key", "notification_settings")
          .single();

        if (error && error.code !== "PGRST116") throw error;

        if (data?.value) {
          setNotificationSettings(JSON.parse(data.value));
        }
      } catch (error) {
        console.error("Error fetching notification settings:", error);
      }
    };

    fetchFCMToken();
    fetchUserDevices();
    fetchNotificationLogs();
    fetchNotificationSettings();
  }, [profile]);

  const handleSaveEmailTemplate = () => {
    try {
      localStorage.setItem("email_template", emailTemplate);
      // Aggiorna anche nel database se necessario
      updateSettingsInDatabase("email_template", emailTemplate);
      toast({
        title: "Successo",
        description: "Template email salvato con successo",
      });
    } catch (error) {
      console.error("Error saving email template:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare il template email",
        variant: "destructive",
      });
    }
  };

  const handleSaveNotificationSettings = async () => {
    try {
      // Salva le impostazioni nel database
      await updateSettingsInDatabase(
        "notification_settings",
        JSON.stringify(notificationSettings),
      );
      toast({
        title: "Successo",
        description: "Impostazioni notifiche salvate con successo",
      });
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le impostazioni notifiche",
        variant: "destructive",
      });
    }
  };

  const handleSaveFirebaseConfig = async () => {
    try {
      // Salva la configurazione nel database
      await updateSettingsInDatabase(
        "firebase_config",
        JSON.stringify(firebaseConfig),
      );
      toast({
        title: "Successo",
        description: "Configurazione Firebase salvata con successo",
      });
    } catch (error) {
      console.error("Error saving Firebase config:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la configurazione Firebase",
        variant: "destructive",
      });
    }
  };

  const updateSettingsInDatabase = async (key: string, value: string) => {
    try {
      // Verifica se l'impostazione esiste già
      const { data, error: checkError } = await supabase
        .from("settings")
        .select("*")
        .eq("key", key)
        .single();

      if (checkError && checkError.code !== "PGRST116") throw checkError;

      if (data) {
        // Aggiorna l'impostazione esistente
        const { error } = await supabase
          .from("settings")
          .update({ value })
          .eq("key", key);

        if (error) throw error;
      } else {
        // Crea una nuova impostazione
        const { error } = await supabase
          .from("settings")
          .insert([{ key, value }]);

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error(`Error updating ${key} in database:`, error);
      throw error;
    }
  };

  const handleSendTestNotification = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Crea una notifica di test
      const notification = {
        user_id: user.id,
        title: testNotification.title,
        message: testNotification.message,
        type: testNotification.type,
        read: false,
        created_at: new Date().toISOString(),
        action_url: "/notifications",
      };

      // Salva la notifica nel database
      const { error } = await supabase
        .from("notifications")
        .insert([notification]);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Notifica di test inviata con successo",
      });

      // Aggiorna i log delle notifiche
      const { data: updatedLogs } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (updatedLogs) {
        setNotificationLogs(updatedLogs);
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
      toast({
        title: "Errore",
        description: "Impossibile inviare la notifica di test",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshDevices = async () => {
    try {
      const { data, error } = await supabase.from("user_devices").select("*");
      if (error) throw error;
      setUserDevices(data || []);
      toast({
        title: "Successo",
        description: "Lista dispositivi aggiornata",
      });
    } catch (error) {
      console.error("Error refreshing devices:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la lista dispositivi",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from("user_devices")
        .delete()
        .eq("id", deviceId);
      if (error) throw error;

      // Aggiorna la lista dei dispositivi
      handleRefreshDevices();

      toast({
        title: "Successo",
        description: "Dispositivo eliminato con successo",
      });
    } catch (error) {
      console.error("Error deleting device:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare il dispositivo",
        variant: "destructive",
      });
    }
  };

  const handleRefreshLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setNotificationLogs(data || []);
      toast({
        title: "Successo",
        description: "Log delle notifiche aggiornati",
      });
    } catch (error) {
      console.error("Error refreshing notification logs:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare i log delle notifiche",
        variant: "destructive",
      });
    }
  };

  const handleFirebaseConfigChange = (key: string, value: string) => {
    setFirebaseConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleNotificationSettingChange = (key: string, value: any) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleManualCheck = async () => {
    setLoading(true);
    try {
      const result = await triggerBookingsCheck();
      toast({
        title: "Controllo completato",
        description: `Prenotazioni imminenti: ${result.upcomingBookings.count || 0}, Prenotazioni scadute: ${result.expiredBookings.count || 0}`,
      });
    } catch (error) {
      console.error("Error triggering manual check:", error);
      toast({
        title: "Errore",
        description: "Impossibile eseguire il controllo manuale",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== "admin") {
    return null;
  }

  return (
    <Card className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow mb-8">
      <CardHeader>
        <CardTitle>Debug e Configurazione Notifiche</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="test">
          <TabsList className="mb-4">
            <TabsTrigger value="test">Test Notifiche</TabsTrigger>
            <TabsTrigger value="settings">Impostazioni Notifiche</TabsTrigger>
            <TabsTrigger value="devices">Dispositivi</TabsTrigger>
            <TabsTrigger value="template">Template Email</TabsTrigger>
            <TabsTrigger value="firebase">Config Firebase</TabsTrigger>
            <TabsTrigger value="logs">Log Notifiche</TabsTrigger>
            <TabsTrigger value="email-debug">Debug Email</TabsTrigger>
            <TabsTrigger value="email-proxy">Email Proxy</TabsTrigger>
          </TabsList>

          <TabsContent value="test" className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium mb-2">FCM Token Corrente</h3>
              <div className="flex items-center gap-2">
                <Input
                  value={fcmToken}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(fcmToken);
                    toast({
                      title: "Copiato",
                      description: "Token copiato negli appunti",
                    });
                  }}
                >
                  Copia
                </Button>
              </div>
            </div>

            <div className="space-y-4 mt-6">
              <div className="grid gap-2">
                <Label htmlFor="title">Titolo Notifica Test</Label>
                <Input
                  id="title"
                  value={testNotification.title}
                  onChange={(e) =>
                    setTestNotification({
                      ...testNotification,
                      title: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="message">Messaggio Notifica Test</Label>
                <Textarea
                  id="message"
                  value={testNotification.message}
                  onChange={(e) =>
                    setTestNotification({
                      ...testNotification,
                      message: e.target.value,
                    })
                  }
                  rows={4}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">Tipo Notifica</Label>
                <select
                  id="type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={testNotification.type}
                  onChange={(e) =>
                    setTestNotification({
                      ...testNotification,
                      type: e.target.value,
                    })
                  }
                >
                  <option value="system">Sistema</option>
                  <option value="booking">Prenotazione</option>
                  <option value="reminder">Promemoria</option>
                  <option value="maintenance">Manutenzione</option>
                </select>
              </div>

              <div className="flex flex-col gap-4 mt-4">
                <Button onClick={handleSendTestNotification} disabled={loading}>
                  {loading ? "Invio in corso..." : "Invia Notifica Test"}
                </Button>

                <Button
                  onClick={handleManualCheck}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Esegui controllo prenotazioni manualmente
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium mb-4">
                Impostazioni Notifiche
              </h3>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Promemoria prenotazioni</h4>
                    <p className="text-sm text-gray-500">
                      Invia promemoria per le prenotazioni imminenti
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.booking_reminders_enabled}
                    onChange={(e) =>
                      handleNotificationSettingChange(
                        "booking_reminders_enabled",
                        e.target.checked,
                      )
                    }
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">
                      Notifiche prenotazioni scadute
                    </h4>
                    <p className="text-sm text-gray-500">
                      Invia notifiche per le prenotazioni scadute
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={
                      notificationSettings.expired_bookings_notifications_enabled
                    }
                    onChange={(e) =>
                      handleNotificationSettingChange(
                        "expired_bookings_notifications_enabled",
                        e.target.checked,
                      )
                    }
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notifiche manutenzione</h4>
                    <p className="text-sm text-gray-500">
                      Invia notifiche per le manutenzioni programmate
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={
                      notificationSettings.maintenance_notifications_enabled
                    }
                    onChange={(e) =>
                      handleNotificationSettingChange(
                        "maintenance_notifications_enabled",
                        e.target.checked,
                      )
                    }
                    className="h-4 w-4"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="reminder_days">
                    Giorni di anticipo per promemoria prenotazioni
                  </Label>
                  <Input
                    id="reminder_days"
                    type="number"
                    min="1"
                    max="7"
                    value={notificationSettings.reminder_days_before}
                    onChange={(e) =>
                      handleNotificationSettingChange(
                        "reminder_days_before",
                        parseInt(e.target.value),
                      )
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="maintenance_days">
                    Giorni di anticipo per notifiche manutenzione
                  </Label>
                  <Input
                    id="maintenance_days"
                    type="number"
                    min="1"
                    max="14"
                    value={notificationSettings.maintenance_days_before}
                    onChange={(e) =>
                      handleNotificationSettingChange(
                        "maintenance_days_before",
                        parseInt(e.target.value),
                      )
                    }
                  />
                </div>

                <Button onClick={handleSaveNotificationSettings}>
                  Salva Impostazioni Notifiche
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Dispositivi Registrati</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshDevices}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Aggiorna
              </Button>
            </div>

            {userDevices.length === 0 ? (
              <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">
                Nessun dispositivo registrato
              </div>
            ) : (
              <div className="space-y-4">
                {userDevices.map((device) => (
                  <div
                    key={device.id}
                    className="p-4 border rounded-lg flex justify-between items-start"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Utente:</span>
                        <span>{device.user_id}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Tipo:</span>
                        <span>{device.device_type}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Creato:</span>
                        <span>
                          {new Date(device.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="font-medium">Token:</span>
                        <div className="mt-1 p-2 bg-gray-50 rounded font-mono text-xs break-all">
                          {device.token}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteDevice(device.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="template" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="email-template" className="mb-2 block">
                  Template Email HTML
                </Label>
                <Textarea
                  id="email-template"
                  value={emailTemplate}
                  onChange={(e) => setEmailTemplate(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Usa &#123;&#123;subject&#125;&#125; e
                  &#123;&#123;body&#125;&#125; come placeholder per il titolo e
                  il contenuto dell'email.
                </p>
              </div>

              <Button onClick={handleSaveEmailTemplate}>
                Salva Template Email
              </Button>

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Anteprima Template</h3>
                <div className="border rounded-lg p-4 bg-white">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: emailTemplate
                        .replace(/\{\{subject\}\}/g, "Titolo Email di Esempio")
                        .replace(
                          /\{\{body\}\}/g,
                          "Questo è un esempio di corpo dell'email. Il contenuto verrà sostituito con il messaggio effettivo della notifica.",
                        ),
                    }}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="firebase" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  value={firebaseConfig.apiKey}
                  onChange={(e) =>
                    handleFirebaseConfigChange("apiKey", e.target.value)
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="authDomain">Auth Domain</Label>
                <Input
                  id="authDomain"
                  value={firebaseConfig.authDomain}
                  onChange={(e) =>
                    handleFirebaseConfigChange("authDomain", e.target.value)
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="projectId">Project ID</Label>
                <Input
                  id="projectId"
                  value={firebaseConfig.projectId}
                  onChange={(e) =>
                    handleFirebaseConfigChange("projectId", e.target.value)
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="storageBucket">Storage Bucket</Label>
                <Input
                  id="storageBucket"
                  value={firebaseConfig.storageBucket}
                  onChange={(e) =>
                    handleFirebaseConfigChange("storageBucket", e.target.value)
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="messagingSenderId">Messaging Sender ID</Label>
                <Input
                  id="messagingSenderId"
                  value={firebaseConfig.messagingSenderId}
                  onChange={(e) =>
                    handleFirebaseConfigChange(
                      "messagingSenderId",
                      e.target.value,
                    )
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="appId">App ID</Label>
                <Input
                  id="appId"
                  value={firebaseConfig.appId}
                  onChange={(e) =>
                    handleFirebaseConfigChange("appId", e.target.value)
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="vapidKey">VAPID Key</Label>
                <Input
                  id="vapidKey"
                  value={firebaseConfig.vapidKey}
                  onChange={(e) =>
                    handleFirebaseConfigChange("vapidKey", e.target.value)
                  }
                />
              </div>

              <Button onClick={handleSaveFirebaseConfig} className="mt-2">
                Salva Configurazione Firebase
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Log Notifiche</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshLogs}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Aggiorna
              </Button>
            </div>

            {notificationLogs.length === 0 ? (
              <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">
                Nessun log di notifica disponibile
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {notificationLogs.map((log) => (
                  <div key={log.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">{log.title}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm mb-2">{log.message}</div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-gray-100 rounded-full">
                        Tipo: {log.type}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded-full">
                        Utente: {log.user_id || "Tutti"}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded-full">
                        Letto: {log.read ? "Sì" : "No"}
                      </span>
                      {log.action_url && (
                        <span className="px-2 py-1 bg-gray-100 rounded-full">
                          URL: {log.action_url}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="email-debug">
            <EmailDebugPanel />
          </TabsContent>

          <TabsContent value="email-proxy">
            <EmailProxyPanel />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default NotificationDebugPanel;
