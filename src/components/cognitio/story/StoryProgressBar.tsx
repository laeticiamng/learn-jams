// ============================================================
// StoryProgressBar — Scene navigation with type indicators
// ============================================================

import type { StoryScene } from "@/domain/cognitio/story.types";

interface StoryProgressBarProps {
  scenes: StoryScene[];
  currentIndex: number;
  onGoTo: (index: number) => void;
}

export function StoryProgressBar({ scenes, currentIndex, onGoTo }: StoryProgressBarProps) {
  return (
    <div className="flex items-center gap-1">
      {scenes.map((scene, i) => {
        const isCurrent = i === currentIndex;
        const isPast = i < currentIndex;

        return (
          <button
            key={scene.scene_id}
            className={`flex-1 h-2 rounded-full transition-colors ${
              isCurrent
                ? sceneColor(scene.type)
                : isPast
                  ? "bg-primary/40"
                  : "bg-muted"
            }`}
            onClick={() => onGoTo(i)}
            title={`${i + 1}. ${scene.title}`}
          />
        );
      })}
    </div>
  );
}

function sceneColor(type: string): string {
  const colors: Record<string, string> = {
    contract_hook: "bg-blue-500",
    anchoring: "bg-indigo-500",
    narrative_core: "bg-primary",
    active_pause: "bg-amber-500",
    clarity_peak: "bg-emerald-500",
    consolidation: "bg-green-500",
    disclaimer: "bg-yellow-500",
  };
  return colors[type] ?? "bg-primary";
}
