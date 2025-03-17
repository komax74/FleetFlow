import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const NotificationSystem = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Load notifications from localStorage first
    const storedNotifications = localStorage.getItem(
      `notifications_${user.id}`,
    );
    if (storedNotifications) {
      try {
        const parsedNotifications = JSON.parse(storedNotifications);
        setNotifications(parsedNotifications);
        setUnreadCount(parsedNotifications.filter((n) => !n.read).length);
      } catch (parseError) {
        console.error("Error parsing stored notifications:", parseError);
        // If there's an error parsing, clear the corrupted data
        localStorage.removeItem(`notifications_${user.id}`);
      }
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
          setUnreadCount(data.filter((n) => !n.read).length);
          try {
            localStorage.setItem(
              `notifications_${user.id}`,
              JSON.stringify(data),
            );
          } catch (storageError) {
            console.error(
              "Error storing notifications in localStorage:",
              storageError,
            );
          }
        }
      } catch (error) {
        console.log("Using local notifications only:", error.message);
      }
    };

    // Initial fetch
    fetchNotifications();

    // Set up polling instead of realtime subscription
    const pollingInterval = setInterval(() => {
      fetchNotifications();
    }, 10000); // Poll every 10 seconds

    return () => {
      clearInterval(pollingInterval);
    };
  }, [user]);

  const markAsRead = async (notificationId) => {
    // Update locally first
    const updatedNotifications = notifications.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n,
    );

    setNotifications(updatedNotifications);
    setUnreadCount(updatedNotifications.filter((n) => !n.read).length);
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
    setUnreadCount(0);
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

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    // Store the notification ID in localStorage to open it on the notifications page
    localStorage.setItem("open_notification_id", notification.id);
    window.location.href = "/notifications";
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifiche</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={markAllAsRead}
            >
              Segna tutte come lette
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="py-4 px-2 text-center">
            <p className="text-sm text-gray-500 mb-3">Nessuna notifica</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = "/notifications")}
              className="flex items-center gap-2 mx-auto text-xs"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
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
        ) : (
          <div>
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.slice(0, 5).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex flex-col items-start p-3 cursor-pointer ${!notification.read ? "bg-blue-50" : ""}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex w-full">
                    <div className="mr-2 text-lg">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {notification.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2 overflow-hidden max-h-8">
                        {notification.message
                          .replace(/<[^>]*>/g, "")
                          .substring(0, 100)}
                        ...
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {format(
                          new Date(notification.created_at),
                          "dd MMM, HH:mm",
                          { locale: it },
                        )}
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="h-2 w-2 bg-blue-500 rounded-full self-start mt-1"></div>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
            <div className="sticky bottom-0 bg-white border-t py-2">
              <DropdownMenuItem
                className="w-full text-center text-sm text-blue-500 hover:text-blue-700 flex items-center justify-center gap-2"
                onClick={() => (window.location.href = "/notifications")}
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
              </DropdownMenuItem>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationSystem;
