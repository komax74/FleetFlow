import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

const NotificationSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    // Prenotazione
    booking_reminder_enabled: true,
    booking_reminder_hours: 24,
    return_reminder_enabled: true,
    return_reminder_hours: 1,
    late_return_user_enabled: true,
    late_return_user_hours: 2,
    late_return_admin_enabled: true,
    late_return_admin_hours: 4,
    // Manutenzione
    maintenance_notification_enabled: true,
    // Note
    return_notes_notification_enabled: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Try to get from localStorage first
      const storedSettings = localStorage.getItem("notification_settings");
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }

      // Try from Supabase if available
      try {
        const { data, error } = await supabase
          .from("settings")
          .select("*")
          .eq("key", "notification_settings");

        if (error) {
          console.log("Error fetching from database, using local settings");
          return;
        }

        if (data && data.length > 0) {
          const parsedSettings = JSON.parse(data[0].value);
          setSettings(parsedSettings);
          localStorage.setItem("notification_settings", data[0].value);
        }
      } catch (dbError) {
        console.log("Using local notification settings");
      }
    } catch (error) {
      console.error("Error fetching notification settings:", error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      // Save to localStorage
      localStorage.setItem("notification_settings", JSON.stringify(settings));

      // Try to save to database
      try {
        // Check if settings already exist
        const { data: existingData } = await supabase
          .from("settings")
          .select("*")
          .eq("key", "notification_settings");

        if (existingData && existingData.length > 0) {
          // Update existing settings
          const { error } = await supabase
            .from("settings")
            .update({ value: JSON.stringify(settings) })
            .eq("key", "notification_settings");

          if (error) {
            console.log(
              "Error updating settings in database, saved locally only",
            );
          }
        } else {
          // Insert new settings
          const { error } = await supabase.from("settings").insert([
            {
              key: "notification_settings",
              value: JSON.stringify(settings),
            },
          ]);

          if (error) {
            console.log(
              "Error inserting settings in database, saved locally only",
            );
          }
        }
      } catch (dbError) {
        console.log("Saved to localStorage only", dbError);
      }

      toast({
        title: "Successo",
        description: "Impostazioni notifiche salvate con successo",
      });
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le impostazioni",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChange = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleInputChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Card className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow mb-8">
      <CardHeader>
        <CardTitle>Notifiche Automatiche</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Prenotazioni</h3>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Promemoria prenotazione</Label>
                <p className="text-sm text-gray-500">
                  Notifica all'utente prima della prenotazione
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Switch
                  checked={settings.booking_reminder_enabled}
                  onCheckedChange={() =>
                    handleToggleChange("booking_reminder_enabled")
                  }
                />
                {settings.booking_reminder_enabled && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-16"
                      value={settings.booking_reminder_hours}
                      onChange={(e) =>
                        handleInputChange(
                          "booking_reminder_hours",
                          parseInt(e.target.value) || 1,
                        )
                      }
                      min="1"
                    />
                    <span className="text-sm">ore prima</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Promemoria riconsegna</Label>
                <p className="text-sm text-gray-500">
                  Notifica all'utente prima della riconsegna
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Switch
                  checked={settings.return_reminder_enabled}
                  onCheckedChange={() =>
                    handleToggleChange("return_reminder_enabled")
                  }
                />
                {settings.return_reminder_enabled && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-16"
                      value={settings.return_reminder_hours}
                      onChange={(e) =>
                        handleInputChange(
                          "return_reminder_hours",
                          parseInt(e.target.value) || 1,
                        )
                      }
                      min="1"
                    />
                    <span className="text-sm">ore prima</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">
                  Avviso ritardo riconsegna (utente)
                </Label>
                <p className="text-sm text-gray-500">
                  Notifica all'utente dopo la scadenza della prenotazione
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Switch
                  checked={settings.late_return_user_enabled}
                  onCheckedChange={() =>
                    handleToggleChange("late_return_user_enabled")
                  }
                />
                {settings.late_return_user_enabled && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-16"
                      value={settings.late_return_user_hours}
                      onChange={(e) =>
                        handleInputChange(
                          "late_return_user_hours",
                          parseInt(e.target.value) || 1,
                        )
                      }
                      min="1"
                    />
                    <span className="text-sm">ore dopo</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">
                  Avviso ritardo riconsegna (admin)
                </Label>
                <p className="text-sm text-gray-500">
                  Notifica all'admin dopo la scadenza della prenotazione
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Switch
                  checked={settings.late_return_admin_enabled}
                  onCheckedChange={() =>
                    handleToggleChange("late_return_admin_enabled")
                  }
                />
                {settings.late_return_admin_enabled && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-16"
                      value={settings.late_return_admin_hours}
                      onChange={(e) =>
                        handleInputChange(
                          "late_return_admin_hours",
                          parseInt(e.target.value) || 1,
                        )
                      }
                      min="1"
                    />
                    <span className="text-sm">ore dopo</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Manutenzione</h3>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Avviso manutenzione veicolo</Label>
                <p className="text-sm text-gray-500">
                  Notifica a tutti gli utenti quando un veicolo va in
                  manutenzione
                </p>
              </div>
              <Switch
                checked={settings.maintenance_notification_enabled}
                onCheckedChange={() =>
                  handleToggleChange("maintenance_notification_enabled")
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Note e Feedback</h3>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Avviso note riconsegna</Label>
                <p className="text-sm text-gray-500">
                  Notifica all'admin quando un utente inserisce note alla
                  riconsegna
                </p>
              </div>
              <Switch
                checked={settings.return_notes_notification_enabled}
                onCheckedChange={() =>
                  handleToggleChange("return_notes_notification_enabled")
                }
              />
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={saveSettings}
              disabled={loading}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {loading ? "Salvataggio..." : "Salva impostazioni"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
