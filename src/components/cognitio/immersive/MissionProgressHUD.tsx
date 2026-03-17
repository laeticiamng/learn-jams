// ============================================================
// MissionProgressHUD — Cinematic heads-up display
// Intent: Anchored in space, not floating randomly.
// Reads like a game HUD: minimal, elegant, always readable,
// never competing with the 3D world.
// ============================================================

import { motion } from "framer-motion";
import { Map, Eye, Lightbulb, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RenderMode } from "@/domain/cognitio/immersiveEngine.types";

interface MissionProgressHUDProps {
  currentRoom: number;
  totalRooms: number;
  score: number;
  hintsUsed: number;
  objectsDiscovered: number;
  totalObjects: number;
  completedRooms: number;
  onToggleMap: () => void;
  renderMode: RenderMode;
}

export default function MissionProgressHUD({
  currentRoom,
  totalRooms,
  score,
  hintsUsed,
  objectsDiscovered,
  totalObjects,
  completedRooms,
  onToggleMap,
  renderMode,
}: MissionProgressHUDProps) {
  const progress = totalRooms > 0 ? (completedRooms / totalRooms) * 100 : 0;

  return (
    <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="pointer-events-auto mx-2 mt-2"
      >
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3 bg-background/30 backdrop-blur-xl border border-border/8 rounded-2xl shadow-xl shadow-black/10">
          {/* Room indicator — primary info */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium block leading-none">
                Salle
              </span>
              <span className="text-sm font-bold tabular-nums leading-tight">
                {currentRoom}<span className="text-muted-foreground/40">/{totalRooms}</span>
              </span>
            </div>
          </div>

          {/* Progress bar — cinematic energy fill */}
          <div className="flex-1 mx-1">
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative">
              <motion.div
                className="h-full rounded-full relative"
                style={{
                  background: "linear-gradient(90deg, hsl(265 90% 60%), hsl(215 80% 55%), hsl(300 70% 50%))",
                }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
              {/* Shimmer on active progress */}
              {progress > 0 && progress < 100 && (
                <motion.div
                  className="absolute top-0 h-full w-8 rounded-full"
                  style={{
                    background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.15), transparent)",
                  }}
                  animate={{ left: ["-10%", `${progress}%`] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </div>
          </div>

          {/* Score */}
          <motion.div
            key={Math.round(score)}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-sm font-bold tabular-nums">{Math.round(score)}</span>
          </motion.div>

          {/* Separator */}
          <div className="w-px h-4 bg-border/10" />

          {/* Objects */}
          <div className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-blue-400/70" />
            <span className="text-xs tabular-nums text-muted-foreground/70">
              {objectsDiscovered}<span className="text-muted-foreground/30">/{totalObjects}</span>
            </span>
          </div>

          {/* Hints */}
          <div className="flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-yellow-400/70" />
            <span className="text-xs tabular-nums text-muted-foreground/70">{hintsUsed}</span>
          </div>

          {/* Map toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMap}
            className="p-1.5 h-7 w-7 rounded-lg hover:bg-white/5"
          >
            <Map className="w-3.5 h-3.5" />
          </Button>

          {/* Render mode indicator */}
          {renderMode !== "full_3d" && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-muted-foreground/50 font-medium">
              {renderMode === "lite_3d" ? "Lite" :
               renderMode === "pseudo_3d" ? "2.5D" : "2D"}
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
