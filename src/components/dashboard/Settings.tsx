import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useToast } from "../ui/use-toast";
import { supabase } from "@/lib/supabase";
import Header from "./Header";
import NotificationSettings from "./NotificationSettings.jsx";

const Settings = () => {
  const [footerText, setFooterText] = useState(
    "© 2024 FleetFlow - Gestione flotta aziendale. Tutti i diritti riservati.",
  );
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // First try to get from localStorage
      const storedFooterText = localStorage.getItem("footer_text");
      if (storedFooterText) {
        setFooterText(storedFooterText);
      }

      // Also try from Supabase if available, but don't worry if it fails
      try {
        const { data, error } = await supabase
          .from("settings")
          .select("*")
          .eq("key", "footer_text")
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        if (data) {
          setFooterText(data.value);
          localStorage.setItem("footer_text", data.value);
        }
      } catch (dbError) {
        // Silently fail if database table doesn't exist yet
        console.log("Database table not available yet");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      // If there's an error, we'll just use the default text
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      // Always save to localStorage first
      localStorage.setItem("footer_text", footerText);

      // Try to save to database if available
      try {
        // Check if the setting already exists
        const { data: existingData } = await supabase
          .from("settings")
          .select("*")
          .eq("key", "footer_text")
          .single();

        if (existingData) {
          // Update existing setting
          const { error } = await supabase
            .from("settings")
            .update({ value: footerText })
            .eq("key", "footer_text");

          if (error) throw error;
        } else {
          // Insert new setting
          const { error } = await supabase.from("settings").insert([
            {
              key: "footer_text",
              value: footerText,
            },
          ]);

          if (error) throw error;
        }
      } catch (dbError) {
        // Silently fail if database table doesn't exist yet
        console.log("Saved to localStorage only");
      }

      toast({
        title: "Successo",
        description: "Impostazioni salvate con successo",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le impostazioni",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header />
      <div className="pt-[72px] px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Impostazioni</h1>
          </div>

          <Card className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow mb-8">
            <CardHeader>
              <CardTitle>Testo Footer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="footer-text">
                    Testo del footer (supporta HTML)
                  </Label>
                  <Textarea
                    id="footer-text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    rows={5}
                    placeholder="Inserisci il testo del footer"
                  />
                  <p className="text-sm text-gray-500">
                    Questo testo verrà visualizzato nel footer di tutte le
                    pagine.
                  </p>
                </div>

                <div className="pt-2">
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

          <Card className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow mb-8">
            <CardHeader>
              <CardTitle>Anteprima Footer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 border rounded-lg bg-gray-50">
                <div
                  className="text-sm text-gray-600"
                  dangerouslySetInnerHTML={{ __html: footerText }}
                />
              </div>
            </CardContent>
          </Card>

          <NotificationSettings />
        </div>
      </div>
    </div>
  );
};

export default Settings;
