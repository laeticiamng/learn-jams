// ============================================================
// ObjectInspectPanel — Side panel for inspecting a pedagogical
// object. Shows concept details, available interactions, and
// explanation text.
// ============================================================

import { motion } from "framer-motion";
import { X, Eye, RotateCw, ZoomIn, Link2, Combine, Layers, MapPin, Plug, Puzzle, Lightbulb, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PedagogicalObject, ObjectInteraction } from "@/domain/cognitio/immersiveEngine.types";

interface ObjectInspectPanelProps {
  object: PedagogicalObject;
  onClose: () => void;
  onInteract: (interaction: string) => void;
}

const INTERACTION_ICONS: Record<ObjectInteraction, typeof Eye> = {
  inspect: Eye,
  rotate: RotateCw,
  zoom: ZoomIn,
  compare: Layers,
  combine: Combine,
  classify: Layers,
  place: MapPin,
  connect: Plug,
  trigger_puzzle: Puzzle,
  reveal_hint: Lightbulb,
  show_explanation: BookOpen,
};

const INTERACTION_LABELS: Record<ObjectInteraction, string> = {
  inspect: "Inspecter",
  rotate: "Tourner",
  zoom: "Zoomer",
  compare: "Comparer",
  combine: "Combiner",
  classify: "Classifier",
  place: "Placer",
  connect: "Connecter",
  trigger_puzzle: "Puzzle",
  reveal_hint: "Indice",
  show_explanation: "Explication",
};

const TYPE_LABELS: Record<string, string> = {
  concept_node: "Nœud conceptuel",
  clue_object: "Indice",
  relation_bridge: "Pont relationnel",
  knowledge_key: "Clé de connaissance",
  protocol_assembler: "Assembleur",
  diagnostic_console: "Console diagnostique",
  gate_lock: "Verrou",
  memory_totem: "Totem mémoriel",
  evidence_board: "Tableau de preuves",
  timeline_fragment: "Fragment temporel",
};

export default function ObjectInspectPanel({
  object,
  onClose,
  onInteract,
}: ObjectInspectPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="absolute right-0 top-0 bottom-0 w-80 z-20 bg-background/95 backdrop-blur-xl border-l border-border/20 p-4 overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-primary font-semibold uppercase tracking-wider">
            {TYPE_LABELS[object.type] ?? object.type}
          </p>
          <h3 className="text-sm font-bold mt-1">{object.label}</h3>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Description */}
      <div className="glass-card p-3 rounded-xl mb-4">
        <p className="text-xs text-muted-foreground leading-relaxed">{object.description}</p>
      </div>

      {/* Educational role */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] text-muted-foreground">Rôle pédagogique:</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
          {object.educational_role.replace(/_/g, " ")}
        </span>
      </div>

      {/* Linked concepts */}
      {object.linked_concepts.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">
            Concepts liés
          </p>
          <div className="flex flex-wrap gap-1">
            {object.linked_concepts.map(key => (
              <span key={key} className="text-[10px] px-1.5 py-0.5 rounded bg-accent/30 text-muted-foreground">
                {key}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* State */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] text-muted-foreground">État:</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
          object.state === "collected" ? "bg-green-500/10 text-green-500" :
          object.state === "discovered" ? "bg-blue-500/10 text-blue-500" :
          object.state === "locked" ? "bg-red-500/10 text-red-500" :
          "bg-accent/30 text-muted-foreground"
        }`}>
          {object.state}
        </span>
      </div>

      {/* Interaction buttons */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
          Actions
        </p>
        {object.interaction_modes.map(interaction => {
          const Icon = INTERACTION_ICONS[interaction] ?? Eye;
          const label = INTERACTION_LABELS[interaction] ?? interaction;
          const isDisabled = object.state === "locked" && interaction !== "inspect";

          return (
            <Button
              key={interaction}
              variant="ghost"
              size="sm"
              onClick={() => onInteract(interaction)}
              disabled={isDisabled}
              className="w-full justify-start gap-2 text-xs h-8"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Button>
          );
        })}
      </div>

      {/* Hint text */}
      {object.hint_text && (
        <div className="mt-4 p-3 rounded-xl border-l-4 border-yellow-500/30 bg-yellow-500/5">
          <p className="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium mb-0.5">Indice</p>
          <p className="text-xs text-muted-foreground">{object.hint_text}</p>
        </div>
      )}

      {/* Explanation (shown after interaction) */}
      {object.state === "collected" && object.explanation_text && (
        <div className="mt-4 p-3 rounded-xl border-l-4 border-green-500/30 bg-green-500/5">
          <p className="text-[10px] text-green-600 dark:text-green-400 font-medium mb-0.5">Explication</p>
          <p className="text-xs text-muted-foreground">{object.explanation_text}</p>
        </div>
      )}
    </motion.div>
  );
}
