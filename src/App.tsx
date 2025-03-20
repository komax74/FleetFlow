import { Suspense } from "react";
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
import MapboxMap from "./components/dashboard/MapboxMap";
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

function App() {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  // If still loading, show loading indicator
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

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
            <Route path="/map" element={<MapboxMap />} />
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

export default App;
