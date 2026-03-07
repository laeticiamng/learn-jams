import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Heart, ArrowLeft, Volume2, Loader2, Brain, Music, BookOpen, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StudyNotes } from "@/components/player/StudyNotes";

interface Song { id: string; title: string; style: string; original_text: string; generated_lyrics: string | null; audio_url: string | null; duration: number | null; status: string; subject: string | null; lyrics_metadata: string | null; }

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

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
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-mesh)" }} />

      {hasAudio && <audio ref={audioRef} src={song.audio_url!} preload="metadata" />}

      <div className="container mx-auto pt-8 pb-40 px-4 max-w-2xl relative z-10">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Button variant="ghost" size="sm" onClick={() => navigate("/library")} className="gap-2 mb-10 rounded-xl hover:bg-muted/30">
            <ArrowLeft className="w-4 h-4" /> {t("player.back")}
          </Button>
        </motion.div>

        {/* Album art */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease }}
          className="w-64 h-64 md:w-80 md:h-80 rounded-[2rem] gradient-bg mx-auto mb-10 flex items-center justify-center glow relative"
        >
          {/* Floating ring */}
          <motion.div
            className="absolute inset-0 rounded-[2rem] border border-primary/20"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="text-center text-primary-foreground">
            <motion.div
              animate={playing ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl mb-2"
            >
              🎵
            </motion.div>
            <div className="font-display text-lg font-bold capitalize">{song.style}</div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease }}
          className="text-center mb-10"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{song.title}</h1>
          {song.subject && <p className="text-muted-foreground mt-2 text-lg">{song.subject}</p>}
        </motion.div>

        {hasAudio ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease }}
          >
            {/* Progress */}
            <div className="space-y-2 mb-8">
              <Slider value={[currentTime]} max={duration || 100} step={1} onValueChange={seek} />
              <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-8 mb-10">
              <button
                onClick={toggleFav}
                className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110"
              >
                <Heart className={`w-6 h-6 transition-all duration-300 ${isFav ? "fill-primary text-primary" : ""}`} />
              </button>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={togglePlay}
                className="w-18 h-18 rounded-full gradient-bg flex items-center justify-center glow hover:shadow-xl hover:shadow-primary/30 transition-shadow duration-500"
                style={{ width: 72, height: 72 }}
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
            className="glass-card p-8 mb-10 text-center"
          >
            <Music className="w-8 h-8 text-muted-foreground/60 mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">{t("player.no_audio_title")}</p>
            <p className="text-sm text-muted-foreground">{t("player.no_audio_text")}</p>
            <div className="flex justify-center gap-3 mt-4">
              <button onClick={toggleFav} className="text-muted-foreground hover:text-primary transition-colors">
                <Heart className={`w-6 h-6 ${isFav ? "fill-primary text-primary" : ""}`} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Lyrics */}
        {lyricsLines.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6, ease }}
            className="glass-card p-8 md:p-10 space-y-3"
          >
            <h3 className="font-display font-semibold text-lg mb-5">{t("player.lyrics")}</h3>
            {lyricsLines.map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 + i * 0.03 }}
                className="text-foreground/75 leading-relaxed"
              >
                {line}
              </motion.p>
            ))}
          </motion.div>
        )}

        {/* Study Notes (Metadata) */}
        {song.lyrics_metadata && <StudyNotes metadata={song.lyrics_metadata} t={t} />}

        {/* Quiz CTA */}
        {song.generated_lyrics && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-8"
          >
            <Button
              className="w-full gradient-bg gap-2 h-14 text-base rounded-2xl hover:scale-[1.01] active:scale-[0.99] transition-transform duration-200"
              onClick={() => navigate(`/quiz/${song.id}`)}
            >
              <Brain className="w-5 h-5" /> {t("player.quiz_button")}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
