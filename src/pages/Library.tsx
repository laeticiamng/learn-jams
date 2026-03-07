import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Play, Heart, Search, Plus, Music, Clock, Loader2, Brain, Wifi, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Song {
  id: string; title: string; style: string; subject: string | null;
  status: string; audio_url: string | null; duration: number | null;
  created_at: string; is_final_quality?: boolean;
}

export default function Library() {
  const { t } = useTranslation();
  const [songs, setSongs] = useState<Song[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [songsRes, favsRes] = await Promise.all([
      supabase.from("songs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("favorites").select("song_id").eq("user_id", user.id),
    ]);
    if (songsRes.data) setSongs(songsRes.data as Song[]);
    if (favsRes.data) setFavorites(new Set(favsRes.data.map(f => f.song_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime subscription for song updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('library-songs')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'songs',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setSongs(prev => prev.map(s => s.id === (payload.new as Song).id ? { ...s, ...payload.new as Song } : s));
        } else if (payload.eventType === 'INSERT') {
          setSongs(prev => [payload.new as Song, ...prev]);
        } else if (payload.eventType === 'DELETE') {
          setSongs(prev => prev.filter(s => s.id !== (payload.old as { id: string }).id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Poll Suno API as fallback for songs stuck in "generating"
  useEffect(() => {
    const generatingSongs = songs.filter(s => s.status === "generating");
    if (generatingSongs.length === 0) return;

    const pollAndRefresh = async () => {
      await Promise.allSettled(
        generatingSongs.map(song =>
          supabase.functions.invoke("poll-suno-status", { body: { songId: song.id } })
        )
      );
    };

    const interval = setInterval(pollAndRefresh, 10000);
    return () => clearInterval(interval);
  }, [songs]);

  const toggleFavorite = async (songId: string) => {
    if (!user) return;
    if (favorites.has(songId)) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("song_id", songId);
      setFavorites(prev => { const n = new Set(prev); n.delete(songId); return n; });
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, song_id: songId });
      setFavorites(prev => new Set(prev).add(songId));
    }
  };

  const filtered = songs.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) || (s.subject?.toLowerCase().includes(search.toLowerCase()))
  );

  const styleColors: Record<string, string> = {
    rap: "bg-red-500/20 text-red-400", lofi: "bg-indigo-500/20 text-indigo-400", pop: "bg-pink-500/20 text-pink-400",
    jazz: "bg-amber-500/20 text-amber-400", rock: "bg-red-600/20 text-red-400", "spoken-word": "bg-teal-500/20 text-teal-400",
    reggaeton: "bg-green-500/20 text-green-400", classique: "bg-violet-500/20 text-violet-400",
  };

  const getStatusInfo = (song: Song) => {
    if (song.status === "generating") return { label: t("library.generating_status"), icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, color: "text-amber-400" };
    if (song.status === "error") return { label: t("library.error_status"), icon: null, color: "text-destructive" };
    if (song.status === "pending") return { label: t("library.pending_status"), icon: null, color: "text-muted-foreground" };
    if (song.status === "ready" && !song.is_final_quality) return { label: t("library.streaming_status", "Streaming"), icon: <Wifi className="w-3.5 h-3.5" />, color: "text-blue-400" };
    if (song.status === "ready" && song.is_final_quality) return { label: t("library.final_status", "HD"), icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-emerald-400" };
    return null;
  };

  // Estimate progress for generating songs based on time elapsed
  const getGeneratingProgress = (song: Song) => {
    if (song.status !== "generating") return null;
    const elapsed = (Date.now() - new Date(song.created_at).getTime()) / 1000;
    // Typical: ~40s for streaming, ~180s for complete
    return Math.min(95, Math.round((elapsed / 45) * 100));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto pt-24 pb-12 px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">{t("library.title")}</h1>
            <p className="text-muted-foreground">{t(songs.length !== 1 ? "library.songs_count_plural" : "library.songs_count", { count: songs.length })}</p>
          </div>
          <Button className="gradient-bg gap-2" onClick={() => navigate("/create")}>
            <Plus className="w-4 h-4" /> {t("library.new_song")}
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t("library.search")} className="pl-10 bg-muted/50" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto"><Music className="w-10 h-10 text-muted-foreground" /></div>
            <h3 className="font-display text-xl font-semibold">{t("library.no_songs_title")}</h3>
            <p className="text-muted-foreground">{t("library.no_songs_text")}</p>
            <Button className="gradient-bg" onClick={() => navigate("/create")}>{t("library.create_song")}</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((song, i) => {
              const statusInfo = getStatusInfo(song);
              const isClickable = song.status === "ready";
              const genProgress = getGeneratingProgress(song);
              return (
                <motion.div key={song.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className={`glass-card p-4 flex flex-col gap-2 transition-all ${isClickable ? "hover:border-primary/30 cursor-pointer" : "opacity-80"} group`}
                  onClick={() => isClickable && navigate(`/player/${song.id}`)}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg gradient-bg flex items-center justify-center shrink-0 relative">
                      {song.status === "generating" ? (
                        <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
                      ) : (
                        <Play className="w-5 h-5 text-primary-foreground group-hover:scale-110 transition-transform" />
                      )}
                      {/* Streaming indicator dot */}
                      {song.status === "ready" && !song.is_final_quality && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-400 animate-pulse border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{song.title}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${styleColors[song.style] || "bg-muted text-muted-foreground"}`}>{song.style}</span>
                        {song.subject && <span className="text-xs text-muted-foreground">{song.subject}</span>}
                        {statusInfo && (
                          <span className={`text-xs flex items-center gap-1 ${statusInfo.color}`}>
                            {statusInfo.icon}
                            {statusInfo.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      {song.duration && <span className="text-sm flex items-center gap-1"><Clock className="w-3 h-3" />{Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, "0")}</span>}
                      {song.status === "ready" && (
                        <Tooltip><TooltipTrigger asChild>
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/quiz/${song.id}`); }} className="hover:text-primary transition-colors"><Brain className="w-5 h-5" /></button>
                        </TooltipTrigger><TooltipContent>{t("library.quiz_tooltip")}</TooltipContent></Tooltip>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(song.id); }} className="hover:text-primary transition-colors">
                        <Heart className={`w-5 h-5 ${favorites.has(song.id) ? "fill-primary text-primary" : ""}`} />
                      </button>
                    </div>
                  </div>
                  {/* Progress bar for generating songs */}
                  {genProgress !== null && (
                    <div className="pl-16 pr-2">
                      <Progress value={genProgress} className="h-1.5" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {genProgress < 50 ? t("create.analyzing", "Analyse en cours…") : t("create.generating_music", "Génération de la musique…")}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
