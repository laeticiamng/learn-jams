import { motion } from "framer-motion";
import { Skull } from "lucide-react";
import MissionRoom from "./MissionRoom";
import type { MissionBossRoom, MissionItem, BrickType } from "@/domain/cognitio/types";

interface MissionBossProps {
  boss: MissionBossRoom;
  currentItemIndex: number;
  timerEnabled: boolean;
  onSubmit: (answer: string | string[], confidence: number, timeTakenMs: number) => { isCorrect: boolean; explanation: string } | undefined;
  onHint: () => string | null;
  onNext: () => void;
}

export default function MissionBoss({
  boss,
  currentItemIndex,
  timerEnabled,
  onSubmit,
  onHint,
  onNext,
}: MissionBossProps) {
  const currentItem = boss.items[currentItemIndex];
  if (!currentItem) return null;

  return (
    <div className="space-y-4">
      {/* Boss intro */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card-elevated p-6 rounded-xl text-center border-2 border-red-500/20"
      >
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
          <Skull className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-lg font-bold">{boss.title}</h2>
        <p className="text-sm text-muted-foreground mt-2">{boss.narrative_context}</p>
        <div className="flex items-center justify-center gap-2 mt-3">
          {boss.brick_types.map((brick, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20"
            >
              {brick}
            </span>
          ))}
        </div>
      </motion.div>

      <MissionRoom
        roomTitle={boss.title}
        brickType={currentItem.type}
        narrativeContext=""
        item={currentItem}
        itemIndex={currentItemIndex}
        totalItems={boss.items.length}
        timerEnabled={timerEnabled}
        timeLimitSec={boss.time_limit_sec}
        onSubmit={onSubmit}
        onHint={onHint}
        onNext={onNext}
      />
    </div>
  );
}
