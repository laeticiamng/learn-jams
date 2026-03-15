// ============================================================
// MissionProgressBar — Visual room-by-room progress tracker
// Shows completed rooms, current room, locked rooms, and boss
// ============================================================

import { motion } from "framer-motion";
import { Check, Lock, Crown, Zap } from "lucide-react";
import type { BrickType } from "@/domain/cognitio/types";
import { getBrickLabel } from "@/lib/cognitio-ui";

interface MissionProgressBarProps {
  rooms: { title: string; brick_type: BrickType; items_count: number }[];
  hasBoss: boolean;
  currentRoomIndex: number;
  isBoss: boolean;
  roomsCompleted: boolean[];
  bossUnlocked: boolean;
}

export default function MissionProgressBar({
  rooms,
  hasBoss,
  currentRoomIndex,
  isBoss,
  roomsCompleted,
  bossUnlocked,
}: MissionProgressBarProps) {
  const totalSteps = rooms.length + (hasBoss ? 1 : 0);
  const completedCount = roomsCompleted.filter(Boolean).length + (isBoss ? rooms.length : 0);
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-border/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          {progressPercent}%
        </span>
      </div>

      {/* Room steps */}
      <div className="flex items-center gap-1">
        {rooms.map((room, i) => {
          const isCompleted = roomsCompleted[i] ?? false;
          const isCurrent = !isBoss && i === currentRoomIndex;
          const isLocked = !isCompleted && !isCurrent && i > currentRoomIndex;

          return (
            <RoomStep
              key={i}
              index={i + 1}
              label={getBrickLabel(room.brick_type)}
              isCompleted={isCompleted}
              isCurrent={isCurrent}
              isLocked={isLocked}
            />
          );
        })}

        {/* Boss step */}
        {hasBoss && (
          <BossStep
            isCurrent={isBoss}
            isUnlocked={bossUnlocked}
            isCompleted={false}
          />
        )}
      </div>
    </div>
  );
}

function RoomStep({
  index,
  label,
  isCompleted,
  isCurrent,
  isLocked,
}: {
  index: number;
  label: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isLocked: boolean;
}) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="flex-1 flex flex-col items-center gap-1"
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
          isCompleted
            ? "bg-green-500 text-white"
            : isCurrent
              ? "bg-primary text-white ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
              : isLocked
                ? "bg-border/30 text-muted-foreground"
                : "bg-border/50 text-muted-foreground"
        }`}
      >
        {isCompleted ? (
          <Check className="w-4 h-4" />
        ) : isLocked ? (
          <Lock className="w-3 h-3" />
        ) : isCurrent ? (
          <Zap className="w-4 h-4" />
        ) : (
          index
        )}
      </div>
      <span className={`text-[9px] truncate max-w-full ${
        isCurrent ? "text-primary font-semibold" : "text-muted-foreground"
      }`}>
        {label}
      </span>
    </motion.div>
  );
}

function BossStep({
  isCurrent,
  isUnlocked,
  isCompleted,
}: {
  isCurrent: boolean;
  isUnlocked: boolean;
  isCompleted: boolean;
}) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="flex-1 flex flex-col items-center gap-1"
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
          isCompleted
            ? "bg-green-500 text-white"
            : isCurrent
              ? "bg-red-500 text-white ring-2 ring-red-500/30 ring-offset-2 ring-offset-background"
              : isUnlocked
                ? "bg-red-500/20 text-red-500 border border-red-500/30"
                : "bg-border/30 text-muted-foreground"
        }`}
      >
        {isCompleted ? (
          <Check className="w-4 h-4" />
        ) : !isUnlocked ? (
          <Lock className="w-3 h-3" />
        ) : (
          <Crown className="w-4 h-4" />
        )}
      </div>
      <span className={`text-[9px] ${
        isCurrent ? "text-red-500 font-semibold" : "text-muted-foreground"
      }`}>
        Boss
      </span>
    </motion.div>
  );
}
