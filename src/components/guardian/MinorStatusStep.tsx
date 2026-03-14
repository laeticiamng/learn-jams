// ============================================================
// MinorStatusStep — Age declaration + minor mode toggle
// ============================================================

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Baby, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computeMinorStatus } from "@/domain/guardian/guardian.validators";
import type { ContentFilterLevel } from "@/domain/guardian/minorProfile.types";

interface MinorStatusStepProps {
  birthYear: number | null;
  minorModeEnabled: boolean;
  contentFilterLevel: ContentFilterLevel;
  maxDailyMinutes: number;
  allowedHoursStart: number;
  allowedHoursEnd: number;
  onUpdate: (updates: {
    birth_year?: number | null;
    minor_mode_enabled?: boolean;
    content_filter_level?: ContentFilterLevel;
    max_daily_minutes?: number;
    allowed_hours_start?: number;
    allowed_hours_end?: number;
  }) => void;
  onNext?: () => void;
}

export function MinorStatusStep({
  birthYear,
  minorModeEnabled,
  contentFilterLevel,
  maxDailyMinutes,
  allowedHoursStart,
  allowedHoursEnd,
  onUpdate,
  onNext,
}: MinorStatusStepProps) {
  const [localBirthYear, setLocalBirthYear] = useState(birthYear?.toString() ?? "");
  const status = computeMinorStatus(birthYear);

  const handleBirthYearChange = (value: string) => {
    setLocalBirthYear(value);
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed > 1900 && parsed <= new Date().getFullYear()) {
      onUpdate({ birth_year: parsed });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-6 border rounded-xl bg-card/60 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold">Statut mineur</h3>
          <p className="text-sm text-muted-foreground">
            Déclaration d'âge et mode protégé
          </p>
        </div>
      </div>

      {/* Birth year */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Année de naissance
        </Label>
        <Input
          type="number"
          placeholder="ex: 2010"
          value={localBirthYear}
          onChange={(e) => handleBirthYearChange(e.target.value)}
          min={1900}
          max={new Date().getFullYear()}
        />
        {status.age !== null && (
          <div className="flex items-center gap-2 text-sm">
            <Baby className="w-4 h-4 text-muted-foreground" />
            <span>
              {status.age} ans — {status.isMinor ? "Mineur" : "Majeur"}
              {status.requiresConsent && " — Consentement parental requis"}
            </span>
          </div>
        )}
      </div>

      {/* Minor mode toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Mode protégé</Label>
          <p className="text-xs text-muted-foreground">Active le filtrage renforcé et les limites d'usage</p>
        </div>
        <Switch
          checked={minorModeEnabled}
          onCheckedChange={(checked) => onUpdate({ minor_mode_enabled: checked })}
        />
      </div>

      {minorModeEnabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-4 pl-4 border-l-2 border-blue-200"
        >
          {/* Content filter level */}
          <div className="space-y-2">
            <Label>Niveau de filtrage</Label>
            <Select
              value={contentFilterLevel}
              onValueChange={(v) => onUpdate({ content_filter_level: v as ContentFilterLevel })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="strict">Strict</SelectItem>
                <SelectItem value="institution">Institution</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Daily limit */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> Limite quotidienne (minutes)
            </Label>
            <Input
              type="number"
              value={maxDailyMinutes}
              onChange={(e) => onUpdate({ max_daily_minutes: parseInt(e.target.value, 10) || 120 })}
              min={10}
              max={480}
            />
          </div>

          {/* Allowed hours */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Heure début</Label>
              <Input
                type="number"
                value={allowedHoursStart}
                onChange={(e) => onUpdate({ allowed_hours_start: parseInt(e.target.value, 10) || 6 })}
                min={0}
                max={23}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Heure fin</Label>
              <Input
                type="number"
                value={allowedHoursEnd}
                onChange={(e) => onUpdate({ allowed_hours_end: parseInt(e.target.value, 10) || 22 })}
                min={0}
                max={23}
              />
            </div>
          </div>
        </motion.div>
      )}

      {onNext && (
        <Button onClick={onNext} className="w-full">
          Continuer
        </Button>
      )}
    </motion.div>
  );
}
