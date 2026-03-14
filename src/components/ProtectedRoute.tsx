import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (!loading && !user && !hasShownToast.current) {
      hasShownToast.current = true;
      toast.info(t("auth.login_required", "Connecte-toi pour acceder a cette page."));
    }
  }, [loading, user, t]);

  // Reset toast guard when user logs in (so it can fire again if they log out)
  useEffect(() => {
    if (user) {
      hasShownToast.current = false;
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}
