import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import Header from "../dashboard/Header";

const SendNotifications = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "system",
    recipient: "all", // 'all' or specific user ID
    action_url: "",
  });

  useEffect(() => {
    if (profile?.role !== "admin") return;

    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email");

        if (error) throw error;

        if (data) {
          setUsers(data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const sendNotification = async () => {
    if (!formData.title || !formData.message) {
      toast({
        title: "Errore",
        description: "Titolo e messaggio sono obbligatori",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const notification = {
        user_id: formData.recipient === "all" ? null : formData.recipient,
        title: formData.title,
        message: formData.message,
        type: formData.type,
        read: false,
        created_at: new Date().toISOString(),
        action_url: formData.action_url || null,
      };

      const { error } = await supabase
        .from("notifications")
        .insert([notification]);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Notifica inviata con successo",
      });

      // Reset form
      setFormData({
        title: "",
        message: "",
        type: "system",
        recipient: "all",
        action_url: "",
      });
    } catch (error) {
      console.error("Error sending notification:", error);
      toast({
        title: "Errore",
        description: "Impossibile inviare la notifica: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== "admin") {
    return (
      <div>
        <Header />
        <div className="pt-[72px] px-6">
          <div className="max-w-[1400px] mx-auto">
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Non hai i permessi per accedere a questa pagina
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="pt-[72px] px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Invia Notifiche</h1>
          </div>

          <Card className="bg-white rounded-[20px] overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow mb-8">
            <CardHeader>
              <CardTitle>Crea Nuova Notifica</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Titolo</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Inserisci il titolo della notifica"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="message">Messaggio</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Inserisci il messaggio della notifica"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        handleSelectChange("type", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">Sistema</SelectItem>
                        <SelectItem value="booking">Prenotazione</SelectItem>
                        <SelectItem value="reminder">Promemoria</SelectItem>
                        <SelectItem value="maintenance">
                          Manutenzione
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="recipient">Destinatario</Label>
                    <Select
                      value={formData.recipient}
                      onValueChange={(value) =>
                        handleSelectChange("recipient", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona destinatario" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti gli utenti</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="action_url">URL Azione (opzionale)</Label>
                  <Input
                    id="action_url"
                    name="action_url"
                    value={formData.action_url}
                    onChange={handleChange}
                    placeholder="es. /booking?vehicle=123"
                  />
                  <p className="text-sm text-gray-500">
                    Se specificato, cliccando sulla notifica l'utente verrà
                    reindirizzato a questo URL
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={sendNotification}
                    disabled={loading}
                    className="bg-black hover:bg-gray-800 text-white"
                  >
                    {loading ? "Invio in corso..." : "Invia Notifica"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SendNotifications;
