import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "../dashboard/Header";

const NotificationPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");

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

          // Check if there's a notification to open
          const openNotificationId = localStorage.getItem(
            "open_notification_id",
          );
          if (openNotificationId) {
            const notificationToOpen = data.find(
              (n) => n.id === openNotificationId,
            );
            if (notificationToOpen) {
              setSelectedNotification(notificationToOpen);
              // Clear the stored ID after opening
              localStorage.removeItem("open_notification_id");
            }
          }
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

  const markAsRead = async (notificationId) => {
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

  const [selectedNotification, setSelectedNotification] = useState(null);

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    setSelectedNotification(notification);
  };

  const getNotificationIcon = (type) => {
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
          <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
            <h1 className="text-3xl font-bold">Notifiche</h1>

            {/* Desktop filters */}
            <div className="hidden md:flex gap-2">
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

            {/* Mobile filter dropdown */}
            <div className="md:hidden">
              <div className="relative inline-block w-full">
                <select
                  className="appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">Tutte le notifiche</option>
                  <option value="unread">Non lette</option>
                  <option value="booking">Prenotazioni</option>
                  <option value="maintenance">Manutenzione</option>
                  <option value="reminder">Promemoria</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg
                    className="fill-current h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0">
              {notifications.some((n) => !n.read) && (
                <Button onClick={markAllAsRead}>Segna tutte come lette</Button>
              )}
            </div>
          </div>

          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <div className="flex flex-col items-center justify-center">
                  <div className="text-6xl mb-4">📬</div>
                  <h3 className="text-xl font-medium mb-2">
                    Nessuna notifica trovata
                  </h3>
                  <p className="mb-4">
                    Non hai notifiche da visualizzare al momento
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = "/notifications")}
                    className="flex items-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    Visualizza tutte le notifiche
                  </Button>
                </div>
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

          {/* Notification Detail Dialog */}
          {selectedNotification && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedNotification(null)}
            >
              <Card
                className="w-[90%] md:w-[600px] max-w-[800px] min-w-[300px] mx-auto shadow-xl bg-white rounded-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <CardContent className="p-6 md:p-8 relative">
                  <button
                    className="absolute top-6 right-6 text-gray-500 hover:text-gray-800 transition-colors"
                    onClick={() => setSelectedNotification(null)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>

                  <div className="flex items-start mb-6 pr-8">
                    <div className="mr-4 text-4xl">
                      {getNotificationIcon(selectedNotification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold">
                          {selectedNotification.title}
                        </h2>
                        <Badge variant="secondary">
                          {selectedNotification.type === "booking"
                            ? "Prenotazione"
                            : selectedNotification.type === "reminder"
                              ? "Promemoria"
                              : selectedNotification.type === "maintenance"
                                ? "Manutenzione"
                                : "Sistema"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {format(
                          new Date(selectedNotification.created_at),
                          "dd MMMM yyyy, HH:mm",
                          { locale: it },
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div
                      className="text-gray-800"
                      dangerouslySetInnerHTML={{
                        __html: selectedNotification.message,
                      }}
                    ></div>
                  </div>

                  {selectedNotification.action_url && (
                    <div className="mt-8 flex justify-end">
                      <Button
                        onClick={() =>
                          (window.location.href =
                            selectedNotification.action_url)
                        }
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        Vai al link
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPage;
