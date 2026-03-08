import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Song } from "@/components/library/SongCard";

export function useSongs(userId: string | undefined) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    const [songsRes, favsRes] = await Promise.all([
      supabase.from("songs").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("favorites").select("song_id").eq("user_id", userId),
    ]);
    if (songsRes.data) setSongs(songsRes.data as Song[]);
    if (favsRes.data) setFavorites(new Set(favsRes.data.map((f) => f.song_id)));
    setLoading(false);
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("library-songs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "songs", filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setSongs((prev) => prev.map((s) => (s.id === (payload.new as Song).id ? { ...s, ...(payload.new as Song) } : s)));
          } else if (payload.eventType === "INSERT") {
            setSongs((prev) => [payload.new as Song, ...prev]);
          } else if (payload.eventType === "DELETE") {
            setSongs((prev) => prev.filter((s) => s.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Fallback polling when realtime disconnected
  useEffect(() => {
    if (realtimeConnected || !userId) return;
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [realtimeConnected, userId, fetchData]);

  // Poll generating songs via edge function — use stable ref to avoid interval churn
  const songsRef = useRef(songs);
  songsRef.current = songs;

  const hasGenerating = songs.some((s) => s.status === "generating");
  useEffect(() => {
    if (!hasGenerating) return;
    const interval = setInterval(async () => {
      const generating = songsRef.current.filter((s) => s.status === "generating");
      if (generating.length === 0) return;
      await Promise.allSettled(
        generating.map((song) => supabase.functions.invoke("poll-suno-status", { body: { songId: song.id } }))
      );
    }, 10000);
    return () => clearInterval(interval);
  }, [hasGenerating]);

  const toggleFavorite = useCallback(
    async (songId: string) => {
      if (!userId) return;
      if (favorites.has(songId)) {
        await supabase.from("favorites").delete().eq("user_id", userId).eq("song_id", songId);
        setFavorites((prev) => {
          const n = new Set(prev);
          n.delete(songId);
          return n;
        });
      } else {
        await supabase.from("favorites").insert({ user_id: userId, song_id: songId });
        setFavorites((prev) => new Set(prev).add(songId));
      }
    },
    [userId, favorites]
  );

  return { songs, favorites, loading, toggleFavorite, realtimeConnected };
}
