import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, Check } from "lucide-react";
import { useCalibration } from "@/hooks/useCalibration";

interface CalibrationMissionCardProps {
  onComplete: () => void;
}

export default function CalibrationMissionCard({ onComplete }: CalibrationMissionCardProps) {
  const {
    currentQuestion,
    currentIndex,
    totalQuestions,
    progress,
    isCompleted,
    isSubmitting,
    submitAnswer,
  } = useCalibration();

  const [selected, setSelected] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0.5);

  if (isCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card-elevated p-8 rounded-xl text-center space-y-4"
      >
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-bold">Calibration terminée !</h3>
        <p className="text-sm text-muted-foreground">
          Votre profil initial est configuré. Il s'affinera avec chaque mission.
        </p>
        <Button onClick={onComplete} className="gradient-bg-premium rounded-xl">
          Commencer
        </Button>
      </motion.div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="glass-card-elevated p-6 rounded-xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Target className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Calibration rapide</h3>
          <p className="text-xs text-muted-foreground">~4 minutes pour estimer votre profil</p>
        </div>
      </div>

      <Progress value={progress} className="h-1.5" />
      <p className="text-xs text-muted-foreground text-right tabular-nums">
        {currentIndex + 1}/{totalQuestions}
      </p>

      <p className="font-medium">{currentQuestion.question}</p>

      <div className="space-y-2">
        {currentQuestion.options.map((option) => (
          <button
            key={option}
            onClick={() => setSelected(option)}
            className={`w-full text-left p-3 rounded-xl border transition-all ${
              selected === option
                ? "border-primary bg-primary/5"
                : "border-border/20 hover:border-border/40"
            }`}
          >
            <span className="text-sm">{option}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">
            Confiance: {Math.round(confidence * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={confidence}
            onChange={(e) => setConfidence(parseFloat(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
      )}

      <Button
        onClick={() => {
          if (selected) {
            submitAnswer(selected, confidence);
            setSelected(null);
            setConfidence(0.5);
          }
        }}
        disabled={!selected || isSubmitting}
        className="w-full rounded-xl"
      >
        {isSubmitting ? "Enregistrement..." : "Valider"}
      </Button>
    </div>
  );
}
