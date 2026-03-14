// ============================================================
// SceneViewer — Renders a single story scene
// ============================================================

import { useState } from "react";
import {
  BookOpen,
  Eye,
  MessageSquare,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Image,
} from "lucide-react";
import type { StoryScene } from "@/domain/cognitio/story.types";
import { ChoiceWidget } from "./ChoiceWidget";
import { FeedbackReveal } from "./FeedbackReveal";
import { ConfusionEventCard } from "./ConfusionEventCard";

interface SceneViewerProps {
  scene: StoryScene;
}

export function SceneViewer({ scene }: SceneViewerProps) {
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Scene header */}
      <div className={`px-4 py-3 ${sceneHeaderBg(scene.type)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {sceneIcon(scene.type)}
            <span className="text-xs uppercase tracking-wide font-medium">
              {sceneTypeLabel(scene.type)}
            </span>
          </div>
          {scene.emotion_tag && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/50">
              {emotionLabel(scene.emotion_tag)}
            </span>
          )}
        </div>
        <h3 className="font-semibold mt-1">{scene.title}</h3>
      </div>

      {/* Visual direction */}
      <div className="px-4 py-2 bg-muted/20 border-b">
        <div className="flex items-start gap-2">
          <Image className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground italic">{scene.visual_direction}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="px-4 py-4 space-y-4">
        {/* Narration */}
        <div className="prose prose-sm max-w-none">
          {scene.narration.split("\n").map((line, i) => (
            <p key={i} className="text-sm leading-relaxed mb-2">
              {line}
            </p>
          ))}
        </div>

        {/* Dialogue */}
        {scene.dialogue && scene.dialogue.length > 0 && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-1 mb-1">
              <MessageSquare className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Dialogue</span>
            </div>
            {scene.dialogue.map((line, i) => (
              <p key={i} className="text-sm italic text-foreground/80">
                {line}
              </p>
            ))}
          </div>
        )}

        {/* Visual anchor */}
        {scene.visual_anchor && (
          <div className="border border-primary/20 rounded-lg p-3 bg-primary/5">
            <div className="flex items-start gap-2">
              <Eye className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-primary">Ancrage visuel</p>
                <p className="text-sm text-foreground/80 mt-1">{scene.visual_anchor.image_desc}</p>
                <p className="text-xs text-primary/70 mt-1 italic">
                  {scene.visual_anchor.verbal_formula}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Confusion event */}
        {scene.confusion_event && (
          <ConfusionEventCard event={scene.confusion_event} />
        )}

        {/* Choice widget */}
        {scene.choice_widget && (
          <ChoiceWidget
            widget={scene.choice_widget}
            onAnswer={() => setShowFeedback(true)}
          />
        )}

        {/* Feedback reveal */}
        {showFeedback && scene.feedback_reveal && (
          <FeedbackReveal reveal={scene.feedback_reveal} />
        )}
      </div>

      {/* Concepts covered */}
      {scene.concepts_covered.length > 0 && (
        <div className="px-4 py-2 border-t bg-muted/10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Concepts :</span>
            {scene.concepts_covered.map((key) => (
              <span
                key={key}
                className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
              >
                {key}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function sceneTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    contract_hook: "Accroche & Contrat",
    anchoring: "Ancrage",
    narrative_core: "Récit",
    active_pause: "Pause interactive",
    clarity_peak: "Pic de clarté",
    consolidation: "Consolidation",
    disclaimer: "Avertissement",
  };
  return labels[type] ?? type;
}

function sceneHeaderBg(type: string): string {
  const colors: Record<string, string> = {
    contract_hook: "bg-blue-50 text-blue-900",
    anchoring: "bg-indigo-50 text-indigo-900",
    narrative_core: "bg-slate-50 text-slate-900",
    active_pause: "bg-amber-50 text-amber-900",
    clarity_peak: "bg-emerald-50 text-emerald-900",
    consolidation: "bg-green-50 text-green-900",
    disclaimer: "bg-yellow-50 text-yellow-900",
  };
  return colors[type] ?? "bg-muted/30";
}

function sceneIcon(type: string) {
  const iconClass = "h-4 w-4";
  switch (type) {
    case "contract_hook": return <BookOpen className={iconClass} />;
    case "anchoring": return <Eye className={iconClass} />;
    case "narrative_core": return <BookOpen className={iconClass} />;
    case "active_pause": return <Lightbulb className={iconClass} />;
    case "clarity_peak": return <CheckCircle className={iconClass} />;
    case "consolidation": return <CheckCircle className={iconClass} />;
    case "disclaimer": return <AlertTriangle className={iconClass} />;
    default: return <BookOpen className={iconClass} />;
  }
}

function emotionLabel(tag: string): string {
  const labels: Record<string, string> = {
    tension: "Tension",
    surprise: "Surprise",
    identification: "Identification",
    clarity: "Clarté",
  };
  return labels[tag] ?? tag;
}
