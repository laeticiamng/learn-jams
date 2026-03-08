import { useTranslation } from "react-i18next";
import { useAccessibility } from "@/hooks/useAccessibility";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Accessibility, RotateCcw, Eye, Type, Brain, Palette } from "lucide-react";
import { motion } from "framer-motion";

export default function AccessibilityPanel() {
  const { t } = useTranslation();
  const { settings, update, reset } = useAccessibility();

  const items = [
    {
      key: "dyslexiaFont" as const,
      icon: Type,
      label: t("a11y.dyslexia_font", "Dyslexia-friendly font"),
      desc: t("a11y.dyslexia_desc", "Uses OpenDyslexic for improved readability"),
    },
    {
      key: "adhdMode" as const,
      icon: Brain,
      label: t("a11y.adhd_mode", "ADHD mode"),
      desc: t("a11y.adhd_desc", "Shorter sessions, focus indicators, reduced animations"),
    },
    {
      key: "colorblindSafe" as const,
      icon: Palette,
      label: t("a11y.colorblind", "Colorblind-safe"),
      desc: t("a11y.colorblind_desc", "High-contrast color scheme optimized for color vision deficiency"),
    },
    {
      key: "highContrast" as const,
      icon: Eye,
      label: t("a11y.high_contrast", "High contrast"),
      desc: t("a11y.high_contrast_desc", "Increased text and border contrast"),
    },
  ];

  const fontSizeLabel =
    settings.fontSize <= 1 ? t("a11y.size_normal", "Normal") :
    settings.fontSize <= 1.25 ? t("a11y.size_large", "Large") :
    t("a11y.size_xl", "Extra large");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
          aria-label={t("a11y.title", "Accessibility")}
        >
          <Accessibility className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96 bg-card/95 backdrop-blur-2xl border-border/20 overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-display flex items-center gap-2">
            <Accessibility className="w-5 h-5 text-primary" />
            {t("a11y.title", "Accessibility")}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {items.map((item, i) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-4 p-4 rounded-xl bg-muted/10 border border-border/15"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <item.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm font-semibold cursor-pointer" htmlFor={item.key}>
                    {item.label}
                  </Label>
                  <Switch
                    id={item.key}
                    checked={settings[item.key]}
                    onCheckedChange={(checked) => update({ [item.key]: checked })}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}

          {/* Font size slider */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl bg-muted/10 border border-border/15 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Type className="w-4 h-4 text-primary" />
                {t("a11y.font_size", "Text size")}
              </Label>
              <span className="text-xs text-muted-foreground font-medium">{fontSizeLabel}</span>
            </div>
            <Slider
              value={[settings.fontSize]}
              onValueChange={([v]) => update({ fontSize: v })}
              min={0.85}
              max={1.5}
              step={0.05}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>A</span>
              <span className="text-sm">A</span>
              <span className="text-lg font-bold">A</span>
            </div>
          </motion.div>

          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="w-full gap-2 text-muted-foreground rounded-xl"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t("a11y.reset", "Reset to defaults")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
