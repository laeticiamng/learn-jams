import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

/**
 * Global listener: shows a toast when any song transitions to "ready".
 * Mount once in App.tsx.
 */
export default function SongReadyToast() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const knownReady = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    // Pre-populate known ready songs so we don't toast on initial load
    supabase
      .from("songs")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "ready")
      .then(({ data }) => {
        data?.forEach((s) => knownReady.current.add(s.id));
      });

    const channel = supabase
      .channel("song-ready-toast")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "songs",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const song = payload.new as { id: string; status: string; title: string };
          if (song.status === "ready" && !knownReady.current.has(song.id)) {
            knownReady.current.add(song.id);
            toast.success(
              t("library.song_ready_toast", "🎵 \"{{title}}\" est prête !", {
                title: song.title,
              }),
              {
                action: {
                  label: t("common.listen", "Écouter"),
                  onClick: () => navigate(`/player/${song.id}`),
                },
                duration: 8000,
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, t, navigate]);

  return null;
}
