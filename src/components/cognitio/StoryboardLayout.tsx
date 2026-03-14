// ============================================================
// StoryboardLayout — Main layout for histoire_animee
// Interactive Storyboard V1
// ============================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, BookOpen, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { M5B_Output } from "@/domain/cognitio/story.contracts";
import type { StoryScene } from "@/domain/cognitio/story.types";
import { SceneViewer } from "./story/SceneViewer";
import { StoryProgressBar } from "./story/StoryProgressBar";
import { NarrativeNecessityBanner } from "./story/NarrativeNecessityBanner";

interface StoryboardLayoutProps {
  output: M5B_Output;
}

export function StoryboardLayout({ output }: StoryboardLayoutProps) {
  const { scenes, narrative_necessity, audience_adaptation, disclaimer } = output;
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentScene = scenes[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === scenes.length - 1;

  const goNext = () => {
    if (!isLast) setCurrentIndex(prev => prev + 1);
  };

  const goPrev = () => {
    if (!isFirst) setCurrentIndex(prev => prev - 1);
  };

  const goTo = (index: number) => {
    if (index >= 0 && index < scenes.length) setCurrentIndex(index);
  };

  return (
    <div className="space-y-4">
      {/* Narrative necessity banner */}
      {narrative_necessity.revert_candidate && (
        <NarrativeNecessityBanner necessity={narrative_necessity} />
      )}

      {/* Adaptation info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BookOpen className="h-3 w-3" />
        <span>
          Univers : {universeLabel(audience_adaptation.narrative_universe_style)} |
          Guidage : {guidanceLabel(audience_adaptation.guidance_level)} |
          {scenes.length} scènes
        </span>
      </div>

      {/* Progress bar */}
      <StoryProgressBar
        scenes={scenes}
        currentIndex={currentIndex}
        onGoTo={goTo}
      />

      {/* Scene viewer */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScene.scene_id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
        >
          <SceneViewer scene={currentScene} />
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={goPrev}
          disabled={isFirst}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
        </Button>

        <span className="text-xs text-muted-foreground">
          {currentIndex + 1} / {scenes.length}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={goNext}
          disabled={isLast}
        >
          Suivant <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Disclaimer summary */}
      {disclaimer.uncertain_concepts.length > 0 && (
        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-3 mt-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-yellow-800">Concepts incertains</p>
              <p className="text-xs text-yellow-600">
                {disclaimer.uncertain_concepts.length} concept(s) n'ont pas pu être pleinement tracés.
                Confiance globale : {Math.round(disclaimer.confidence_level * 100)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function universeLabel(style: string): string {
  const labels: Record<string, string> = {
    school: "Scolaire",
    daily_life: "Quotidien",
    academic: "Universitaire",
    professional: "Professionnel",
    clinical: "Clinique",
  };
  return labels[style] ?? style;
}

function guidanceLabel(level: string): string {
  const labels: Record<string, string> = {
    high: "Guidage fort",
    medium: "Équilibré",
    light: "Autonome",
  };
  return labels[level] ?? level;
}
