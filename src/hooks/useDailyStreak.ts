import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
}

export function useDailyStreak() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakData>({ current_streak: 0, longest_streak: 0, last_active_date: null });
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().slice(0, 10);

  const refreshStreak = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("daily_streaks")
        .select("current_streak, longest_streak, last_active_date")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data) {
        // First visit ever — create streak
        const newRow = { user_id: user.id, current_streak: 1, longest_streak: 1, last_active_date: todayStr };
        await supabase.from("daily_streaks").insert(newRow as Record<string, unknown>);
        setStreak({ current_streak: 1, longest_streak: 1, last_active_date: todayStr });
      } else if (data.last_active_date === todayStr) {
        // Already checked in today
        setStreak(data as StreakData);
      } else {
        const lastDate = new Date(data.last_active_date!);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const isConsecutive = lastDate.toISOString().slice(0, 10) === yesterday.toISOString().slice(0, 10);

        const newStreak = isConsecutive ? data.current_streak + 1 : 1;
        const newLongest = Math.max(data.longest_streak, newStreak);

        await supabase
          .from("daily_streaks")
          .update({ current_streak: newStreak, longest_streak: newLongest, last_active_date: todayStr } as Record<string, unknown>)
          .eq("user_id", user.id);

        setStreak({ current_streak: newStreak, longest_streak: newLongest, last_active_date: todayStr });
      }
    } catch (err) {
      console.error("[DailyStreak] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, todayStr]);

  useEffect(() => {
    refreshStreak();
  }, [refreshStreak]);

  return { ...streak, loading };
}
