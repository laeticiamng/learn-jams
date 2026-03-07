import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Music, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useSongs } from "@/hooks/useSongs";
import { SongCard } from "@/components/library/SongCard";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export default function Library() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { songs, favorites, loading, toggleFavorite } = useSongs(user?.id);

  const filtered = songs.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.subject?.toLowerCase().includes(search.toLowerCase())
  );

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
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-12"
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

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="relative mb-10"
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
              <Music className="w-14 h-14 text-muted-foreground/40" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-semibold mb-2">{t("library.no_songs_title")}</h3>
              <p className="text-muted-foreground text-lg">{t("library.no_songs_text")}</p>
            </div>
            <Button
              className="gradient-bg-premium rounded-xl h-12 px-10 shadow-lg shadow-primary/20"
              onClick={() => navigate("/create")}
            >
              {t("library.create_song")}
            </Button>
          </motion.div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
            {filtered.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                isFavorite={favorites.has(song.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
