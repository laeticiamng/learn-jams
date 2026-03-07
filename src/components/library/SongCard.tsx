import { motion } from "framer-motion";
import { Play, Heart, Clock, Loader2, Brain } from "lucide-react";
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
  is_final_quality?: boolean;
}

interface SongCardProps {
  song: Song;
  isFavorite: boolean;
  onToggleFavorite: (songId: string) => void;
}

const styleColors: Record<string, string> = {
  rap: "bg-red-500/15 text-red-400",
  lofi: "bg-indigo-500/15 text-indigo-400",
  pop: "bg-pink-500/15 text-pink-400",
  jazz: "bg-amber-500/15 text-amber-400",
  rock: "bg-red-600/15 text-red-400",
  "spoken-word": "bg-teal-500/15 text-teal-400",
  reggaeton: "bg-green-500/15 text-green-400",
  classique: "bg-violet-500/15 text-violet-400",
  techno: "bg-gray-500/15 text-gray-400",
  afrobeat: "bg-amber-500/15 text-amber-400",
};

const item = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
};

export function SongCard({ song, isFavorite, onToggleFavorite }: SongCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isClickable = song.status === "ready";
  const genProgress = getGeneratingProgress(song);

  return (
    <motion.div
      variants={item}
      layout
      className={`glass-card p-5 flex flex-col gap-3 card-hover ${
        isClickable ? "cursor-pointer" : "opacity-80"
      } group`}
      onClick={() => isClickable && navigate(`/player/${song.id}`)}
    >
      <div className="flex items-center gap-4">
        {/* Play icon */}
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 relative transition-all duration-300 ${
            song.status === "generating"
              ? "bg-muted/60"
              : "gradient-bg group-hover:shadow-lg group-hover:shadow-primary/20 group-hover:scale-105"
          }`}
        >
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
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                styleColors[song.style] || "bg-muted/60 text-muted-foreground"
              }`}
            >
              {song.style}
            </span>
            {song.subject && <span className="text-xs text-muted-foreground">{song.subject}</span>}
            <StatusBadge status={song.status} isFinalQuality={song.is_final_quality} />
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
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/quiz/${song.id}`);
                  }}
                  className="hover:text-primary transition-colors duration-300 p-1"
                >
                  <Brain className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t("library.quiz_tooltip")}</TooltipContent>
            </Tooltip>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(song.id);
            }}
            className="hover:text-primary transition-all duration-300 p-1 hover:scale-110"
          >
            <Heart
              className={`w-5 h-5 transition-all duration-300 ${
                isFavorite ? "fill-primary text-primary scale-110" : ""
              }`}
            />
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
