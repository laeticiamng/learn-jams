import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Music, Loader2, Heart, ListMusic, Grid3X3, Clock, Filter } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useSongs } from "@/hooks/useSongs";
import { SongCard } from "@/components/library/SongCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type FilterTab = "all" | "favorites" | "recent" | "generating";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

export default function Library() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const { songs, favorites, loading, toggleFavorite } = useSongs(user?.id);
  const { i18n } = useTranslation();

  const handleRetry = useCallback(async (songId: string) => {
    const song = songs.find(s => s.id === songId);
    if (!song || !user) return;
    try {
      await supabase.from("songs").update({ status: "generating" }).eq("id", songId);
      const { error } = await supabase.functions.invoke("generate-music", {
        body: { songId: song.id, lyrics: song.generated_lyrics || "", style: song.style, title: song.title, language: i18n.language },
      });
      if (error) throw error;
      toast.success(t("library.retry_started", "Generation restarted"));
    } catch (err: any) {
      toast.error(err.message || "Retry failed");
    }
  }, [songs, user, i18n.language, t]);

  const tabs: { key: FilterTab; label: string; icon: typeof ListMusic; count: number }[] = useMemo(() => [
    { key: "all", label: t("library.tab_all", "All"), icon: ListMusic, count: songs.length },
    { key: "favorites", label: t("library.tab_favorites", "Favorites"), icon: Heart, count: songs.filter(s => favorites.has(s.id)).length },
    { key: "recent", label: t("library.tab_recent", "Recent"), icon: Clock, count: songs.filter(s => Date.now() - new Date(s.created_at).getTime() < 7 * 86400000).length },
    { key: "generating", label: t("library.tab_generating", "In Progress"), icon: Loader2, count: songs.filter(s => s.status === "generating" || s.status === "pending").length },
  ], [songs, favorites, t]);

  const filtered = useMemo(() => {
    let result = songs;

    // Tab filter
    switch (activeTab) {
      case "favorites": result = result.filter(s => favorites.has(s.id)); break;
      case "recent": result = result.filter(s => Date.now() - new Date(s.created_at).getTime() < 7 * 86400000); break;
      case "generating": result = result.filter(s => s.status === "generating" || s.status === "pending"); break;
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => s.title.toLowerCase().includes(q) || s.subject?.toLowerCase().includes(q) || s.style.toLowerCase().includes(q));
    }

    return result;
  }, [songs, favorites, search, activeTab]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-mesh)" }} />
      <div className="fixed top-0 left-1/3 w-[600px] h-[400px] pointer-events-none ambient-orb" style={{ background: "hsl(265, 90%, 60%)" }} />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[300px] pointer-events-none ambient-orb" style={{ background: "hsl(215, 80%, 55%)", animationDelay: "4s" }} />
      <Navbar />

      <div className="container mx-auto pt-28 pb-16 px-4 max-w-4xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              {t("library.title")}
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              {t(songs.length !== 1 ? "library.songs_count_plural" : "library.songs_count", { count: songs.length })}
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              className="gradient-bg-premium gap-2 rounded-xl h-12 px-7 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 shrink-0"
              onClick={() => navigate("/create")}
            >
              <Plus className="w-4 h-4" /> {t("library.new_song")}
            </Button>
          </motion.div>
        </motion.div>

        {/* Filter tabs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.5 }}
          className="flex gap-1 mb-6 overflow-x-auto scrollbar-none pb-1"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.key === "generating" && !isActive ? "animate-spin" : ""}`} />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-mono tabular-nums ${
                    isActive ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="relative mb-8"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("library.search")}
            className="pl-11 bg-muted/20 border-border/20 h-12 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Loader2 className="w-8 h-8 text-primary" />
            </motion.div>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.7 }}
            className="text-center py-24 space-y-8"
          >
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mx-auto border border-border/20">
              {activeTab === "favorites" ? (
                <Heart className="w-14 h-14 text-muted-foreground/40" />
              ) : (
                <Music className="w-14 h-14 text-muted-foreground/40" />
              )}
            </div>
            <div>
              <h3 className="font-display text-2xl font-semibold mb-2">
                {activeTab === "favorites"
                  ? t("library.no_favorites_title", "No favorites yet")
                  : activeTab === "generating"
                  ? t("library.no_generating_title", "No songs in progress")
                  : t("library.no_songs_title")}
              </h3>
              <p className="text-muted-foreground text-lg">
                {activeTab === "favorites"
                  ? t("library.no_favorites_text", "Heart a song to add it here")
                  : activeTab === "generating"
                  ? t("library.no_generating_text", "Create a new song to get started")
                  : search
                  ? t("library.no_results_text", "Try a different search")
                  : t("library.no_songs_text")}
              </p>
            </div>
            {activeTab === "all" && !search && (
              <Button
                className="gradient-bg-premium rounded-xl h-12 px-10 shadow-lg shadow-primary/20"
                onClick={() => navigate("/create")}
              >
                {t("library.create_song")}
              </Button>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + search}
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {filtered.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  isFavorite={favorites.has(song.id)}
                  onToggleFavorite={toggleFavorite}
                  onRetry={handleRetry}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
