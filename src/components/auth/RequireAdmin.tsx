import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export default function RequireAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = useAuth();

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
