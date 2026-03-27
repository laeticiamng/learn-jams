// ============================================================
// AdminRoute — Route guard that requires admin role.
// Uses server-side user_roles table check (not user_metadata).
// ============================================================

import { Navigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import ProtectedRoute from "./ProtectedRoute";
import PageLoadingFallback from "@/components/PageLoadingFallback";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminGate>{children}</AdminGate>
    </ProtectedRoute>
  );
}

function AdminGate({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useIsAdmin();

  if (loading) return <PageLoadingFallback />;

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
