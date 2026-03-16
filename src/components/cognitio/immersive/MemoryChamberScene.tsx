// ============================================================
// MemoryChamberScene — Calm synthesis environment where the
// learner revisits critical concepts after a mission. Uses
// spatial layout to reinforce memory through visual placement
// and concept relationships.
// ============================================================

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Brain, BookOpen, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  ImmersiveDebrief,
  ConceptResult,
  ReviewScheduleItem,
  DependencyGraph,
} from "@/domain/cognitio/immersiveEngine.types";

interface MemoryChamberSceneProps {
  debrief: ImmersiveDebrief;
  graph: DependencyGraph;
  onConceptReview: (conceptKey: string) => void;
  onAdvance: () => void;
  onReplayWeak: () => void;
}

export default function MemoryChamberScene({
  debrief,
  graph,
  onConceptReview,
  onAdvance,
  onReplayWeak,
}: MemoryChamberSceneProps) {
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);

  // Group concepts by mastery
  const { mastered, developing, weak } = useMemo(() => ({
    mastered: debrief.concepts_learned.filter(c => c.mastery_level === "mastered" || c.mastery_level === "stable"),
    developing: debrief.concepts_learned.filter(c => c.mastery_level === "developing"),
    weak: debrief.concepts_weak,
  }), [debrief]);

  // Next review items
  const upcomingReviews = useMemo(() =>
    debrief.spaced_review_schedule
      .filter(r => {
        const d = new Date(r.review_date);
        const now = new Date();
        const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      })
      .slice(0, 6),
    [debrief.spaced_review_schedule]
  );

  const selectedDetails = useMemo(() => {
    if (!selectedConcept) return null;
    const node = graph.nodes.find(n => n.concept_key === selectedConcept);
    const result = [...debrief.concepts_learned, ...debrief.concepts_weak].find(c => c.concept_key === selectedConcept);
    return { node, result };
  }, [selectedConcept, graph, debrief]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/10 mb-2">
          <Brain className="w-6 h-6 text-purple-500" />
        </div>
        <h2 className="text-xl font-bold">Chambre de Mémoire</h2>
        <p className="text-sm text-muted-foreground">
          Consolidez vos apprentissages et renforcez les concepts fragiles
        </p>
      </motion.div>

      {/* Score summary */}
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard label="Précision" value={`${Math.round((debrief.puzzles_correct / Math.max(1, debrief.total_puzzles)) * 100)}%`} />
        <SummaryCard label="Synthèse" value={`${Math.round(debrief.synthesis_score * 100)}%`} />
        <SummaryCard label="Objets" value={`${debrief.objects_discovered}/${debrief.objects_total}`} />
        <SummaryCard label="Salles" value={`${debrief.rooms_completed}/${debrief.rooms_total}`} />
      </div>

      {/* Concept mastery visualization */}
      <div className="grid grid-cols-3 gap-4">
        {/* Mastered */}
        <ConceptColumn
          title="Maîtrisés"
          concepts={mastered}
          color="green"
          onSelect={setSelectedConcept}
          selectedKey={selectedConcept}
        />
        {/* Developing */}
        <ConceptColumn
          title="En développement"
          concepts={developing}
          color="blue"
          onSelect={setSelectedConcept}
          selectedKey={selectedConcept}
        />
        {/* Weak */}
        <ConceptColumn
          title="À renforcer"
          concepts={weak}
          color="amber"
          onSelect={setSelectedConcept}
          selectedKey={selectedConcept}
        />
      </div>

      {/* Selected concept detail */}
      {selectedDetails?.node && selectedDetails?.result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-elevated p-4 rounded-xl space-y-3"
        >
          <h3 className="text-sm font-semibold">{selectedDetails.node.label}</h3>
          <p className="text-xs text-muted-foreground">{selectedDetails.node.definition}</p>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">{selectedDetails.node.bloom_target}</span>
            <span>Précision: {Math.round(selectedDetails.result.accuracy * 100)}%</span>
            <span>Tentatives: {selectedDetails.result.attempts}</span>
            <span>Indices: {selectedDetails.result.hints_used}</span>
          </div>
          <Button size="sm" onClick={() => onConceptReview(selectedConcept!)} className="gap-2 text-xs">
            <BookOpen className="w-3.5 h-3.5" /> Réviser ce concept
          </Button>
        </motion.div>
      )}

      {/* Confusion zones */}
      {debrief.confusion_zones_encountered.filter(z => z.needs_review).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
            Zones de confusion à travailler
          </h3>
          {debrief.confusion_zones_encountered
            .filter(z => z.needs_review)
            .map((zone, i) => (
              <div key={i} className="glass-card p-3 rounded-xl border-l-4 border-amber-500/30">
                <p className="text-xs">
                  <span className="font-medium">{zone.concept_a}</span>
                  {" ↔ "}
                  <span className="font-medium">{zone.concept_b}</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Discrimination: {Math.round(zone.discrimination_accuracy * 100)}%
                </p>
              </div>
            ))}
        </div>
      )}

      {/* Upcoming reviews */}
      {upcomingReviews.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Prochaines révisions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {upcomingReviews.map((review, i) => (
              <div key={i} className="glass-card p-2.5 rounded-xl">
                <p className="text-xs font-medium truncate">{review.concept_key}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                  <span>J+{review.interval_days}</span>
                  <span>{review.review_type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
        {weak.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onReplayWeak} className="gap-2 text-xs">
            <RotateCcw className="w-3.5 h-3.5" /> Retravailler les points faibles
          </Button>
        )}
        <Button onClick={onAdvance} className="ml-auto gap-2 gradient-bg-premium rounded-xl">
          {debrief.recommended_next === "advance" ? "Mission suivante" : "Continuer"}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------- Sub-components ----------

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-3 rounded-xl text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ConceptColumn({
  title,
  concepts,
  color,
  onSelect,
  selectedKey,
}: {
  title: string;
  concepts: ConceptResult[];
  color: "green" | "blue" | "amber";
  onSelect: (key: string) => void;
  selectedKey: string | null;
}) {
  const borderColor = color === "green" ? "border-green-500/20" : color === "blue" ? "border-blue-500/20" : "border-amber-500/20";
  const textColor = color === "green" ? "text-green-500" : color === "blue" ? "text-blue-500" : "text-amber-500";

  return (
    <div className="space-y-1.5">
      <p className={`text-[10px] ${textColor} font-semibold uppercase tracking-wider`}>
        {title} ({concepts.length})
      </p>
      {concepts.slice(0, 8).map(concept => (
        <button
          key={concept.concept_key}
          onClick={() => onSelect(concept.concept_key)}
          className={`w-full text-left p-2 rounded-lg border text-xs transition-all ${
            selectedKey === concept.concept_key
              ? `${borderColor} bg-accent/30 ring-1 ring-primary/20`
              : `${borderColor} hover:bg-accent/10`
          }`}
        >
          <p className="font-medium truncate text-[11px]">{concept.label}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            {Math.round(concept.accuracy * 100)}% • {concept.attempts} essais
          </p>
        </button>
      ))}
    </div>
  );
}
