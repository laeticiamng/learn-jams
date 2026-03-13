import { AlertCircle } from "lucide-react";
import type { AmbiguousZone } from "@/domain/cognitio/types";

interface AmbiguityWarningProps {
  zones: AmbiguousZone[];
}

export default function AmbiguityWarning({ zones }: AmbiguityWarningProps) {
  if (zones.length === 0) return null;

  return (
    <div className="glass-card p-4 rounded-xl space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-yellow-500" />
        Zones ambiguës détectées ({zones.length})
      </h4>
      <p className="text-xs text-muted-foreground">
        Ces zones du contenu source contiennent des ambiguïtés. Les questions associées doivent être interprétées avec prudence.
      </p>
      {zones.map((zone, i) => (
        <div
          key={i}
          className={`p-3 rounded-lg border ${
            zone.severity === "high"
              ? "bg-red-500/5 border-red-500/10"
              : zone.severity === "medium"
                ? "bg-yellow-500/5 border-yellow-500/10"
                : "bg-blue-500/5 border-blue-500/10"
          }`}
        >
          <p className="text-sm font-medium">{zone.zone_label}</p>
          <p className="text-xs text-muted-foreground mt-1">{zone.reason}</p>
        </div>
      ))}
    </div>
  );
}
