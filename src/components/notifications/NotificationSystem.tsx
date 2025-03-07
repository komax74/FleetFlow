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

interface Notification {
  id: string;
  user_id: string | null; // null means for all users
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  action_url?: string;
}

export const NotificationSystem = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Load notifications from localStorage first
    const storedNotifications = localStorage.getItem(
      `notifications_${user.id}`,
    );
    if (storedNotifications) {
      const parsedNotifications = JSON.parse(storedNotifications);
      setNotifications(parsedNotifications);
      setUnreadCount(
        parsedNotifications.filter((n: Notification) => !n.read).length,
      );
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
          <div className="py-4 px-2 text-center text-sm text-gray-500">
            Nessuna notifica
          </div>
        ) : (
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
                    <div className="text-xs text-gray-500 mt-1">
                      {notification.message}
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

            {notifications.length > 5 && (
              <DropdownMenuItem className="w-full text-center text-sm text-blue-500 hover:text-blue-700">
                Vedi tutte le notifiche
              </DropdownMenuItem>
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationSystem;
