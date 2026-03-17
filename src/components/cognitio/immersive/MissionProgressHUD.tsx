// ============================================================
// MissionProgressHUD — Heads-up display showing mission
// progress, score, room count, and discovered objects.
// ============================================================

import { motion } from "framer-motion";
import { Map, Eye, Lightbulb, Trophy } from "lucide-react";
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
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-3 pointer-events-auto bg-background/40 backdrop-blur-md border-b border-border/10 rounded-b-xl mx-2 mt-1">
        {/* Room indicator */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Salle</span>
          <span className="text-sm font-bold tabular-nums">
            {currentRoom}/{totalRooms}
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex-1 mx-2">
          <div className="h-1.5 bg-border/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center gap-1">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-sm font-medium tabular-nums">{Math.round(score)}</span>
        </div>

        {/* Objects discovered */}
        <div className="flex items-center gap-1">
          <Eye className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs tabular-nums">{objectsDiscovered}/{totalObjects}</span>
        </div>

        {/* Hints used */}
        <div className="flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-xs tabular-nums">{hintsUsed}</span>
        </div>

        {/* Map toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleMap}
          className="p-2"
        >
          <Map className="w-4 h-4" />
        </Button>

        {/* Render mode indicator */}
        {renderMode !== "full_3d" && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/30 text-muted-foreground">
            {renderMode === "lite_3d" ? "Lite" :
             renderMode === "pseudo_3d" ? "2.5D" : "2D"}
          </span>
        )}
      </div>
    </div>
  );
}
