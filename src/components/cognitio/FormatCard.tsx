import { useTranslation } from "react-i18next";
import { Music, Gamepad2, FileText, BookOpen, Video, Lock } from "lucide-react";
import type { CreateFormat } from "@/lib/create-format-config";

const ICON_MAP: Record<string, typeof Music> = {
  Music, Gamepad2, FileText, BookOpen, Video,
};

const COLOR_MAP: Record<string, string> = {
  purple: "border-purple-500/50 bg-purple-500/10 text-purple-600",
  pink: "border-pink-500/50 bg-pink-500/10 text-pink-600",
  blue: "border-blue-500/50 bg-blue-500/10 text-blue-600",
  amber: "border-amber-500/50 bg-amber-500/10 text-amber-600",
  green: "border-green-500/50 bg-green-500/10 text-green-600",
};

const COLOR_MAP_INACTIVE: Record<string, string> = {
  purple: "hover:border-purple-500/30",
  pink: "hover:border-pink-500/30",
  blue: "hover:border-blue-500/30",
  amber: "hover:border-amber-500/30",
  green: "hover:border-green-500/30",
};

interface FormatCardProps {
  format: CreateFormat;
  labelKey: string;
  descriptionKey: string;
  icon: string;
  color: string;
  tags: string[];
  selected: boolean;
  locked: boolean;
  quotaRemaining?: number;    // -1 = unlimited, undefined = unknown
  onSelect: () => void;
  onLockedClick?: () => void; // triggers paywall
}

export function FormatCard({
  format, labelKey, descriptionKey, icon, color, tags,
  selected, locked, quotaRemaining, onSelect, onLockedClick,
}: FormatCardProps) {
  const { t } = useTranslation();
  const Icon = ICON_MAP[icon] ?? FileText;

  const handleClick = () => {
    if (locked) {
      onLockedClick?.();
    } else {
      onSelect();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left w-full ${
        locked
          ? "opacity-50 border-border/20 cursor-not-allowed"
          : selected
          ? COLOR_MAP[color] ?? ""
          : `border-border/30 text-muted-foreground ${COLOR_MAP_INACTIVE[color] ?? ""} hover:bg-muted/20`
      }`}
    >
      {locked && (
        <div className="absolute top-2 right-2">
          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5" />
        <span className="text-sm font-semibold">{t(labelKey, { defaultValue: format })}</span>
      </div>
      <p className="text-[11px] text-muted-foreground line-clamp-2">
        {t(descriptionKey, { defaultValue: "" })}
      </p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {tags.map((tag) => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/30 text-muted-foreground">
            {t(`format.tag.${tag}`, { defaultValue: tag })}
          </span>
        ))}
      </div>
      {quotaRemaining !== undefined && !locked && (
        <span className="text-[10px] text-muted-foreground">
          {quotaRemaining === -1
            ? t("format.unlimited", { defaultValue: "Illimité" })
            : t("format.remaining", { defaultValue: "{{count}} restant(s)", count: quotaRemaining })}
        </span>
      )}
    </button>
  );
}
