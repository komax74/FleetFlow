import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./components/home";
import VehicleManagement from "./components/dashboard/VehicleManagement";
import UserManagement from "./components/dashboard/UserManagement";
import AccountSettings from "./components/dashboard/AccountSettings";
import MonthlyCalendar from "./components/dashboard/MonthlyCalendar";
import BookingCalendar from "./components/dashboard/BookingCalendar";
import MyBookings from "./components/dashboard/MyBookings";
import LoginForm from "./components/auth/LoginForm";
import RequireAdmin from "./components/auth/RequireAdmin";
import { useAuth } from "./lib/auth";

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen">
            <p>Loading...</p>
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/calendar" element={<MonthlyCalendar />} />
          <Route path="/booking" element={<BookingCalendar />} />
          <Route path="/book" element={<BookingCalendar />} />
          <Route path="/my-bookings" element={<MyBookings />} />
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
        </Routes>
      </Suspense>
    </div>
  );
}

function App() {
  return <AppRoutes />;
}

export default App;
