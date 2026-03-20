// ============================================================
// MissionBriefingMap — Pseudo-3D room map for mission intro.
// Rooms revealed sequentially with stagger animation.
// Boss room pulses in red. Pure CSS perspective, no Three.js.
// ============================================================

import { motion } from "framer-motion";
import { Crown, DoorOpen, Lock } from "lucide-react";

interface RoomInfo {
  title: string;
  itemsCount: number;
  brickType: string;
}

interface MissionBriefingMapProps {
  rooms: RoomInfo[];
  hasBoss: boolean;
  bossTitle?: string;
  bossItemsCount?: number;
}

export function MissionBriefingMap({
  rooms,
  hasBoss,
  bossTitle,
  bossItemsCount,
}: MissionBriefingMapProps) {
  const totalNodes = rooms.length + (hasBoss ? 1 : 0);

  return (
    <div
      className="relative py-6"
      style={{ perspective: "800px" }}
    >
      {/* Connecting line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/20 via-primary/10 to-transparent -translate-x-1/2 z-0" />

      <div className="relative z-10 space-y-4">
        {rooms.map((room, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20, rotateX: -15 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{
              delay: 0.2 + i * 0.12,
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative"
          >
            {/* Room node */}
            <div className="flex items-center gap-4 p-4 rounded-xl glass-card hover:border-primary/20 transition-colors duration-300 group">
              {/* Room number badge */}
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                <span className="text-sm font-bold text-primary">{i + 1}</span>
              </div>

              {/* Room info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{room.title}</p>
                <p className="text-xs text-muted-foreground">
                  {room.itemsCount} épreuve{room.itemsCount > 1 ? "s" : ""}
                </p>
              </div>

              {/* Room icon */}
              <DoorOpen className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            </div>

            {/* Connection dot */}
            <div className="absolute left-1/2 -bottom-2.5 -translate-x-1/2 w-2 h-2 rounded-full bg-primary/30" />
          </motion.div>
        ))}

        {/* Boss room */}
        {hasBoss && (
          <motion.div
            initial={{ opacity: 0, y: 20, rotateX: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            transition={{
              delay: 0.2 + rooms.length * 0.12,
              duration: 0.6,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-red-500/20 bg-red-500/5 relative overflow-hidden">
              {/* Pulsing glow */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{
                  background: [
                    "radial-gradient(ellipse at 50% 50%, hsl(0, 70%, 50%, 0.03), transparent 60%)",
                    "radial-gradient(ellipse at 50% 50%, hsl(0, 70%, 50%, 0.08), transparent 60%)",
                    "radial-gradient(ellipse at 50% 50%, hsl(0, 70%, 50%, 0.03), transparent 60%)",
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Boss icon */}
              <motion.div
                className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Crown className="w-5 h-5 text-red-500" />
              </motion.div>

              {/* Boss info */}
              <div className="flex-1 min-w-0 relative z-10">
                <p className="text-sm font-bold text-red-400 truncate">
                  {bossTitle ?? "Boss Final"}
                </p>
                <p className="text-xs text-red-500/60">
                  {bossItemsCount ?? 0} épreuves — Synthèse finale
                </p>
              </div>

              <Lock className="w-4 h-4 text-red-400/50 shrink-0" />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
