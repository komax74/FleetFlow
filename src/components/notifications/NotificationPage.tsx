import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "../dashboard/Header";

interface Notification {
  id: string;
  user_id: string | null; // null means for all users
  title: string;
  message: string;
  type: "system" | "booking" | "reminder" | "maintenance";
  read: boolean;
  created_at: string;
  action_url?: string;
}

const NotificationPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;

    // Load notifications from localStorage first
    const storedNotifications = localStorage.getItem(
      `notifications_${user.id}`,
    );
    if (storedNotifications) {
      const parsedNotifications = JSON.parse(storedNotifications);
      setNotifications(parsedNotifications);
    }

    // Try to fetch from database if available
    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .or(`user_id.eq.${user.id},user_id.is.null`)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data) {
          setNotifications(data);
          localStorage.setItem(
            `notifications_${user.id}`,
            JSON.stringify(data),
          );
        }
      } catch (error) {
        console.log("Using local notifications only");
      }
    };

    fetchNotifications();

    // Set up subscription for real-time updates if available
    try {
      const subscription = supabase
        .channel("notifications_channel")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications" },
          (payload) => {
            fetchNotifications();
          },
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.log("Real-time updates not available");
    }
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    // Update locally first
    const updatedNotifications = notifications.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n,
    );

    setNotifications(updatedNotifications);
    localStorage.setItem(
      `notifications_${user.id}`,
      JSON.stringify(updatedNotifications),
    );

    // Try to update in database
    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);
    } catch (error) {
      console.log("Updated notification locally only");
    }
  };

  const markAllAsRead = async () => {
    // Update locally first
    const updatedNotifications = notifications.map((n) => ({
      ...n,
      read: true,
    }));

    setNotifications(updatedNotifications);
    localStorage.setItem(
      `notifications_${user.id}`,
      JSON.stringify(updatedNotifications),
    );

    // Try to update in database
    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .or(`user_id.eq.${user.id},user_id.is.null`);
    } catch (error) {
      console.log("Updated notifications locally only");
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "booking":
        return "🚗";
      case "reminder":
        return "⏰";
      case "maintenance":
        return "🔧";
      default:
        return "📢";
    }
  };

  const filteredNotifications =
    filter === "all"
      ? notifications
      : filter === "unread"
        ? notifications.filter((n) => !n.read)
        : notifications.filter((n) => n.type === filter);

  return (
    <div>
      <Header />
      <div className="pt-[72px] px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Notifiche</h1>
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
              >
                Tutte
              </Button>
              <Button
                variant={filter === "unread" ? "default" : "outline"}
                onClick={() => setFilter("unread")}
              >
                Non lette
              </Button>
              <Button
                variant={filter === "booking" ? "default" : "outline"}
                onClick={() => setFilter("booking")}
              >
                Prenotazioni
              </Button>
              <Button
                variant={filter === "maintenance" ? "default" : "outline"}
                onClick={() => setFilter("maintenance")}
              >
                Manutenzione
              </Button>
              <Button
                variant={filter === "reminder" ? "default" : "outline"}
                onClick={() => setFilter("reminder")}
              >
                Promemoria
              </Button>
            </div>
            {notifications.some((n) => !n.read) && (
              <Button onClick={markAllAsRead}>Segna tutte come lette</Button>
            )}
          </div>

          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Nessuna notifica trovata
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${!notification.read ? "bg-blue-50" : ""}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex">
                      <div className="mr-4 text-2xl">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {notification.title}
                            </h3>
                            <p className="text-gray-600 mt-1">
                              {notification.message}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                notification.read ? "outline" : "default"
                              }
                            >
                              {notification.read ? "Letta" : "Non letta"}
                            </Badge>
                            <Badge variant="secondary">
                              {notification.type === "booking"
                                ? "Prenotazione"
                                : notification.type === "reminder"
                                  ? "Promemoria"
                                  : notification.type === "maintenance"
                                    ? "Manutenzione"
                                    : "Sistema"}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-400 mt-2">
                          {format(
                            new Date(notification.created_at),
                            "dd MMMM yyyy, HH:mm",
                            { locale: it },
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPage;
