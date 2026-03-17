// ============================================================
// MissionPreviewLayout — Preview a generated mission in the Create result view
// Shows mission summary: narrative, rooms overview, fallback mode + play button
// ============================================================

import { useNavigate } from "react-router-dom";
import { Gamepad2, DoorOpen, Crown, AlertTriangle, Shield, Play, XCircle, Compass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GenerateExperienceOutput } from "@/domain/cognitio/contracts";
import type { FallbackMode } from "@/domain/cognitio/types";
import { getBrickLabel } from "@/lib/cognitio-ui";
import { isEditorialArtifact } from "@/lib/cognitio-semantic-cleaning";

interface MissionPreviewLayoutProps {
  output: GenerateExperienceOutput;
}

const FALLBACK_LABELS: Record<FallbackMode, string> = {
  full: "Mission complète",
  full_with_alerts: "Mission complète (alertes)",
  reduced: "Mission réduite",
  minimal: "Mission light",
  synthesis_only: "Synthèse uniquement",
};

export function MissionPreviewLayout({ output }: MissionPreviewLayoutProps) {
  const navigate = useNavigate();
  const { mission_id, mission_json, fallback_mode, quality_band, room_count, includes_boss } = output;
  const isDegraded = fallback_mode !== "full" && fallback_mode !== "full_with_alerts";
  // P0: Check if mission title contains editorial artifacts (safety check)
  const titleText = mission_json.title.replace(/^Mission:\s*/i, "");
  const hasTitleArtifact = isEditorialArtifact(titleText) || /^R2C\b|^Rang\s+[A-Z]|^COM\s+R2C|^CODEX\b|^S[\s-]*ECN\b/i.test(titleText);
  const isPlayable = mission_json.rooms.length > 0 && !hasTitleArtifact;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-emerald-600" />
          Mission Interactive
        </h3>
        {isPlayable && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/mission/${mission_id}/escape`)}
              className="gap-2 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <Compass className="h-3.5 w-3.5" />
              Escape Game
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(`/mission/${mission_id}/play`)}
              className="gap-2 gradient-bg-premium rounded-xl"
            >
              <Play className="h-3.5 w-3.5" />
              Jouer
            </Button>
          </div>
        )}
      </div>

      {/* Fallback mode badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs">
          {FALLBACK_LABELS[fallback_mode] ?? fallback_mode}
        </Badge>
        <Badge variant="outline" className="text-xs">
          Qualité: {quality_band}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {room_count} salle{room_count > 1 ? "s" : ""}
          {includes_boss ? " + boss" : ""}
        </Badge>
      </div>

      {/* Degraded mode warning */}
      {isDegraded && (
        <div className="p-3 rounded-lg border-l-4 border-yellow-500/50 bg-yellow-500/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-700">
              La qualité du document source a entraîné une mission en mode dégradé ({FALLBACK_LABELS[fallback_mode]}).
            </p>
          </div>
        </div>
      )}

      {/* Narrative intro */}
      <div className="bg-muted/30 rounded-lg p-4">
        <p className="text-sm text-muted-foreground italic">{mission_json.narrative_intro}</p>
      </div>

      {/* Rooms overview */}
      {mission_json.rooms.length > 0 && (
        <div className="space-y-2">
          {mission_json.rooms.map((room) => (
            <div key={room.room_index} className="flex items-center gap-3 p-3 rounded-lg border bg-background">
              <DoorOpen className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{room.title}</p>
                <p className="text-xs text-muted-foreground">
                  {getBrickLabel(room.brick_type)} — {room.items.length} item{room.items.length > 1 ? "s" : ""}
                  {room.time_limit_sec ? ` — ${Math.ceil(room.time_limit_sec / 60)} min` : ""}
                </p>
              </div>
            </div>
          ))}

          {/* Boss */}
          {mission_json.boss && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-purple-200 bg-purple-50/50">
              <Crown className="h-4 w-4 text-purple-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-purple-800 truncate">{mission_json.boss.title}</p>
                <p className="text-xs text-purple-600">
                  {mission_json.boss.items.length} épreuves
                  {mission_json.boss.time_limit_sec ? ` — ${Math.ceil(mission_json.boss.time_limit_sec / 60)} min` : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* P0: Editorial artifact in title — block play */}
      {hasTitleArtifact && mission_json.rooms.length > 0 && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50/50">
          <div className="flex items-start gap-2">
            <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Mission non jouable</p>
              <p className="text-xs text-red-600">
                Le titre de la mission est basé sur un artefact éditorial ("{titleText}"). La mission ne peut pas être lancée dans cet état.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Synthesis-only fallback */}
      {mission_json.rooms.length === 0 && (
        <div className="p-4 rounded-lg border border-muted bg-muted/10">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Le contenu source ne permet pas de générer des salles interactives. Une synthèse des concepts a été produite.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
