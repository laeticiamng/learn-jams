// ============================================================
// EscapeRoomMap — Visual room map showing progression,
// locks, and current position in the escape game.
// ============================================================

import { motion } from "framer-motion";
import { Lock, Unlock, CheckCircle2, MapPin, ChevronRight, Key, Hash, Target, Shield } from "lucide-react";
import type { EscapeRoom } from "@/domain/cognitio/escapeEngine.types";

interface EscapeRoomMapProps {
  rooms: EscapeRoom[];
  currentRoomIndex: number;
  onRoomSelect: (index: number) => void;
}

export default function EscapeRoomMap({
  rooms,
  currentRoomIndex,
  onRoomSelect,
}: EscapeRoomMapProps) {
  return (
    <div className="space-y-1">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
        Carte des salles
      </h3>
      <div className="space-y-1">
        {rooms.map((room, index) => {
          const isCurrent = index === currentRoomIndex;
          const isCompleted = room.completed;
          const isLocked = !room.unlocked;

          return (
            <motion.button
              key={room.id}
              onClick={() => !isLocked && onRoomSelect(index)}
              disabled={isLocked}
              whileHover={!isLocked ? { x: 4 } : undefined}
              className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                isCurrent
                  ? "bg-primary/10 border border-primary/30 text-primary font-medium"
                  : isCompleted
                    ? "bg-green-500/5 border border-green-500/20 text-green-600 dark:text-green-400"
                    : isLocked
                      ? "opacity-50 cursor-not-allowed border border-border/10"
                      : "hover:bg-accent/50 border border-transparent"
              }`}
            >
              {/* Status icon */}
              <div className="shrink-0">
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : isLocked ? (
                  <Lock className="w-4 h-4 text-muted-foreground/50" />
                ) : isCurrent ? (
                  <MapPin className="w-4 h-4 text-primary" />
                ) : (
                  <Unlock className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {/* Room info */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm">{room.title}</p>
                {isCompleted && (
                  <p className="text-[10px] text-green-500/70 mt-0.5">
                    {room.puzzles.filter(p => p.solved).length}/{room.puzzles.length} puzzles
                  </p>
                )}
                {isLocked && (
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5 truncate flex items-center gap-1">
                    {room.lock.type === "code_lock" && <Hash className="w-2.5 h-2.5 inline" />}
                    {room.lock.type === "key_item" && <Key className="w-2.5 h-2.5 inline" />}
                    {room.lock.type === "multi_key" && <Key className="w-2.5 h-2.5 inline" />}
                    {room.lock.type === "score_gate" && <Target className="w-2.5 h-2.5 inline" />}
                    {room.lock.type === "puzzle_gate" && <Shield className="w-2.5 h-2.5 inline" />}
                    {room.lock.lock_description.slice(0, 50)}
                  </p>
                )}
              </div>

              {/* Arrow for accessible rooms */}
              {!isLocked && !isCompleted && (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Progress */}
      <div className="mt-4 pt-3 border-t border-border/10">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progression</span>
          <span className="font-medium">
            {rooms.filter(r => r.completed).length}/{rooms.length}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 bg-border/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
            initial={{ width: 0 }}
            animate={{
              width: `${(rooms.filter(r => r.completed).length / Math.max(1, rooms.length)) * 100}%`,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}
