import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Heart, ArrowLeft, Volume2, Loader2, Brain, Music } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StudyNotes } from "@/components/player/StudyNotes";

interface Song { id: string; title: string; style: string; original_text: string; generated_lyrics: string | null; audio_url: string | null; duration: number | null; status: string; subject: string | null; lyrics_metadata: string | null; }

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const styleGradients: Record<string, string> = {
  rap: "from-red-500 to-orange-500",
  lofi: "from-indigo-500 to-purple-500",
  pop: "from-pink-500 to-rose-500",
  jazz: "from-amber-500 to-yellow-500",
  rock: "from-red-600 to-red-400",
  "spoken-word": "from-teal-500 to-cyan-500",
  reggaeton: "from-green-500 to-emerald-500",
  classique: "from-violet-500 to-purple-500",
  techno: "from-gray-400 to-zinc-500",
  afrobeat: "from-amber-500 to-red-500",
};

export default function Player() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [song, setSong] = useState<Song | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(true);

  const hasAudio = !!song?.audio_url;
  const gradient = song ? (styleGradients[song.style] || "from-primary to-secondary") : "from-primary to-secondary";

  useEffect(() => {
    if (!id || !user) return;
    const fetchSong = async () => {
      const { data } = await supabase.from("songs").select("*").eq("id", id).single();
      if (data) setSong(data as Song);
      const { data: favData } = await supabase.from("favorites").select("id").eq("user_id", user.id).eq("song_id", id);
      setIsFav((favData?.length ?? 0) > 0);
      setLoading(false);
    };
    fetchSong();
  }, [id, user]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    return () => { audio.removeEventListener("timeupdate", onTime); audio.removeEventListener("loadedmetadata", onLoaded); audio.removeEventListener("ended", onEnded); };
  }, [song]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume / 100; }, [volume]);

  const togglePlay = () => { if (!audioRef.current || !hasAudio) return; if (playing) audioRef.current.pause(); else audioRef.current.play(); setPlaying(!playing); };
  const seek = (val: number[]) => { if (audioRef.current) { audioRef.current.currentTime = val[0]; setCurrentTime(val[0]); } };
  const toggleFav = async () => {
    if (!user || !id) return;
    if (isFav) await supabase.from("favorites").delete().eq("user_id", user.id).eq("song_id", id);
    else await supabase.from("favorites").insert({ user_id: user.id, song_id: id });
    setIsFav(!isFav);
  };
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  const lyricsLines = song?.generated_lyrics?.split("\n").filter(Boolean) || [];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
        <Loader2 className="w-8 h-8 text-primary" />
      </motion.div>
    </div>
  );

  if (!song) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
        <p className="text-muted-foreground">{t("player.not_found")}</p>
        <Button onClick={() => navigate("/library")} className="rounded-xl">{t("common.back")}</Button>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Immersive ambient background */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-mesh)" }} />
      <div className={`fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none ambient-orb bg-gradient-to-b ${gradient}`} style={{ opacity: 0.08 }} />

      {hasAudio && <audio ref={audioRef} src={song.audio_url!} preload="metadata" />}

      <div className="container mx-auto pt-8 pb-40 px-4 max-w-2xl relative z-10">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Button variant="ghost" size="sm" onClick={() => navigate("/library")} className="gap-2 mb-10 rounded-xl hover:bg-muted/30 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> {t("player.back")}
          </Button>
        </motion.div>

        {/* Album art */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, filter: "blur(20px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1, ease }}
          className={`w-64 h-64 md:w-80 md:h-80 rounded-[2.5rem] bg-gradient-to-br ${gradient} mx-auto mb-12 flex items-center justify-center relative`}
          style={{
            boxShadow: `0 40px 100px -20px hsl(265, 90%, 60% / 0.25), 0 0 0 1px hsl(0 0% 100% / 0.05) inset`,
          }}
        >
          {/* Animated rings */}
          <motion.div
            className="absolute inset-0 rounded-[2.5rem]"
            style={{ border: "1px solid hsl(0 0% 100% / 0.1)" }}
            animate={{ scale: [1, 1.04, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -inset-4 rounded-[3rem]"
            style={{ border: "1px solid hsl(0 0% 100% / 0.04)" }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <div className="text-center text-primary-foreground relative z-10">
            <motion.div
              animate={playing ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl mb-3 drop-shadow-2xl"
            >
              🎵
            </motion.div>
            <div className="font-display text-lg font-bold capitalize drop-shadow-lg">{song.style}</div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.3, duration: 0.7, ease }}
          className="text-center mb-12"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{song.title}</h1>
          {song.subject && <p className="text-muted-foreground mt-2 text-lg">{song.subject}</p>}
        </motion.div>

        {hasAudio ? (
          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.4, duration: 0.6, ease }}
          >
            {/* Progress */}
            <div className="space-y-2 mb-10">
              <Slider value={[currentTime]} max={duration || 100} step={1} onValueChange={seek} />
              <div className="flex justify-between text-xs text-muted-foreground tabular-nums font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-10 mb-12">
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleFav}
                className="text-muted-foreground hover:text-primary transition-all duration-300"
              >
                <Heart className={`w-6 h-6 transition-all duration-300 ${isFav ? "fill-primary text-primary" : ""}`} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.05 }}
                onClick={togglePlay}
                className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center transition-all duration-500`}
                style={{
                  boxShadow: "0 8px 40px hsl(265, 90%, 60% / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.15)",
                }}
              >
                {playing ? <Pause className="w-8 h-8 text-primary-foreground" /> : <Play className="w-8 h-8 text-primary-foreground ml-1" />}
              </motion.button>
              <div className="w-6 h-6" />
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 max-w-xs mx-auto mb-14">
              <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <Slider value={[volume]} max={100} step={1} onValueChange={(v) => setVolume(v[0])} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card-elevated p-10 mb-12 text-center"
          >
            <Music className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-foreground font-semibold mb-1">{t("player.no_audio_title")}</p>
            <p className="text-sm text-muted-foreground">{t("player.no_audio_text")}</p>
            <div className="flex justify-center gap-3 mt-5">
              <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} onClick={toggleFav} className="text-muted-foreground hover:text-primary transition-colors">
                <Heart className={`w-6 h-6 ${isFav ? "fill-primary text-primary" : ""}`} />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Lyrics */}
        {lyricsLines.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.6, duration: 0.7, ease }}
            className="glass-card-elevated p-8 md:p-10 space-y-3"
          >
            <h3 className="font-display font-semibold text-lg mb-6 gradient-text">{t("player.lyrics")}</h3>
            {lyricsLines.map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.03 }}
                className="text-foreground/70 leading-relaxed text-[15px]"
              >
                {line}
              </motion.p>
            ))}
          </motion.div>
        )}

        {/* Study Notes */}
        {song.lyrics_metadata && <StudyNotes metadata={song.lyrics_metadata} t={t} />}

        {/* Quiz CTA */}
        {song.generated_lyrics && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-10"
          >
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                className="w-full gradient-bg-premium gap-2 h-14 text-base rounded-2xl shadow-lg shadow-primary/20 shimmer-btn"
                onClick={() => navigate(`/quiz/${song.id}`)}
              >
                <Brain className="w-5 h-5" /> {t("player.quiz_button")}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
