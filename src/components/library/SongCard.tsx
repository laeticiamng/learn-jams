import { motion } from "framer-motion";
import { Play, Heart, Clock, Loader2, Brain, RotateCcw, Trash2, Music } from "lucide-react";
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
  onDelete?: (songId: string) => void;
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

export function SongCard({ song, isFavorite, onToggleFavorite, onRetry, onDelete }: SongCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isClickable = song.status === "ready" || song.status === "generating" || song.status === "pending";
  const isError = song.status === "error";
  const genProgress = getGeneratingProgress(song);
  const styleGradient = styleColors[song.style] || "from-primary/80 to-secondary/80";

  return (
    <motion.div
      variants={item}
      layout
      className={`glass-card-elevated overflow-hidden card-hover group flex flex-col ${
        isClickable ? "cursor-pointer" : "opacity-80"
      }`}
      onClick={() => isClickable && navigate(`/player/${song.id}`)}
    >
      {/* Cover / Thumbnail — dominant */}
      <div className={`relative aspect-square w-full overflow-hidden ${
        song.cover_image_url ? "" : `bg-gradient-to-br ${song.status === "generating" ? "from-muted/40 to-muted/20" : styleGradient}`
      }`}>
        {song.cover_image_url ? (
          <img
            src={song.cover_image_url}
            alt={song.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {song.status === "generating" ? (
              <Loader2 className="w-10 h-10 text-primary/60 animate-spin" />
            ) : (
              <Music className="w-12 h-12 text-primary-foreground/40" />
            )}
          </div>
        )}

        {/* Overlay on hover */}
        {isClickable && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-500 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-500 shadow-xl shadow-primary/30">
              <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
            </div>
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <span className={`text-[10px] px-2 py-1 rounded-lg font-semibold uppercase tracking-wider bg-gradient-to-r ${styleGradient} text-primary-foreground backdrop-blur-sm shadow-lg`}>
            {song.style}
          </span>
          {!song.is_final_quality && song.status === "ready" && (
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse-glow shadow-lg shadow-blue-400/50" />
          )}
        </div>

        {/* Favorite button overlay */}
        <motion.button
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(song.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-sm transition-all duration-300 hover:bg-black/50 ${
            isFavorite ? "opacity-100 bg-black/40" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 bg-black/30"
          }`}
        >
          <Heart
            className={`w-4 h-4 transition-all duration-300 ${
              isFavorite ? "fill-primary text-primary" : "text-white/80"
            }`}
          />
        </motion.button>

        {/* Progress bar for generating */}
        {genProgress !== null && (
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="h-1.5 rounded-full bg-black/30 backdrop-blur-sm overflow-hidden">
              <motion.div
                className="h-full gradient-bg-premium rounded-full"
                animate={{ width: `${genProgress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <p className="text-[10px] text-white/70 mt-1.5 font-medium">
              {genProgress < 50
                ? t("create.analyzing")
                : t("create.generating_music")}
            </p>
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-semibold text-[15px] leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-300">
            {song.title}
          </h3>
          <StatusBadge status={song.status} isFinalQuality={song.is_final_quality} />
        </div>

        {song.subject && (
          <p className="text-xs text-muted-foreground line-clamp-1">{song.subject}</p>
        )}

        {isError && song.generation_error_code && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[10px] text-destructive/70 cursor-help truncate block">
                {song.generation_error_code === "SENSITIVE_WORD_ERROR"
                  ? t("library.error_sensitive")
                  : song.generation_error_code === "TIMEOUT"
                  ? t("library.error_timeout")
                  : song.generation_error_code}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px]">
              <p className="text-xs">{song.generation_error || t("library.error_unknown")}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Bottom bar */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/10">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {song.duration && (
              <span className="text-[11px] flex items-center gap-1 tabular-nums font-mono">
                <Clock className="w-3 h-3" />
                {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, "0")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isError && onRetry && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); onRetry(song.id); }}
                    className="hover:text-primary transition-colors duration-300 p-2 sm:p-1.5 rounded-lg hover:bg-primary/10"
                  >
                    <RotateCcw className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>{t("library.retry_tooltip")}</TooltipContent>
              </Tooltip>
            )}
            {song.status === "ready" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); navigate(`/quiz/${song.id}`); }}
                    className="hover:text-primary transition-colors duration-300 p-2 sm:p-1.5 rounded-lg hover:bg-primary/10"
                  >
                    <Brain className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>{t("library.quiz_tooltip")}</TooltipContent>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); onDelete(song.id); }}
                    className="hover:text-destructive transition-colors duration-300 p-2 sm:p-1.5 rounded-lg hover:bg-destructive/10 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>{t("library.delete_tooltip")}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function getGeneratingProgress(song: Song) {
  if (song.status !== "generating") return null;
  const elapsed = (Date.now() - new Date(song.created_at).getTime()) / 1000;
  return Math.min(95, Math.round((elapsed / 45) * 100));
}
