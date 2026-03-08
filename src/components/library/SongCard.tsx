import { motion } from "framer-motion";
import { Play, Heart, Clock, Loader2, Brain, RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "./StatusBadge";

export interface Song {
  id: string;
  title: string;
  style: string;
  subject: string | null;
  status: string;
  audio_url: string | null;
  duration: number | null;
  created_at: string;
  is_final_quality: boolean;
  generated_lyrics: string | null;
  cover_image_url: string | null;
  lyrics_metadata: string | null;
  original_text: string;
  suno_task_id: string | null;
  generation_error: string | null;
  generation_error_code: string | null;
  generation_error_at: string | null;
}

interface SongCardProps {
  song: Song;
  isFavorite: boolean;
  onToggleFavorite: (songId: string) => void;
  onRetry?: (songId: string) => void;
}

const styleColors: Record<string, string> = {
  rap: "from-red-500/80 to-orange-500/80",
  lofi: "from-indigo-500/80 to-purple-500/80",
  pop: "from-pink-500/80 to-rose-500/80",
  jazz: "from-amber-500/80 to-yellow-500/80",
  rock: "from-red-600/80 to-red-400/80",
  "spoken-word": "from-teal-500/80 to-cyan-500/80",
  reggaeton: "from-green-500/80 to-emerald-500/80",
  classique: "from-violet-500/80 to-purple-500/80",
  techno: "from-gray-400/80 to-zinc-500/80",
  afrobeat: "from-amber-500/80 to-red-500/80",
};

const item = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
};

export function SongCard({ song, isFavorite, onToggleFavorite, onRetry }: SongCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isClickable = song.status === "ready";
  const isError = song.status === "error";
  const genProgress = getGeneratingProgress(song);
  const styleGradient = styleColors[song.style] || "from-primary/80 to-secondary/80";

  return (
    <motion.div
      variants={item}
      layout
      className={`glass-card-elevated p-5 card-hover group ${
        isClickable ? "cursor-pointer" : "opacity-75"
      }`}
      onClick={() => isClickable && navigate(`/player/${song.id}`)}
    >
      <div className="flex items-center gap-4">
        {/* Album art mini */}
        <motion.div
          whileHover={isClickable ? { scale: 1.08 } : {}}
          className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 relative transition-all duration-500 overflow-hidden ${
            song.cover_image_url ? "" : `bg-gradient-to-br ${song.status === "generating" ? "from-muted/60 to-muted/40" : styleGradient}`
          }`}
        >
          {song.cover_image_url ? (
            <img src={song.cover_image_url} alt={song.title} className="w-full h-full object-cover" />
          ) : song.status === "generating" ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <Play className="w-5 h-5 text-primary-foreground ml-0.5 drop-shadow-lg" />
          )}
          {song.status === "ready" && !song.is_final_quality && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-400 animate-pulse-glow border-2 border-card" />
          )}
        </motion.div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-[15px] truncate group-hover:text-primary transition-colors duration-300">
            {song.title}
          </h3>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-gradient-to-r ${styleGradient} text-primary-foreground`}>
              {song.style}
            </span>
            {song.subject && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{song.subject}</span>}
            <StatusBadge status={song.status} isFinalQuality={song.is_final_quality} />
            {isError && song.generation_error_code && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[10px] text-destructive/70 cursor-help truncate max-w-[140px]">
                    {song.generation_error_code === "SENSITIVE_WORD_ERROR" 
                      ? t("library.error_sensitive", "Mot sensible détecté")
                      : song.generation_error_code === "TIMEOUT"
                      ? t("library.error_timeout", "Timeout")
                      : song.generation_error_code}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px]">
                  <p className="text-xs">{song.generation_error || t("library.error_unknown", "Erreur inconnue")}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 text-muted-foreground">
          {song.duration && (
            <span className="text-xs flex items-center gap-1 tabular-nums font-mono opacity-60">
              <Clock className="w-3 h-3" />
              {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, "0")}
            </span>
          )}
          {isError && onRetry && (
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry(song.id);
                  }}
                  className="hover:text-primary transition-colors duration-300 p-1.5 rounded-lg hover:bg-primary/10"
                >
                  <RotateCcw className="w-4.5 h-4.5" />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent>{t("library.retry_tooltip", "Retry generation")}</TooltipContent>
            </Tooltip>
          )}
          {song.status === "ready" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/quiz/${song.id}`);
                  }}
                  className="hover:text-primary transition-colors duration-300 p-1.5 rounded-lg hover:bg-primary/10"
                >
                  <Brain className="w-4.5 h-4.5" />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent>{t("library.quiz_tooltip")}</TooltipContent>
            </Tooltip>
          )}
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(song.id);
            }}
            className="hover:text-primary transition-all duration-300 p-1.5 rounded-lg hover:bg-primary/10"
          >
            <Heart
              className={`w-4.5 h-4.5 transition-all duration-300 ${
                isFavorite ? "fill-primary text-primary" : ""
              }`}
            />
          </motion.button>
        </div>
      </div>

      {/* Progress bar for generating songs */}
      {genProgress !== null && (
        <div className="pl-[72px] pr-2 mt-3">
          <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
            <motion.div
              className="h-full gradient-bg-premium rounded-full"
              animate={{ width: `${genProgress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">
            {genProgress < 50
              ? t("create.analyzing", "Analyse en cours…")
              : t("create.generating_music", "Génération de la musique…")}
          </p>
        </div>
      )}
    </motion.div>
  );
}

function getGeneratingProgress(song: Song) {
  if (song.status !== "generating") return null;
  const elapsed = (Date.now() - new Date(song.created_at).getTime()) / 1000;
  return Math.min(95, Math.round((elapsed / 45) * 100));
}
