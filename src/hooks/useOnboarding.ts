// ============================================================
// useOnboarding — Detect if user needs onboarding
// ============================================================

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Returns { needsOnboarding, dismiss } when a user has just signed up
 * and hasn't set their profile yet.
 */
export function useOnboarding() {
  const { user } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setNeedsOnboarding(false);
      setChecked(true);
      return;
    }

    // Skip if already dismissed this session
    const dismissed = sessionStorage.getItem("onboarding_dismissed");
    if (dismissed === "true") {
      setNeedsOnboarding(false);
      setChecked(true);
      return;
    }

    let cancelled = false;

    async function check() {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("field_of_study, display_name")
          .eq("user_id", user!.id)
          .maybeSingle();

        if (!cancelled) {
          // User needs onboarding if they haven't set their field of study
          const hasProfile = data?.field_of_study && data.field_of_study.trim() !== "";
          setNeedsOnboarding(!hasProfile);
          setChecked(true);
        }
      } catch {
        if (!cancelled) {
          setNeedsOnboarding(false);
          setChecked(true);
        }
      }
    }

    check();
    return () => { cancelled = true; };
  }, [user?.id]);

  const dismiss = () => {
    setNeedsOnboarding(false);
    sessionStorage.setItem("onboarding_dismissed", "true");
  };

  return { needsOnboarding: checked && needsOnboarding, dismiss, userId: user?.id ?? "", defaultName: user?.user_metadata?.display_name };
}
