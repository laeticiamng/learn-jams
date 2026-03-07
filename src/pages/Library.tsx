import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Heart, Search, Plus, Music, Clock, Loader2, Brain, Wifi, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Song {
  id: string; title: string; style: string; subject: string | null;
  status: string; audio_url: string | null; duration: number | null;
  created_at: string; is_final_quality?: boolean;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

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

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('library-songs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'songs', filter: `user_id=eq.${user.id}` }, (payload) => {
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

  useEffect(() => {
    const generatingSongs = songs.filter(s => s.status === "generating");
    if (generatingSongs.length === 0) return;
    const pollAndRefresh = async () => {
      await Promise.allSettled(
        generatingSongs.map(song => supabase.functions.invoke("poll-suno-status", { body: { songId: song.id } }))
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
    rap: "bg-red-500/15 text-red-400", lofi: "bg-indigo-500/15 text-indigo-400", pop: "bg-pink-500/15 text-pink-400",
    jazz: "bg-amber-500/15 text-amber-400", rock: "bg-red-600/15 text-red-400", "spoken-word": "bg-teal-500/15 text-teal-400",
    reggaeton: "bg-green-500/15 text-green-400", classique: "bg-violet-500/15 text-violet-400",
    techno: "bg-gray-500/15 text-gray-400", afrobeat: "bg-amber-500/15 text-amber-400",
  };

  const getStatusInfo = (song: Song) => {
    if (song.status === "generating") return { label: t("library.generating_status"), icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, color: "text-amber-400" };
    if (song.status === "error") return { label: t("library.error_status"), icon: null, color: "text-destructive" };
    if (song.status === "pending") return { label: t("library.pending_status"), icon: null, color: "text-muted-foreground" };
    if (song.status === "ready" && !song.is_final_quality) return { label: t("library.streaming_status", "Streaming"), icon: <Wifi className="w-3.5 h-3.5" />, color: "text-blue-400" };
    if (song.status === "ready" && song.is_final_quality) return { label: t("library.final_status", "HD"), icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-emerald-400" };
    return null;
  };

  const getGeneratingProgress = (song: Song) => {
    if (song.status !== "generating") return null;
    const elapsed = (Date.now() - new Date(song.created_at).getTime()) / 1000;
    return Math.min(95, Math.round((elapsed / 45) * 100));
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-mesh)" }} />
      <Navbar />

      <div className="container mx-auto pt-28 pb-16 px-4 max-w-4xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10"
        >
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">{t("library.title")}</h1>
            <p className="text-muted-foreground mt-1 text-lg">
              {t(songs.length !== 1 ? "library.songs_count_plural" : "library.songs_count", { count: songs.length })}
            </p>
          </div>
          <Button
            className="gradient-bg gap-2 rounded-xl h-11 px-6 hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 shrink-0"
            onClick={() => navigate("/create")}
          >
            <Plus className="w-4 h-4" /> {t("library.new_song")}
          </Button>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="relative mb-8"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("library.search")}
            className="pl-11 bg-muted/30 border-border/30 h-12 rounded-xl focus:ring-2 focus:ring-primary/30 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-8 h-8 text-primary" />
            </motion.div>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center py-24 space-y-6"
          >
            <div className="w-24 h-24 rounded-3xl bg-muted/40 flex items-center justify-center mx-auto">
              <Music className="w-12 h-12 text-muted-foreground/60" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-semibold mb-2">{t("library.no_songs_title")}</h3>
              <p className="text-muted-foreground text-lg">{t("library.no_songs_text")}</p>
            </div>
            <Button
              className="gradient-bg rounded-xl h-11 px-8 hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
              onClick={() => navigate("/create")}
            >
              {t("library.create_song")}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {filtered.map((song) => {
              const statusInfo = getStatusInfo(song);
              const isClickable = song.status === "ready";
              const genProgress = getGeneratingProgress(song);
              return (
                <motion.div
                  key={song.id}
                  variants={item}
                  layout
                  className={`glass-card p-5 flex flex-col gap-3 card-hover ${
                    isClickable ? "cursor-pointer" : "opacity-80"
                  } group`}
                  onClick={() => isClickable && navigate(`/player/${song.id}`)}
                >
                  <div className="flex items-center gap-4">
                    {/* Play icon */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 relative transition-all duration-300 ${
                      song.status === "generating"
                        ? "bg-muted/60"
                        : "gradient-bg group-hover:shadow-lg group-hover:shadow-primary/20 group-hover:scale-105"
                    }`}>
                      {song.status === "generating" ? (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      ) : (
                        <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                      )}
                      {song.status === "ready" && !song.is_final_quality && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-400 animate-pulse border-2 border-card" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-[15px] truncate group-hover:text-primary transition-colors duration-300">
                        {song.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${styleColors[song.style] || "bg-muted/60 text-muted-foreground"}`}>
                          {song.style}
                        </span>
                        {song.subject && (
                          <span className="text-xs text-muted-foreground">{song.subject}</span>
                        )}
                        {statusInfo && (
                          <span className={`text-xs flex items-center gap-1 font-medium ${statusInfo.color}`}>
                            {statusInfo.icon}
                            {statusInfo.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 text-muted-foreground">
                      {song.duration && (
                        <span className="text-sm flex items-center gap-1 tabular-nums">
                          <Clock className="w-3.5 h-3.5" />
                          {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, "0")}
                        </span>
                      )}
                      {song.status === "ready" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/quiz/${song.id}`); }}
                              className="hover:text-primary transition-colors duration-300 p-1"
                            >
                              <Brain className="w-5 h-5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{t("library.quiz_tooltip")}</TooltipContent>
                        </Tooltip>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(song.id); }}
                        className="hover:text-primary transition-all duration-300 p-1 hover:scale-110"
                      >
                        <Heart className={`w-5 h-5 transition-all duration-300 ${favorites.has(song.id) ? "fill-primary text-primary scale-110" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar for generating songs */}
                  {genProgress !== null && (
                    <div className="pl-[72px] pr-2">
                      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                        <motion.div
                          className="h-full gradient-bg rounded-full"
                          animate={{ width: `${genProgress}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {genProgress < 50 ? t("create.analyzing", "Analyse en cours…") : t("create.generating_music", "Génération de la musique…")}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
