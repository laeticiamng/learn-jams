import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Heart, ArrowLeft, Volume2, Repeat, Share2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Song {
  id: string;
  title: string;
  style: string;
  original_text: string;
  generated_lyrics: string | null;
  audio_url: string | null;
  duration: number | null;
  status: string;
  subject: string | null;
}

export default function Player() {
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

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
    setPlaying(!playing);
  };

  const seek = (val: number[]) => {
    if (audioRef.current) { audioRef.current.currentTime = val[0]; setCurrentTime(val[0]); }
  };

  const toggleFav = async () => {
    if (!user || !id) return;
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("song_id", id);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, song_id: id });
    }
    setIsFav(!isFav);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

  const lyricsLines = song?.generated_lyrics?.split("\n").filter(Boolean) || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Chanson introuvable</p>
          <Button onClick={() => navigate("/library")}>Retour</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={{ background: "var(--gradient-glow)" }}>
      {song.audio_url && <audio ref={audioRef} src={song.audio_url} preload="metadata" />}

      <div className="container mx-auto pt-8 pb-40 px-4 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/library")} className="gap-2 mb-8">
          <ArrowLeft className="w-4 h-4" /> Bibliothèque
        </Button>

        {/* Album art */}
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-64 h-64 md:w-80 md:h-80 rounded-3xl gradient-bg mx-auto mb-8 flex items-center justify-center glow">
          <div className="text-center text-primary-foreground">
            <div className="text-6xl mb-2">🎵</div>
            <div className="font-display text-lg font-bold">{song.style}</div>
          </div>
        </motion.div>

        {/* Song info */}
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold">{song.title}</h1>
          {song.subject && <p className="text-muted-foreground mt-1">{song.subject}</p>}
        </div>

        {/* Progress */}
        <div className="space-y-2 mb-6">
          <Slider value={[currentTime]} max={duration || 100} step={1} onValueChange={seek} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mb-12">
          <button onClick={toggleFav} className="text-muted-foreground hover:text-primary transition-colors">
            <Heart className={`w-6 h-6 ${isFav ? "fill-primary text-primary" : ""}`} />
          </button>
          <button className="text-muted-foreground hover:text-foreground"><SkipBack className="w-6 h-6" /></button>
          <button onClick={togglePlay}
            className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center glow hover:scale-105 transition-transform">
            {playing ? <Pause className="w-7 h-7 text-primary-foreground" /> : <Play className="w-7 h-7 text-primary-foreground ml-1" />}
          </button>
          <button className="text-muted-foreground hover:text-foreground"><SkipForward className="w-6 h-6" /></button>
          <button className="text-muted-foreground hover:text-foreground"><Repeat className="w-6 h-6" /></button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 max-w-xs mx-auto mb-12">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
          <Slider value={[volume]} max={100} step={1} onValueChange={(v) => setVolume(v[0])} />
        </div>

        {/* Lyrics */}
        {lyricsLines.length > 0 && (
          <div className="glass-card p-8 space-y-3">
            <h3 className="font-display font-semibold text-lg mb-4">Paroles</h3>
            {lyricsLines.map((line, i) => (
              <p key={i} className="text-foreground/80 leading-relaxed">{line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
