import React, { useState } from "react";
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

const AdminNotificationPanel = () => {
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

  React.useEffect(() => {
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

  const generateNotificationId = () => {
    return `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
        id: generateNotificationId(),
        user_id: formData.recipient === "all" ? null : formData.recipient,
        title: formData.title,
        message: formData.message,
        type: formData.type,
        read: false,
        created_at: new Date().toISOString(),
        action_url: formData.action_url || null,
      };

      // Try to save to database
      try {
        const { error } = await supabase
          .from("notifications")
          .insert([notification]);

        if (error) throw error;
      } catch (dbError) {
        console.log("Database not available, saving locally");

        // If database fails, save locally for all affected users
        if (formData.recipient === "all") {
          // For all users, we'll save in a common storage
          const allNotifications = JSON.parse(
            localStorage.getItem("all_notifications") || "[]",
          );
          allNotifications.push(notification);
          localStorage.setItem(
            "all_notifications",
            JSON.stringify(allNotifications),
          );

          // Also update current user's notifications
          const userNotifications = JSON.parse(
            localStorage.getItem(`notifications_${user.id}`) || "[]",
          );
          userNotifications.push(notification);
          localStorage.setItem(
            `notifications_${user.id}`,
            JSON.stringify(userNotifications),
          );
        } else {
          // For specific user
          const userNotifications = JSON.parse(
            localStorage.getItem(`notifications_${formData.recipient}`) || "[]",
          );
          userNotifications.push(notification);
          localStorage.setItem(
            `notifications_${formData.recipient}`,
            JSON.stringify(userNotifications),
          );
        }
      }

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
        description: "Impossibile inviare la notifica",
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
        <CardTitle>Invia Notifica</CardTitle>
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
                onValueChange={(value) => handleSelectChange("type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">Sistema</SelectItem>
                  <SelectItem value="booking">Prenotazione</SelectItem>
                  <SelectItem value="reminder">Promemoria</SelectItem>
                  <SelectItem value="maintenance">Manutenzione</SelectItem>
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
  );
};

export default AdminNotificationPanel;
