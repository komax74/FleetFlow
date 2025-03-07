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
import LoginForm from "./components/auth/LoginForm";
import RequireAdmin from "./components/auth/RequireAdmin";
import Footer from "./components/Footer";
import NotificationPage from "./components/notifications/NotificationPage.jsx";
import SendNotifications from "./components/notifications/SendNotifications.jsx";
import { useAuth } from "./lib/auth";

function AppRoutes() {
  const { user } = useAuth();

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
      </Suspense>
    </div>
  );
}

function App() {
  return <AppRoutes />;
}

export default App;
