// ============================================================
// useIsAdmin — Server-side admin role check via user_roles table
// SECURITY: Never trust client-side metadata for admin status.
// ============================================================

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Checks admin status by querying the user_roles table (server-side).
 * Returns { isAdmin, loading }.
 */
export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function checkAdmin() {
      try {
        const { data, error } = await supabase
          .from("user_roles" as any)
          .select("role")
          .eq("user_id", user!.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!cancelled) {
          setIsAdmin(!error && !!data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    }

    checkAdmin();
    return () => { cancelled = true; };
  }, [user?.id]);

  return { isAdmin, loading };
}
