// ============================================================
// EscapeRoomMap2D — Interactive 2D visual room map with SVG
// connections, animated player position, fog of war, and
// lock type indicators. Replaces the linear room list.
// ============================================================

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Lock, CheckCircle2, MapPin, Key, Hash, Target, Shield, Crown,
} from "lucide-react";
import type { EscapeRoom } from "@/domain/cognitio/escapeEngine.types";

interface EscapeRoomMap2DProps {
  rooms: EscapeRoom[];
  currentRoomIndex: number;
  onRoomSelect: (index: number) => void;
}

// Node positions for up to 8 rooms in a serpentine / branching layout
function computeNodePositions(count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const cols = 2;
  const startX = 60;
  const gapX = 140;
  const startY = 40;
  const gapY = 72;

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = row % 2 === 0 ? i % cols : (cols - 1) - (i % cols); // serpentine
    positions.push({
      x: startX + col * gapX,
      y: startY + row * gapY,
    });
  }
  return positions;
}

const ROOM_TYPE_COLORS: Record<string, string> = {
  briefing: "#3B82F6",    // blue
  exploration: "#10B981",  // emerald
  analysis: "#8B5CF6",     // violet
  diagnostic: "#F59E0B",   // amber
  decision: "#EF4444",     // red
  synthesis: "#EC4899",    // pink
  final: "#DC2626",        // red-600
};

const LOCK_ICONS: Record<string, typeof Lock> = {
  code_lock: Hash,
  key_item: Key,
  multi_key: Key,
  puzzle_gate: Shield,
  score_gate: Target,
};

export default function EscapeRoomMap2D({
  rooms,
  currentRoomIndex,
  onRoomSelect,
}: EscapeRoomMap2DProps) {
  const positions = useMemo(() => computeNodePositions(rooms.length), [rooms.length]);

  const svgWidth = 280;
  const svgHeight = Math.max(160, positions.length > 0 ? positions[positions.length - 1].y + 60 : 160);

  const completedCount = rooms.filter(r => r.completed).length;
  const progress = rooms.length > 0 ? Math.round((completedCount / rooms.length) * 100) : 0;

  return (
    <div className="space-y-3">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
        Carte des salles
      </h3>

      {/* SVG Map */}
      <div className="relative rounded-xl border border-border/10 bg-background/50 overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full"
          style={{ minHeight: 120 }}
        >
          {/* Connection lines */}
          {positions.map((pos, i) => {
            if (i === 0) return null;
            const prev = positions[i - 1];
            const room = rooms[i];
            const prevRoom = rooms[i - 1];
            const isConnected = prevRoom?.completed || room?.unlocked;

            return (
              <line
                key={`line-${i}`}
                x1={prev.x}
                y1={prev.y}
                x2={pos.x}
                y2={pos.y}
                stroke={isConnected ? "hsl(var(--primary))" : "hsl(var(--border))"}
                strokeWidth={isConnected ? 2 : 1}
                strokeDasharray={isConnected ? undefined : "4 4"}
                opacity={isConnected ? 0.6 : 0.2}
              />
            );
          })}

          {/* Room nodes */}
          {rooms.map((room, index) => {
            const pos = positions[index];
            if (!pos) return null;

            const isCurrent = index === currentRoomIndex;
            const isCompleted = room.completed;
            const isLocked = !room.unlocked;
            const isBoss = room.room_type === "final";
            const color = ROOM_TYPE_COLORS[room.room_type] ?? "#6B7280";

            return (
              <g key={room.id}>
                {/* Fog of war overlay for locked rooms */}
                {isLocked && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={28}
                    fill="hsl(var(--background))"
                    opacity={0.7}
                  />
                )}

                {/* Pulse animation for current room */}
                {isCurrent && (
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r={24}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    initial={{ r: 20, opacity: 0.8 }}
                    animate={{ r: 30, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}

                {/* Main circle */}
                <motion.circle
                  cx={pos.x}
                  cy={pos.y}
                  r={20}
                  fill={
                    isCompleted ? color
                    : isCurrent ? `${color}33`
                    : isLocked ? "hsl(var(--muted))"
                    : `${color}22`
                  }
                  stroke={
                    isCompleted ? color
                    : isCurrent ? color
                    : isLocked ? "hsl(var(--border))"
                    : `${color}66`
                  }
                  strokeWidth={isCurrent ? 2.5 : 1.5}
                  className={!isLocked ? "cursor-pointer" : ""}
                  onClick={() => !isLocked && onRoomSelect(index)}
                  whileHover={!isLocked ? { scale: 1.15 } : undefined}
                  whileTap={!isLocked ? { scale: 0.95 } : undefined}
                />

                {/* Room number / status icon */}
                <text
                  x={pos.x}
                  y={pos.y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[10px] font-bold pointer-events-none select-none"
                  fill={
                    isCompleted ? "#fff"
                    : isCurrent ? color
                    : isLocked ? "hsl(var(--muted-foreground))"
                    : color
                  }
                >
                  {isCompleted ? "✓" : isBoss ? "★" : index + 1}
                </text>

                {/* Lock indicator */}
                {isLocked && room.lock.type !== "none" && (
                  <g transform={`translate(${pos.x + 14}, ${pos.y - 14})`}>
                    <circle r={7} fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={1} />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="text-[8px] pointer-events-none select-none"
                      fill="hsl(var(--muted-foreground))"
                    >
                      {room.lock.type === "code_lock" ? "#"
                       : room.lock.type === "key_item" || room.lock.type === "multi_key" ? "🔑"
                       : room.lock.type === "score_gate" ? "%" : "🔒"}
                    </text>
                  </g>
                )}

                {/* Room label */}
                <text
                  x={pos.x}
                  y={pos.y + 30}
                  textAnchor="middle"
                  className="text-[8px] pointer-events-none select-none"
                  fill="hsl(var(--muted-foreground))"
                >
                  {room.title.length > 18 ? room.title.slice(0, 18) + "…" : room.title}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Progress bar */}
      <div className="pt-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progression</span>
          <span className="font-medium">{completedCount}/{rooms.length}</span>
        </div>
        <div className="mt-1.5 h-1.5 bg-border/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}
