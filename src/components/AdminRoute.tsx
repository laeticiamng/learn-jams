// ============================================================
// AdminRoute — Route guard that requires admin role.
// Wraps ProtectedRoute (auth check) + admin metadata check.
// ============================================================

import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isAdmin } from "@/security/roles";
import ProtectedRoute from "./ProtectedRoute";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminGate>{children}</AdminGate>
    </ProtectedRoute>
  );
}

function AdminGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!isAdmin(user?.user_metadata)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
