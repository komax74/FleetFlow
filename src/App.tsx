import { Suspense, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./components/home";
import VehicleManagement from "./components/dashboard/VehicleManagement";
import UserManagement from "./components/dashboard/UserManagement";
import AccountSettings from "./components/dashboard/AccountSettings";
import MonthlyCalendar from "./components/dashboard/MonthlyCalendar";
import BookingCalendar from "./components/dashboard/BookingCalendar";
import MyBookings from "./components/dashboard/MyBookings";
import BookingHistory from "./components/dashboard/BookingHistory";
import Settings from "./components/dashboard/Settings";
import LoginForm from "./components/auth/LoginForm";
import RequireAdmin from "./components/auth/RequireAdmin";
import Footer from "./components/Footer";
import NotificationPage from "./components/notifications/NotificationPage.jsx";
import SendNotifications from "./components/notifications/SendNotifications.jsx";
import NotificationDebugPage from "./components/notifications/NotificationDebugPage";
import NotificationTestGuide from "./components/notifications/NotificationTestGuide";
import EmailConfigGuide from "./components/notifications/EmailConfigGuide";
import BrowserNotificationTest from "./components/notifications/BrowserNotificationTest";
import SafariGuide from "./components/notifications/SafariGuide";
import NotificationPermission from "./components/notifications/NotificationPermission";
import { useAuth } from "./lib/auth";
import {
  requestNotificationPermission,
  onMessageListener,
} from "./lib/firebase";
import { useToast } from "./components/ui/use-toast";

function AppRoutes() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      // Configura il listener per i messaggi in primo piano
      const unsubscribe = onMessageListener();

      // Controlla se è un nuovo login (dopo logout)
      const lastLoginTime = localStorage.getItem("last_login_time");
      const currentTime = new Date().getTime();
      localStorage.setItem("last_login_time", currentTime.toString());

      // Forza sempre la rimozione del flag per mostrare il popup di notifiche
      localStorage.removeItem("notifications_ignored");

      // Se è passato più di un'ora dall'ultimo login o è il primo login
      const isNewLogin =
        !lastLoginTime || currentTime - parseInt(lastLoginTime) > 3600000;

      // Se è un nuovo login e l'utente non ha ancora deciso sulle notifiche
      if (
        isNewLogin &&
        "Notification" in window &&
        Notification.permission === "default"
      ) {
        // Rimuoviamo il flag di notifiche ignorate per mostrare nuovamente il popup
        localStorage.removeItem("notifications_ignored");

        // Forza il reset dello stato delle notifiche per mostrare il popup
        if ("Notification" in window) {
          console.log("Forzando la visualizzazione del popup di notifiche");
        }
      }

      return () => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      };
    }
  }, [user]);

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen">
            <p>Loading...</p>
          </div>
        }
      >
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/calendar" element={<MonthlyCalendar />} />
            <Route path="/booking" element={<BookingCalendar />} />
            <Route path="/book" element={<BookingCalendar />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/booking-history" element={<BookingHistory />} />
            <Route path="/notifications" element={<NotificationPage />} />
            <Route path="/notifications/send" element={<SendNotifications />} />
            <Route
              path="/notifications/debug"
              element={<NotificationDebugPage />}
            />
            <Route
              path="/notifications/guide"
              element={<NotificationTestGuide />}
            />
            <Route
              path="/notifications/email-config"
              element={<EmailConfigGuide />}
            />
            <Route
              path="/notifications/browser-test"
              element={<BrowserNotificationTest />}
            />
            <Route
              path="/notifications/safari-guide"
              element={<SafariGuide />}
            />
            <Route
              path="/fleet-management"
              element={
                <RequireAdmin>
                  <VehicleManagement />
                </RequireAdmin>
              }
            />
            <Route path="/account" element={<AccountSettings />} />
            <Route
              path="/user-management"
              element={
                <RequireAdmin>
                  <UserManagement />
                </RequireAdmin>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAdmin>
                  <Settings />
                </RequireAdmin>
              }
            />
          </Routes>
        </div>
        <Footer />
        <NotificationPermission />
      </Suspense>
    </div>
  );
}

function App() {
  return <AppRoutes />;
}

export default App;
