import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Heart, Search, Plus, Music, Clock, Loader2, Brain } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Song {
  id: string;
  title: string;
  style: string;
  subject: string | null;
  status: string;
  audio_url: string | null;
  duration: number | null;
  created_at: string;
}

export default function Library() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [songsRes, favsRes] = await Promise.all([
        supabase.from("songs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("favorites").select("song_id").eq("user_id", user.id),
      ]);
      if (songsRes.data) setSongs(songsRes.data as Song[]);
      if (favsRes.data) setFavorites(new Set(favsRes.data.map(f => f.song_id)));
      setLoading(false);
    };
    fetchData();
  }, [user]);

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
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    (s.subject?.toLowerCase().includes(search.toLowerCase()))
  );

  const styleColors: Record<string, string> = {
    rap: "bg-red-500/20 text-red-400",
    lofi: "bg-indigo-500/20 text-indigo-400",
    pop: "bg-pink-500/20 text-pink-400",
    jazz: "bg-amber-500/20 text-amber-400",
    rock: "bg-red-600/20 text-red-400",
    "spoken-word": "bg-teal-500/20 text-teal-400",
    reggaeton: "bg-green-500/20 text-green-400",
    classique: "bg-violet-500/20 text-violet-400",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto pt-24 pb-12 px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">Ma bibliothèque 🎵</h1>
            <p className="text-muted-foreground">{songs.length} chanson{songs.length !== 1 ? "s" : ""}</p>
          </div>
          <Button className="gradient-bg gap-2" onClick={() => navigate("/create")}>
            <Plus className="w-4 h-4" /> Nouvelle chanson
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-10 bg-muted/50" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Music className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-display text-xl font-semibold">Aucune chanson</h3>
            <p className="text-muted-foreground">Crée ta première chanson pour commencer !</p>
            <Button className="gradient-bg" onClick={() => navigate("/create")}>Créer une chanson</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((song, i) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-4 flex items-center gap-4 hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => song.status === "ready" && navigate(`/player/${song.id}`)}
              >
                <div className="w-12 h-12 rounded-lg gradient-bg flex items-center justify-center shrink-0">
                  {song.status === "generating" ? (
                    <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
                  ) : (
                    <Play className="w-5 h-5 text-primary-foreground group-hover:scale-110 transition-transform" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{song.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${styleColors[song.style] || "bg-muted text-muted-foreground"}`}>
                      {song.style}
                    </span>
                    {song.subject && <span className="text-xs text-muted-foreground">{song.subject}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  {song.duration && (
                    <span className="text-sm flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, "0")}
                    </span>
                  )}
                  {song.status === "ready" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/quiz/${song.id}`); }}
                      className="hover:text-primary transition-colors"
                      title="Quiz"
                    >
                      <Brain className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(song.id); }}
                    className="hover:text-primary transition-colors"
                  >
                    <Heart className={`w-5 h-5 ${favorites.has(song.id) ? "fill-primary text-primary" : ""}`} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
