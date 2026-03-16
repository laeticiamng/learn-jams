// ============================================================
// InventoryPanel — Visual inventory display with item
// examination, type grouping, and collection progress.
// ============================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Search, BarChart2, ClipboardList,
  Gem, Puzzle, Award, Key, Package, X, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InventoryItem, InventoryItemType } from "@/domain/cognitio/escapeEngine.types";

interface InventoryPanelProps {
  inventory: InventoryItem[];
  totalItems: number;
  onExamine: (itemId: string) => string | null;
}

const ITEM_ICONS: Record<InventoryItemType, typeof FileText> = {
  document: FileText,
  artifact: Gem,
  clue: Search,
  key: Key,
  data: BarChart2,
  protocol: ClipboardList,
  badge: Award,
  fragment: Puzzle,
};

const ITEM_TYPE_LABELS: Record<InventoryItemType, string> = {
  document: "Documents",
  artifact: "Artéfacts",
  clue: "Indices",
  key: "Clés",
  data: "Données",
  protocol: "Protocoles",
  badge: "Badges",
  fragment: "Fragments",
};

const ITEM_TYPE_COLORS: Record<InventoryItemType, string> = {
  document: "text-blue-500",
  artifact: "text-purple-500",
  clue: "text-yellow-500",
  key: "text-amber-500",
  data: "text-cyan-500",
  protocol: "text-emerald-500",
  badge: "text-orange-500",
  fragment: "text-pink-500",
};

export default function InventoryPanel({
  inventory,
  totalItems,
  onExamine,
}: InventoryPanelProps) {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [examineText, setExamineText] = useState<string>("");

  const collectedItems = inventory.filter(i => i.collected);
  const progress = totalItems > 0
    ? Math.round((collectedItems.length / totalItems) * 100)
    : 0;

  const handleExamine = (item: InventoryItem) => {
    const text = onExamine(item.id);
    setSelectedItem(item);
    setExamineText(text ?? item.description);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Inventaire
        </h3>
        <span className="text-xs text-muted-foreground">
          {collectedItems.length}/{totalItems}
        </span>
      </div>

      {/* Item grid */}
      {collectedItems.length === 0 ? (
        <p className="text-xs text-muted-foreground/50 py-4 text-center">
          Aucun objet collecté
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {collectedItems.map((item) => {
            const Icon = ITEM_ICONS[item.type] ?? Package;
            const color = ITEM_TYPE_COLORS[item.type] ?? "text-muted-foreground";
            const isSelected = selectedItem?.id === item.id;

            return (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleExamine(item)}
                className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                  isSelected
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/10 hover:border-border/30 hover:bg-accent/30"
                }`}
                title={item.name}
              >
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-[9px] text-muted-foreground truncate w-full text-center leading-tight">
                  {item.name.length > 12 ? item.name.slice(0, 12) + "…" : item.name}
                </span>
                {item.is_key_item && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full" />
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Examine modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="glass-card p-3 rounded-xl border border-border/20 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = ITEM_ICONS[selectedItem.type] ?? Package;
                  const color = ITEM_TYPE_COLORS[selectedItem.type];
                  return <Icon className={`w-4 h-4 shrink-0 ${color}`} />;
                })()}
                <div>
                  <p className="text-sm font-medium">{selectedItem.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {ITEM_TYPE_LABELS[selectedItem.type]}
                    {selectedItem.is_key_item && " • Objet clé"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-muted-foreground/50 hover:text-muted-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {examineText}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collection progress */}
      <div className="pt-2 border-t border-border/10">
        <div className="h-1 bg-border/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}
