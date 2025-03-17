import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "../ui/button";
import { Pencil } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useToast } from "../ui/use-toast";
import { supabase } from "@/lib/supabase";
import Header from "./Header";
import { Switch } from "../ui/switch";
import { requestNotificationPermission } from "@/lib/firebase";

const AccountSettings = () => {
  const { user, profile } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    company: "",
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        company: profile.company || "",
      });
      setHasChanges(false);
    }

    // Controlla se le notifiche sono abilitate
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, [profile]);

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update profile data if changed
      if (
        formData.full_name !== profile?.full_name ||
        formData.company !== profile?.company
      ) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: formData.full_name,
            company: formData.company,
          })
          .eq("id", user.id);

        if (profileError) throw profileError;
      }

      // Update password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          toast({
            title: "Errore",
            description: "Le password non coincidono",
            variant: "destructive",
          });
          return;
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (passwordError) throw passwordError;
      }

      toast({
        title: "Successo",
        description: "Account aggiornato con successo",
      });
      setNewPassword("");
      setConfirmPassword("");
      setHasChanges(false);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare l'account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: "Errore",
        description: "Le password non coincidono",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Password aggiornata con successo",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationToggle = async () => {
    if (!notificationsEnabled) {
      try {
        // Rimuoviamo il flag di notifiche ignorate
        localStorage.removeItem("notifications_ignored");

        // Verifica il browser e il sistema operativo
        const isSafari = /^((?!chrome|android).)*safari/i.test(
          navigator.userAgent,
        );
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isSafari && isMobile) {
          // Safari su iOS richiede un approccio diverso
          toast({
            title: "Safari Mobile rilevato",
            description:
              "Su Safari iOS, vai in Impostazioni > Safari > Notifiche per abilitare le notifiche per questo sito.",
          });
          // Impostiamo comunque lo stato come attivato per l'interfaccia
          setNotificationsEnabled(true);
          return;
        }

        // Richiedi il permesso per le notifiche
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
          // Richiedi il token FCM (ora sempre simulato)
          const token = await requestNotificationPermission();
          setNotificationsEnabled(true);

          toast({
            title: "Notifiche push attivate",
            description:
              "Riceverai notifiche push per gli aggiornamenti importanti",
          });

          // Invia una notifica di test
          if (user) {
            try {
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

              // Invia una notifica nativa del browser come test
              try {
                const testNotification = new Notification(
                  "Notifiche attivate",
                  {
                    body: "Le notifiche push sono state attivate con successo",
                    icon: "/vite.svg",
                  },
                );

                // Aggiungi un handler per il click sulla notifica
                testNotification.onclick = () => {
                  window.focus();
                  testNotification.close();
                };

                console.log("Notifica di test inviata con successo");
              } catch (notificationError) {
                console.error(
                  "Errore nell'invio della notifica di test del browser:",
                  notificationError,
                );
              }
            } catch (error) {
              console.error(
                "Errore nell'invio della notifica di test al database:",
                error,
              );
            }
          }
        } else if (permission === "denied") {
          setNotificationsEnabled(false);
          toast({
            title: "Notifiche push bloccate",
            description:
              "Non riceverai notifiche push. Puoi modificare questa impostazione nelle preferenze del browser.",
            variant: "destructive",
          });
        } else {
          // Se l'utente ha cliccato "Non ora", non cambiamo lo stato
          toast({
            title: "Richiesta ignorata",
            description:
              "Puoi attivare le notifiche push in qualsiasi momento.",
          });
        }
      } catch (error) {
        console.error(
          "Errore durante l'attivazione delle notifiche push:",
          error,
        );
        toast({
          title: "Errore",
          description:
            "Si è verificato un errore durante l'attivazione delle notifiche push",
          variant: "destructive",
        });
      }
    } else {
      // Se l'utente tenta di disattivare le notifiche già attive
      try {
        // Non possiamo revocare il permesso, ma possiamo rimuovere il token
        localStorage.removeItem("fcmToken");

        // Rimuovi il dispositivo dal database se possibile
        if (user) {
          try {
            const fcmToken = localStorage.getItem("fcmToken");
            if (fcmToken) {
              await supabase
                .from("user_devices")
                .delete()
                .eq("token", fcmToken);
            }
          } catch (dbError) {
            console.error("Errore nella rimozione del dispositivo:", dbError);
          }
        }

        setNotificationsEnabled(false);
        toast({
          title: "Notifiche push disattivate",
          description:
            "Le notifiche push sono state disattivate per questo dispositivo.",
        });
      } catch (error) {
        console.error(
          "Errore durante la disattivazione delle notifiche:",
          error,
        );
        toast({
          title: "Informazione",
          description:
            "Per disattivare completamente le notifiche push, modifica le impostazioni del browser",
        });
      }
    }
  };

  if (!user || !profile) return null;

  return (
    <div>
      <Header />
      <div className="pt-[72px] px-6">
        <div className="max-w-[600px] mx-auto">
          <Card className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Il Tuo Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture and Name */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback>{profile.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="space-y-4">
                  <div>
                    <Label>Nome Completo</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        value={formData.full_name}
                        onChange={(e) =>
                          handleFormChange("full_name", e.target.value)
                        }
                        className="h-9"
                      />
                      <div className="text-gray-400">
                        <Pencil className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Azienda</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        value={formData.company}
                        onChange={(e) =>
                          handleFormChange("company", e.target.value)
                        }
                        placeholder="Inserisci la tua azienda"
                        className="h-9"
                      />
                      <div className="text-gray-400">
                        <Pencil className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Ruolo</Label>
                    <p className="text-sm text-gray-500 mt-2">
                      {profile.role === "admin" ? "Amministratore" : "Utente"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="space-y-2">
                <Label>Notifiche</Label>
                <div className="flex items-center justify-between mt-2 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Notifiche Push</p>
                    <p className="text-sm text-gray-500">
                      Ricevi notifiche push per prenotazioni e aggiornamenti
                      direttamente sul tuo dispositivo
                    </p>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={handleNotificationToggle}
                  />
                </div>
                {!notificationsEnabled && (
                  <p className="text-sm text-blue-600 mt-1">
                    Attiva le notifiche push per ricevere aggiornamenti
                    importanti sul tuo dispositivo
                  </p>
                )}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-700">
                    <strong>Nota:</strong> Le notifiche in-app e via email sono
                    sempre attive e non possono essere disattivate. Le notifiche
                    push sono opzionali e richiedono il tuo consenso esplicito.
                  </p>
                </div>
              </div>

              {/* Email Display */}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user.email} disabled />
                <p className="text-sm text-muted-foreground">
                  Contatta il supporto per modificare l'indirizzo email
                </p>
              </div>

              {/* Password Change Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nuova Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setHasChanges(true);
                    }}
                    placeholder="Inserisci la nuova password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Conferma Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setHasChanges(true);
                    }}
                    placeholder="Conferma la nuova password"
                  />
                </div>

                <Button
                  type="submit"
                  className={`w-full ${!loading && (hasChanges || newPassword) ? "bg-blue-500 hover:bg-blue-600" : ""}`}
                  disabled={loading || (!hasChanges && !newPassword)}
                >
                  {loading ? "Aggiornamento..." : "Aggiorna Account"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
