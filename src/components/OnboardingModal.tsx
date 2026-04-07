// ============================================================
// OnboardingModal — Shown after first login when profile is empty
// ============================================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Brain, GraduationCap, Sparkles, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SUBJECTS = [
  { id: "medicine", emoji: "🩺", label: "Médecine" },
  { id: "law", emoji: "⚖️", label: "Droit" },
  { id: "history", emoji: "📜", label: "Histoire" },
  { id: "languages", emoji: "🌍", label: "Langues" },
  { id: "sciences", emoji: "🔬", label: "Sciences" },
  { id: "engineering", emoji: "⚙️", label: "Ingénierie" },
  { id: "business", emoji: "📊", label: "Business" },
  { id: "arts", emoji: "🎨", label: "Arts" },
  { id: "other", emoji: "📚", label: "Autre" },
];

interface Props {
  open: boolean;
  onComplete: () => void;
  userId: string;
  defaultName?: string;
}

export function OnboardingModal({ open, onComplete, userId, defaultName }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(defaultName ?? "");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    setSaving(true);
    try {
      const updates: Record<string, string> = {};
      if (displayName.trim()) updates.display_name = displayName.trim();
      if (selectedSubject) updates.field_of_study = selectedSubject;

      if (Object.keys(updates).length > 0) {
        await supabase.from("profiles").update(updates).eq("user_id", userId);
      }

      toast.success(t("onboarding.success", { defaultValue: "Bienvenue sur COGNITIO ! 🎉" }));
      onComplete();
    } catch {
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md border-border/30 bg-card" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            {step === 0
              ? t("onboarding.step1_title", { defaultValue: "Comment on t'appelle ?" })
              : t("onboarding.step2_title", { defaultValue: "Qu'est-ce que tu étudies ?" })}
          </DialogTitle>
          <DialogDescription>
            {step === 0
              ? t("onboarding.step1_desc", { defaultValue: "On personnalise ton expérience d'apprentissage." })
              : t("onboarding.step2_desc", { defaultValue: "COGNITIO adapte ses contenus à ton domaine." })}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 py-2">
              <Input
                placeholder={t("onboarding.name_placeholder", { defaultValue: "Ton prénom ou pseudo" })}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="text-base"
                autoFocus
              />
              <Button className="w-full" onClick={() => setStep(1)} disabled={!displayName.trim()}>
                {t("onboarding.next", { defaultValue: "Suivant" })}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-2">
                {SUBJECTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSubject(s.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all ${
                      selectedSubject === s.id
                        ? "border-primary bg-primary/10 ring-1 ring-primary/20 text-primary"
                        : "border-border/30 hover:border-border/50 bg-card/50 text-muted-foreground"
                    }`}
                  >
                    <span className="text-xl">{s.emoji}</span>
                    {s.label}
                    {selectedSubject === s.id && <Check className="h-3 w-3 text-primary" />}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
                  {t("onboarding.back", { defaultValue: "Retour" })}
                </Button>
                <Button className="flex-1" onClick={handleFinish} disabled={saving}>
                  {saving ? (
                    <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <GraduationCap className="h-4 w-4 mr-2" />
                  )}
                  {t("onboarding.start", { defaultValue: "C'est parti !" })}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-1">
          {[0, 1].map((i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
