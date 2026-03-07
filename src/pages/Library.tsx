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
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
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
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
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
