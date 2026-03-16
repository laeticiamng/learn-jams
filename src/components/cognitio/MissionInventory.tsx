// ============================================================
// MissionInventory — Displays collected inventory items
// during mission gameplay. Items are earned by completing rooms
// and are required for the final boss/meta-puzzle.
// ============================================================

import { motion, AnimatePresence } from "framer-motion";
import { Package, Key, Scroll, FlaskConical, Compass, Gem, Shield, Map, BookOpen, Lock } from "lucide-react";
import type { InventoryItem } from "@/domain/cognitio/types";

interface MissionInventoryProps {
  items: InventoryItem[];
  collectedIds: Set<string>;
  requiredForBoss?: string[];
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  key: Key,
  scroll: Scroll,
  flask: FlaskConical,
  compass: Compass,
  gem: Gem,
  shield: Shield,
  map: Map,
  book: BookOpen,
};

export default function MissionInventory({
  items,
  collectedIds,
  requiredForBoss = [],
}: MissionInventoryProps) {
  if (items.length === 0) return null;

  const collectedCount = items.filter((i) => collectedIds.has(i.id)).length;
  const totalRequired = requiredForBoss.length || items.length;

  return (
    <div className="glass-card p-3 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Inventaire
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {collectedCount}/{totalRequired}
        </span>
      </div>

      {/* Items grid */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {items.map((item) => {
            const collected = collectedIds.has(item.id);
            const required = requiredForBoss.includes(item.id);
            const IconComponent = ICON_MAP[item.icon] ?? Package;

            return (
              <motion.div
                key={item.id}
                initial={collected ? { scale: 0, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="group relative"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${
                    collected
                      ? "bg-primary/10 border-primary/30 shadow-sm"
                      : "bg-border/10 border-border/20 opacity-40"
                  }`}
                  title={collected ? item.name : `${item.name} (non collecté)`}
                >
                  {collected ? (
                    <IconComponent className="w-5 h-5 text-primary" />
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                  <div className="bg-popover text-popover-foreground border rounded-lg p-2 shadow-lg text-xs whitespace-nowrap max-w-48">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-muted-foreground mt-0.5">{item.description}</p>
                    {required && !collected && (
                      <p className="text-yellow-600 dark:text-yellow-400 mt-1">
                        Nécessaire pour le boss final
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Boss requirement notice */}
      {requiredForBoss.length > 0 && collectedCount < totalRequired && (
        <p className="text-[10px] text-yellow-600/70 mt-2">
          Collectez tous les fragments pour débloquer l'épreuve finale
        </p>
      )}
    </div>
  );
}
