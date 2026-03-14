// ============================================================
// CoverageBadge — Coverage indicator for the sheet
// ============================================================

import { Check, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CoverageReport, QualityFlag } from "@/domain/cognitio/generation.types";

interface Props {
  coverage: CoverageReport;
  qualityFlags: QualityFlag[];
}

export function CoverageBadge({ coverage, qualityFlags }: Props) {
  const fullCoverage = coverage.critical_covered === coverage.critical_total;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Badge
        variant={fullCoverage ? "default" : "destructive"}
        className="text-xs"
      >
        {fullCoverage ? (
          <><Check className="h-3 w-3 mr-1" /> Couverture critique 100%</>
        ) : (
          <><AlertTriangle className="h-3 w-3 mr-1" /> {coverage.critical_covered}/{coverage.critical_total} critiques</>
        )}
      </Badge>

      {coverage.major_total > 0 && (
        <Badge variant="outline" className="text-xs">
          {coverage.major_covered}/{coverage.major_total} majeurs
        </Badge>
      )}

      {qualityFlags.includes("uncertain_concepts_present") && (
        <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700">
          Contenu incertain
        </Badge>
      )}

      {qualityFlags.includes("low_recall_density") && (
        <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
          Rappels insuffisants
        </Badge>
      )}
    </div>
  );
}
